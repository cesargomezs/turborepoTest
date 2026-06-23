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
    //review: text("review"),
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
    description: text("description"),
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
    locationDon: text("location_don"),    
    imageUrl: text("image_url"),
    phone: text("phone"),
    zip: text("zip"),
    estate: text("estate"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
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
    categoryId: text("category_id"),
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
    categoryId: text("categoryId"),
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
    companyId: uuid('company_id').references(() => companies.id), // Nuevo campo opcional
    createdAt: timestamp("created_at").defaultNow(),
    approved: boolean("approved").default(false),
  });

   // 12. TABLA: JOBS
  export const notifications = pgTable("notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull(), 
    referenceId: text("reference_id"), 
    isRead: boolean("is_read").default(false).notNull(),
    // 🚀 LA CLAVE: Cuándo debe mostrarse en la App
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    visibleAt: timestamp("visible_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // 13. 💰 TABLA MAESTRA DE PAGOS MANUALES (Y FUTURO STRIPE)
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 🚀 REFERENCIA POLIMÓRFICA
  entityType: text("entity_type").notNull(), // Ej: 'lawyer', 'store', 'job', 'event'
  entityId: uuid("entity_id").notNull(), // El ID exacto de la tabla correspondiente  
  // Usuario que realiza el pago
  userId: uuid("user_id").references(() => users.id),
 // Detalles del Pago
  referenceCode: text("reference_code").notNull().unique(), // unique() bloquea duplicados a nivel BD
  paymentMethod: text("payment_method").notNull(), // 'Zelle', 'Venmo', 'Stripe'
  amount: numeric("amount", { precision: 10, scale: 2 }).default("0.00"),
  durationDays: integer("duration_days").default(30).notNull(), 
  status: text("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  timepost_end: timestamp("timepost_end", { mode: "date" }).defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});
  
  // 14. 💰 TABLA MAESTRA DE TARIFAS POR REFERENCIA (Y FUTURO STRIPE)
/*export const tariffs = pgTable('tariffs', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceId: text("reference_id"),  // Ej: 'lawyer', 'event', 'entrepreneur'
  planType: text('plan_type').notNull(),     // Ej: 'monthly', 'annual', 'one_time'
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Ej: 50.00, 100.00
  description: text('description'),          // Ej: 'Suscripción Anual para Eventos'
  isActive: boolean('is_active').default(true), // Para apagar planes viejos sin borrarlos
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});*/
export const tariffs = pgTable("tariffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceId: text("reference_id"),
  planType: text("plan_type"), 
  description: text('description'),          // Ej: 'Suscripción Anual para Eventos'
  //🚀 PRECIOS CORREGIDOS: Ahora la BD sabe que son números reales
  priceCoupon: numeric("coupon", { precision: 10, scale: 2 }).default("0.00"),
  priceBasic: numeric("price_basic", { precision: 10, scale: 2 }).default("50.00"), 
  pricePremium: numeric("price_premium", { precision: 10, scale: 2 }).default("99.00"), 
  priceUnlimited: numeric("price_unlimited", { precision: 10, scale: 2 }).default("149.00"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});


 // 15. TABLA: COMPANIES (Empresas de servicios, tiendas, etc. que pueden pagar por destacar su perfil)

 export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: "cascade" }).notNull(),
  // Información pública de la empresa
  name: text('name').notNull(),
  ein: text('ein'), 
  phoneCode: text('phone_code').default('+1'),
  phone: text('phone').notNull(),
  contactMethod: text('contact_method').default('whatsapp'), // 'whatsapp' o 'call'
  email: text('email'),
  website: text('website'),
  logoUrl: text('logo_url'),
  // 🚀 Control de Suscripción (SaaS)
  isVerified: boolean('is_verified').default(false), // Check azul
  premiumPlan: text('premium_plan').default('free'), // 'free', 'basic', 'unlimited'
  status: text('status').default('pending'), // 'pending', 'approved', 'expired'
  timepostEnd: timestamp('timepost_end'), // Fecha en la que caduca la suscripción
  // Auditoría
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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