import { db } from "../../../../packages/db/src"; // Ajusta la ruta si es necesario
import { users } from "../../../../packages/db/src/schema";
import { eq, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images';

// --------------------------------------------------------
// 1. REGISTRO DE USUARIO
// --------------------------------------------------------
export const registerUser = async (data: any, imageUrl: string | null) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const [newUser] = await db.insert(users).values({
      name: data.name,
      lastName: data.lastName,     // 🚀 Añadido
      email: data.email,
      phone: data.phone,           // 🚀 Añadido
      zip: data.zip,               // 🚀 Añadido
      birth: data.birth,           // 🚀 Añadido
      password: hashedPassword, 
      imageUrl: imageUrl, // Ya viene el nombre final desde el endpoint optimizado
      typeDetail: data.typeDetail || 'User'
    }).returning();

    return newUser;
  } catch (error) {
    throw new Error("Error en registro: " + error);
  }
};

// --------------------------------------------------------
// 2. 🔍 CONSULTA DE USUARIO
// --------------------------------------------------------
export const getUser = async (id: string) => {
  try {
    // Usamos el CAST (::text) para evitar problemas de tipos UUID vs String
    const rows = await db
      .select()
      .from(users)
      .where(sql`${users.id}::text = ${id}::text`);
      
    if (!rows || rows.length === 0) return null;

    const user = rows[0];
    let signedImageUrl = user.imageUrl;

    if (user.imageUrl && !user.imageUrl.startsWith('http')) {
      const rutaArchivo = user.imageUrl.startsWith('users/') 
          ? user.imageUrl 
          : `users/${user.imageUrl}`;
          
      const { data } = await supabase.storage
          .from(NOMBRE_BUCKET)
          .createSignedUrl(rutaArchivo, 3600);
          
      if (data) {
        signedImageUrl = data.signedUrl;
      }
    }

    return {
      ...user,
      imageUrl: signedImageUrl
    };
  } catch (error: any) {
    console.error("Error en getUserById:", error);
    throw new Error(`Error al consultar el usuario: ${error.message}`);
  }
};

// --------------------------------------------------------
// 3. 🔄 ACTUALIZACIÓN DE USUARIO
// --------------------------------------------------------
export const updateUser = async (id: string, data: any, newImageUri: string | null) => {
  try {
    const [existingUser] = await db.select().from(users).where(eq(users.id, id));
    const updateData: any = { ...data };

    // 🚀 Lógica de Password
    if (data.password && data.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    } else {
      delete updateData.password; 
    }

    // 🚀 Lógica de Imagen
    if (newImageUri && typeof newImageUri === 'string') {
      if (existingUser?.imageUrl) {
        const oldImagePath = existingUser.imageUrl.includes('users/') 
          ? existingUser.imageUrl 
          : `users/${existingUser.imageUrl}`;
          
        await supabase.storage.from(NOMBRE_BUCKET).remove([oldImagePath]);
      }
      updateData.imageUrl = newImageUri; 
    }

    const updatedRows = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return updatedRows[0];
  } catch (error: any) {
    console.error("Error en updateUser:", error);
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }
};