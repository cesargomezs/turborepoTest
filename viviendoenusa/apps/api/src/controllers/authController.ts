import { db } from "../../../../packages/db/src"; 
import { users } from "../../../../packages/db/src/schema";
import { eq, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library'; 
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express'; 
import { AuthRequest } from '../middleware/authMiddleware'; 
import { logAuditEvent } from '../services/audit.service'; // 🚀 IMPORTACIÓN CORREGIDA

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images';

const googleClient = new OAuth2Client(); 

const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// --------------------------------------------------------
// 1. REGISTRO DE USUARIO CLÁSICO Y GOOGLE
// --------------------------------------------------------
export const registerUser = async (data: any, imageUrl: string | null) => {
  try {
    const existingUsers = await db.select().from(users).where(eq(users.email, data.email));
    
    if (existingUsers.length > 0) {
      throw new Error("El correo electrónico ya está registrado. Por favor, inicia sesión.");
    }

    const salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(data.password, salt);

    let cityObj = undefined;
    let stateObj = undefined;

    if (data.zip && data.zip.length === 5) {
      try {
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${data.zip}`);
        if (zipResponse.ok) {
          const zipInfo = await zipResponse.json();
          const location = zipInfo.places[0];
          cityObj = location['place name']; 
          stateObj = location['state abbreviation']; 
        } else {
          console.warn(`Zip code no encontrado en la API al registrar: ${data.zip}`);
        }
      } catch (err) {
        console.error("Error al consultar el servicio de Zip Codes en registro:", err);
      }
    }

    const [newUser] = await db.insert(users).values({
      name: data.firstName,   
      lastName: data.lastName,     
      email: data.email,
      phone: data.phone || undefined,           
      zip: data.zip || undefined,
      estate: stateObj,                
      birth: data.birth || undefined,           
      password: data.isVerified ? (null as string | null) : hashedPassword, 
      imageUrl: imageUrl || undefined, 
      typeDetail: data.typeDetail || 'User',
      isVerified: data.isVerified      
    }).returning();

    return newUser;
  } catch (error: any) {
    throw new Error(error.message); 
  }
};

// --------------------------------------------------------
// 2. 🔍 CONSULTA DE USUARIO
// --------------------------------------------------------
export const getUser = async (idOrEmail: string) => {
  try {
    const isEmail = idOrEmail.includes('@');
    const query = isEmail 
      ? sql`${users.email}::text = ${idOrEmail}::text`
      : sql`${users.id}::text = ${idOrEmail}::text`;

    const rows = await db.select().from(users).where(query);
      
    if (!rows || rows.length === 0) return null;

    const user = rows[0];
    let signedImageUrl = user.imageUrl;

    if (user.imageUrl && !user.imageUrl.startsWith('http')) {
      const rutaArchivo = user.imageUrl.startsWith('users/') 
          ? user.imageUrl 
          : `users/${user.imageUrl}`;
          
      const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
      if (data) { signedImageUrl = data.signedUrl; }
    }

    return { ...user, imageUrl: signedImageUrl };
  } catch (error: any) {
    console.error("Error en getUser:", error);
    throw new Error(`Error al consultar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 3. 🔄 ACTUALIZACIÓN DE USUARIO 
// --------------------------------------------------------
export const updateUser = async (idOrEmail: string, data: any, newImageUri: string | null) => {
  try {
    const isEmail = idOrEmail.includes('@');
    const query = isEmail 
      ? eq(users.email, idOrEmail) 
      : eq(users.id, idOrEmail);

    const [existingUser] = await db.select().from(users).where(query);
    if (!existingUser) throw new Error("Usuario no encontrado");

    if (data.birth) {
      const today = new Date();
      const birthDate = new Date(data.birth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) { age--; }
      if (age < 18) { throw new Error("Operación rechazada: El usuario debe tener al menos 18 años."); }
    }

    const updateData: any = { ...data };

    if (data.zip && data.zip.length === 5) {
      try {
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${data.zip}`);
        if (zipResponse.ok) {
          const zipInfo = await zipResponse.json();
          const location = zipInfo.places[0];
          updateData.city = location['place name']; 
          updateData.state = location['state abbreviation']; 
        }
      } catch (err) {}
    }

    if (data.password && data.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    } else {
      delete updateData.password; 
    }

    if (newImageUri && typeof newImageUri === 'string') {
      if (existingUser.imageUrl) {
        const oldImagePath = existingUser.imageUrl.includes('users/') ? existingUser.imageUrl : `users/${existingUser.imageUrl}`;
        await supabase.storage.from(NOMBRE_BUCKET).remove([oldImagePath]);
      }
      updateData.imageUrl = newImageUri; 
    }

    if (updateData.isVerified) {
      updateData.verifiedAt = new Date();
      delete updateData.isVerified; 
    }
    
    if (updateData.authProvider) delete updateData.authProvider;

    const updatedRows = await db.update(users).set(updateData).where(query).returning();
    
    // Extracción segura de la IP verificando si headers o socket existen en 'data' (por si viene directo del cliente web)
    const forwarded = data.headers?.['x-forwarded-for'];
    const ipString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const rawIp = ipString ? ipString.split(',')[0].trim() : data.socket?.remoteAddress || data.ip || '0.0.0.0';
    const ipAddress = sanitizeText(rawIp);

    // 🚀 MEJORA: Excluimos la contraseña del historial previo por seguridad
    const { password: _oldPassword, ...previousState } = existingUser;

    logAuditEvent({
      userId: existingUser.id,
      action: 'UPDATE_USER',
      entityType: 'auth',
      entityId: existingUser.id,
      ipAddress: ipAddress,
      metadata: { 
        reason: "El usuario actualizó su propia información", 
        previousState: previousState  // ⬅️ Y aquí lo que se insertó nuevo
      }
    });
    
    return updatedRows[0];
  } catch (error: any) {
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 4. 🌐 AUTENTICACIÓN CENTRALIZADA (Google + Email)
// --------------------------------------------------------
export const authenticateUser = async (credentials: { 
  idToken?: string; 
  email?: string; 
  password?: string; 
  isGoogle: boolean; 
}) => {
  try {
    let email = credentials.email;
    let firstName = "";
    let lastName = "";

    if (credentials.isGoogle && credentials.idToken) {
      const ticket = await googleClient.verifyIdToken({ idToken: credentials.idToken });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("Token de Google inválido");
      email = payload.email;
      firstName = payload.given_name || "";
      lastName = payload.family_name || "";
    }

    if (!email) throw new Error("Email requerido");

    const rows = await db.select().from(users).where(eq(users.email, email));
    let user = rows[0];

    // 🛡️ SEGURIDAD: Mensaje genérico para no revelar si el correo existe o no
    const genericAuthError = "Credenciales incorrectas.";

    if (!user) {
      if (credentials.isGoogle) {
        return {
          message: "Usuario no registrado, requiere completar perfil",
          requiresProfileCompletion: true,
          user: { email, firstName, lastName, id: "temp" }
        };
      }
      throw new Error(genericAuthError);
    }

    // 🚀 CORRECCIÓN TS: Usamos (user.failedLoginAttempts ?? 0) para asegurar un número
    const currentAttempts = user.failedLoginAttempts ?? 0;

    // 🛡️ SEGURIDAD: Verificar si la cuenta está bloqueada ANTES de comparar contraseñas
    if (user.isLocked || currentAttempts >= 5) {
      throw new Error("Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Por favor, utiliza la opción '¿Olvidaste tu contraseña?' para restablecerla.");
    }

    if (!credentials.isGoogle) {
      if (!user.password) throw new Error(genericAuthError);
      
      const isMatch = await bcrypt.compare(credentials.password || '', user.password);
      
      if (!isMatch) {
        // 🛡️ SEGURIDAD: Incrementar contador de intentos fallidos
        const attempts = currentAttempts + 1;
        const isLocked = attempts >= 5; // Bloquear al quinto intento
        
        await db.update(users)
          .set({ failedLoginAttempts: attempts, isLocked: isLocked })
          .where(eq(users.id, user.id));

        if (isLocked) {
          throw new Error("Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Por favor, utiliza la opción '¿Olvidaste tu contraseña?' para restablecerla.");
        }
        
        throw new Error(genericAuthError);
      }
    }

    // 🛡️ SEGURIDAD: Si el login es exitoso, reiniciamos los intentos fallidos a 0
    if (currentAttempts > 0 || user.isLocked) {
      await db.update(users)
        .set({ failedLoginAttempts: 0, isLocked: false })
        .where(eq(users.id, user.id));
    }

    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const token = jwt.sign({ id: user.id, email: user.email }, baseSecret, { expiresIn: '7d' });

    return {
      message: "Autenticación exitosa",
      requiresProfileCompletion: false,
      token, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.name,
        lastName: user.lastName,
      }
    };
  } catch (error: any) {
    console.error("❌ Error en autenticación:", error.message);
    throw new Error(error.message);
  }
};


// --------------------------------------------------------
// 5. 📧 ENVÍO DE CORREO PARA RECUPERAR CONTRASEÑA
// --------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com', 
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendPasswordResetEmail = async (email: string) => {
  try {
    //console.log("Solicitud de recuperación para:", email);

    // 1. Validar que el usuario exista
    const rows = await db.select().from(users).where(eq(users.email, email));
    const user = rows[0];

    if (!user) {
      throw new Error("No existe una cuenta registrada con este correo electrónico.");
    }

    if (!user.password) {
      throw new Error("Esta cuenta usa autenticación de Google. Inicia sesión directamente con Google.");
    }

    // 2. 🚨 TRUCO DE SEGURIDAD: Combinar el secreto del .env con el password actual
    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const secret = baseSecret + user.password;

    // 3. Generar un token seguro firmado con ESA combinación (válido por 1 hora)
    const resetToken = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });

    // 4. Crear el enlace apuntando a tu IP local (o tu dominio web en producción)
    const resetLink = `http://192.168.1.171:8081/ResetPassword?token=${resetToken}`;

    const mailOptions = {
      from: '"Viviendo en USA" <cesar@viviendoenusa.app>',
      to: user.email as string, 
      subject: 'Recuperación de Contraseña - Viviendo en USA',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2>Recuperación de Contraseña</h2>
          <p>Hola ${user.name},</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Haz clic en el botón de abajo para crear una nueva (este enlace expirará en 1 hora o al usarse):</p>
          <br>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #FF5F6D; color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">
            Restablecer Contraseña
          </a>
          <br><br>
          <p>Si no solicitaste este cambio, simplemente ignora este correo.</p>
        </div>
      `
    };

    // 5. Enviar el correo
    await transporter.sendMail(mailOptions);

    return { message: "Correo enviado con éxito. Revisa tu bandeja de entrada." };
  } catch (error: any) {
    console.error("❌ Error enviando correo:", error.message);
    throw new Error(error.message);
  }
};

// --------------------------------------------------------
// 6. 🔐 ACTUALIZAR CONTRASEÑA EN LA BASE DE DATOS
// --------------------------------------------------------
export const updatePassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  
  try {
    const decodedPayload: any = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.id) {
      throw new Error("Token con formato incorrecto.");
    }

    const rows = await db.select().from(users).where(eq(users.id, decodedPayload.id));
    const user = rows[0];
    if (!user) throw new Error("Usuario no encontrado.");

    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const secret = baseSecret + user.password;

    const decoded: any = jwt.verify(token, secret);
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 🛡️ SEGURIDAD: Al restablecer la contraseña, desbloqueamos la cuenta y reseteamos los intentos
    await db.update(users)
      .set({ 
        password: hashedPassword,
        failedLoginAttempts: 0,
        isLocked: false
      })
      .where(eq(users.id, decoded.id));

    res.status(200).json({ message: "Contraseña actualizada correctamente." });
  } catch (error: any) {
    console.error("❌ Error al actualizar contraseña:", error.message);
    res.status(400).json({ error: "El enlace es inválido, ha expirado o ya fue utilizado." });
  }
};

//// --------------------------------------------------------
// 7. 🔍 OBTENER PERFIL DEL USUARIO AUTENTICADO
//// --------------------------------------------------------

export const getMiPerfil = async (req: AuthRequest, res: Response) => {
  try {
    // El middleware 'verifyToken' inyectó el 'user' en 'req'
    const userId = req.user.id; 

    const userProfile = await db.select().from(users).where(eq(users.id, userId));

    if (userProfile.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json(userProfile[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el perfil.' });
  }
};

