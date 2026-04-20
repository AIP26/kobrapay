import { and, desc, eq, gte, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Customer,
  InsertCustomer,
  InsertPaymentLink,
  InsertPlatformClient,
  InsertTransaction,
  InsertUser,
  InsertVendorSettings,
  InsertProduct,
  Product,
  Contract,
  InsertContract,
  SalesAgent,
  InsertSalesAgent,
  AgentCommission,
  InsertAgentCommission,
  customers,
  otpVerifications,
  paymentLinks,
  platformClients,
  products,
  transactions,
  users,
  vendorSettings,
  contracts,
  salesAgents,
  agentCommissions,
  agentReferrals,
  clientRecords,
  ClientRecord,
  userProfiles,
  UserProfile,
  InsertUserProfile,
  chargebacks,
  Chargeback,
  InsertChargeback,
  invoices,
  Invoice,
  InsertInvoice,
  notifications,
  Notification,
  InsertNotification,
  employeeRecords,
  EmployeeRecord,
  InsertEmployeeRecord,
  employeeDocuments,
  EmployeeDocument,
  InsertEmployeeDocument,
  attendanceRecords,
  AttendanceRecord,
  InsertAttendanceRecord,
  subscriptions,
  Subscription,
  InsertSubscription,
  courses,
  Course,
  InsertCourse,
  courseModules,
  CourseModule,
  InsertCourseModule,
  courseProgress,
  CourseProgress,
  InsertCourseProgress,
  associateCommissions,
  AssociateCommission,
  associateEarnings,
  AssociateEarning,
  InsertAssociateEarning,
  paymentConsents,
  PaymentConsent,
  InsertPaymentConsent,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _dbLastError: number = 0;

export async function getDb() {
  // Allow reconnection after 30s cooldown (handles ECONNRESET from idle connections)
  const now = Date.now();
  if (_db && _dbLastError > 0 && now - _dbLastError > 30_000) {
    _db = null;
    _dbLastError = 0;
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      _dbLastError = 0;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _dbLastError = now;
    }
  }
  return _db;
}

export function resetDbConnection() {
  _db = null;
  _dbLastError = 0;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    // El owner siempre debe tener role superadmin para que isSuperAdmin() funcione correctamente
    values.role = "superadmin";
    updateSet.role = "superadmin";
  }
  // El superadmin (owner) siempre queda activo; nuevos registros quedan en "pending"
  if (user.openId === ENV.ownerOpenId) {
    values.accountStatus = "active";
    updateSet.accountStatus = "active";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ─── Gestión de registros (aprobación de cuentas) ─────────────────────────────

export async function getAllRegistrations() {
  const db = await getDb();
  if (!db) return [];
  // Obtener usuarios con perfil
  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    accountStatus: users.accountStatus,
    isActive: users.isActive,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    loginMethod: users.loginMethod,
    fullName: userProfiles.fullName,
    birthDate: userProfiles.birthDate,
    curp: userProfiles.curp,
    rfc: userProfiles.rfc,
    phone: userProfiles.phone,
    businessName: userProfiles.businessName,
    businessType: userProfiles.businessType,
    accountType: userProfiles.accountType,
    permissions: userProfiles.permissions,
    profileCompleted: userProfiles.profileCompleted,
  }).from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .orderBy(users.createdAt);

  // Obtener estadísticas de cobros por usuario en una sola consulta
  const stats = await db.select({
    userId: paymentLinks.userId,
    totalCobros: sql<number>`COUNT(*)`,
    cobrosExitosos: sql<number>`SUM(CASE WHEN ${paymentLinks.status} = 'paid' THEN 1 ELSE 0 END)`,
    totalCobrado: sql<string>`COALESCE(SUM(CASE WHEN ${paymentLinks.status} = 'paid' THEN CAST(${paymentLinks.amount} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
  }).from(paymentLinks)
    .groupBy(paymentLinks.userId);

  const statsMap = new Map(stats.map(s => [s.userId, s]));

  return rows.map(r => ({
    ...r,
    totalCobros: statsMap.get(r.id)?.totalCobros ?? 0,
    cobrosExitosos: statsMap.get(r.id)?.cobrosExitosos ?? 0,
    totalCobrado: String(statsMap.get(r.id)?.totalCobrado ?? '0'),
  }));
}

export async function updateUserAccountStatus(
  userId: number,
  status: "pending" | "active" | "blocked"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    accountStatus: status,
    isActive: status === "active",
  }).where(eq(users.id, userId));
}

// ─── Vendor Settings ─────────────────────────────────────────────────────────

export async function getVendorSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vendorSettings).where(eq(vendorSettings.userId, userId)).limit(1);
  return result[0];
}

export async function upsertVendorSettings(data: Partial<InsertVendorSettings> & { userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getVendorSettings(data.userId);
  if (existing) {
    await db.update(vendorSettings).set({ ...data, updatedAt: new Date() }).where(eq(vendorSettings.userId, data.userId));
  } else {
    await db.insert(vendorSettings).values({ ...data } as InsertVendorSettings);
  }
  return getVendorSettings(data.userId);
}

// ─── Platform Clients (multi-tenant) ─────────────────────────────────────────

export async function createPlatformClient(data: InsertPlatformClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(platformClients).values(data);
  const result = await db.select().from(platformClients).where(eq(platformClients.email, data.email)).limit(1);
  return result[0];
}

export async function getPlatformClientsByAdmin(adminUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformClients).where(eq(platformClients.adminUserId, adminUserId)).orderBy(desc(platformClients.createdAt));
}

export async function getPlatformClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformClients).where(eq(platformClients.id, id)).limit(1);
  return result[0];
}

export async function getPlatformClientByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformClients).where(eq(platformClients.email, email)).limit(1);
  return result[0];
}

export async function updatePlatformClient(id: number, data: Partial<InsertPlatformClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(platformClients).set({ ...data, updatedAt: new Date() }).where(eq(platformClients.id, id));
  return getPlatformClientById(id);
}

// ─── Payment Links ────────────────────────────────────────────────────────────

export async function createPaymentLink(data: InsertPaymentLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(paymentLinks).values(data);
  const result = await db.select().from(paymentLinks).where(eq(paymentLinks.token, data.token!)).limit(1);
  return result[0];
}

export async function getPaymentLinkByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(paymentLinks).where(eq(paymentLinks.token, token)).limit(1);
  return result[0];
}

export async function getPaymentLinkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(paymentLinks).where(eq(paymentLinks.id, id)).limit(1);
  return result[0];
}

export async function getPaymentLinksByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentLinks).where(eq(paymentLinks.userId, userId)).orderBy(desc(paymentLinks.createdAt));
}

export async function updatePaymentLink(
  id: number,
  data: Partial<Pick<InsertPaymentLink, "clientName" | "clientEmail" | "amount" | "description" | "status" | "paidAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentLinks).set({ ...data, updatedAt: new Date() }).where(eq(paymentLinks.id, id));
}

export async function updatePaymentLinkStatus(
  id: number,
  status: "pending" | "paid" | "expired" | "cancelled",
  paidAt?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentLinks).set({ status, paidAt: paidAt ?? null, updatedAt: new Date() }).where(eq(paymentLinks.id, id));
}

export async function expireOldPaymentLinks() {
  const db = await getDb();
  if (!db) return;
  await db
    .update(paymentLinks)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(paymentLinks.status, "pending"), sql`${paymentLinks.expiresAt} IS NOT NULL AND ${paymentLinks.expiresAt} < NOW()`));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(transactions).values(data);
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.paymentLinkId, data.paymentLinkId))
    .orderBy(desc(transactions.createdAt))
    .limit(1);
  const tx = result[0];
  // Generar y guardar operationNumber basado en timestamp + id
  if (tx && !tx.operationNumber) {
    const ts = new Date(tx.createdAt).getTime().toString().slice(-8);
    const id = String(tx.id).padStart(6, "0");
    const operationNumber = `KP${ts}${id}`;
    await db.update(transactions).set({ operationNumber }).where(eq(transactions.id, tx.id));
    tx.operationNumber = operationNumber;
  }
  return tx;
}

export async function getTransactionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
}

export async function searchTransactionsByUser(userId: number, search: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${search.trim()}%`;
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        or(
          like(transactions.payerName, term),
          like(transactions.payerEmail, term),
          like(transactions.operationNumber, term),
          like(transactions.stripePaymentIntentId, term)
        )
      )
    )
    .orderBy(desc(transactions.createdAt));
}

export async function getTransactionsByUserFiltered(
  userId: number,
  opts: { search?: string; status?: string; dateFrom?: string; dateTo?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(transactions.userId, userId)];
  if (opts.search) {
    const term = `%${opts.search.trim()}%`;
    conditions.push(
      or(
        like(transactions.payerName, term),
        like(transactions.payerEmail, term),
        like(transactions.operationNumber, term),
        like(transactions.stripePaymentIntentId, term)
      )!
    );
  }
  if (opts.status && opts.status !== "all") {
    conditions.push(eq(transactions.status, opts.status as "pending" | "processing" | "succeeded" | "failed" | "refunded"));
  }
  if (opts.dateFrom) {
    conditions.push(gte(transactions.createdAt, new Date(opts.dateFrom)));
  }
  if (opts.dateTo) {
    const to = new Date(opts.dateTo);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(transactions.createdAt, to));
  }
  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt));
}

export async function getAllTransactionsForAdmin(adminUserId: number) {
  // Admin ve todas las transacciones de sus clientes de plataforma + las propias
  const db = await getDb();
  if (!db) return [];
  const clients = await getPlatformClientsByAdmin(adminUserId);
  const clientUserIds = clients.filter((c) => c.userId).map((c) => c.userId as number);
  const allUserIds = [adminUserId, ...clientUserIds];
  if (allUserIds.length === 0) return [];
  return db.select().from(transactions).where(sql`${transactions.userId} IN (${sql.join(allUserIds.map(id => sql`${id}`), sql`, `)})`).orderBy(desc(transactions.createdAt));
}

export async function getTransactionByPaymentIntent(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return result[0];
}

export async function getTransactionByChargeId(stripeChargeId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.stripeChargeId, stripeChargeId))
    .limit(1);
  return result[0];
}

export async function updateTransactionStatus(
  id: number,
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded",
  extra?: {
    stripeChargeId?: string;
    cardLast4?: string;
    cardBrand?: string;
    errorMessage?: string;
    otpVerified?: boolean;
    selfieVerified?: boolean;
    selfieUrl?: string;
    faceMatchScore?: string;
    ipAddress?: string;
    userAgent?: string;
    // Sistema 3: Trazabilidad OXXO/SPEI tardío
    paidAfterExpiry?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(transactions).set({ status, updatedAt: new Date(), ...extra }).where(eq(transactions.id, id));
}

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalCollected: 0, totalNetAmount: 0, totalCommission: 0, totalLinks: 0, paidLinks: 0, pendingLinks: 0, monthCollected: 0, monthTransactions: 0, todayCollected: 0, todayTransactions: 0, totalCustomers: 0, totalTransactions: 0 };

  const links = await db.select().from(paymentLinks).where(eq(paymentLinks.userId, userId));
  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.status, "succeeded")));
  const customerCount = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const totalCollected = txs.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
  const totalNetAmount = txs.reduce((sum, t) => sum + parseFloat(String(t.netAmount || t.amount)), 0);
  const totalCommission = txs.reduce((sum, t) => sum + parseFloat(String(t.commissionAmount || 0)), 0);
  const monthTxs = txs.filter(t => new Date(t.createdAt).getTime() >= startOfMonth);
  const todayTxs = txs.filter(t => new Date(t.createdAt).getTime() >= startOfDay);

  return {
    totalCollected,
    totalNetAmount,
    totalCommission,
    totalLinks: links.length,
    // paidLinks = transacciones succeeded reales (no links con status paid que pueden ser de prueba)
    paidLinks: txs.length,
    totalTransactions: txs.length,
    pendingLinks: links.filter((l) => l.status === "pending").length,
    monthCollected: monthTxs.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0),
    monthTransactions: monthTxs.length,
    todayCollected: todayTxs.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0),
    todayTransactions: todayTxs.length,
    totalCustomers: customerCount.length,
  };
}

// ─── Customers (base de datos de pagadores) ──────────────────────────────────

export async function upsertCustomer(data: {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  amount: number;
}) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.userId, data.userId), eq(customers.email, data.email)))
    .limit(1);

  if (existing[0]) {
    // Actualizar estadísticas del cliente existente
    await db
      .update(customers)
      .set({
        name: data.name,
        phone: data.phone ?? existing[0].phone,
        countryCode: data.countryCode ?? existing[0].countryCode,
        totalPaid: String(parseFloat(String(existing[0].totalPaid)) + data.amount),
        totalTransactions: existing[0].totalTransactions + 1,
        lastPaymentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, existing[0].id));
  } else {
    // Crear nuevo cliente
    await db.insert(customers).values({
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      countryCode: data.countryCode ?? "+52",
      totalPaid: String(data.amount),
      totalTransactions: 1,
      lastPaymentAt: new Date(),
    } as InsertCustomer);
  }
}

export async function getCustomersByUser(userId: number, search?: string) {
  const db = await getDb();
  if (!db) return [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    return db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.userId, userId),
          or(like(customers.name, term), like(customers.email, term), like(customers.phone ?? "", term))
        )
      )
      .orderBy(desc(customers.lastPaymentAt));
  }

  return db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.lastPaymentAt));
}

export async function getCustomerTransactions(userId: number, customerEmail: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.payerEmail, customerEmail), eq(transactions.status, "succeeded")))
    .orderBy(desc(transactions.createdAt));
}

// ─── OTP Verifications ────────────────────────────────────────────────────────

export async function createOtpVerification(data: {
  paymentLinkToken: string;
  email?: string;
  phone?: string;
  code: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidar OTPs anteriores para este token
  await db.update(otpVerifications).set({ verified: true }).where(
    and(eq(otpVerifications.paymentLinkToken, data.paymentLinkToken), eq(otpVerifications.verified, false))
  );
  await db.insert(otpVerifications).values(data);
  const result = await db
    .select()
    .from(otpVerifications)
    .where(eq(otpVerifications.paymentLinkToken, data.paymentLinkToken))
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);
  return result[0];
}

export async function verifyOtp(paymentLinkToken: string, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.paymentLinkToken, paymentLinkToken),
        eq(otpVerifications.verified, false)
      )
    )
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);

  const otp = result[0];
  if (!otp) return { success: false, reason: "no_otp" };
  if (new Date() > otp.expiresAt) return { success: false, reason: "expired" };
  if (otp.attempts >= 5) return { success: false, reason: "too_many_attempts" };

  await db.update(otpVerifications).set({ attempts: otp.attempts + 1 }).where(eq(otpVerifications.id, otp.id));

  if (otp.code !== code) return { success: false, reason: "invalid_code" };

  await db.update(otpVerifications).set({ verified: true }).where(eq(otpVerifications.id, otp.id));
  return { success: true };
}

// ─── PRODUCTOS / CATÁLOGO ────────────────────────────────────────────────────

export async function getProductsByUser(userId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(products.userId, userId)];
  if (!includeInactive) conditions.push(eq(products.isActive, true));
  return db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(products).where(and(eq(products.id, id), eq(products.userId, userId))).limit(1);
  return result[0] ?? null;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(products).values(data);
  const result = await db.select().from(products).where(and(eq(products.userId, data.userId), eq(products.name, data.name))).orderBy(desc(products.createdAt)).limit(1);
  return result[0];
}

export async function updateProduct(id: number, userId: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(and(eq(products.id, id), eq(products.userId, userId)));
  return getProductById(id, userId);
}

export async function deleteProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set({ isActive: false }).where(and(eq(products.id, id), eq(products.userId, userId)));
  return { success: true };
}

export async function adjustProductStock(id: number, userId: number, delta: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set({ stock: sql`stock + ${delta}` }).where(and(eq(products.id, id), eq(products.userId, userId)));
  return getProductById(id, userId);
}

// ─── Contratos ────────────────────────────────────────────────────────────────

export async function createContract(data: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(contracts).values(data);
  const result = await db.select().from(contracts).where(eq(contracts.createdByUserId, data.createdByUserId)).orderBy(desc(contracts.createdAt)).limit(1);
  return result[0];
}

export async function getContractsByAdmin(adminUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).where(eq(contracts.createdByUserId, adminUserId)).orderBy(desc(contracts.createdAt));
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result[0];
}

export async function getContractBySignToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.signToken, token)).limit(1);
  return result[0];
}

export async function updateContract(id: number, data: Partial<InsertContract>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contracts).set({ ...data, updatedAt: new Date() }).where(eq(contracts.id, id));
  return getContractById(id);
}

// ─── Vendedores/Afiliados ─────────────────────────────────────────────────────

export async function createSalesAgent(data: InsertSalesAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(salesAgents).values(data);
  const result = await db.select().from(salesAgents).where(eq(salesAgents.email, data.email)).limit(1);
  return result[0];
}

export async function getSalesAgentsByAdmin(adminUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesAgents).where(eq(salesAgents.createdByUserId, adminUserId)).orderBy(desc(salesAgents.createdAt));
}

export async function getSalesAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(salesAgents).where(eq(salesAgents.id, id)).limit(1);
  return result[0];
}

export async function getSalesAgentByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(salesAgents).where(eq(salesAgents.referralCode, code)).limit(1);
  return result[0];
}

export async function updateSalesAgent(id: number, data: Partial<InsertSalesAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(salesAgents).set({ ...data, updatedAt: new Date() }).where(eq(salesAgents.id, id));
  return getSalesAgentById(id);
}

// ─── Comisiones de Vendedores ─────────────────────────────────────────────────

export async function createAgentCommission(data: InsertAgentCommission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(agentCommissions).values(data);
}

export async function getPendingCommissionsByAgent(agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentCommissions).where(and(eq(agentCommissions.agentId, agentId), eq(agentCommissions.status, "pending"))).orderBy(desc(agentCommissions.createdAt));
}

export async function getCommissionSummaryByAgent(agentId: number) {
  const db = await getDb();
  if (!db) return { pending: "0", paid: "0", total: "0" };
  const rows = await db.select({
    status: agentCommissions.status,
    total: sql<string>`SUM(${agentCommissions.commissionAmount})`,
  }).from(agentCommissions).where(eq(agentCommissions.agentId, agentId)).groupBy(agentCommissions.status);
  const pending = rows.find(r => r.status === "pending")?.total ?? "0";
  const paid = rows.find(r => r.status === "paid")?.total ?? "0";
  const total = (parseFloat(pending) + parseFloat(paid)).toFixed(2);
  return { pending, paid, total };
}

export async function markCommissionsAsPaid(agentId: number, paymentReference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(agentCommissions).set({ status: "paid", paidAt: new Date(), paymentReference }).where(and(eq(agentCommissions.agentId, agentId), eq(agentCommissions.status, "pending")));
}

export async function linkAgentToClient(agentId: number, clientUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verificar si ya existe la relación
  const existing = await db.select().from(agentReferrals).where(and(eq(agentReferrals.agentId, agentId), eq(agentReferrals.clientUserId, clientUserId))).limit(1);
  if (existing.length === 0) {
    await db.insert(agentReferrals).values({ agentId, clientUserId });
  }
}

export async function getAgentByClientUserId(clientUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ agentId: agentReferrals.agentId }).from(agentReferrals).where(eq(agentReferrals.clientUserId, clientUserId)).limit(1);
  if (!result[0]) return undefined;
  return getSalesAgentById(result[0].agentId);
}

// ─── Expedientes de Clientes ──────────────────────────────────────────────────
export async function upsertClientRecord(
  userId: number,
  tx: {
    payerEmail: string;
    payerName?: string;
    payerPhone?: string;
    selfieUrl?: string;
    signatureUrl?: string;
    idDocumentUrl?: string;
    faceMatchScore?: number;
    selfieVerified?: boolean;
    amount: number;
  }
) {
  const db = await getDb();
  if (!db) return;
  const email = tx.payerEmail.toLowerCase().trim();

  const existing = await db
    .select()
    .from(clientRecords)
    .where(and(eq(clientRecords.userId, userId), eq(clientRecords.payerEmail, email)))
    .limit(1);

  if (existing.length === 0) {
    // Crear nuevo expediente
    await db.insert(clientRecords).values({
      userId,
      payerEmail: email,
      payerName: tx.payerName || null,
      payerPhone: tx.payerPhone || null,
      latestSelfieUrl: tx.selfieUrl || null,
      latestSignatureUrl: tx.signatureUrl || null,
      latestIdDocumentUrl: tx.idDocumentUrl || null,
      latestFaceMatchScore: tx.faceMatchScore ? String(tx.faceMatchScore) : null,
      selfieVerified: tx.selfieVerified ?? false,
      totalTransactions: 1,
      totalAmountPaid: String(tx.amount),
    });
  } else {
    // Actualizar expediente existente
    const rec = existing[0];
    // Solo sumar al contador si es un pago real (amount > 0)
    const newTotal = tx.amount > 0 ? (rec.totalTransactions || 0) + 1 : (rec.totalTransactions || 0);
    const newAmount = tx.amount > 0
      ? (parseFloat(String(rec.totalAmountPaid || 0)) + tx.amount).toFixed(2)
      : rec.totalAmountPaid;
    await db
      .update(clientRecords)
      .set({
        payerName: tx.payerName || rec.payerName,
        payerPhone: tx.payerPhone || rec.payerPhone,
        latestSelfieUrl: tx.selfieUrl || rec.latestSelfieUrl,
        latestSignatureUrl: tx.signatureUrl || rec.latestSignatureUrl,
        latestIdDocumentUrl: tx.idDocumentUrl || rec.latestIdDocumentUrl,
        latestFaceMatchScore: tx.faceMatchScore ? String(tx.faceMatchScore) : rec.latestFaceMatchScore,
        selfieVerified: tx.selfieVerified ?? rec.selfieVerified,
        totalTransactions: newTotal,
        totalAmountPaid: String(newAmount),
        lastSeenAt: new Date(),
      })
      .where(eq(clientRecords.id, rec.id));
  }
}

export async function getClientRecords(userId: number, search?: string): Promise<ClientRecord[]> {
  const db = await getDb();
  if (!db) return [];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    return db
      .select()
      .from(clientRecords)
      .where(
        and(
          eq(clientRecords.userId, userId),
          or(
            like(clientRecords.payerName, term),
            like(clientRecords.payerEmail, term),
            like(clientRecords.payerPhone, term)
          )
        )
      )
      .orderBy(desc(clientRecords.lastSeenAt));
  }
  return db
    .select()
    .from(clientRecords)
    .where(eq(clientRecords.userId, userId))
    .orderBy(desc(clientRecords.lastSeenAt));
}

export async function getClientRecordById(userId: number, id: number): Promise<ClientRecord | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(clientRecords)
    .where(and(eq(clientRecords.userId, userId), eq(clientRecords.id, id)))
    .limit(1);
  return result[0];
}

export async function getTransactionsByPayerEmail(userId: number, payerEmail: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.payerEmail, payerEmail.toLowerCase().trim()),
        eq(transactions.status, "succeeded")
      )
    )
    .orderBy(desc(transactions.createdAt));
}

// ─── User Profiles (perfil extendido de registro) ─────────────────────────────

export async function getUserProfile(userId: number): Promise<UserProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set({ ...data, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, ...data });
  }
}

// ─── Chargebacks (Aclaraciones) ───────────────────────────────────────────────
export async function createChargeback(data: Omit<InsertChargeback, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(chargebacks).values(data as InsertChargeback);
}

export type ChargebackEnriched = Chargeback & {
  vendorName: string | null;
  vendorEmail: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  operationNumber: string | null;
  linkDescription: string | null;
};

export async function getChargebacksByUser(userId: number): Promise<ChargebackEnriched[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: chargebacks.id,
      userId: chargebacks.userId,
      transactionId: chargebacks.transactionId,
      stripeDisputeId: chargebacks.stripeDisputeId,
      amount: chargebacks.amount,
      currency: chargebacks.currency,
      reason: chargebacks.reason,
      reasonEs: chargebacks.reasonEs,
      status: chargebacks.status,
      evidence: chargebacks.evidence,
      notes: chargebacks.notes,
      dueBy: chargebacks.dueBy,
      resolvedAt: chargebacks.resolvedAt,
      createdAt: chargebacks.createdAt,
      updatedAt: chargebacks.updatedAt,
      vendorName: users.name,
      vendorEmail: users.email,
      payerName: transactions.payerName,
      payerEmail: transactions.payerEmail,
      payerPhone: transactions.payerPhone,
      operationNumber: transactions.operationNumber,
      linkDescription: paymentLinks.description,
    })
    .from(chargebacks)
    .leftJoin(users, eq(chargebacks.userId, users.id))
    .leftJoin(transactions, eq(chargebacks.transactionId, transactions.id))
    .leftJoin(paymentLinks, eq(transactions.paymentLinkId, paymentLinks.id))
    .where(eq(chargebacks.userId, userId))
    .orderBy(desc(chargebacks.createdAt));
  return rows;
}

export async function getAllChargebacks(): Promise<ChargebackEnriched[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: chargebacks.id,
      userId: chargebacks.userId,
      transactionId: chargebacks.transactionId,
      stripeDisputeId: chargebacks.stripeDisputeId,
      amount: chargebacks.amount,
      currency: chargebacks.currency,
      reason: chargebacks.reason,
      reasonEs: chargebacks.reasonEs,
      status: chargebacks.status,
      evidence: chargebacks.evidence,
      notes: chargebacks.notes,
      dueBy: chargebacks.dueBy,
      resolvedAt: chargebacks.resolvedAt,
      createdAt: chargebacks.createdAt,
      updatedAt: chargebacks.updatedAt,
      vendorName: users.name,
      vendorEmail: users.email,
      payerName: transactions.payerName,
      payerEmail: transactions.payerEmail,
      payerPhone: transactions.payerPhone,
      operationNumber: transactions.operationNumber,
      linkDescription: paymentLinks.description,
    })
    .from(chargebacks)
    .leftJoin(users, eq(chargebacks.userId, users.id))
    .leftJoin(transactions, eq(chargebacks.transactionId, transactions.id))
    .leftJoin(paymentLinks, eq(transactions.paymentLinkId, paymentLinks.id))
    .orderBy(desc(chargebacks.createdAt));
  return rows;
}

export async function updateChargebackStatus(id: number, status: string, notes?: string, resolvedAt?: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (resolvedAt) updateData.resolvedAt = resolvedAt;
  await db.update(chargebacks).set(updateData).where(eq(chargebacks.id, id));
}

// ─── Invoices (Facturas) ──────────────────────────────────────────────────────
export async function createInvoice(data: Omit<InsertInvoice, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(invoices).values(data as InsertInvoice);
}

export async function getInvoicesByUser(userId: number): Promise<Invoice[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number): Promise<Invoice | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function updateInvoiceStatus(id: number, status: string, issuedAt?: Date, cancelledAt?: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (issuedAt) updateData.issuedAt = issuedAt;
  if (cancelledAt) updateData.cancelledAt = cancelledAt;
  await db.update(invoices).set(updateData).where(eq(invoices.id, id));
}

// ─── Notifications (Centro de Notificaciones) ─────────────────────────────────
export async function createNotification(data: Omit<InsertNotification, "id" | "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data as InsertNotification);
}

export async function getNotificationsByUser(userId: number, limit = 50): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// Verificar si ya existe una notificación no leída del mismo tipo en las últimas N horas
export async function hasRecentNotification(userId: number, type: string, withinHours = 2): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.type, type),
      eq(notifications.isRead, false),
      gte(notifications.createdAt, cutoff)
    ));
  return Number(result[0]?.count ?? 0) > 0;
}

// Eliminar notificaciones leídas con más de N días de antigüedad
export async function cleanOldNotifications(userId: number, olderThanDays = 30): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  await db.delete(notifications).where(and(
    eq(notifications.userId, userId),
    eq(notifications.isRead, true),
    lte(notifications.createdAt, cutoff)
  ));
}

// Eliminar notificaciones duplicadas no leídas del mismo tipo (mantiene solo la más reciente)
export async function deduplicateNotifications(userId: number, type: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.type, type),
      eq(notifications.isRead, false)
    ))
    .orderBy(desc(notifications.createdAt));
  if (existing.length > 1) {
    const idsToMark = existing.slice(1).map(n => n.id);
    for (const id of idsToMark) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    }
  }
}

export async function getPendingRegistrationsOlderThan(hours: number) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(and(eq(users.accountStatus, "pending"), lte(users.createdAt, cutoff)));
}

// ─── Employee Records (Expedientes de Colaboradores) ─────────────────────────

export async function createEmployeeRecord(data: Omit<InsertEmployeeRecord, "id" | "createdAt" | "updatedAt">): Promise<EmployeeRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(employeeRecords).values(data as InsertEmployeeRecord);
  const result = await db.select().from(employeeRecords)
    .where(and(eq(employeeRecords.ownerId, data.ownerId), eq(employeeRecords.fullName, data.fullName)))
    .orderBy(desc(employeeRecords.createdAt)).limit(1);
  return result[0];
}

export async function getEmployeeRecordsByOwner(ownerId: number): Promise<EmployeeRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employeeRecords)
    .where(eq(employeeRecords.ownerId, ownerId))
    .orderBy(desc(employeeRecords.createdAt));
}

export async function getEmployeeRecordById(id: number, ownerId: number): Promise<EmployeeRecord | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employeeRecords)
    .where(and(eq(employeeRecords.id, id), eq(employeeRecords.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function updateEmployeeRecord(id: number, ownerId: number, data: Partial<InsertEmployeeRecord>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employeeRecords).set({ ...data, updatedAt: new Date() })
    .where(and(eq(employeeRecords.id, id), eq(employeeRecords.ownerId, ownerId)));
}

export async function deleteEmployeeRecord(id: number, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Borrar registros de asistencia primero (FK constraint)
  await db.delete(attendanceRecords).where(and(eq(attendanceRecords.employeeId, id), eq(attendanceRecords.ownerId, ownerId)));
  // Borrar documentos del empleado
  await db.delete(employeeDocuments).where(and(eq(employeeDocuments.employeeId, id), eq(employeeDocuments.ownerId, ownerId)));
  // Finalmente borrar el empleado
  await db.delete(employeeRecords).where(and(eq(employeeRecords.id, id), eq(employeeRecords.ownerId, ownerId)));
}

// ─── Employee Documents ───────────────────────────────────────────────────────

export async function createEmployeeDocument(data: Omit<InsertEmployeeDocument, "id" | "uploadedAt">): Promise<EmployeeDocument> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(employeeDocuments).values(data as InsertEmployeeDocument);
  const result = await db.select().from(employeeDocuments)
    .where(and(eq(employeeDocuments.employeeId, data.employeeId), eq(employeeDocuments.fileKey, data.fileKey))).limit(1);
  return result[0];
}

export async function getEmployeeDocuments(employeeId: number, ownerId: number): Promise<EmployeeDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employeeDocuments)
    .where(and(eq(employeeDocuments.employeeId, employeeId), eq(employeeDocuments.ownerId, ownerId)))
    .orderBy(desc(employeeDocuments.uploadedAt));
}

export async function deleteEmployeeDocument(id: number, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employeeDocuments).where(and(eq(employeeDocuments.id, id), eq(employeeDocuments.ownerId, ownerId)));
}

// ─── Attendance Records (Reloj Checador) ─────────────────────────────────────

export async function getNextEmployeeNumber(ownerId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "001";
  const result = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.ownerId, ownerId))
    .orderBy(desc(employeeRecords.createdAt));
  const count = result.length + 1;
  return String(count).padStart(3, "0");
}

export async function createAttendanceRecord(data: Omit<InsertAttendanceRecord, "id" | "createdAt">): Promise<AttendanceRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(attendanceRecords).values(data as InsertAttendanceRecord);
  const result = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, data.employeeId), eq(attendanceRecords.ownerId, data.ownerId)))
    .orderBy(desc(attendanceRecords.createdAt)).limit(1);
  return result[0];
}

export async function getAttendanceByEmployee(employeeId: number, ownerId: number, limit = 50): Promise<AttendanceRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.ownerId, ownerId)))
    .orderBy(desc(attendanceRecords.timestamp)).limit(limit);
}

export async function getAttendanceByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(attendanceRecords.ownerId, ownerId)];
  if (startDate) conditions.push(gte(attendanceRecords.timestamp, startDate));
  if (endDate) conditions.push(lte(attendanceRecords.timestamp, endDate));
  return db.select().from(attendanceRecords)
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.timestamp)).limit(500);
}

export async function getLastAttendanceRecord(employeeId: number, ownerId: number): Promise<AttendanceRecord | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.ownerId, ownerId)))
    .orderBy(desc(attendanceRecords.timestamp)).limit(1);
  return result[0];
}

// ─── Subscriptions (Cobros Recurrentes) ──────────────────────────────────────

export async function createSubscription(data: Omit<InsertSubscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data as InsertSubscription);
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.ownerId, data.ownerId), eq(subscriptions.customerEmail, data.customerEmail)))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return result[0];
}

export async function getSubscriptionsByOwner(ownerId: number): Promise<Subscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions)
    .where(eq(subscriptions.ownerId, ownerId))
    .orderBy(desc(subscriptions.createdAt));
}

export async function getSubscriptionById(id: number, ownerId: number): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function updateSubscription(id: number, ownerId: number, data: Partial<InsertSubscription>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set({ ...data, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, ownerId)));
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return result[0];
}

export async function getSubscriptionByCustomerAndPrice(stripeCustomerId: string, stripePriceId: string): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.stripeCustomerId, stripeCustomerId), eq(subscriptions.stripePriceId, stripePriceId)))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return result[0];
}

export async function getSubscriptionByCustomerId(stripeCustomerId: string): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return result[0];
}


// ─── Nómina (Payroll) ─────────────────────────────────────────────────────────
export async function updateEmployeePayrollData(
  id: number,
  ownerId: number,
  data: { dailyRate?: string; dailyHours?: string; restDay?: string; overtimeEnabled?: boolean; overtimeRate?: string; paymentCycle?: string; bankName?: string; clabe?: string; bankAccountHolder?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(employeeRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(employeeRecords.id, id), eq(employeeRecords.ownerId, ownerId)));
}

export async function getAttendanceForPayroll(
  ownerId: number,
  startDate: Date,
  endDate: Date
): Promise<AttendanceRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.ownerId, ownerId),
        gte(attendanceRecords.timestamp, startDate),
        lte(attendanceRecords.timestamp, endDate)
      )
    )
    .orderBy(attendanceRecords.employeeId, attendanceRecords.timestamp);
}

// ─── Attendance: Edición, Eliminación y Ausencias (Admin) ────────────────────
export async function updateAttendanceRecord(
  id: number,
  ownerId: number,
  editedByUserId: number,
  data: { type?: string; timestamp?: Date; notes?: string | null; absenceType?: string | null; comment?: string | null }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(attendanceRecords)
    .set({ ...data, editedByUserId, editedAt: new Date() })
    .where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.ownerId, ownerId)));
}

export async function deleteAttendanceRecord(id: number, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(attendanceRecords)
    .where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.ownerId, ownerId)));
}

export async function createAbsenceRecord(data: {
  employeeId: number;
  ownerId: number;
  date: Date;
  absenceType: string;
  comment?: string | null;
}): Promise<AttendanceRecord> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [rec] = await db.insert(attendanceRecords).values({
    employeeId: data.employeeId,
    ownerId: data.ownerId,
    type: "absence",
    timestamp: data.date,
    absenceType: data.absenceType,
    comment: data.comment || null,
  });
  const insertId = (rec as { insertId: number }).insertId;
  const [created] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, insertId));
  return created;
}

// ─── AGENDA MÉDICA ────────────────────────────────────────────────────────────
import {
  medicalPatients, medicalAppointments, medicalRecords,
  MedicalPatient, InsertMedicalPatient,
  MedicalAppointment, InsertMedicalAppointment,
  MedicalRecord, InsertMedicalRecord,
} from "../drizzle/schema";

export async function createMedicalPatient(data: Omit<InsertMedicalPatient, "id" | "createdAt" | "updatedAt">): Promise<MedicalPatient> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [res] = await db.insert(medicalPatients).values(data as InsertMedicalPatient);
  const insertId = (res as { insertId: number }).insertId;
  const [created] = await db.select().from(medicalPatients).where(eq(medicalPatients.id, insertId));
  return created;
}

export async function getMedicalPatientsByOwner(ownerId: number): Promise<MedicalPatient[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalPatients)
    .where(and(eq(medicalPatients.ownerId, ownerId), eq(medicalPatients.isActive, true)))
    .orderBy(desc(medicalPatients.createdAt));
}

export async function getMedicalPatientById(id: number, ownerId: number): Promise<MedicalPatient | null> {
  const db = await getDb();
  if (!db) return null;
  const [patient] = await db.select().from(medicalPatients)
    .where(and(eq(medicalPatients.id, id), eq(medicalPatients.ownerId, ownerId)));
  return patient || null;
}

export async function updateMedicalPatient(id: number, ownerId: number, data: Partial<InsertMedicalPatient>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(medicalPatients).set(data).where(and(eq(medicalPatients.id, id), eq(medicalPatients.ownerId, ownerId)));
}

export async function deleteMedicalPatient(id: number, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(medicalPatients).set({ isActive: false }).where(and(eq(medicalPatients.id, id), eq(medicalPatients.ownerId, ownerId)));
}

export async function createMedicalAppointment(data: Omit<InsertMedicalAppointment, "id" | "createdAt" | "updatedAt">): Promise<MedicalAppointment> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [res] = await db.insert(medicalAppointments).values(data as InsertMedicalAppointment);
  const insertId = (res as { insertId: number }).insertId;
  const [created] = await db.select().from(medicalAppointments).where(eq(medicalAppointments.id, insertId));
  return created;
}

export async function getMedicalAppointmentsByOwner(ownerId: number): Promise<MedicalAppointment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalAppointments)
    .where(eq(medicalAppointments.ownerId, ownerId))
    .orderBy(desc(medicalAppointments.appointmentDate));
}

export async function getMedicalAppointmentById(id: number, ownerId: number): Promise<MedicalAppointment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(medicalAppointments)
    .where(and(eq(medicalAppointments.id, id), eq(medicalAppointments.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}
export async function getMedicalAppointmentsByPatient(patientId: number, ownerId: number): Promise<MedicalAppointment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalAppointments)
    .where(and(eq(medicalAppointments.patientId, patientId), eq(medicalAppointments.ownerId, ownerId)))
    .orderBy(desc(medicalAppointments.appointmentDate));
}

export async function updateMedicalAppointment(id: number, ownerId: number, data: Partial<InsertMedicalAppointment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(medicalAppointments).set(data).where(and(eq(medicalAppointments.id, id), eq(medicalAppointments.ownerId, ownerId)));
}

export async function deleteMedicalAppointment(id: number, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(medicalAppointments).where(and(eq(medicalAppointments.id, id), eq(medicalAppointments.ownerId, ownerId)));
}

export async function createMedicalRecord(data: Omit<InsertMedicalRecord, "id" | "createdAt" | "updatedAt">): Promise<MedicalRecord> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [res] = await db.insert(medicalRecords).values(data as InsertMedicalRecord);
  const insertId = (res as { insertId: number }).insertId;
  const [created] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, insertId));
  return created;
}

export async function getMedicalRecordsByPatient(patientId: number, ownerId: number): Promise<MedicalRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalRecords)
    .where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.ownerId, ownerId)))
    .orderBy(desc(medicalRecords.recordDate));
}

export async function updateMedicalRecord(id: number, ownerId: number, data: Partial<InsertMedicalRecord>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(medicalRecords).set(data).where(and(eq(medicalRecords.id, id), eq(medicalRecords.ownerId, ownerId)));
}

// ─── Capacitaciones / Cursos ──────────────────────────────────────────────────

export async function getCourses(ownerId?: number | null): Promise<Course[]> {
  const db = await getDb();
  if (!db) return [];
  if (ownerId) {
    return db.select().from(courses)
      .where(and(eq(courses.isActive, true), or(isNull(courses.ownerId), eq(courses.ownerId, ownerId))))
      .orderBy(courses.sortOrder, courses.category, courses.title);
  }
  return db.select().from(courses)
    .where(and(eq(courses.isActive, true), isNull(courses.ownerId)))
    .orderBy(courses.sortOrder, courses.category, courses.title);
}

export async function getCourseById(id: number): Promise<Course | null> {
  const db = await getDb();
  if (!db) return null;
  const [c] = await db.select().from(courses).where(eq(courses.id, id));
  return c || null;
}

export async function createCourse(data: Omit<InsertCourse, "id" | "createdAt" | "updatedAt">): Promise<Course> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [res] = await db.insert(courses).values(data as InsertCourse);
  const insertId = (res as { insertId: number }).insertId;
  const [created] = await db.select().from(courses).where(eq(courses.id, insertId));
  return created;
}

export async function updateCourse(id: number, data: Partial<InsertCourse>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(courses).set(data).where(eq(courses.id, id));
}

export async function deleteCourse(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(courses).where(eq(courses.id, id));
}

export async function getCourseModules(courseId: number): Promise<CourseModule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(courseModules.sortOrder);
}

export async function createCourseModule(data: Omit<InsertCourseModule, "id" | "createdAt">): Promise<CourseModule> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [res] = await db.insert(courseModules).values(data as InsertCourseModule);
  const insertId = (res as { insertId: number }).insertId;
  const [created] = await db.select().from(courseModules).where(eq(courseModules.id, insertId));
  return created;
}

export async function getCourseProgress(userId: number, courseId?: number): Promise<CourseProgress[]> {
  const db = await getDb();
  if (!db) return [];
  if (courseId) {
    return db.select().from(courseProgress)
      .where(and(eq(courseProgress.userId, userId), eq(courseProgress.courseId, courseId)));
  }
  return db.select().from(courseProgress).where(eq(courseProgress.userId, userId));
}

export async function upsertCourseProgress(data: {
  userId: number;
  courseId: number;
  moduleId?: number | null;
  status: string;
  evidenceUrl?: string | null;
  evidenceKey?: string | null;
  evidenceName?: string | null;
  notes?: string | null;
}): Promise<CourseProgress> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const where = data.moduleId
    ? and(eq(courseProgress.userId, data.userId), eq(courseProgress.courseId, data.courseId), eq(courseProgress.moduleId, data.moduleId))
    : and(eq(courseProgress.userId, data.userId), eq(courseProgress.courseId, data.courseId), isNull(courseProgress.moduleId));
  const [existing] = await db.select().from(courseProgress).where(where);
  if (existing) {
    await db.update(courseProgress).set({
      status: data.status,
      completedAt: data.status === 'completed' ? new Date() : existing.completedAt,
      evidenceUrl: data.evidenceUrl !== undefined ? data.evidenceUrl : existing.evidenceUrl,
      evidenceKey: data.evidenceKey !== undefined ? data.evidenceKey : existing.evidenceKey,
      evidenceName: data.evidenceName !== undefined ? data.evidenceName : existing.evidenceName,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    }).where(eq(courseProgress.id, existing.id));
    const [updated] = await db.select().from(courseProgress).where(eq(courseProgress.id, existing.id));
    return updated;
  }
  const insertData: InsertCourseProgress = {
    userId: data.userId,
    courseId: data.courseId,
    moduleId: data.moduleId || null,
    status: data.status,
    completedAt: data.status === 'completed' ? new Date() : null,
    evidenceUrl: data.evidenceUrl || null,
    evidenceKey: data.evidenceKey || null,
    evidenceName: data.evidenceName || null,
    notes: data.notes || null,
  };
  const [res] = await db.insert(courseProgress).values(insertData);
  const insertId = (res as { insertId: number }).insertId;
  const [created] = await db.select().from(courseProgress).where(eq(courseProgress.id, insertId));
  return created;
}

export async function deleteEvidenceFromProgress(data: {
  userId: number;
  courseId: number;
  moduleId?: number | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const where = data.moduleId
    ? and(eq(courseProgress.userId, data.userId), eq(courseProgress.courseId, data.courseId), eq(courseProgress.moduleId, data.moduleId))
    : and(eq(courseProgress.userId, data.userId), eq(courseProgress.courseId, data.courseId), isNull(courseProgress.moduleId));
  await db.update(courseProgress).set({
    evidenceUrl: null,
    evidenceKey: null,
    evidenceName: null,
  }).where(where);
}

// ─── Contratos: eliminar ──────────────────────────────────────────────────────
export async function deleteContract(id: number, createdByUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.createdByUserId, createdByUserId)));
}

// ─── Comisiones automáticas de asociados ─────────────────────────────────────

/**
 * Obtiene el registro associateCommissions vinculado a un usuario cliente.
 * Busca en vendor_settings el campo referred_by_associate_commission_id.
 */
export async function getAssociateCommissionForClient(clientUserId: number): Promise<AssociateCommission | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // Buscar en vendor_settings el ID del registro de comisión del asociado
  const [vs] = await db.select({ referredByAssociateCommissionId: vendorSettings.referredByAssociateCommissionId })
    .from(vendorSettings)
    .where(eq(vendorSettings.userId, clientUserId))
    .limit(1);
  if (!vs?.referredByAssociateCommissionId) return undefined;
  // Obtener el registro de associateCommissions
  const [ac] = await db.select()
    .from(associateCommissions)
    .where(eq(associateCommissions.id, vs.referredByAssociateCommissionId))
    .limit(1);
  return ac;
}

/**
 * Registra una ganancia de comisión para el asociado cuando su cliente procesa un pago.
 * Actualiza también los totales acumulados en associateCommissions.
 */
export async function recordAssociateEarning(data: {
  associateCommissionId: number;
  associateUserId: number;
  clientUserId: number;
  transactionId?: number;
  paymentAmount: number;
  commissionRate: number;
  currency?: string;
}): Promise<AssociateEarning | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const commissionAmount = Math.round(data.paymentAmount * (data.commissionRate / 100) * 100) / 100;
  const now = Date.now();
  // Insertar el registro de ganancia
  await db.insert(associateEarnings).values({
    associateCommissionId: data.associateCommissionId,
    associateUserId: data.associateUserId,
    clientUserId: data.clientUserId,
    transactionId: data.transactionId ?? null,
    paymentAmount: String(data.paymentAmount),
    commissionRate: String(data.commissionRate),
    commissionAmount: String(commissionAmount),
    currency: data.currency ?? 'MXN',
    status: 'pending',
    createdAt: now,
  } as InsertAssociateEarning);
  // Actualizar los totales acumulados en associateCommissions
  await db.execute(sql`
    UPDATE associate_commissions
    SET totalVolumeProcessed = totalVolumeProcessed + ${data.paymentAmount},
        totalCommissionEarned = totalCommissionEarned + ${commissionAmount},
        updatedAt = ${now}
    WHERE id = ${data.associateCommissionId}
  `);
  // Retornar el registro creado
  const [created] = await db.select()
    .from(associateEarnings)
    .where(eq(associateEarnings.associateCommissionId, data.associateCommissionId))
    .orderBy(desc(associateEarnings.createdAt))
    .limit(1);
  return created;
}

/**
 * Obtiene el historial de ganancias de un asociado.
 */
export async function getAssociateEarnings(associateUserId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(associateEarnings)
    .where(eq(associateEarnings.associateUserId, associateUserId))
    .orderBy(desc(associateEarnings.createdAt))
    .limit(limit);
}

/**
 * Vincula un cliente con su asociado referidor.
 * Se llama cuando el superadmin activa el cliente (status = 'active').
 */
export async function linkClientToAssociate(clientUserId: number, associateCommissionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(vendorSettings)
    .set({ referredByAssociateCommissionId: associateCommissionId } as Partial<typeof vendorSettings.$inferInsert>)
    .where(eq(vendorSettings.userId, clientUserId));
}

// ─── Payment Consents (Evidencia Anti-Contracargos) ───────────────────────────

/**
 * Guarda el consentimiento explícito del pagador antes de procesar el pago.
 * Esta evidencia se usa para disputar contracargos ante Stripe y bancos.
 */
export async function createPaymentConsent(data: InsertPaymentConsent): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(paymentConsents).values(data);
}

/**
 * Vincula un consentimiento a una transacción confirmada.
 */
export async function linkConsentToTransaction(paymentToken: string, transactionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(paymentConsents)
    .set({ transactionId } as any)
    .where(eq(paymentConsents.paymentToken, paymentToken));
}

/**
 * Obtiene el consentimiento de un pago por token.
 */
export async function getPaymentConsent(paymentToken: string): Promise<PaymentConsent | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(paymentConsents)
    .where(eq(paymentConsents.paymentToken, paymentToken))
    .limit(1);
  return results[0] || null;
}

/**
 * Obtiene el consentimiento de un pago por transactionId.
 */
export async function getPaymentConsentByTransaction(transactionId: number): Promise<PaymentConsent | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(paymentConsents)
    .where(eq(paymentConsents.transactionId, transactionId))
    .limit(1);
  return results[0] || null;
}

/**
 * Obtiene un chargeback por stripeDisputeId.
 */
export async function getChargebackByDisputeId(stripeDisputeId: string): Promise<Chargeback | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(chargebacks)
    .where(eq(chargebacks.stripeDisputeId, stripeDisputeId))
    .limit(1);
  return results[0] || null;
}

// ─── Lista Negra de Pagadores ────────────────────────────────────────────────

/**
 * Verifica si un email está en la lista negra del usuario.
 */
export async function isPayerBlacklisted(userId: number, email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { payerBlacklist } = await import('../drizzle/schema');
  const emailLower = email.toLowerCase().trim();
  const results = await db.select({ id: payerBlacklist.id }).from(payerBlacklist)
    .where(and(
      eq(payerBlacklist.userId, userId),
      eq(payerBlacklist.type, 'email'),
      eq(payerBlacklist.value, emailLower),
      eq(payerBlacklist.isActive, true)
    )).limit(1);
  return results.length > 0;
}

/**
 * Agrega un pagador a la lista negra.
 */
export async function addPayerToBlacklist(data: {
  userId: number;
  type: 'email' | 'card_last4';
  value: string;
  reason?: string;
  chargebackId?: number;
  transactionId?: number;
  payerName?: string;
  chargebackAmount?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { payerBlacklist } = await import('../drizzle/schema');
  const normalizedValue = data.value.toLowerCase().trim();
  const existing = await db.select({ id: payerBlacklist.id }).from(payerBlacklist)
    .where(and(
      eq(payerBlacklist.userId, data.userId),
      eq(payerBlacklist.type, data.type),
      eq(payerBlacklist.value, normalizedValue),
      eq(payerBlacklist.isActive, true)
    )).limit(1);
  if (existing.length > 0) return;
  await db.insert(payerBlacklist).values({
    userId: data.userId,
    type: data.type,
    value: normalizedValue,
    reason: data.reason,
    chargebackId: data.chargebackId,
    transactionId: data.transactionId,
    payerName: data.payerName,
    chargebackAmount: data.chargebackAmount,
    isActive: true,
  });
}

/**
 * Lista todos los pagadores bloqueados de un usuario.
 */
export async function getPayerBlacklist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { payerBlacklist } = await import('../drizzle/schema');
  return db.select().from(payerBlacklist)
    .where(eq(payerBlacklist.userId, userId))
    .orderBy(desc(payerBlacklist.createdAt));
}

/**
 * Elimina (desactiva) una entrada de la lista negra.
 */
export async function removeFromBlacklist(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { payerBlacklist } = await import('../drizzle/schema');
  await db.update(payerBlacklist)
    .set({ isActive: false })
    .where(and(eq(payerBlacklist.id, id), eq(payerBlacklist.userId, userId)));
}
