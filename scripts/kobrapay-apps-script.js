/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  KobraPay — Google Apps Script Web App                                      ║
 * ║  Log Central de Ingresos en tiempo real                                     ║
 * ║                                                                              ║
 * ║  INSTRUCCIONES DE INSTALACIÓN:                                               ║
 * ║  1. Abre tu Google Sheet                                                     ║
 * ║  2. Extensiones → Apps Script                                                ║
 * ║  3. Borra el código existente y pega TODO este archivo                       ║
 * ║  4. Guarda (Ctrl+S)                                                          ║
 * ║  5. Implementar → Nueva implementación                                       ║
 * ║     - Tipo: Aplicación web                                                   ║
 * ║     - Ejecutar como: Yo (tu cuenta de Google)                                ║
 * ║     - Quién tiene acceso: Cualquier persona                                  ║
 * ║  6. Haz clic en "Implementar" → Autoriza los permisos                        ║
 * ║  7. Copia la URL del Web App                                                 ║
 * ║  8. En KobraPay → Settings → Secrets:                                        ║
 * ║     GOOGLE_APPS_SCRIPT_URL = {URL copiada}                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ─── Configuración ────────────────────────────────────────────────────────────

const SHEET_NAME = "KobraPay - Pagos";

const HEADERS = [
  "Fecha",
  "Hora",
  "Cliente",
  "Email",
  "Teléfono",
  "Monto",
  "Moneda",
  "Método de Pago",
  "Status",
  "Transaction ID",
  "Payment Intent ID",   // ← Columna K: clave anti-duplicados
  "Link/Token",
  "Pago Tardío",
  "Error",
  "Tipo de Evento",
  "Vendor ID",
];

// Índice (base 0) de la columna que se usa como clave de anti-duplicados
// Columna K = Payment Intent ID = índice 10
const PI_COLUMN_INDEX = 10;

// ─── Punto de entrada: recibe POST de KobraPay ───────────────────────────────

function doPost(e) {
  try {
    // Parsear el payload JSON enviado por KobraPay
    const payload = JSON.parse(e.postData.contents);

    // Validar que viene de KobraPay
    if (!payload || !payload.paymentIntentId) {
      return jsonResponse({ success: false, error: "Payload inválido: falta paymentIntentId" });
    }

    const sheet = getOrCreateSheet();
    const result = upsertRow(sheet, payload);

    return jsonResponse({
      success: true,
      action:  result.action,
      row:     result.row,
    });
  } catch (err) {
    console.error("Error en doPost:", err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ─── GET: endpoint de verificación ───────────────────────────────────────────

function doGet(e) {
  return jsonResponse({
    status:  "ok",
    message: "KobraPay Apps Script Web App activo",
    version: "2.0",
    sheet:   SHEET_NAME,
  });
}

// ─── Obtener o crear la hoja ──────────────────────────────────────────────────

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    // Crear la hoja si no existe
    sheet = ss.insertSheet(SHEET_NAME);

    // Agregar fila de encabezados con formato
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1a1a2e");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontSize(11);

    // Congelar la primera fila
    sheet.setFrozenRows(1);

    // Ajustar anchos de columna
    sheet.setColumnWidth(1, 100);   // Fecha
    sheet.setColumnWidth(2, 80);    // Hora
    sheet.setColumnWidth(3, 160);   // Cliente
    sheet.setColumnWidth(4, 200);   // Email
    sheet.setColumnWidth(5, 140);   // Teléfono
    sheet.setColumnWidth(6, 90);    // Monto
    sheet.setColumnWidth(7, 70);    // Moneda
    sheet.setColumnWidth(8, 180);   // Método de Pago
    sheet.setColumnWidth(9, 110);   // Status
    sheet.setColumnWidth(10, 160);  // Transaction ID
    sheet.setColumnWidth(11, 220);  // Payment Intent ID
    sheet.setColumnWidth(12, 160);  // Link/Token
    sheet.setColumnWidth(13, 100);  // Pago Tardío
    sheet.setColumnWidth(14, 250);  // Error
    sheet.setColumnWidth(15, 140);  // Tipo de Evento
    sheet.setColumnWidth(16, 80);   // Vendor ID

    console.log("Hoja '" + SHEET_NAME + "' creada con encabezados.");
  }

  return sheet;
}

// ─── Insertar o actualizar fila (anti-duplicados) ─────────────────────────────

function upsertRow(sheet, payload) {
  const lastRow = sheet.getLastRow();

  // Buscar si el Payment Intent ID ya existe (anti-duplicados)
  // Columna K (índice 10, base 0) → columna 11 en Sheets (base 1)
  if (lastRow > 1) {
    const piColumn = sheet.getRange(2, PI_COLUMN_INDEX + 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < piColumn.length; i++) {
      if (piColumn[i][0] === payload.paymentIntentId) {
        // ── ACTUALIZAR fila existente ─────────────────────────────────────────
        const rowNumber = i + 2; // +2 porque empezamos en fila 2 (fila 1 = headers)
        const rowData   = buildRow(payload);
        sheet.getRange(rowNumber, 1, 1, rowData.length).setValues([rowData]);
        applyRowFormatting(sheet, rowNumber, payload.status);
        console.log("Fila actualizada en posición " + rowNumber + " para PI " + payload.paymentIntentId);
        return { action: "updated", row: rowNumber };
      }
    }
  }

  // ── AGREGAR nueva fila al final ───────────────────────────────────────────
  const newRow    = lastRow + 1;
  const rowData   = buildRow(payload);
  sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
  applyRowFormatting(sheet, newRow, payload.status);
  console.log("Nueva fila agregada en posición " + newRow + " para PI " + payload.paymentIntentId);
  return { action: "appended", row: newRow };
}

// ─── Construir array de valores para la fila ─────────────────────────────────

function buildRow(p) {
  return [
    p.fecha         || "",   // A: Fecha
    p.hora          || "",   // B: Hora
    p.cliente       || "",   // C: Cliente
    p.email         || "",   // D: Email
    p.telefono      || "",   // E: Teléfono
    p.monto         || 0,    // F: Monto (número)
    p.moneda        || "MXN",// G: Moneda
    p.metodoPago    || "",   // H: Método de Pago
    p.status        || "",   // I: Status
    p.transactionId || "",   // J: Transaction ID
    p.paymentIntentId || "", // K: Payment Intent ID (clave anti-duplicados)
    p.linkToken     || "",   // L: Link/Token
    p.pagoTardio    || "No", // M: Pago Tardío
    p.error         || "",   // N: Error
    p.tipoEvento    || "",   // O: Tipo de Evento
    p.vendorId      || "",   // P: Vendor ID
  ];
}

// ─── Formato visual por status ────────────────────────────────────────────────

function applyRowFormatting(sheet, rowNumber, status) {
  const range = sheet.getRange(rowNumber, 1, 1, HEADERS.length);

  // Alternar colores de fila para legibilidad
  const isEven = rowNumber % 2 === 0;

  if (status && status.includes("Exitoso")) {
    range.setBackground(isEven ? "#e8f5e9" : "#f1f8e9");  // Verde claro
  } else if (status && status.includes("Fallido")) {
    range.setBackground(isEven ? "#fce4ec" : "#ffeef2");  // Rojo claro
  } else if (status && status.includes("Proceso")) {
    range.setBackground(isEven ? "#fff8e1" : "#fffde7");  // Amarillo claro
  } else {
    range.setBackground(isEven ? "#f5f5f5" : "#ffffff");  // Gris alternado
  }

  // Formato de moneda en columna F (Monto)
  sheet.getRange(rowNumber, 6).setNumberFormat("$#,##0.00");
}

// ─── Helper: respuesta JSON ───────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Función de prueba (ejecutar manualmente desde el editor) ─────────────────

function testWebApp() {
  const testPayload = {
    fecha:            "14/04/2026",
    hora:             "10:32:15",
    cliente:          "Juan Pérez (TEST)",
    email:            "juan@example.com",
    telefono:         "+52 55 1234 5678",
    monto:            1500,
    moneda:           "MXN",
    metodoPago:       "Visa ****4242",
    status:           "✅ Exitoso",
    transactionId:    "txn_test_001",
    paymentIntentId:  "pi_test_KOBRAPAY_001",
    linkToken:        "tok_test_abc123",
    pagoTardio:       "No",
    error:            "",
    tipoEvento:       "payment_succeeded",
    vendorId:         "42",
    _meta: {
      source:  "kobrapay",
      version: "2.0",
      sentAt:  new Date().toISOString(),
    },
  };

  const sheet  = getOrCreateSheet();
  const result = upsertRow(sheet, testPayload);
  console.log("Test completado:", JSON.stringify(result));
}
