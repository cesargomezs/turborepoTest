
import { pgTable, uuid,text, doublePrecision,timestamp, integer,pgEnum} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const statusEnum = pgEnum("lawyers_status", ["pending", "approved", "rejected"]);

export const users = pgTable("Users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});


export const lawyers = pgTable("Services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  rating: doublePrecision("rating").notNull().default(0.0),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  phone: text("phone").notNull(),
  image: text("image").notNull(),
  status: statusEnum("status").notNull().default("pending"),
});


export const reviews = pgTable("Reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  comment: text("comment").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  
  // Llaves foráneas con integridad referencial (on delete cascade)
  serviceId: uuid("lawyers_id").notNull().references(() => lawyers.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});


// ==========================================
// RELACIONES (Para hacer JOINs automáticos en Drizzle)
// ==========================================

export const lawyersRelations = relations(lawyers, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  lawyers: one(lawyers, {
    fields: [reviews.serviceId],
    references: [lawyers.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  reviews: many(reviews),
}));