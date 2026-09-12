export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL ?? "noreply@kobrapay.mx",
  // URL pública de la app (para links absolutos en emails y archivos)
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  // Directorio del volumen persistente para evidencias (Railway: /data/storage)
  storageDir: process.env.STORAGE_DIR ?? "",
  // Funciones de IA desactivadas por defecto (pendiente: proveedor propio)
  aiEnabled: process.env.AI_ENABLED === "true",
  // Proveedor OpenAI-compatible para reactivar IA después (opcional)
  aiApiUrl: process.env.AI_API_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "gpt-4o-mini",
};
