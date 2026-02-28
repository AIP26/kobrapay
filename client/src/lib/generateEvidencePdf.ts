import jsPDF from "jspdf";

interface EvidencePdfData {
  // Datos del cliente
  payerName: string;
  payerEmail: string;
  payerPhone?: string | null;
  // Datos de la transacción
  operationNumber?: string | null;
  amount: number | string;
  currency?: string;
  createdAt: Date | string;
  description?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  // Dirección
  shippingAddress?: string | null;
  // Evidencia
  selfieUrl?: string | null;
  signatureUrl?: string | null;
  idDocumentUrl?: string | null;
  faceMatchScore?: number | string | null;
  selfieVerified?: boolean | null;
  // Negocio
  businessName?: string;
}

/**
 * Carga una imagen a través del proxy del servidor para evitar bloqueos CORS.
 * Convierte la imagen a base64 para insertarla en el PDF.
 */
async function loadImageViaProxy(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // Usar el proxy del servidor para evitar CORS
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateEvidencePdf(data: EvidencePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // dark navy
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("KobraPay", margin, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Expediente de Evidencia de Pago", margin, 21);

  if (data.operationNumber) {
    doc.setFontSize(8);
    doc.text(`Op. #${data.operationNumber}`, pageW - margin, 14, { align: "right" });
  }
  doc.setFontSize(8);
  doc.text(`Generado: ${formatDate(new Date())}`, pageW - margin, 21, { align: "right" });

  y = 42;

  // ── Datos del Cliente ────────────────────────────────────────────────────────
  const clientBoxH = data.shippingAddress ? 46 : 38;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentW, clientBoxH, 3, 3, "F");

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const col1x = margin + 6;
  const col2x = margin + contentW / 2 + 4;

  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", col1x, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(data.payerName || "—", col1x + 22, y + 17);

  doc.setFont("helvetica", "bold");
  doc.text("Email:", col2x, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(data.payerEmail || "—", col2x + 16, y + 17);

  doc.setFont("helvetica", "bold");
  doc.text("Teléfono:", col1x, y + 25);
  doc.setFont("helvetica", "normal");
  doc.text(data.payerPhone || "—", col1x + 22, y + 25);

  if (data.shippingAddress) {
    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", col1x, y + 33);
    doc.setFont("helvetica", "normal");
    const addrLines = doc.splitTextToSize(data.shippingAddress, contentW - 30);
    doc.text(addrLines[0] || "—", col1x + 24, y + 33);
    if (addrLines[1]) doc.text(addrLines[1], col1x + 24, y + 39);
  }

  y += clientBoxH + 10;

  // ── Datos de la Transacción ──────────────────────────────────────────────────
  // Altura dinámica según si hay descripción
  const txBoxH = data.description ? 38 : 30;
  doc.setFillColor(220, 252, 231); // light green
  doc.roundedRect(margin, y, contentW, txBoxH, 3, 3, "F");

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE LA TRANSACCIÓN", margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.setFont("helvetica", "bold");
  doc.text("Monto:", col1x, y + 17);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(22, 163, 74); // green
  doc.text(formatCurrency(data.amount, data.currency || "MXN"), col1x + 18, y + 17);

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", col2x, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(data.createdAt), col2x + 16, y + 17);

  if (data.cardBrand && data.cardLast4) {
    doc.setFont("helvetica", "bold");
    doc.text("Tarjeta:", col2x, y + 25);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.cardBrand.toUpperCase()} ····${data.cardLast4}`, col2x + 18, y + 25);
  }

  if (data.description) {
    doc.setFont("helvetica", "bold");
    doc.text("Producto:", col1x, y + 25);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(data.description, contentW - 30);
    doc.text(descLines[0] || "—", col1x + 24, y + 25);
    if (descLines[1]) {
      doc.text(descLines[1], col1x + 24, y + 31);
    }
  }

  y += txBoxH + 10;

  // ── Evidencia de Identidad ───────────────────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("EVIDENCIA DE IDENTIDAD", margin, y + 6);

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 9, pageW - margin, y + 9);

  y += 16;

  // Cargar imágenes en paralelo usando el proxy del servidor
  const [selfieB64, signatureB64, idB64] = await Promise.all([
    data.selfieUrl ? loadImageViaProxy(data.selfieUrl) : Promise.resolve(null),
    data.signatureUrl ? loadImageViaProxy(data.signatureUrl) : Promise.resolve(null),
    data.idDocumentUrl ? loadImageViaProxy(data.idDocumentUrl) : Promise.resolve(null),
  ]);

  const imgW = (contentW - 12) / 3;
  const imgH = 52;
  const imgY = y + 10;

  // ── Selfie ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, imgW, imgH + 18, 3, 3, "F");
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, imgW, imgH + 18, 3, 3, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("FOTO / SELFIE", margin + imgW / 2, y + 6, { align: "center" });

  if (selfieB64) {
    try {
      const imgType = selfieB64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(selfieB64, imgType, margin + 2, imgY, imgW - 4, imgH - 4, undefined, "FAST");
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("No disponible", margin + imgW / 2, imgY + imgH / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("No disponible", margin + imgW / 2, imgY + imgH / 2, { align: "center" });
  }

  if (data.faceMatchScore) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(`✓ ${Number(data.faceMatchScore).toFixed(1)}% match`, margin + imgW / 2, y + imgH + 13, { align: "center" });
  }

  // ── Firma ──
  const sigX = margin + imgW + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(sigX, y, imgW, imgH + 18, 3, 3, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sigX, y, imgW, imgH + 18, 3, 3, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("FIRMA DIGITAL", sigX + imgW / 2, y + 6, { align: "center" });

  if (signatureB64) {
    try {
      const imgType = signatureB64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(signatureB64, imgType, sigX + 2, imgY, imgW - 4, imgH - 4, undefined, "FAST");
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("No disponible", sigX + imgW / 2, imgY + imgH / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("No disponible", sigX + imgW / 2, imgY + imgH / 2, { align: "center" });
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Firmado digitalmente", sigX + imgW / 2, y + imgH + 13, { align: "center" });

  // ── Identificación ──
  const idX = margin + (imgW + 6) * 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(idX, y, imgW, imgH + 18, 3, 3, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(idX, y, imgW, imgH + 18, 3, 3, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("IDENTIFICACIÓN", idX + imgW / 2, y + 6, { align: "center" });

  if (idB64) {
    try {
      const imgType = idB64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(idB64, imgType, idX + 2, imgY, imgW - 4, imgH - 4, undefined, "FAST");
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("No disponible", idX + imgW / 2, imgY + imgH / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("No disponible", idX + imgW / 2, imgY + imgH / 2, { align: "center" });
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Documento oficial", idX + imgW / 2, y + imgH + 13, { align: "center" });

  y += imgH + 30;

  // ── Declaración legal ────────────────────────────────────────────────────────
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(253, 224, 71);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(113, 63, 18);
  doc.text("DECLARACIÓN DE AUTENTICIDAD", margin + 6, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(92, 60, 15);
  const productStr = data.description ? ` por concepto de "${data.description}"` : "";
  const legalText = `Este documento certifica que el cliente ${data.payerName} realizó el pago de ${formatCurrency(data.amount, data.currency || "MXN")}${productStr} el ${formatDate(data.createdAt)}. La identidad fue verificada mediante selfie, firma digital y documento de identidad oficial. Este expediente puede ser utilizado como evidencia ante contracargos o disputas.`;
  const legalLines = doc.splitTextToSize(legalText, contentW - 12);
  doc.text(legalLines, margin + 6, y + 14);

  y += 38;

  // ── Pie de página ────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("KobraPay · kobrapay.mx · Cobra fácil, cobra global", pageW / 2, y + 6, { align: "center" });
  doc.text(`Documento generado automáticamente · ${new Date().toISOString()}`, pageW / 2, y + 11, { align: "center" });

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const filename = `evidencia-${data.operationNumber || "pago"}-${data.payerName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}
