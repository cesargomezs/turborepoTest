import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const users = pgTable("Users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});