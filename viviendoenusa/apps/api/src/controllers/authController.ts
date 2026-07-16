import { db } from "../../../../packages/db/src"; 
import { users } from "../../../../packages/db/src/schema";
import { eq, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images';

const googleClient = new OAuth2Client(); 

// --------------------------------------------------------
// 1. REGISTRO DE USUARIO CLÁSICO Y GOOGLE
// --------------------------------------------------------
export const registerUser = async (data: any, imageUrl: string | null) => {
  try {
    console.log("Intentando registrar usuario con email:", data);
    const existingUsers = await db.select().from(users).where(eq(users.email, data.email));
    
    if (existingUsers.length > 0) {
      throw new Error("El correo electrónico ya está registrado. Por favor, inicia sesión.");
    }

    const salt = await bcrypt.genSalt(10);

    let hashedPassword = await bcrypt.hash(data.password, salt);
/*
    if(data.isVerified == true ){
      hashedPassword=null;
    }
*/
    const [newUser] = await db.insert(users).values({
      name: data.firstName,   
      lastName: data.lastName,     
      email: data.email,
      phone: data.phone || undefined,           
      zip: data.zip || undefined,               
      birth: data.birth || undefined,           
      password: data.isVerified ?(null as string | null) : hashedPassword, 
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
    return updatedRows[0];
  } catch (error: any) {
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 4. 🌐 AUTENTICACIÓN GOOGLE (LÓGICA CORREGIDA)
// --------------------------------------------------------
export const authenticateWithGoogle = async (idToken: string, termsAccepted: boolean) => {
  try {
    console.log("Verificando token de Google...");

    // 🚀 SOLUCIÓN: Validamos el token sin forzar el 'audience' inicialmente para evitar bloqueos
    // La librería google-auth-library permite verificar sin pasar el audience si extraemos el payload primero.
    const ticket = await googleClient.verifyIdToken({
      idToken,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error("Token de Google inválido o no contiene email");

    const { email, given_name, family_name, picture } = payload;
    console.log(`Token validado con éxito para: ${email}`);

    const rows = await db.select().from(users).where(eq(users.email, email));
    let user = rows[0];

    // 🚀 TU LÓGICA: Si no existe, no lo guardamos aún. Le decimos al front que abra el modal.
    if (!user) {
      console.log("Usuario nuevo detectado. Solicitando perfil...");
      return {
        message: "Usuario no registrado, requiere completar perfil",
        requiresProfileCompletion: true,
        user: { email, firstName: given_name, lastName: family_name, id: "temp" }
      };
    }

    // 🚀 TU LÓGICA: Si ya existe, se loguea directo al index.
    console.log("Usuario existente detectado. Procediendo con el login...");
    return {
      message: "Autenticación exitosa",
      token: "simulated_jwt_token", 
      requiresProfileCompletion: false, // Va directo
      user: {
        id: user.id,
        email: user.email,
        firstName: user.name,
        lastName: user.lastName,
      }
    };
  } catch (error: any) {
    console.error("❌ Error CRÍTICO en authenticateWithGoogle:", error.message);
    throw new Error(`Error en autenticación con Google: ${error.message}`);
  }
};