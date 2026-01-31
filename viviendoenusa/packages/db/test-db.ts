// test-db.ts
import { users } from "./src/schema";
import { db } from "./src/index";

async function runTest() {
  console.log("--- VUSA DATABASE CHECK ---");
  // Imprimimos la URL (ocultando el password) para verificar que se leyó
  const url = process.env.DATABASE_URL || "NO DEFINIDA";
  console.log("🔗 URL detectada:", url.replace(/:.*@/, ":****@"));

  try {
    const result = await db.select().from(users).limit(1);
    console.log("✅ Conexión exitosa a la tabla 'users'");
    console.log("Resultado:", result);
  } catch (err) {
    console.error("❌ Error de Query:", err);
  }
  process.exit();
}

runTest();