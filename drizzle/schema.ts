import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Usuarios de la plataforma (admin = dueño, user = cliente de la plataforma)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Multi-tenant: si es cliente de la plataforma, quién lo creó
  createdByUserId: int("createdByUserId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Configuración del negocio por usuario (admin y clientes de la plataforma)
 */
export const vendorSettings = mysqlTable("vendor_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 255 }),
  businessEmail: varchar("businessEmail", { length: 320 }),
  businessPhone: varchar("businessPhone", { length: 32 }),
  logoUrl: text("logoUrl"),
  currency: varchar("currency", { length: 8 }).default("MXN").notNull(),
  // Stripe
  stripeAccountId: varchar("stripeAccountId", { length: 128 }),
  stripeOnboarded: mysqlEnum("stripeOnboarded", ["pending", "complete", "restricted"]).default("pending").notNull(),
  // Comisión que cobra la plataforma a este usuario (% por transacción)
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("7.00").notNull(),
  // Tipo de cambio USD→MXN configurable (0 = usar tipo de cambio real de Stripe)
  usdExchangeRate: decimal("usdExchangeRate", { precision: 8, scale: 4 }).default("0").notNull(),
  // Opciones de verificación de identidad disponibles para este cliente
  otpEnabled: boolean("otpEnabled").default(false).notNull(),
  selfieEnabled: boolean("selfieEnabled").default(false).notNull(),
  // Texto de protección contra contracargos (aparece en página de pago)
  chargebackText: text("chargebackText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorSettings = typeof vendorSettings.$inferSelect;
export type InsertVendorSettings = typeof vendorSettings.$inferInsert;

/**
 * Cuentas de clientes de la plataforma (creadas por el admin)
 */
export const platformClients = mysqlTable("platform_clients", {
  id: int("id").autoincrement().primaryKey(),
  // El admin que creó esta cuenta
  adminUserId: int("adminUserId").notNull(),
  // El usuario de la plataforma (puede ser null si aún no ha iniciado sesión)
  userId: int("userId"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  businessName: varchar("businessName", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  // Comisión personalizada (null = usar la del admin)
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["active", "suspended", "pending"]).default("pending").notNull(),
  // Contraseña temporal para primer acceso
  tempPassword: varchar("tempPassword", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformClient = typeof platformClients.$inferSelect;
export type InsertPlatformClient = typeof platformClients.$inferInsert;

/**
 * Enlaces de pago generados
 */
export const paymentLinks = mysqlTable("payment_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("MXN").notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "expired", "cancelled"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt"),
  paidAt: timestamp("paidAt"),
  // Tipo de cambio USD/MXN al momento de crear el enlace (0 = no mostrar equivalente)
  usdExchangeRate: decimal("usdExchangeRate", { precision: 8, scale: 4 }).default("0").notNull(),
  // Comisión aplicada a este enlace
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0").notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  // Verificación de identidad requerida
  requireOtp: boolean("requireOtp").default(false).notNull(),
  requireSelfie: boolean("requireSelfie").default(false).notNull(),
  // Texto de protección contracargos
  chargebackProtectionText: text("chargebackProtectionText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type InsertPaymentLink = typeof paymentLinks.$inferInsert;

/**
 * Transacciones de pago procesadas
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  paymentLinkId: int("paymentLinkId").notNull(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  stripeChargeId: varchar("stripeChargeId", { length: 128 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("MXN").notNull(),
  // Comisión de la plataforma
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0").notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  netAmount: decimal("netAmount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "succeeded", "failed", "refunded"]).default("pending").notNull(),
  // Datos del pagador
  payerName: varchar("payerName", { length: 255 }),
  payerEmail: varchar("payerEmail", { length: 320 }),
  payerPhone: varchar("payerPhone", { length: 32 }),
  // Datos de la tarjeta (solo últimos 4 dígitos)
  cardLast4: varchar("cardLast4", { length: 4 }),
  cardBrand: varchar("cardBrand", { length: 32 }),
  // Verificación de identidad
  otpVerified: boolean("otpVerified").default(false).notNull(),
  selfieVerified: boolean("selfieVerified").default(false).notNull(),
  selfieUrl: text("selfieUrl"),
  faceMatchScore: decimal("faceMatchScore", { precision: 5, scale: 2 }),
  // IP y dispositivo para auditoría
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  errorMessage: text("errorMessage"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Verificaciones OTP para pagos
 */
export const otpVerifications = mysqlTable("otp_verifications", {
  id: int("id").autoincrement().primaryKey(),
  paymentLinkToken: varchar("paymentLinkToken", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  code: varchar("code", { length: 8 }).notNull(),
  verified: boolean("verified").default(false).notNull(),
  attempts: int("attempts").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;
