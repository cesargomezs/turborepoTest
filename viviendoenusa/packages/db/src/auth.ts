import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export const validateUserLogin = async (emailInput: string, passwordInput: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, emailInput.toLowerCase()))
    .limit(1);

  if (!user) return { success: false, message: "Usuario no encontrado" };
  if (user.password !== passwordInput) return { success: false, message: "Contraseña incorrecta" };

  return { success: true, user };
};