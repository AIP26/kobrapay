/**
 * SCRIPT DE DIAGNÓSTICO — Bug #3
 * Detecta duplicados en stripePaymentIntentId antes de aplicar la migración UNIQUE.
 * Ejecutar con: node scripts/diagnose-pi-duplicates.mjs
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

console.log("=== Diagnóstico: stripePaymentIntentId duplicados ===\n");

// 1. Total de transacciones
const [[{ total }]] = await conn.execute("SELECT COUNT(*) AS total FROM transactions");
console.log(`Total de transacciones en BD: ${total}`);

// 2. Cuántas tienen stripePaymentIntentId NULL o vacío
const [[{ nullOrEmpty }]] = await conn.execute(
  "SELECT COUNT(*) AS nullOrEmpty FROM transactions WHERE stripePaymentIntentId IS NULL OR stripePaymentIntentId = ''"
);
console.log(`Con stripePaymentIntentId NULL o vacío: ${nullOrEmpty}`);

// 3. Cuántas tienen valor real
const [[{ withValue }]] = await conn.execute(
  "SELECT COUNT(*) AS withValue FROM transactions WHERE stripePaymentIntentId IS NOT NULL AND stripePaymentIntentId != ''"
);
console.log(`Con stripePaymentIntentId con valor: ${withValue}`);

// 4. Detectar duplicados exactos
const [duplicates] = await conn.execute(`
  SELECT stripePaymentIntentId, COUNT(*) AS cnt
  FROM transactions
  WHERE stripePaymentIntentId IS NOT NULL AND stripePaymentIntentId != ''
  GROUP BY stripePaymentIntentId
  HAVING cnt > 1
  ORDER BY cnt DESC
`);

if (duplicates.length === 0) {
  console.log("\n✅ No hay duplicados en stripePaymentIntentId. La migración UNIQUE es segura.");
} else {
  console.log(`\n⚠️  Se encontraron ${duplicates.length} IDs duplicados:`);
  for (const row of duplicates) {
    console.log(`  - ${row.stripePaymentIntentId}: ${row.cnt} registros`);
    // Mostrar los IDs de transacción duplicados para limpieza manual
    const [txRows] = await conn.execute(
      "SELECT id, status, createdAt FROM transactions WHERE stripePaymentIntentId = ? ORDER BY createdAt ASC",
      [row.stripePaymentIntentId]
    );
    for (const tx of txRows) {
      console.log(`      TX id=${tx.id} status=${tx.status} createdAt=${tx.createdAt}`);
    }
  }
  console.log("\n❌ DETENER MIGRACIÓN. Limpiar duplicados primero con el script de limpieza.");
}

// 5. Verificar si ya existe el índice UNIQUE
const [indexes] = await conn.execute(`
  SELECT INDEX_NAME, NON_UNIQUE
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transactions'
    AND COLUMN_NAME = 'stripePaymentIntentId'
`);

if (indexes.length > 0) {
  const idx = indexes[0];
  console.log(`\n📋 Índice existente en stripePaymentIntentId: ${idx.INDEX_NAME} (UNIQUE=${idx.NON_UNIQUE === 0 ? "SÍ" : "NO"})`);
  if (idx.NON_UNIQUE === 0) {
    console.log("✅ El índice UNIQUE ya existe. No es necesario aplicar la migración.");
  }
} else {
  console.log("\n📋 No existe índice en stripePaymentIntentId. La migración es necesaria.");
}

await conn.end();
console.log("\n=== Diagnóstico completado ===");
