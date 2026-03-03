import {
  bigint,
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
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
  // superadmin = dueño de la plataforma (tú), admin = cliente de la plataforma, user = empleado del cliente
  role: mysqlEnum("role", ["user", "admin", "superadmin", "assistant", "associate"]).default("user").notNull(),
  // Rol específico para colaboradores (staff): asistente = contratos+pagos, operador = solo pagos
  staffRole: mysqlEnum("staffRole", ["asistente", "operador"]).default("operador"),
  // Estado de la cuenta: pending = esperando aprobación, active = aprobado, blocked = rechazado/bloqueado
  accountStatus: mysqlEnum("accountStatus", ["pending", "active", "blocked"]).default("pending").notNull(),
  // Multi-tenant: si es cliente de la plataforma, quién lo creó
  createdByUserId: int("createdByUserId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
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
  // Stripe Connect (para que el cliente reciba pagos en su propia cuenta)
  stripeConnectAccountId: varchar("stripeConnectAccountId", { length: 128 }),
  stripeConnectStatus: mysqlEnum("stripeConnectStatus", ["not_started", "pending", "active", "restricted", "disabled"]).default("not_started").notNull(),
  stripeConnectChargesEnabled: boolean("stripeConnectChargesEnabled").default(false).notNull(),
  stripeConnectPayoutsEnabled: boolean("stripeConnectPayoutsEnabled").default(false).notNull(),
  stripeConnectDetailsSubmitted: boolean("stripeConnectDetailsSubmitted").default(false).notNull(),
  stripeConnectOnboardedAt: timestamp("stripeConnectOnboardedAt"),
  // Stripe legacy
  stripeAccountId: varchar("stripeAccountId", { length: 128 }),
  stripeOnboarded: mysqlEnum("stripeOnboarded", ["pending", "complete", "restricted"]).default("pending").notNull(),
  // Comisión que cobra la plataforma a este usuario (% por transacción)
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("7.00").notNull(),
  // IVA configurable sobre la comisión de KobraPay (estrategia fiscal)
  ivaRate: decimal("ivaRate", { precision: 5, scale: 2 }).default("16.00").notNull(),
  ivaEnabled: boolean("ivaEnabled").default(true).notNull(),
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
  clientPhone: varchar("clientPhone", { length: 32 }),
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
  // Firma digital e identificación
  requireSignature: boolean("requireSignature").default(false).notNull(),
  requireIdUpload: boolean("requireIdUpload").default(false).notNull(),
  // Texto de protección contracargos
  chargebackProtectionText: text("chargebackProtectionText"),
  // MSI: meses sin intereses habilitados (JSON array: [3,6,9,12])
  msiOptions: text("msiOptions"),
  // Propina: habilitar propina en el pago
  tipEnabled: boolean("tipEnabled").default(false).notNull(),
  // Opciones de propina sugeridas (JSON array de porcentajes: [10,15,20] o null para solo monto manual)
  tipSuggestions: text("tipSuggestions"),
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
  // Firma digital e identificación
  signatureUrl: text("signatureUrl"),
  idDocumentUrl: text("idDocumentUrl"),
  // IP y dispositivo para auditoría
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  operationNumber: varchar("operationNumber", { length: 32 }),
  errorMessage: text("errorMessage"),
  metadata: text("metadata"),
  // MSI seleccionado por el pagador (null = pago de contado)
  msiMonths: int("msiMonths"),
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

/**
 * Registro de auditoría de accesos (quién hizo qué y cuándo)
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userEmail: varchar("userEmail", { length: 320 }),
  action: varchar("action", { length: 64 }).notNull(),
  resource: varchar("resource", { length: 255 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  statusCode: int("statusCode"),
  success: boolean("success").default(true).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Intentos de acceso fallidos (para bloqueo por brute force)
 */
export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }),
  attemptCount: int("attemptCount").default(0).notNull(),
  blockedUntil: timestamp("blockedUntil"),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

/**
 * Base de datos de clientes (pagadores que han realizado al menos un pago)
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  // El vendedor (usuario de la plataforma) al que pertenece este cliente
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  countryCode: varchar("countryCode", { length: 8 }).default("+52").notNull(),
  // Estadísticas
  totalPaid: decimal("totalPaid", { precision: 12, scale: 2 }).default("0").notNull(),
  totalTransactions: int("totalTransactions").default(0).notNull(),
  lastPaymentAt: timestamp("lastPaymentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Catálogo de productos del negocio (para POS e inventario)
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  // El vendedor (usuario de la plataforma) al que pertenece este producto
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 128 }),
  imageUrl: text("imageUrl"),
  // Control de stock (opcional — si trackStock=false, stock se ignora)
  trackStock: boolean("trackStock").default(false).notNull(),
  stock: int("stock").default(0).notNull(),
  lowStockAlert: int("lowStockAlert").default(5).notNull(),
  // Estado del producto
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Contratos digitales (solo visibles para super-admin y asistente)
 * Los clientes (negocios) nunca ven esta sección
 */
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  createdByUserId: int("createdByUserId").notNull(),
  // Datos del cliente/negocio
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 32 }),
  clientRfc: varchar("clientRfc", { length: 20 }),
  clientCurp: varchar("clientCurp", { length: 20 }),
  clientAddress: text("clientAddress"),
  businessName: varchar("businessName", { length: 255 }),
  clientIneNumber: varchar("clientIneNumber", { length: 50 }),
  // Título del contrato
  title: varchar("title", { length: 255 }),
  // Términos del contrato
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("6.00").notNull(),
  contractDurationMonths: int("contractDurationMonths").default(0).notNull(),
  includeExclusivityClause: boolean("includeExclusivityClause").default(false).notNull(),
  customTerms: text("customTerms"),
  // Estado: draft, sent, signed, archived
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  // Token único para que el cliente acceda al contrato
  signToken: varchar("signToken", { length: 128 }).unique(),
  signTokenExpiresAt: timestamp("signTokenExpiresAt"),
  // Firma digital del cliente
  signatureUrl: text("signatureUrl"),
  signedAt: timestamp("signedAt"),
  signedFromIp: varchar("signedFromIp", { length: 64 }),
  // Documentos del cliente (URLs en S3)
  ineUrl: text("ineUrl"),
  passportUrl: text("passportUrl"),
  addressProofUrl: text("addressProofUrl"),
  rfcDocUrl: text("rfcDocUrl"),
  curpDocUrl: text("curpDocUrl"),
  situacionFiscalUrl: text("situacionFiscalUrl"),
  situacionFiscalKey: text("situacionFiscalKey"),
  // Datos adicionales KYC del cliente
  razonSocial: varchar("razonSocial", { length: 255 }),
  representanteLegal: varchar("representanteLegal", { length: 255 }),
  rfcEmpresa: varchar("rfcEmpresa", { length: 20 }),
  // Firma digital del ADMIN/KobraPay
  adminSignatureUrl: text("adminSignatureUrl"),
  adminSignedAt: timestamp("adminSignedAt"),
  adminSignedByName: varchar("adminSignedByName", { length: 255 }),
  // Notas internas (solo el admin las ve)
  internalNotes: text("internalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

/**
 * Vendedores/Afiliados que refieren clientes a la plataforma
 */
export const salesAgents = mysqlTable("sales_agents", {
  id: int("id").autoincrement().primaryKey(),
  createdByUserId: int("createdByUserId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  // Comisión residual que gana el vendedor (%)
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0.50").notNull(),
  // Datos bancarios para pago de comisiones
  bankName: varchar("bankName", { length: 128 }),
  clabe: varchar("clabe", { length: 18 }),
  bankAccountHolder: varchar("bankAccountHolder", { length: 255 }),
  // Ciclo de pago: weekly o biweekly
  paymentCycle: varchar("paymentCycle", { length: 16 }).default("biweekly").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalesAgent = typeof salesAgents.$inferSelect;
export type InsertSalesAgent = typeof salesAgents.$inferInsert;

/**
 * Comisiones acumuladas de vendedores por transacción
 */
export const agentCommissions = mysqlTable("agent_commissions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  transactionId: int("transactionId").notNull(),
  clientUserId: int("clientUserId").notNull(),
  transactionAmount: decimal("transactionAmount", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 12, scale: 2 }).notNull(),
  // Estado: pending, paid
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  paymentReference: varchar("paymentReference", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgentCommission = typeof agentCommissions.$inferSelect;
export type InsertAgentCommission = typeof agentCommissions.$inferInsert;

/**
 * Relación entre vendedor y cliente referido
 */
export const agentReferrals = mysqlTable("agent_referrals", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  clientUserId: int("clientUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgentReferral = typeof agentReferrals.$inferSelect;

// ─── Expedientes de Clientes ──────────────────────────────────────────────────
// Un expediente se crea/actualiza automáticamente cada vez que un cliente paga.
// Agrupa toda la evidencia (selfie, firma, ID) y el historial de transacciones.
export const clientRecords = mysqlTable("client_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),          // vendedor dueño del expediente
  payerEmail: varchar("payerEmail", { length: 320 }).notNull(),
  payerName: varchar("payerName", { length: 255 }),
  payerPhone: varchar("payerPhone", { length: 32 }),
  // Evidencia más reciente
  latestSelfieUrl: text("latestSelfieUrl"),
  latestSignatureUrl: text("latestSignatureUrl"),
  latestIdDocumentUrl: text("latestIdDocumentUrl"),
  latestFaceMatchScore: decimal("latestFaceMatchScore", { precision: 5, scale: 2 }),
  selfieVerified: boolean("selfieVerified").default(false).notNull(),
  // Estadísticas
  totalTransactions: int("totalTransactions").default(0).notNull(),
  totalAmountPaid: decimal("totalAmountPaid", { precision: 14, scale: 2 }).default("0").notNull(),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
});
export type ClientRecord = typeof clientRecords.$inferSelect;
export type InsertClientRecord = typeof clientRecords.$inferInsert;
// Documentos adjuntos al contrato (INE, comprobante domicilio, RFC, CURP, etc.)
export const contractDocuments = mysqlTable("contract_documents", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  documentType: mysqlEnum("documentType", ["ine", "domicilio", "rfc", "curp", "pasaporte", "otro"]).notNull(),
  documentUrl: text("documentUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
export type ContractDocument = typeof contractDocuments.$inferSelect;
export type InsertContractDocument = typeof contractDocuments.$inferInsert;

// Perfil extendido del usuario (completado al registrarse en KobraPay)
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Datos personales
  fullName: varchar("fullName", { length: 255 }),
  birthDate: varchar("birthDate", { length: 16 }),   // YYYY-MM-DD
  curp: varchar("curp", { length: 18 }),
  rfc: varchar("rfc", { length: 13 }),
  phone: varchar("phone", { length: 32 }),
  // Datos del negocio
  businessName: varchar("businessName", { length: 255 }),
  businessType: varchar("businessType", { length: 128 }),
  // Foto de perfil
  avatarUrl: text("avatarUrl"),
  // Datos adicionales del negocio
  razonSocial: varchar("razonSocial", { length: 255 }),
  direccionFiscal: text("direccionFiscal"),
  codigoPostal: varchar("codigoPostal", { length: 10 }),
  ciudad: varchar("ciudad", { length: 128 }),
  estado: varchar("estado", { length: 64 }),
  sitioWeb: varchar("sitioWeb", { length: 255 }),
  // Datos bancarios (para recibir transferencias SPEI)
  clabe: varchar("clabe", { length: 18 }),
  banco: varchar("banco", { length: 128 }),
  titularCuenta: varchar("titularCuenta", { length: 255 }),
  rfcTitular: varchar("rfcTitular", { length: 13 }),
  // Documentos subidos (URLs en S3)
  ineUrl: text("ineUrl"),
  domicilioUrl: text("domicilioUrl"),
  actaConstitutiva: text("actaConstitutiva"),
  // Tipo de cuenta asignado por super-admin al aprobar: business, admin, employee, assistant
  accountType: varchar("accountType", { length: 32 }).default("business"),
  // JSON con permisos granulares asignados al aprobar
  permissions: text("permissions"),
  // Estado del perfil
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// *** CHARGEBACKS (Aclaraciones/Disputas) ***
export const chargebacks = mysqlTable("chargebacks", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  transactionId: int("transactionId").references(() => transactions.id),
  stripeDisputeId: varchar("stripeDisputeId", { length: 128 }),
  amount: int("amount").notNull(), // en centavos
  currency: varchar("currency", { length: 8 }).default("mxn").notNull(),
  reason: varchar("reason", { length: 128 }),
  reasonEs: varchar("reasonEs", { length: 255 }),
  status: varchar("status", { length: 32 }).default("open").notNull(), // open, under_review, won, lost, closed
  evidence: text("evidence"), // JSON con URLs de evidencia en S3
  notes: text("notes"),
  dueBy: timestamp("dueBy"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Chargeback = typeof chargebacks.$inferSelect;
export type InsertChargeback = typeof chargebacks.$inferInsert;

// *** INVOICES (Facturas CFDI) ***
export const invoices = mysqlTable("invoices", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  transactionId: int("transactionId").references(() => transactions.id),
  folio: varchar("folio", { length: 32 }).notNull(),
  uuid: varchar("uuid", { length: 64 }),
  emisorRfc: varchar("emisorRfc", { length: 13 }).notNull(),
  emisorNombre: varchar("emisorNombre", { length: 255 }).notNull(),
  receptorRfc: varchar("receptorRfc", { length: 13 }).notNull(),
  receptorNombre: varchar("receptorNombre", { length: 255 }).notNull(),
  receptorEmail: varchar("receptorEmail", { length: 255 }),
  conceptos: text("conceptos").notNull(), // JSON
  subtotal: int("subtotal").notNull(), // en centavos
  iva: int("iva").notNull(), // en centavos
  total: int("total").notNull(), // en centavos
  currency: varchar("currency", { length: 8 }).default("MXN").notNull(),
  status: varchar("status", { length: 32 }).default("draft").notNull(), // draft, issued, cancelled
  xmlUrl: text("xmlUrl"),
  pdfUrl: text("pdfUrl"),
  cancelledAt: timestamp("cancelledAt"),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// *** NOTIFICATIONS (Centro de Notificaciones del Super-Admin) ***
export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 512 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// *** EMPLOYEE RECORDS (Expedientes de Colaboradores) ***
export const employeeRecords = mysqlTable("employee_records", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  employeeNumber: varchar("employeeNumber", { length: 32 }), // Número de colaborador (automático o manual)
  fullName: varchar("fullName", { length: 255 }).notNull(),
  position: varchar("position", { length: 128 }),
  department: varchar("department", { length: 128 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  curp: varchar("curp", { length: 20 }),
  rfc: varchar("rfc", { length: 15 }),
  address: text("address"),
  birthDate: varchar("birthDate", { length: 16 }),  // YYYY-MM-DD
  startDate: timestamp("startDate"),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 512 }),
  notes: text("notes"),
  // Nómina
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }), // Salario diario en MXN
  dailyHours: decimal("dailyHours", { precision: 5, scale: 2 }).default("8.00"), // Horas de trabajo por día
  restDay: varchar("restDay", { length: 16 }).default("sunday"), // Día de descanso: monday-sunday
  overtimeEnabled: boolean("overtimeEnabled").default(false), // ¿Se pagan horas extras?
  overtimeRate: decimal("overtimeRate", { precision: 10, scale: 2 }), // Tarifa por hora extra en MXN
  paymentCycle: varchar("paymentCycle", { length: 16 }).default("biweekly"), // "weekly" | "biweekly" | "monthly"
  bankName: varchar("bankName", { length: 128 }),
  clabe: varchar("clabe", { length: 18 }),
  bankAccountHolder: varchar("bankAccountHolder", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmployeeRecord = typeof employeeRecords.$inferSelect;
export type InsertEmployeeRecord = typeof employeeRecords.$inferInsert;

// *** EMPLOYEE DOCUMENTS (Documentos del Expediente) ***
export const employeeDocuments = mysqlTable("employee_documents", {
  id: int("id").primaryKey().autoincrement(),
  employeeId: int("employeeId").notNull().references(() => employeeRecords.id),
  ownerId: int("ownerId").notNull().references(() => users.id),
  type: varchar("type", { length: 64 }).notNull(), // cv, ine, domicilio, referencia_laboral, referencia_personal, otro
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = typeof employeeDocuments.$inferInsert;

// *** SUBSCRIPTIONS (Cobros Recurrentes con Stripe Billing) ***
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  stripeProductId: varchar("stripeProductId", { length: 128 }),
  stripePriceId: varchar("stripePriceId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  amount: int("amount").notNull(), // en centavos MXN
  currency: varchar("currency", { length: 8 }).default("mxn").notNull(),
  interval: varchar("interval", { length: 32 }).notNull(), // day, week, month, year
  intervalCount: int("intervalCount").default(1).notNull(),
  customerEmail: varchar("customerEmail", { length: 255 }).notNull(),
  customerName: varchar("customerName", { length: 255 }),
  status: varchar("status", { length: 32 }).default("active").notNull(), // active, paused, canceled, past_due, incomplete
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// *** ATTENDANCE RECORDS (Reloj Checador) ***
export const attendanceRecords = mysqlTable("attendance_records", {
  id: int("id").primaryKey().autoincrement(),
  employeeId: int("employeeId").notNull().references(() => employeeRecords.id),
  ownerId: int("ownerId").notNull().references(() => users.id),
  type: varchar("type", { length: 16 }).notNull(), // "in" = entrada, "out" = salida, "absence" = ausencia
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  notes: text("notes"),
  // Ausencias: cuando type = "absence", absenceType clasifica el motivo
  absenceType: varchar("absenceType", { length: 32 }), // "rest" | "sick_leave" | "paid_leave" | "unpaid_leave"
  comment: text("comment"), // Comentario de por qué faltó o detalle de la ausencia
  // Para ediciones del admin: guardar quién editó y cuándo
  editedByUserId: int("editedByUserId"),
  editedAt: timestamp("editedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

// *** AGENDA MÉDICA — PACIENTES ***
export const medicalPatients = mysqlTable("medical_patients", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  birthDate: varchar("birthDate", { length: 16 }),
  gender: varchar("gender", { length: 16 }),
  address: text("address"),
  photoUrl: varchar("photoUrl", { length: 512 }),
  bloodType: varchar("bloodType", { length: 8 }),
  allergies: text("allergies"),
  medicalNotes: text("medicalNotes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MedicalPatient = typeof medicalPatients.$inferSelect;
export type InsertMedicalPatient = typeof medicalPatients.$inferInsert;

// *** AGENDA MÉDICA — CITAS ***
export const medicalAppointments = mysqlTable("medical_appointments", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  patientId: int("patientId").notNull().references(() => medicalPatients.id),
  title: varchar("title", { length: 255 }).notNull(),
  appointmentDate: timestamp("appointmentDate").notNull(),
  durationMinutes: int("durationMinutes").default(30).notNull(),
  status: varchar("status", { length: 32 }).default("scheduled").notNull(),
  notes: text("notes"),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MedicalAppointment = typeof medicalAppointments.$inferSelect;
export type InsertMedicalAppointment = typeof medicalAppointments.$inferInsert;

// *** AGENDA MÉDICA — EXPEDIENTE CLÍNICO ***
export const medicalRecords = mysqlTable("medical_records", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  patientId: int("patientId").notNull().references(() => medicalPatients.id),
  appointmentId: int("appointmentId").references(() => medicalAppointments.id),
  recordDate: timestamp("recordDate").defaultNow().notNull(),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  prescription: text("prescription"),
  clinicalNotes: text("clinicalNotes"),
  attachments: text("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

// *** CAPACITACIONES ***
// Cursos disponibles en la plataforma (superadmin = globales, admin = internos de empresa)
export const courses = mysqlTable("courses", {
  id: int("id").primaryKey().autoincrement(),
  // null = curso global de KobraPay (solo superadmin), número = curso interno de empresa
  ownerId: int("ownerId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // Categoría: english, office, first_aid, sales, books, health, other
  category: varchar("category", { length: 64 }).notNull().default("other"),
  // Nivel: basic, intermediate, advanced, general
  level: varchar("level", { length: 32 }).default("general"),
  // URL externa del curso (YouTube, PDF, enlace externo)
  externalUrl: text("externalUrl"),
  // Contenido en texto/HTML (guía interna)
  content: text("content"),
  // Imagen de portada
  coverImageUrl: text("coverImageUrl"),
  // Duración estimada en minutos
  durationMinutes: int("durationMinutes").default(0),
  // Orden de visualización
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// Módulos/lecciones de un curso
export const courseModules = mysqlTable("course_modules", {
  id: int("id").primaryKey().autoincrement(),
  courseId: int("courseId").notNull().references(() => courses.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"),
  externalUrl: text("externalUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = typeof courseModules.$inferInsert;

// Progreso del usuario en cada curso/módulo
export const courseProgress = mysqlTable("course_progress", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  courseId: int("courseId").notNull().references(() => courses.id),
  moduleId: int("moduleId").references(() => courseModules.id),
  // Status: in_progress, completed
  status: varchar("status", { length: 32 }).default("in_progress").notNull(),
  completedAt: timestamp("completedAt"),
  // Evidencia subida por el usuario (URL en S3)
  evidenceUrl: text("evidenceUrl"),
  evidenceKey: text("evidenceKey"),
  evidenceName: varchar("evidenceName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CourseProgress = typeof courseProgress.$inferSelect;
export type InsertCourseProgress = typeof courseProgress.$inferInsert;

// ─── Revista Interna de la Empresa ────────────────────────────────────────────
export const magazines = mysqlTable("magazines", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  edition: varchar("edition", { length: 100 }),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  // Contenido JSON con secciones: [{type, title, body, imageUrl}]
  content: text("content"),
  aiPrompt: text("aiPrompt"),
  isPublished: boolean("isPublished").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Magazine = typeof magazines.$inferSelect;
export type InsertMagazine = typeof magazines.$inferInsert;

// ─── Agenda de Proveedores ────────────────────────────────────────────────────
export const suppliers = mysqlTable("suppliers", {
  id: int("id").primaryKey().autoincrement(),
  // null = proveedor global del superadmin, número = proveedor de un negocio específico
  ownerId: int("ownerId").notNull().references(() => users.id),
  // Datos del proveedor
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  // Categoría del proveedor
  category: varchar("category", { length: 64 }).default("other").notNull(),
  // Notas adicionales (dirección, horarios, condiciones, etc.)
  notes: text("notes"),
  // Estado activo/inactivo
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Prescripciones Médicas ───────────────────────────────────────────────────
export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").primaryKey().autoincrement(),
  // Doctor que emite la prescripción
  doctorId: int("doctorId").notNull().references(() => users.id),
  // Paciente (puede ser de la agenda médica o externo)
  patientId: int("patientId"),
  // Datos del paciente en la receta (puede diferir del registro)
  patientName: varchar("patientName", { length: 255 }).notNull(),
  patientAge: varchar("patientAge", { length: 20 }),
  patientGender: varchar("patientGender", { length: 20 }),
  // Fecha de la prescripción
  prescriptionDate: timestamp("prescriptionDate").defaultNow().notNull(),
  // Diagnóstico
  diagnosis: text("diagnosis"),
  // Medicamentos: JSON array [{name, dose, frequency, duration, instructions}]
  medications: text("medications").notNull(),
  // Indicaciones adicionales
  instructions: text("instructions"),
  // Imagen del membrete/encabezado del doctor (URL en S3)
  membreteUrl: text("membreteUrl"),
  membreteKey: text("membreteKey"),
  // Firma digital del doctor (base64 PNG guardada en S3)
  signatureUrl: text("signatureUrl"),
  signatureKey: text("signatureKey"),
  // Estado: draft, signed, sent
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

// Configuración del doctor (membrete, datos profesionales)
export const doctorProfiles = mysqlTable("doctor_profiles", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  // Nombre completo del doctor
  fullName: varchar("fullName", { length: 255 }),
  // Especialidad
  specialty: varchar("specialty", { length: 255 }),
  // Cédula profesional
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  // Institución / Clínica
  institution: varchar("institution", { length: 255 }),
  // Teléfono de consultorio
  officePhone: varchar("officePhone", { length: 32 }),
  // Dirección del consultorio
  officeAddress: text("officeAddress"),
  // Imagen del membrete (URL en S3)
  membreteUrl: text("membreteUrl"),
  membreteKey: text("membreteKey"),
  // Sello del doctor (URL en S3)
  stampUrl: text("stampUrl"),
  stampKey: text("stampKey"),
  // Firma guardada (URL en S3)
  savedSignatureUrl: text("savedSignatureUrl"),
  savedSignatureKey: text("savedSignatureKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DoctorProfile = typeof doctorProfiles.$inferSelect;
export type InsertDoctorProfile = typeof doctorProfiles.$inferInsert;

// ─── Módulo Farmacia ──────────────────────────────────────────────────────────
// Clientes de la farmacia (registro propio, no ligado a users)
export const pharmacyCustomers = mysqlTable("pharmacy_customers", {
  id: int("id").primaryKey().autoincrement(),
  // Farmacia dueña del registro
  ownerId: int("ownerId").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  birthDate: varchar("birthDate", { length: 20 }),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  allergies: text("allergies"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PharmacyCustomer = typeof pharmacyCustomers.$inferSelect;
export type InsertPharmacyCustomer = typeof pharmacyCustomers.$inferInsert;

// Prescripciones escaneadas / registradas en la farmacia
export const pharmacyPrescriptions = mysqlTable("pharmacy_prescriptions", {
  id: int("id").primaryKey().autoincrement(),
  // Farmacia dueña
  ownerId: int("ownerId").notNull().references(() => users.id),
  // Cliente de la farmacia
  customerId: int("customerId").notNull().references(() => pharmacyCustomers.id),
  // Datos de la prescripción
  doctorName: varchar("doctorName", { length: 255 }),
  prescriptionDate: varchar("prescriptionDate", { length: 20 }),
  // Archivo escaneado (foto, PDF) - URL en S3
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  fileName: varchar("fileName", { length: 255 }),
  fileMimeType: varchar("fileMimeType", { length: 100 }),
  // Medicamentos registrados (texto libre o JSON)
  medications: text("medications"),
  // Notas del farmacéutico
  notes: text("notes"),
  // Estado: pending (por surtir), dispensed (surtida), partial (surtida parcialmente)
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  dispensedAt: timestamp("dispensedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PharmacyPrescription = typeof pharmacyPrescriptions.$inferSelect;
export type InsertPharmacyPrescription = typeof pharmacyPrescriptions.$inferInsert;

// ─── Control de Acceso por Módulo ─────────────────────────────────────────────
// Módulos controlados: 'prescriptions', 'pharmacy'
export const moduleAccess = mysqlTable("module_access", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  module: varchar("module", { length: 64 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  grantedBy: int("grantedBy").notNull().references(() => users.id),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  notes: text("notes"),
});
export type ModuleAccess = typeof moduleAccess.$inferSelect;

export const moduleRequests = mysqlTable("module_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  module: varchar("module", { length: 64 }).notNull(),
  businessType: varchar("businessType", { length: 255 }),
  message: text("message"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
});
export type ModuleRequest = typeof moduleRequests.$inferSelect;

// ─── Encuesta de Onboarding Inteligente ───────────────────────────────────────
export const onboardingSurveys = mysqlTable("onboarding_surveys", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  // Tipo y tamaño del negocio
  businessType: varchar("businessType", { length: 100 }).notNull(),
  businessSize: varchar("businessSize", { length: 50 }).notNull(),
  // Volumen financiero estimado
  monthlyRevenueEstimate: varchar("monthlyRevenueEstimate", { length: 50 }).notNull(),
  // Necesidades de pago
  needsCardPayments: boolean("needsCardPayments").default(true),
  needsInternationalCards: boolean("needsInternationalCards").default(false),
  needsRecurringBilling: boolean("needsRecurringBilling").default(false),
  needsInvoicing: boolean("needsInvoicing").default(false),
  needsMultipleBankAccounts: boolean("needsMultipleBankAccounts").default(false),
  // Módulos de interés (JSON array como texto)
  interestedModules: text("interestedModules"),
  // Contexto adicional
  currentPaymentProcessor: varchar("currentPaymentProcessor", { length: 100 }),
  mainChallenge: text("mainChallenge"),
  // Plan recomendado (calculado automáticamente)
  recommendedPlan: varchar("recommendedPlan", { length: 50 }),
  recommendedCommission: decimal("recommendedCommission", { precision: 5, scale: 2 }),
  planReasoning: text("planReasoning"),
  // Estado del flujo de aprobación
  status: varchar("status", { length: 30 }).default("pending_review").notNull(),
  assistantNotes: text("assistantNotes"),
  reviewedByAssistantAt: int("reviewedByAssistantAt"),
  reviewedByAdminAt: int("reviewedByAdminAt"),
  createdAt: int("createdAt").notNull(),
  updatedAt: int("updatedAt").notNull(),
});
export type OnboardingSurvey = typeof onboardingSurveys.$inferSelect;
export type InsertOnboardingSurvey = typeof onboardingSurveys.$inferInsert;

// ─── Cuentas Bancarias (múltiples por usuario, Express + Custom) ──────────────
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id),
  // Tipo de cuenta Stripe Connect
  connectType: mysqlEnum("connect_type", ["express", "custom"]).default("express").notNull(),
  // Stripe Connect
  stripeAccountId: varchar("stripe_account_id", { length: 128 }),
  stripeStatus: mysqlEnum("stripe_status", ["not_started", "pending", "active", "restricted", "disabled"]).default("not_started").notNull(),
  stripeChargesEnabled: boolean("stripe_charges_enabled").default(false).notNull(),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false).notNull(),
  stripeDetailsSubmitted: boolean("stripe_details_submitted").default(false).notNull(),
  stripeOnboardedAt: int("stripe_onboarded_at"),
  // Datos bancarios
  accountAlias: varchar("account_alias", { length: 100 }),
  bankName: varchar("bank_name", { length: 100 }),
  clabe: varchar("clabe", { length: 18 }),
  accountNumber: varchar("account_number", { length: 20 }),
  cardNumber: varchar("card_number", { length: 16 }),
  // Datos fiscales
  accountHolderName: varchar("account_holder_name", { length: 255 }),
  rfc: varchar("rfc", { length: 20 }),
  curp: varchar("curp", { length: 18 }),
  razonSocial: varchar("razon_social", { length: 255 }),
  regimenFiscal: varchar("regimen_fiscal", { length: 100 }),
  // Estado
  isPrimary: boolean("is_primary").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: int("created_at").notNull(),
  updatedAt: int("updated_at").notNull(),
});
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/// ─── Comisiones de Asociados ─────────────────────────────────────
export const associateCommissions = mysqlTable("associate_commissions", {
  id: int("id").primaryKey().autoincrement(),
  associateUserId: int("associateUserId").notNull().references(() => users.id),
  clientUserId: int("clientUserId"),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientBusinessName: varchar("clientBusinessName", { length: 255 }),
  clientPhone: varchar("clientPhone", { length: 32 }),
  status: mysqlEnum("status", ["pending", "assistant_approved", "active", "rejected", "inactive"]).default("pending").notNull(),
  assignedPlan: varchar("assignedPlan", { length: 50 }),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("1.00").notNull(),
  totalVolumeProcessed: decimal("totalVolumeProcessed", { precision: 14, scale: 2 }).default("0.00").notNull(),
  totalCommissionEarned: decimal("totalCommissionEarned", { precision: 14, scale: 2 }).default("0.00").notNull(),
  notes: text("notes"),
  paymentCycle: varchar("paymentCycle", { length: 20 }).default("monthly").notNull(),
  approvedAt: bigint("approvedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});
export type AssociateCommission = typeof associateCommissions.$inferSelect;
export type InsertAssociateCommission = typeof associateCommissions.$inferInsert;

// ─── Clientes captados por asociados ─────────────────────────────────────────
export const associateClients = mysqlTable("associate_clients", {
  id: int("id").autoincrement().primaryKey(),
  associateId: int("associate_id").notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientBusinessName: varchar("client_business_name", { length: 255 }),
  clientPhone: varchar("client_phone", { length: 50 }),
  assignedPlan: mysqlEnum("assigned_plan", ["express", "connect", "custom", "enterprise"]),
  status: mysqlEnum("status", ["pending", "pre_approved", "active", "rejected", "inactive"]).notNull().default("pending"),
  notes: text("notes"),
  // Flujo de aprobación de dos pasos
  assistantApprovedBy: int("assistant_approved_by"),  // ID del asistente que pre-aprobó
  assistantApprovedAt: int("assistant_approved_at"),  // Timestamp de pre-aprobación
  assistantNotes: text("assistant_notes"),             // Notas del asistente
  superAdminApprovedBy: int("super_admin_approved_by"), // ID del superadmin que aprobó definitivamente
  superAdminApprovedAt: int("super_admin_approved_at"), // Timestamp de aprobación final
  superAdminNotes: text("super_admin_notes"),           // Notas del superadmin
  createdAt: int("created_at").notNull(),
  updatedAt: int("updated_at").notNull(),
});

export type AssociateClient = typeof associateClients.$inferSelect;
export type InsertAssociateClient = typeof associateClients.$inferInsert;

// ─── Tickets de soporte técnico ───────────────────────────────────────────────
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  userName: varchar("userName", { length: 255 }),
  category: varchar("category", { length: 50 }).notNull().default("technical"),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  resolution: text("resolution"),
  resolvedAt: bigint("resolvedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

// ─── Buzón de sugerencias / feedback ─────────────────────────────────────────
export const feedbackMessages = mysqlTable("feedback_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  userName: varchar("userName", { length: 255 }),
  type: varchar("type", { length: 30 }).notNull().default("suggestion"),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  rating: int("rating"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  adminReply: text("adminReply"),
  repliedAt: bigint("repliedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type FeedbackMessage = typeof feedbackMessages.$inferSelect;
export type InsertFeedbackMessage = typeof feedbackMessages.$inferInsert;

// ─── Scoring IA para solicitudes de registro ──────────────────────────────────
export const registrationScores = mysqlTable("registration_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  associateClientId: int("associate_client_id"),
  onboardingSurveyId: int("onboarding_survey_id"),
  applicantEmail: varchar("applicant_email", { length: 255 }).notNull(),
  applicantName: varchar("applicant_name", { length: 255 }),
  businessName: varchar("business_name", { length: 255 }),
  aiScore: int("ai_score").notNull().default(0),
  decision: mysqlEnum("decision", ["auto_approved", "manual_review", "auto_rejected"]).notNull().default("manual_review"),
  scoreFactors: text("score_factors"),
  riskFlags: text("risk_flags"),
  captchaVerified: boolean("captcha_verified").default(false).notNull(),
  captchaToken: varchar("captcha_token", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  aiReasoning: text("ai_reasoning"),
  reviewedBy: int("reviewed_by"),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  reviewerNotes: text("reviewer_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type RegistrationScore = typeof registrationScores.$inferSelect;
export type InsertRegistrationScore = typeof registrationScores.$inferInsert;

// ─── Quote Logs ─────────────────────────────────────────────────────────────
export const quoteLogs = mysqlTable("quote_logs", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("sender_id").notNull(),
  senderName: varchar("sender_name", { length: 255 }).notNull().default(""),
  prospectEmail: varchar("prospect_email", { length: 255 }).notNull(),
  prospectName: varchar("prospect_name", { length: 255 }).notNull().default(""),
  monthlyVolume: decimal("monthly_volume", { precision: 15, scale: 2 }).notNull().default("0"),
  singleAmount: decimal("single_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  kpRate: decimal("kp_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  mode: varchar("mode", { length: 20 }).notNull().default("online"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalFee: decimal("total_fee", { precision: 15, scale: 2 }).notNull().default("0"),
  effectiveRate: decimal("effective_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  registered: tinyint("registered").notNull().default(0),
  registeredAt: bigint("registered_at", { mode: "number" }),
  emailSent: tinyint("email_sent").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export type QuoteLog = typeof quoteLogs.$inferSelect;
export type InsertQuoteLog = typeof quoteLogs.$inferInsert;

// ─── Tabla de tiers de comisión para asociados ────────────────────────────────
// El superadmin define rangos de clientes activos → % de comisión que recibe el asociado
// Ejemplo: 1-5 clientes = 0.3%, 6-15 = 0.5%, 16-30 = 1%, 31-50 = 2%, 51+ = 5%
export const associateCommissionTiers = mysqlTable("associate_commission_tiers", {
  id: int("id").autoincrement().primaryKey(),
  // Rango de clientes activos (minClients <= clientes_activos <= maxClients)
  // maxClients = null significa "sin límite superior" (ej: 51+)
  minClients: int("min_clients").notNull(),
  maxClients: int("max_clients"),
  // Porcentaje de comisión que recibe el asociado sobre el volumen de sus clientes
  commissionPct: decimal("commission_pct", { precision: 5, scale: 2 }).notNull(),
  // Etiqueta descriptiva del tier (ej: "Starter", "Silver", "Gold", "Platinum", "Elite")
  label: varchar("label", { length: 64 }).notNull(),
  // Descripción opcional del tier
  description: text("description"),
  // Orden de visualización
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type AssociateCommissionTier = typeof associateCommissionTiers.$inferSelect;
export type InsertAssociateCommissionTier = typeof associateCommissionTiers.$inferInsert;
