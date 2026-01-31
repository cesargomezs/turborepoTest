import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Asegúrate de incluir 'src/' si ahí es donde vive el archivo
  schema: "./src/schema.ts", 
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Usamos la URL que ya probamos que funciona
    url: process.env.DATABASE_URL!,
  },
});