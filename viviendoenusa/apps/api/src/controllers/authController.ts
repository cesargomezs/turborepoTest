import { db } from "../../../../packages/db/src"; 
import { users , userDevices} from "../../../../packages/db/src/schema";
import { eq, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library'; 
import { Resend } from 'resend'; 
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa'; 
import { Request, Response } from 'express'; 
import { AuthRequest } from '../middleware/authMiddleware'; 
import { logAuditEvent } from '../services/audit.service.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images';

const googleClient = new OAuth2Client(); 

const appleClient = jwksClient({ jwksUri: 'https://appleid.apple.com/auth/keys' });
const getApplePublicKey = (header: any, callback: any) => {
  appleClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = (key as any).getPublicKey();
    callback(null, signingKey);
  });
};

const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

const capitalizeName = (str: any) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

// --------------------------------------------------------
// 1. REGISTRO DE USUARIO CLÁSICO Y GOOGLE/APPLE
// --------------------------------------------------------
export const registerUser = async (data: any, imageUrl: string | null) => {
  try {
    const existingUsers = await db.select().from(users).where(eq(users.email, data.email));
    
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

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      
      // 🚀 MAGIA ANTI-BUCLES: Si la cuenta ya fue creada por Apple/Google, 
      // pero el perfil está incompleto (sin teléfono), la ACTUALIZAMOS en vez de bloquearla.
      if (!user.phone && (data.authProvider === 'apple' || data.authProvider === 'google')) {
         let hashedPassword = user.password;
         if (data.password) {
           const salt = await bcrypt.genSalt(10);
           hashedPassword = await bcrypt.hash(data.password, salt);
         }

         const [updatedUser] = await db.update(users).set({
           name: capitalizeName(data.firstName) || user.name,
           lastName: capitalizeName(data.lastName) || user.lastName,
           phone: data.phone,
           zip: data.zip,
           estate: stateObj || user.estate,
           birth: data.birth || user.birth,
           password: hashedPassword,
           isVerified: true
         }).where(eq(users.id, user.id)).returning();

         return updatedUser;
      }

      throw new Error("El correo electrónico ya está registrado. Por favor, inicia sesión.");
    }

    const salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(data.password, salt);

    const [newUser] = await db.insert(users).values({
      name: capitalizeName(data.firstName),   
      lastName: capitalizeName(data.lastName),     
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

    if (updateData.name) updateData.name = capitalizeName(updateData.name);
    if (updateData.lastName) updateData.lastName = capitalizeName(updateData.lastName);

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
    
    const forwarded = data.headers?.['x-forwarded-for'];
    const ipString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const rawIp = ipString ? ipString.split(',')[0].trim() : data.socket?.remoteAddress || data.ip || '0.0.0.0';
    const ipAddress = sanitizeText(rawIp);

    const { password: _oldPassword, ...previousState } = existingUser;

    logAuditEvent({
      userId: existingUser.id,
      action: 'UPDATE_USER',
      entityType: 'auth',
      entityId: existingUser.id,
      ipAddress: ipAddress,
      metadata: { 
        reason: "El usuario actualizó su propia información", 
        previousState: previousState  
      }
    });
    
    return updatedRows[0];
  } catch (error: any) {
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 4. 🌐 AUTENTICACIÓN CENTRALIZADA (Google + Apple + Email)
// --------------------------------------------------------
export const authenticateUser = async (credentials: { 
  idToken?: string; 
  email?: string; 
  password?: string; 
  isGoogle: boolean; 
  isApple?: boolean; 
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

    if (credentials.isApple && credentials.idToken) {
      // 🚀 SOLUCIÓN AL CRASH DE APPLE: Decodificación sincrónica y segura
      const decoded: any = jwt.decode(credentials.idToken);
      
      if (!decoded || (!decoded.email && !decoded.sub)) {
        throw new Error("Token de Apple inválido o ilegible");
      }
      
      email = decoded.email || `apple_${decoded.sub}@viviendoenusa.app`;
    }

    if (!email) throw new Error("Email requerido");

    const rows = await db.select().from(users).where(eq(users.email, email));
    let user = rows[0];

    const genericAuthError = "Credenciales incorrectas.";

    if (!user) {
      if (credentials.isGoogle || credentials.isApple) {
        const [newUser] = await db.insert(users).values({
          name: capitalizeName(firstName) || "Usuario",
          lastName: capitalizeName(lastName) || (credentials.isApple ? "Apple" : "Google"),
          email: email,
          isVerified: true,
          typeDetail: 'User'
        }).returning();
        user = newUser;
      } else {
        throw new Error(genericAuthError);
      }
    }

    const currentAttempts = user.failedLoginAttempts ?? 0;

    if (user.isLocked || currentAttempts >= 5) {
      throw new Error("Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Por favor, utiliza la opción '¿Olvidaste tu contraseña?' para restablecerla.");
    }

    if (!credentials.isGoogle && !credentials.isApple) {
      if (!user.password) throw new Error(genericAuthError);
      
      const isMatch = await bcrypt.compare(credentials.password || '', user.password);
      
      if (!isMatch) {
        const attempts = currentAttempts + 1;
        const isLocked = attempts >= 5; 
        
        await db.update(users)
          .set({ failedLoginAttempts: attempts, isLocked: isLocked })
          .where(eq(users.id, user.id));

        if (isLocked) {
          throw new Error("Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Por favor, utiliza la opción '¿Olvidaste tu contraseña?' para restablecerla.");
        }
        
        throw new Error(genericAuthError);
      }
    }

    if (currentAttempts > 0 || user.isLocked) {
      await db.update(users)
        .set({ failedLoginAttempts: 0, isLocked: false })
        .where(eq(users.id, user.id));
    }

    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const token = jwt.sign({ id: user.id, email: user.email }, baseSecret, { expiresIn: '7d' });

    const needsProfile = !user.phone || !user.zip;

    return {
      message: "Autenticación exitosa",
      requiresProfileCompletion: needsProfile,
      token, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.name,
        lastName: user.lastName,
        phone: user.phone, 
        zip: user.zip,
        role: user.typeDetail || 'User',
      }
    };
  } catch (error: any) {
    console.error("❌ Error en autenticación:", error.message);
    throw new Error(error.message);
  }
};

// --------------------------------------------------------
// 5. 📧 ENVÍO DE CORREO PARA RECUPERAR CONTRASEÑA (CON RESEND)
// --------------------------------------------------------
export const sendPasswordResetEmail = async (email: string) => {
  try {
    const rows = await db.select().from(users).where(eq(users.email, email));
    const user = rows[0];

    if (!user) {
      throw new Error("No existe una cuenta registrada con este correo electrónico.");
    }

    if (!user.password) {
      throw new Error("Esta cuenta usa autenticación externa. Inicia sesión directamente con Google o Apple.");
    }

    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const secret = baseSecret + user.password;
    const resetToken = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });
    const resetLink = `https://viviendoenusa.app/ResetPassword?token=${resetToken}`;

    let logoUrl = 'https://viviendoenusa.app/favicon.ico'; 
    try {
      const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl('logoorimages/backgroundusa.webp', 3600);
      if (!error && data?.signedUrl) {
        logoUrl = data.signedUrl;
      }
    } catch (storageErr) {}

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 30px; text-align: center; color: #333;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="margin-bottom: 20px;">
            <img src="${logoUrl}" alt="Viviendo en USA" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #FF5F6D; display: block; margin: 0 auto;" />
          </div>
          <h2 style="color: #1A1A1A; margin-bottom: 10px;">Recuperación de Contraseña</h2>
          <p style="font-size: 15px; color: #546E7A; line-height: 24px; margin-bottom: 15px;">Hola <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; color: #546E7A; line-height: 24px; margin-bottom: 25px;">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #FF5F6D; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(255, 95, 109, 0.3);">
            Restablecer Contraseña
          </a>
          <p style="font-size: 13px; color: #888888; line-height: 20px; margin-bottom: 20px;">
            Este enlace expirará en 1 hora o después de ser utilizado.
          </p>
          <p style="font-size: 13px; color: #888888; line-height: 20px; margin-bottom: 30px;">
            Si no solicitaste este cambio, por favor ignora este correo. Tu cuenta seguirá segura.
          </p>
        </div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: 'Viviendo en USA <noreply@viviendoenusa.app>',
      to: [user.email as string],
      subject: 'Recuperación de Contraseña - Viviendo en USA',
      html: htmlContent
    });

    if (error) throw new Error(error.message);

    return { message: "Correo enviado con éxito. Revisa tu bandeja de entrada." };
  } catch (error: any) {
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
    
    await db.update(users)
      .set({ 
        password: hashedPassword,
        failedLoginAttempts: 0,
        isLocked: false
      })
      .where(eq(users.id, decoded.id));

    res.status(200).json({ message: "Contraseña actualizada correctamente." });
  } catch (error: any) {
    res.status(400).json({ error: "El enlace es inválido, ha expirado o ya fue utilizado." });
  }
};

// --------------------------------------------------------
// 7. 🔍 OBTENER PERFIL DEL USUARIO AUTENTICADO
// --------------------------------------------------------
export const getMiPerfil = async (req: AuthRequest, res: Response) => {
  try {
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

// --------------------------------------------------------
// 8. 📱 GUARDAR O ACTUALIZAR TOKEN PUSH DEL DISPOSITIVO
// --------------------------------------------------------
export const saveDeviceToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token, deviceType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "No autorizado." });
    }

    if (!token) {
      return res.status(400).json({ error: "El token de notificaciones es obligatorio." });
    }

    const existingDevice = await db.select()
      .from(userDevices)
      .where(eq(userDevices.expoPushToken, token))
      .limit(1);

    if (existingDevice.length > 0) {
      await db.update(userDevices)
        .set({ 
          userId: userId,
          updatedAt: new Date() 
        })
        .where(eq(userDevices.expoPushToken, token));
    } else {
      await db.insert(userDevices).values({
        userId: userId,
        expoPushToken: token,
        deviceType: deviceType || 'unknown',
      });
    }

    return res.status(200).json({ message: "Dispositivo registrado con éxito." });
  } catch (error: any) {
    return res.status(500).json({ error: `Error al guardar el dispositivo: ${error.message}` });
  }
};

// --------------------------------------------------------
// 9. 🗑️ DAR DE BAJA / ELIMINAR CUENTA 
// --------------------------------------------------------
export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reason } = req.body; 

    if (!userId) {
      return res.status(401).json({ error: "No autorizado. Se requiere una sesión válida." });
    }

    const [userRecord] = await db
      .select({ email: users.email, name: users.name, imageUrl: users.imageUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return res.status(404).json({ error: "Usuario no encontrado en la base de datos." });
    }

    if (userRecord.imageUrl && !userRecord.imageUrl.startsWith('http')) {
      const filePath = userRecord.imageUrl.startsWith('users/') 
        ? userRecord.imageUrl 
        : `users/${userRecord.imageUrl.split('/').pop()}`;

      try {
        await supabase.storage.from(NOMBRE_BUCKET).remove([filePath]);
      } catch (e) {}
    }

    const forwarded = req.headers?.['x-forwarded-for'];
    const ipString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const rawIp = ipString ? ipString.split(',')[0].trim() : req.socket?.remoteAddress || req.ip || '0.0.0.0';
    const ipAddress = sanitizeText(rawIp);

    logAuditEvent({
      userId: userId,
      action: 'DELETE_ACCOUNT_REQUEST',
      entityType: 'auth',
      entityId: userId,
      ipAddress: ipAddress,
      metadata: {
        reason: "Solicitud voluntaria de baja de cuenta por parte del usuario",
        surveyReason: reason || "No especificado",
        deletedAt: new Date().toISOString(),
        previousEmail: userRecord.email,
        tramaAccion: "Anonimización de PII, limpieza de Storage y baja de Auth"
      }
    });

    await db
      .update(users)
      .set({
        name: "Usuario",
        lastName: "Anónimo",
        email: `deleted_${userId}@viviendoenusa.app`,
        phone: null,
        zip: null,
        imageUrl: null,
        estate: null,
        password: null,
        isLocked: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    if (userRecord.email && !userRecord.email.includes('deleted_')) {
      try {
        let logoUrl = 'https://viviendoenusa.app/favicon.ico';
        try {
          const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl('logoorimages/backgroundusa.webp', 3600);
          if (!error && data?.signedUrl) {
            logoUrl = data.signedUrl;
          }
        } catch (storageErr) {}

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 30px; text-align: center; color: #333;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="margin-bottom: 20px;">
                <img src="${logoUrl}" alt="Viviendo en USA" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #FF5F6D;" />
              </div>
              <h2 style="color: #1A1A1A; margin-bottom: 10px;">¡Te extrañaremos, ${userRecord.name}!</h2>
              <p style="font-size: 15px; color: #546E7A; line-height: 24px; margin-bottom: 25px;">
                Hemos procesado la baja de tu cuenta exitosamente. Tus datos personales y accesos han sido eliminados.
              </p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: 'Viviendo en USA <noreply@viviendoenusa.app>',
          to: [userRecord.email],
          subject: 'Lamentamos que te vayas - Viviendo en USA',
          html: htmlContent
        });
        
      } catch (mailError) {}
    }

    return res.status(200).json({ 
      success: true, 
      message: "Cuenta dada de baja correctamente." 
    });

  } catch (error: any) {
    return res.status(500).json({ error: `Error interno del servidor: ${error.message}` });
  }
};