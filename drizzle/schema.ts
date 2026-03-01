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
  // superadmin = dueño de la plataforma (tú), admin = cliente de la plataforma, user = empleado del cliente
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
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
  // Firma digital e identificación
  requireSignature: boolean("requireSignature").default(false).notNull(),
  requireIdUpload: boolean("requireIdUpload").default(false).notNull(),
  // Texto de protección contracargos
  chargebackProtectionText: text("chargebackProtectionText"),
  // MSI: meses sin intereses habilitados (JSON array: [3,6,9,12])
  msiOptions: text("msiOptions"),
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
