import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertPaymentLink,
  InsertPlatformClient,
  InsertTransaction,
  InsertUser,
  InsertVendorSettings,
  otpVerifications,
  paymentLinks,
  platformClients,
  transactions,
  users,
  vendorSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
    values.role = "admin";
    updateSet.role = "admin";
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
  return result[0];
}

export async function getTransactionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
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
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(transactions).set({ status, updatedAt: new Date(), ...extra }).where(eq(transactions.id, id));
}

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalCollected: 0, totalNetAmount: 0, totalCommission: 0, totalLinks: 0, paidLinks: 0, pendingLinks: 0 };

  const links = await db.select().from(paymentLinks).where(eq(paymentLinks.userId, userId));
  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.status, "succeeded")));

  const totalCollected = txs.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
  const totalNetAmount = txs.reduce((sum, t) => sum + parseFloat(String(t.netAmount || t.amount)), 0);
  const totalCommission = txs.reduce((sum, t) => sum + parseFloat(String(t.commissionAmount || 0)), 0);

  return {
    totalCollected,
    totalNetAmount,
    totalCommission,
    totalLinks: links.length,
    paidLinks: links.filter((l) => l.status === "paid").length,
    pendingLinks: links.filter((l) => l.status === "pending").length,
  };
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
