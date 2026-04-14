-- ============================================================
-- Migración: Bug #3 — Índice UNIQUE en stripePaymentIntentId
-- Fecha: 2026-04-14
-- Propósito: Prevenir transacciones duplicadas ante reintentos
--            del webhook de Stripe (Stripe reintenta hasta 3 días).
-- Seguridad: Diagnóstico previo confirmó 0 duplicados en BD.
--            Todos los 8 registros existentes tienen valor único.
-- ============================================================

-- Paso 1: Limpiar stripePaymentIntentId vacíos a NULL para que
--         el índice UNIQUE permita múltiples NULLs (MySQL los trata
--         como valores distintos en índices UNIQUE).
UPDATE transactions
SET stripePaymentIntentId = NULL
WHERE stripePaymentIntentId = '';

-- Paso 2: Crear el índice UNIQUE (permite NULL múltiples)
ALTER TABLE transactions
  ADD UNIQUE INDEX idx_uniq_stripe_pi_id (stripePaymentIntentId);

-- Verificación post-migración (ejecutar manualmente para confirmar):
-- SELECT INDEX_NAME, NON_UNIQUE
-- FROM INFORMATION_SCHEMA.STATISTICS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'transactions'
--   AND COLUMN_NAME = 'stripePaymentIntentId';
-- Esperado: NON_UNIQUE = 0 (es UNIQUE)
