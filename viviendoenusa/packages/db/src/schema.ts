import { 
    pgTable, 
    uuid, 
    text, 
    timestamp, 
    date, 
    boolean, 
    integer, 
    doublePrecision, 
    numeric, 
    type AnyPgColumn 
  } from "drizzle-orm/pg-core";

  import { relations } from "drizzle-orm";
  
  // ==========================================
  // 1. DEFINICIÓN DE LAS 13 TABLAS
  // ==========================================
  
  // 0. TABLA: USERS
  export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique(),
    name: text("name"),
    birth: date("birth").notNull().defaultNow(), // Corregido a date según tu SQL original
    phone: text("phone"),
    createdAt: timestamp("created_at").defaultNow(),
    typeDetail: text("type_detail"),
    statusUsers: boolean("status_users").default(true),
    password: text("password"),
    zip: text("zip"),
    estate: text("estate"),
    // SOLUCIÓN AL TS7022: Se añade : AnyPgColumn para romper el bucle infinito de tipos
    roleId: uuid("role_id").references((): AnyPgColumn => typeDetail.id, { onDelete: "cascade" }),
  });
  
  // 1. TABLA: TYPE DETAIL
  export const typeDetail = pgTable("type_detail", {
    id: uuid("id").primaryKey().defaultRandom(),
    typeCode: text("type_code"),
    descriptionType: text("description_type"),
    // SOLUCIÓN AL TS7022: Se añade : AnyPgColumn aquí también por seguridad
    userId: uuid("user_id").notNull().references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    statusType: boolean("status_type").default(true),
  });
  
  // 2. TABLA: RATING
  export const rating = pgTable("rating", {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceId: uuid("reference_id"),
    typeEntry: text("type_entry"),
    rating: numeric("rating", { precision: 3, scale: 2 }), // Soporta puntuaciones decimales (ej: 4.50)
    review: text("review"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  // 3. TABLA: COMMUNITY
  export const community = pgTable("community", {
    id: uuid("id").primaryKey().defaultRandom(),
    textContent: text("text_content"),
    imageUrl: text("image_url"),
    tag: text("tag"),
    subCategory: text("sub_category"),
    zip: text("zip"),
    estate: text("estate"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  // 4. TABLA: REVIEWS
  export const reviews = pgTable("reviews", {
    id: uuid("id").primaryKey().defaultRandom(),
    typeDetailId: uuid("type_detail_id").references(() => typeDetail.id, { onDelete: "set null" }),
    relationshipId: uuid("relationship_id"), 
    comment: text("comment"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  // 5. TABLA: LAWYERS
  export const lawyers = pgTable("lawyers", {
    id: uuid("id").primaryKey().defaultRandom(),
    nameLawy: text("name_lawy").notNull(),
    area: text("area"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    imageUrl: text("image_url"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    timepostEnd: timestamp("timepost_end").defaultNow(),
    zip: text("zip"), // Cambiado a text para evitar problemas de casteo con numeric
    estate: text("estate"),
    approved: boolean("approved").default(false),
  });
  
  // 6. TABLA: LIKES
  export const countlikes = pgTable("countlikes", {
    id: uuid("id").primaryKey().defaultRandom(),
    relationshipId: uuid("relationship_id"),
    likes: integer("likes").default(0),
    dislikes: integer("dislikes").default(0),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  // 7. TABLA: DONATIONS 
  export const donations = pgTable("donations", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    categoryIdx: integer("category_idx").default(0),
    statusId: uuid("status_id").references(() => typeDetail.id, { onDelete: "set null" }),
    descriptionDon: text("description_don"),
    imageDon: text("image_don"),
    locationDon: text("location_don"),
    phone: text("phone"),
    zip: text("zip"),
    estate: text("estate"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    contactMethod: text("contact_method"),
  });
  
  // 8. TABLA: EVENTS
  export const events = pgTable("events", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    categoryIdx: integer("category_idx").default(0),
    dateEvent: date("date_event").notNull().defaultNow(), // Corregido a date según tu SQL original
    timeStart: text("time_start"),
    timeEnd: text("time_end"),
    descriptionEven: text("description_even"),
    imageEven: text("image_even"),
    locationEven: text("location_even"),
    zip: text("zip"), 
    estate: text("estate"),
    phone: text("phone"),
    contactMethod: text("contact_method"),
    statusId: uuid("status_id").references(() => typeDetail.id, { onDelete: "set null" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    timepostEnd: timestamp("timepost_end").defaultNow(),
    approved: boolean("approved").default(false),
  });
  
  // 9. TABLA: STORES
  export const stores = pgTable("stores", {
    id: uuid("id").primaryKey().defaultRandom(),
    nameStores: text("name_stores").notNull(),
    descriptionStores: text("description_stores"),
    addressStores: text("address_stores"),
    categoryId: uuid("category_id").references(() => typeDetail.id, { onDelete: "set null" }),
    zip: text("zip"),
    estate: text("estate"),
    imageStores: text("image_stores"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    statusId: uuid("status_id").references(() => typeDetail.id, { onDelete: "set null" }),
    timepostEnd: timestamp("timepost_end").defaultNow(),
    approved: boolean("approved").default(false),
  });
  
  // 10. TABLA: ENTREPRENEURSHIP
  export const entrepreneurship = pgTable("entrepreneurship", {
    id: uuid("id").primaryKey().defaultRandom(),
    nameEntrepren: text("name_entrepren").notNull(),
    categoryId: uuid("category_id").references(() => typeDetail.id, { onDelete: "set null" }),
    descriptionEntrepren: text("description_entrepren"),
    phone: text("phone"),
    verified: boolean("verified").default(false),
    promo: text("promo"),
    imageEntrepren: text("image_entrepren"),
    saved: boolean("saved").default(false),
    contactMethod: text("contact_method"),
    zip: text("zip"),
    estate: text("estate"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    
  });
  
  // 11. TABLA: SUPPORT
  export const support = pgTable("support", {
    id: uuid("id").primaryKey().defaultRandom(),
    nameSupp: text("name_supp").notNull(),
    descriptionSupp: text("description_supp"),
    addressSupp: text("address_supp"),
    categoryId: integer("category_id"),
    zip: text("zip"),
    estate: text("estate"),
    imageSupp: text("image_supp"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    timepostEnd: timestamp("timepost_end").defaultNow(),
    approved: boolean("approved").default(false),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  // 12. TABLA: JOBS
  export const jobs = pgTable("jobs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userNameId: text("user_name_id"),
    title: text("title"),
    company: text("company"),
    category: text("category"),
    stateCountry: text("state_country"),
    city: text("city"),
    zip: text("zip"),
    estate: text("estate"),
    contactMethod: boolean("contact_method"),
    phoneCode: text("phone_code"),
    phone: text("phone"),
    shifts: text("shifts"), 
    salaryMin: text("salary_min"),
    salaryMax: text("salary_max"),
    descriptionJob: text("description_job"),
    statusJob: uuid("status_job"),
    isOpen: boolean("is_open").default(true),
    nameJobs: text("name_jobs").notNull(),
    addressJob: text("address_job"),
    categoryId: integer("category_id"),
    imageRute: text("image_rute"),
    rating: doublePrecision("rating").default(0.0),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    timepostEnd: timestamp("timepost_end").defaultNow(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    approved: boolean("approved").default(false),
  });
  
  // ==========================================
  // 2. CONFIGURACIÓN DE RELACIONES (Drizzle Relations)
  // ==========================================
  
  export const usersRelations = relations(users, ({ many }) => ({
    typeDetails: many(typeDetail),
    ratings: many(rating),
    communities: many(community),
    reviews: many(reviews),
    lawyers: many(lawyers),
    donations: many(donations),
    events: many(events),
    stores: many(stores),
    entrepreneurships: many(entrepreneurship),
    supports: many(support),
    jobs: many(jobs),
  }));
  
  export const typeDetailRelations = relations(typeDetail, ({ one, many }) => ({
    user: one(users, { fields: [typeDetail.userId], references: [users.id] }),
    usersWithThisRole: many(users),
  }));
  
  export const communityRelations = relations(community, ({ one, many }) => ({
    user: one(users, { fields: [community.userId], references: [users.id] }),
    reviews: many(reviews),
    likes: many(countlikes),
  }));
  
  export const reviewsRelations = relations(reviews, ({ one }) => ({
    user: one(users, { fields: [reviews.userId], references: [users.id] }),
    typeDetail: one(typeDetail, { fields: [reviews.typeDetailId], references: [typeDetail.id] }),
  }));