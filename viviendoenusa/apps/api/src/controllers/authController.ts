import { db } from "../../../../packages/db/src"; 
import { users, userDevices, userTermsAcceptance } from "../../../../packages/db/src/schema";
import { eq, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library'; 
import { Resend } from 'resend'; 
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa'; 
import { Request, Response } from 'express'; 
import { AuthRequest } from '../middleware/authMiddleware'; 
import { logAuditEvent } from '../services/audit.service';

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
// 🛠️ TÉRMINOS: FUERZA BRUTA (Permite múltiples sesiones, cero duplicados por error)
// --------------------------------------------------------
const ensureTermsAccepted = async (userId: string, ipAddress?: string | null) => {
  try {
    // 1. Borramos cualquier registro viejo para evitar los duplicados del "doble-disparo" de React Native
    await db.execute(sql`DELETE FROM "userTermsAcceptance" WHERE "userId" = ${userId}`);
    
    // 2. Insertamos el nuevo registro limpio
    await db.insert(userTermsAcceptance).values({ 
      userId, 
      ipAddress: ipAddress || null 
    });
    console.log(`✅ [TÉRMINOS] Guardado limpio asegurado para: ${userId}`);
  } catch (error: any) {
    console.error("❌ [TÉRMINOS] EL VERRACO ERROR ES:", error.message);
  }
};

// --------------------------------------------------------
// 🛠️ DISPOSITIVOS: UPSERT Y REPORTE DE ERROR REAL
// --------------------------------------------------------
const upsertDeviceToken = async (userId: string, pushToken?: string, deviceType?: string) => {
  console.log(`🔍 [DEBUG DEVICES] Entrando. Token recibido: ${pushToken}`);

  if (!pushToken || typeof pushToken !== 'string' || pushToken.trim() === '') {
    console.log("⚠️ [DEBUG DEVICES] Token nulo o vacío.");
    return;
  }
  
  const tokenStr = pushToken.trim();
  const deviceStr = deviceType || 'unknown';

  try {
    // IMPORTANTE: Esto solo funciona si en pgAdmin corregiste "expo_push_token" y le pusiste la restricción UNIQUE
    await db.insert(userDevices)
      .values({
        userId: userId,
        expoPushToken: tokenStr,
        deviceType: deviceStr,
      })
      .onConflictDoUpdate({
        target: userDevices.expoPushToken, // Si el token ya existe en la tabla...
        set: { userId: userId, deviceType: deviceStr } // ...solo le actualizamos el dueño.
      });
      
    console.log(`✅ [DEBUG DEVICES] Dispositivo guardado en BD.`);
  } catch (error: any) {
    // Si falla, ESTO NOS DIRÁ EXACTAMENTE POR QUÉ RAILWAY LO RECHAZA
    console.error("❌ [DEBUG DEVICES] EL VERRACO ERROR ES:", error.message);
  }
};

// --------------------------------------------------------
// 1. REGISTRO DE USUARIO CLÁSICO Y COMPLETAR PERFIL
// --------------------------------------------------------
export const registerUser = async (data: any, imageUrl: string | null, reqIp?: string) => {
  try {
    const existingUsers = await db.select().from(users).where(eq(users.email, data.email));
    
    let stateObj = undefined;
    if (data.zip && data.zip.length === 5) {
      try {
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${data.zip}`);
        if (zipResponse.ok) {
          const zipInfo = await zipResponse.json();
          stateObj = zipInfo.places[0]['state abbreviation']; 
        }
      } catch (err) {}
    }

    const ipAddress = sanitizeText(reqIp) || null;

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      
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

         await ensureTermsAccepted(updatedUser.id, ipAddress);
         await upsertDeviceToken(updatedUser.id, data.pushToken, data.deviceType);

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

    await ensureTermsAccepted(newUser.id, ipAddress);
    await upsertDeviceToken(newUser.id, data.pushToken, data.deviceType);

    return newUser;
  } catch (error: any) {
    throw new Error(error.message); 
  }
};

// --------------------------------------------------------
// 2. 🔍 CONSULTA DE USUARIO (URL Pública)
// --------------------------------------------------------
export const getUser = async (idOrEmail: string) => {
  try {
    const isEmail = idOrEmail.includes('@');
    const query = isEmail ? sql`${users.email}::text = ${idOrEmail}::text` : sql`${users.id}::text = ${idOrEmail}::text`;

    const rows = await db.select().from(users).where(query);
    if (!rows || rows.length === 0) return null;

    const user = rows[0];
    let publicImageUrl = user.imageUrl;

    if (user.imageUrl && !user.imageUrl.startsWith('http')) {
      const rutaArchivo = user.imageUrl.startsWith('users/') ? user.imageUrl : `users/${user.imageUrl}`;
      const { data } = supabase.storage.from(NOMBRE_BUCKET).getPublicUrl(rutaArchivo);
      if (data && data.publicUrl) { 
        publicImageUrl = data.publicUrl; 
      }
    }

    return { ...user, imageUrl: publicImageUrl };
  } catch (error: any) {
    throw new Error(`Error al consultar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 3. 🔄 ACTUALIZACIÓN DE USUARIO 
// --------------------------------------------------------
export const updateUser = async (idOrEmail: string, data: any, newImageUri: string | null) => {
  try {
    const isEmail = idOrEmail.includes('@');
    const query = isEmail ? eq(users.email, idOrEmail) : eq(users.id, idOrEmail);

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
          updateData.city = zipInfo.places[0]['place name']; 
          updateData.state = zipInfo.places[0]['state abbreviation']; 
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
      metadata: { reason: "El usuario actualizó su información", previousState }
    });
    
    const finalUser = updatedRows[0];
    let publicImageUrl = finalUser.imageUrl;

    if (finalUser.imageUrl && !finalUser.imageUrl.startsWith('http')) {
      const rutaArchivo = finalUser.imageUrl.startsWith('users/') ? finalUser.imageUrl : `users/${finalUser.imageUrl}`;
      const { data: publicData } = supabase.storage.from(NOMBRE_BUCKET).getPublicUrl(rutaArchivo);
      if (publicData && publicData.publicUrl) { 
        publicImageUrl = publicData.publicUrl; 
      }
    }

    return { ...finalUser, imageUrl: publicImageUrl };
  } catch (error: any) {
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 4. 🌐 AUTENTICACIÓN CENTRALIZADA
// --------------------------------------------------------
export const authenticateUser = async (credentials: { 
  idToken?: string; 
  email?: string; 
  password?: string; 
  firstName?: string; 
  lastName?: string;  
  isGoogle: boolean; 
  isApple?: boolean; 
  pushToken?: string;  
  deviceType?: string; 
}) => {
  try {
    let email = credentials.email;
    let firstName = credentials.firstName || "";
    let lastName = credentials.lastName || "";

    if (credentials.isGoogle && credentials.idToken) {
      const ticket = await googleClient.verifyIdToken({ idToken: credentials.idToken });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("Token de Google inválido");
      email = payload.email;
      if (!firstName) firstName = payload.given_name || "";
      if (!lastName) lastName = payload.family_name || "";
    }

    if (credentials.isApple && credentials.idToken) {
      const decoded: any = jwt.decode(credentials.idToken);
      if (!decoded || (!decoded.email && !decoded.sub)) {
        throw new Error("Token de Apple inválido");
      }
      email = decoded.email || `apple_${decoded.sub}@viviendoenusa.app`;
      
      if (!firstName && credentials.firstName) {
        firstName = credentials.firstName;
      }
      if (!lastName && credentials.lastName) {
        lastName = credentials.lastName;
      }
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
    } else {
      const currentName = user.name;
      const isGenericName = !currentName || currentName === "Usuario" || currentName === "Apple" || currentName === "Google";
      
      if (isGenericName && (firstName || lastName)) {
        const [updatedUser] = await db.update(users).set({
          name: capitalizeName(firstName) || user.name,
          lastName: capitalizeName(lastName) || user.lastName,
        }).where(eq(users.id, user.id)).returning();
        user = updatedUser;
      }
    }

    const currentAttempts = user.failedLoginAttempts ?? 0;

    if (user.isLocked || currentAttempts >= 5) {
      throw new Error("Tu cuenta ha sido bloqueada. Restablécela.");
    }

    if (!credentials.isGoogle && !credentials.isApple) {
      if (!user.password) throw new Error(genericAuthError);
      const isMatch = await bcrypt.compare(credentials.password || '', user.password);
      
      if (!isMatch) {
        const attempts = currentAttempts + 1;
        const isLocked = attempts >= 5; 
        await db.update(users).set({ failedLoginAttempts: attempts, isLocked }).where(eq(users.id, user.id));
        if (isLocked) throw new Error("Tu cuenta ha sido bloqueada.");
        throw new Error(genericAuthError);
      }
    }

    if (currentAttempts > 0 || user.isLocked) {
      await db.update(users).set({ failedLoginAttempts: 0, isLocked: false }).where(eq(users.id, user.id));
    }

    const needsProfile = !user.phone || !user.zip;
    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const token = jwt.sign({ id: user.id, email: user.email }, baseSecret, { expiresIn: '7d' });

    await ensureTermsAccepted(user.id);
    await upsertDeviceToken(user.id, credentials.pushToken, credentials.deviceType);

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
    throw new Error(error.message);
  }
};

// --------------------------------------------------------
// 5. 📧 ENVÍO DE CORREO PARA RECUPERAR CONTRASEÑA
// --------------------------------------------------------
export const sendPasswordResetEmail = async (email: string) => {
  try {
    const rows = await db.select().from(users).where(eq(users.email, email));
    const user = rows[0];

    if (!user) throw new Error("No existe una cuenta con este correo.");
    if (!user.password) throw new Error("Cuenta externa. Inicia sesión con Google o Apple.");

    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const secret = baseSecret + user.password;
    const resetToken = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });
    const resetLink = `https://viviendoenusa.app/ResetPassword?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
        <h2>Recuperación de Contraseña</h2>
        <p>Hola <strong>${user.name}</strong>, hemos recibido una solicitud para restablecer tu contraseña.</p>
        <a href="${resetLink}" style="padding: 14px 28px; background-color: #FF5F6D; color: white; text-decoration: none; border-radius: 25px;">Restablecer Contraseña</a>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: 'Viviendo en USA <noreply@viviendoenusa.app>',
      to: [user.email as string],
      subject: 'Recuperación de Contraseña',
      html: htmlContent
    });

    if (error) throw new Error(error.message);
    return { message: "Correo enviado con éxito." };
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
    if (!decodedPayload || !decodedPayload.id) throw new Error("Token incorrecto.");

    const rows = await db.select().from(users).where(eq(users.id, decodedPayload.id));
    const user = rows[0];
    if (!user) throw new Error("Usuario no encontrado.");

    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const secret = baseSecret + user.password;
    const decoded: any = jwt.verify(token, secret);
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.update(users).set({ password: hashedPassword, failedLoginAttempts: 0, isLocked: false }).where(eq(users.id, decoded.id));

    res.status(200).json({ message: "Contraseña actualizada." });
  } catch (error: any) {
    res.status(400).json({ error: "Enlace inválido o expirado." });
  }
};

// --------------------------------------------------------
// 7. 🔍 OBTENER PERFIL DEL USUARIO 
// --------------------------------------------------------
export const getMiPerfil = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id; 
    const userProfile = await db.select().from(users).where(eq(users.id, userId));
    if (userProfile.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
    
    const user = userProfile[0];
    let publicImageUrl = user.imageUrl;

    if (user.imageUrl && !user.imageUrl.startsWith('http')) {
      const rutaArchivo = user.imageUrl.startsWith('users/') ? user.imageUrl : `users/${user.imageUrl}`;
      const { data } = supabase.storage.from(NOMBRE_BUCKET).getPublicUrl(rutaArchivo);
      if (data && data.publicUrl) { 
        publicImageUrl = data.publicUrl; 
      }
    }

    return res.status(200).json({ ...user, imageUrl: publicImageUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el perfil.' });
  }
};

// --------------------------------------------------------
// 8. 📱 GUARDAR TOKEN PUSH DESDE LA APP
// --------------------------------------------------------
export const saveDeviceToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token, deviceType } = req.body;

    if (!userId) return res.status(401).json({ error: "No autorizado." });
    if (!token) return res.status(400).json({ error: "El token de notificaciones es obligatorio." });

    await upsertDeviceToken(userId, token, deviceType);

    return res.status(200).json({ message: "Dispositivo registrado." });
  } catch (error: any) {
    return res.status(500).json({ error: `Error interno: ${error.message}` });
  }
};

// --------------------------------------------------------
// 9. 🗑️ ELIMINAR CUENTA
// --------------------------------------------------------
export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "No autorizado." });

    await db.delete(userDevices).where(eq(userDevices.userId, userId));
    await db.update(users).set({
      name: "Usuario",
      lastName: "Anónimo",
      email: `deleted_${userId}@viviendoenusa.app`,
      phone: null, zip: null, imageUrl: null, estate: null, password: null,
      isLocked: true, updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return res.status(200).json({ success: true, message: "Cuenta dada de baja." });
  } catch (error: any) {
    return res.status(500).json({ error: `Error: ${error.message}` });
  }
};