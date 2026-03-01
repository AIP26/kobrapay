import jsPDF from "jspdf";

interface Medication {
  name: string;
  dose: string;
  instructions: string;
}

interface PrescriptionPdfData {
  // Doctor
  doctorName: string;
  specialty?: string | null;
  licenseNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  headerImageUrl?: string | null;
  stampUrl?: string | null;
  signatureDataUrl?: string | null; // base64 canvas
  // Paciente
  patientName: string;
  patientAge?: number | null;
  // Receta
  prescriptionDate: string;
  diagnosis?: string | null;
  medications: Medication[];
  notes?: string | null;
  folio?: string | null;
}

async function loadImageViaProxy(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // Si ya es base64, devolverla directamente
    if (url.startsWith("data:")) return url;
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function generatePrescriptionPdf(data: PrescriptionPdfData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Cargar imágenes en paralelo ──────────────────────────────────────────────
  const [headerB64, stampB64] = await Promise.all([
    data.headerImageUrl ? loadImageViaProxy(data.headerImageUrl) : Promise.resolve(null),
    data.stampUrl ? loadImageViaProxy(data.stampUrl) : Promise.resolve(null),
  ]);
  const signatureB64 = data.signatureDataUrl || null;

  // ── Membrete / Header ────────────────────────────────────────────────────────
  if (headerB64) {
    // Si tiene imagen de membrete, usarla como encabezado
    try {
      const imgType = headerB64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(headerB64, imgType, 0, 0, pageW, 45, undefined, "FAST");
      y = 50;
    } catch {
      y = drawTextHeader(doc, data, margin, contentW);
    }
  } else {
    y = drawTextHeader(doc, data, margin, contentW);
  }

  // ── Línea separadora ─────────────────────────────────────────────────────────
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Datos del paciente ───────────────────────────────────────────────────────
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.text("DATOS DEL PACIENTE", margin + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const col1 = margin + 5;
  const col2 = margin + contentW / 2 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", col1, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(data.patientName || "—", col1 + 22, y + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Edad:", col2, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(data.patientAge ? `${data.patientAge} años` : "—", col2 + 16, y + 14);

  y += 28;

  // ── Fecha y folio ────────────────────────────────────────────────────────────
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${formatDate(data.prescriptionDate)}`, col1, y);
  if (data.folio) {
    doc.text(`Folio: ${data.folio}`, pageW - margin, y, { align: "right" });
  }
  y += 8;

  // ── Diagnóstico ──────────────────────────────────────────────────────────────
  if (data.diagnosis) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin, y, contentW, 16, 2, 2, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(113, 63, 18);
    doc.text("Diagnóstico:", col1, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    const diagLines = doc.splitTextToSize(data.diagnosis, contentW - 40);
    doc.text(diagLines[0] || "", col1 + 28, y + 6);
    if (diagLines[1]) doc.text(diagLines[1], col1, y + 12);
    y += 22;
  }

  // ── Medicamentos ─────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text("Rx", margin, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("MEDICAMENTOS PRESCRITOS", margin + 8, y + 7);

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 10, pageW - margin, y + 10);
  y += 16;

  data.medications.forEach((med, idx) => {
    if (y > pageH - 60) {
      doc.addPage();
      y = 20;
    }

    // Número y nombre del medicamento
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    const medBoxH = 24;
    doc.roundedRect(margin, y, contentW, medBoxH, 2, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 118, 110);
    doc.text(`${idx + 1}.`, margin + 4, y + 8);

    doc.setTextColor(30, 41, 59);
    doc.text(med.name || "—", margin + 12, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    doc.setFont("helvetica", "bold");
    doc.text("Dosis:", margin + 12, y + 16);
    doc.setFont("helvetica", "normal");
    doc.text(med.dose || "—", margin + 28, y + 16);

    if (med.instructions) {
      doc.setFont("helvetica", "bold");
      doc.text("Indicaciones:", col2 - 5, y + 16);
      doc.setFont("helvetica", "normal");
      const instrLines = doc.splitTextToSize(med.instructions, contentW / 2 - 10);
      doc.text(instrLines[0] || "", col2 + 26, y + 16);
    }

    y += medBoxH + 4;
  });

  y += 6;

  // ── Notas adicionales ────────────────────────────────────────────────────────
  if (data.notes) {
    if (y > pageH - 60) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(241, 245, 249);
    const notesLines = doc.splitTextToSize(data.notes, contentW - 12);
    const notesH = notesLines.length * 5 + 14;
    doc.roundedRect(margin, y, contentW, notesH, 2, 2, "F");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Notas adicionales:", margin + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(notesLines, margin + 5, y + 13);
    y += notesH + 10;
  }

  // ── Firma y sello ────────────────────────────────────────────────────────────
  if (y > pageH - 70) {
    doc.addPage();
    y = 20;
  }

  y = Math.max(y, pageH - 70);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Área de firma (izquierda)
  const sigAreaW = contentW / 2 - 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, sigAreaW, 40, 2, 2, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, sigAreaW, 40, 2, 2, "S");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("FIRMA DEL MÉDICO", margin + sigAreaW / 2, y + 6, { align: "center" });

  if (signatureB64) {
    try {
      const imgType = signatureB64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(signatureB64, imgType, margin + 5, y + 8, sigAreaW - 10, 22, undefined, "FAST");
    } catch {
      // sin firma
    }
  }

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(margin + 8, y + 34, margin + sigAreaW - 8, y + 34);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(data.doctorName, margin + sigAreaW / 2, y + 38, { align: "center" });

  // Área de sello (derecha)
  const stampX = margin + sigAreaW + 20;
  const stampAreaW = contentW / 2 - 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(stampX, y, stampAreaW, 40, 2, 2, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(stampX, y, stampAreaW, 40, 2, 2, "S");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("SELLO", stampX + stampAreaW / 2, y + 6, { align: "center" });

  if (stampB64) {
    try {
      const imgType = stampB64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(stampB64, imgType, stampX + 5, y + 8, stampAreaW - 10, 28, undefined, "FAST");
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("(Sin sello)", stampX + stampAreaW / 2, y + 22, { align: "center" });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("(Sin sello)", stampX + stampAreaW / 2, y + 22, { align: "center" });
  }

  // ── Pie de página ────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento generado el ${new Date().toLocaleString("es-MX")} · KobraPay`,
    pageW / 2,
    pageH - 6,
    { align: "center" }
  );

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const safePatient = data.patientName.replace(/\s+/g, "-").toLowerCase();
  const safeDate = data.prescriptionDate.slice(0, 10);
  doc.save(`receta-${safePatient}-${safeDate}.pdf`);
}

function drawTextHeader(
  doc: jsPDF,
  data: PrescriptionPdfData,
  margin: number,
  contentW: number
): number {
  const pageW = 210;
  // Fondo verde oscuro
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.doctorName, margin, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (data.specialty) doc.text(data.specialty, margin, 20);
  if (data.licenseNumber) doc.text(`Cédula Prof.: ${data.licenseNumber}`, margin, 27);

  const rightX = pageW - margin;
  if (data.phone) doc.text(`Tel: ${data.phone}`, rightX, 20, { align: "right" });
  if (data.email) doc.text(data.email, rightX, 27, { align: "right" });
  if (data.address) {
    const addrLines = doc.splitTextToSize(data.address, contentW / 2);
    doc.text(addrLines[0] || "", rightX, 34, { align: "right" });
  }

  return 44;
}
