import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:PIRAKRspAbsLNRBFixQHibbSwySlLxvR@mainline.proxy.rlwy.net:41428/railway";

if (!connectionString) {
  throw new Error("❌ DATABASE_URL no está definida en el proceso de Node");
}

// Inicializamos el cliente de Postgres
const client = postgres(connectionString);

// Inicializamos Drizzle y le pasamos el esquema (útil para queries relacionales)
export const db = drizzle(client, { schema });

// Exportamos todo el esquema para que tu backend pueda importar las tablas directamente
export * from "./schema.js";