// Almacenamiento local en volumen persistente (Railway Volume).
// Reemplaza al proxy de storage de Manus (Forge) tras la migración.
//
// Los archivos se guardan en STORAGE_DIR (por defecto ./data/storage) y se
// sirven por HTTP en /api/files/<key>. Las claves incluyen componentes
// aleatorios (nanoid) generados por los llamadores, por lo que las URLs no
// son enumerables. PENDIENTE (hardening): URLs firmadas con expiración.

import fs from "fs";
import path from "path";
import { ENV } from "./_core/env";

function getStorageDir(): string {
  return ENV.storageDir || path.resolve(process.cwd(), "data", "storage");
}

// Normaliza y valida la clave: sin separadores iniciales, sin traversal.
function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  const resolved = path.resolve(getStorageDir(), key);
  if (!resolved.startsWith(path.resolve(getStorageDir()) + path.sep)) {
    throw new Error("Invalid storage key (path traversal)");
  }
  return key;
}

function buildPublicUrl(key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `/api/files/${encoded}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const filePath = path.resolve(getStorageDir(), key);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const buffer =
    typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  await fs.promises.writeFile(filePath, buffer);
  return { key, url: buildPublicUrl(key) };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: buildPublicUrl(key) };
}

// ─── Helpers para el endpoint de descarga ────────────────────────────────────

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

export function resolveStorageFile(relKey: string): {
  filePath: string;
  contentType: string;
} | null {
  try {
    const key = normalizeKey(relKey);
    const filePath = path.resolve(getStorageDir(), key);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return null;
    }
    const ext = path.extname(filePath).toLowerCase();
    return {
      filePath,
      contentType: MIME_BY_EXT[ext] ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}
