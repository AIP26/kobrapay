/**
 * chargebackPdf.ts
 * Genera un PDF de evidencia anti-contracargo profesional usando jsPDF.
 * Incluye: datos de la transacción, historial, notas, y sello de KobraPay.
 */
import { jsPDF } from "jspdf";

interface ChargebackPdfData {
  id: number;
  amount: number;
  currency?: string;
  status: string;
  reason?: string | null;
  reasonEs?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
  // Datos del negocio (quien genera el PDF)
  businessName?: string;
  businessEmail?: string;
  userName?: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  under_review: "En revisión",
  won: "Ganada ✓",
  lost: "Perdida",
  closed: "Cerrada",
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtCurrency(n: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
}

export function generateChargebackEvidencePdf(data: ChargebackPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const MARGIN = 20;
  const CONTENT_W = W - MARGIN * 2;
  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  // Fondo del header
  doc.setFillColor(6, 182, 212); // cyan-500
  doc.rect(0, 0, W, 40, "F");

  // Logo / título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("KobraPay", MARGIN, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Plataforma de Cobros Profesionales", MARGIN, 23);

  // Título del documento
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("EVIDENCIA ANTI-CONTRACARGO", W - MARGIN, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Caso #${data.id}`, W - MARGIN, 23, { align: "right" });
  doc.text(`Generado: ${fmtDate(new Date())}`, W - MARGIN, 29, { align: "right" });

  y = 50;

  // ── AVISO LEGAL ─────────────────────────────────────────────────────────────
  doc.setFillColor(255, 251, 235); // amber-50
  doc.setDrawColor(217, 119, 6);   // amber-600
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(146, 64, 14);   // amber-800
  doc.text("⚠  DOCUMENTO OFICIAL DE EVIDENCIA", MARGIN + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 53, 15);
  doc.text(
    "Este documento ha sido generado automáticamente por KobraPay y contiene información verificable de la transacción.",
    MARGIN + 4, y + 12,
    { maxWidth: CONTENT_W - 8 }
  );
  y += 24;

  // ── SECCIÓN: DATOS DEL CASO ──────────────────────────────────────────────────
  const drawSectionHeader = (title: string) => {
    doc.setFillColor(240, 253, 254); // cyan-50
    doc.setDrawColor(6, 182, 212);
    doc.rect(MARGIN, y, CONTENT_W, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(8, 145, 178); // cyan-600
    doc.text(title, MARGIN + 3, y + 5.5);
    y += 12;
    doc.setTextColor(30, 30, 30);
  };

  const drawRow = (label: string, value: string, highlight = false) => {
    if (highlight) {
      doc.setFillColor(240, 253, 254);
      doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label, MARGIN + 2, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(value, MARGIN + 55, y + 4, { maxWidth: CONTENT_W - 57 });
    y += 8;
  };

  drawSectionHeader("DATOS DEL CASO");
  drawRow("ID del Caso:", `#${data.id}`, true);
  drawRow("Estado actual:", STATUS_LABELS[data.status] || data.status);
  drawRow("Monto en disputa:", fmtCurrency(data.amount, data.currency || "MXN"), true);
  drawRow("Fecha de apertura:", fmtDate(data.createdAt));
  if (data.resolvedAt) drawRow("Fecha de resolución:", fmtDate(data.resolvedAt), true);
  drawRow("Motivo:", data.reasonEs || data.reason || "No especificado");
  y += 4;

  // ── SECCIÓN: DATOS DEL COMERCIO ─────────────────────────────────────────────
  drawSectionHeader("DATOS DEL COMERCIO");
  drawRow("Nombre del comercio:", data.businessName || data.userName || "KobraPay Merchant", true);
  drawRow("Email de contacto:", data.businessEmail || "—");
  drawRow("Plataforma:", "KobraPay — kobrapay.mx");
  y += 4;

  // ── SECCIÓN: NOTAS Y EVIDENCIA ───────────────────────────────────────────────
  if (data.notes) {
    drawSectionHeader("NOTAS Y EVIDENCIA");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const noteLines = doc.splitTextToSize(data.notes, CONTENT_W - 6);
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(209, 213, 219);
    const noteH = noteLines.length * 5 + 8;
    doc.roundedRect(MARGIN, y, CONTENT_W, noteH, 2, 2, "FD");
    doc.text(noteLines, MARGIN + 3, y + 6);
    y += noteH + 6;
  }

  // ── SECCIÓN: RECOMENDACIONES LEGALES ────────────────────────────────────────
  drawSectionHeader("RECOMENDACIONES PARA DISPUTAR");
  const tips = [
    "1. Adjunta contratos firmados digitalmente con el pagador.",
    "2. Incluye capturas de pantalla de la comunicación con el cliente.",
    "3. Proporciona comprobantes de entrega del servicio o producto.",
    "4. Adjunta la selfie de verificación del pagador si fue solicitada.",
    "5. Incluye el historial de transacciones de la plataforma KobraPay.",
    "6. Presenta este documento como evidencia oficial ante el banco.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  tips.forEach((tip) => {
    doc.text(tip, MARGIN + 2, y);
    y += 6;
  });
  y += 4;

  // ── SECCIÓN: VERIFICACIÓN ────────────────────────────────────────────────────
  drawSectionHeader("VERIFICACIÓN Y AUTENTICIDAD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  const verifyText = [
    `Este documento fue generado el ${fmtDate(new Date())} por el sistema KobraPay.`,
    `ID de caso: ${data.id} | Plataforma: kobrapay.mx | Soporte: soporte@kobrapay.mx`,
    "Para verificar la autenticidad de este documento, contacta a soporte@kobrapay.mx con el ID del caso.",
  ];
  verifyText.forEach((line) => {
    doc.text(line, MARGIN + 2, y, { maxWidth: CONTENT_W - 4 });
    y += 5.5;
  });

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  const pageH = 297;
  doc.setFillColor(6, 182, 212);
  doc.rect(0, pageH - 18, W, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("KobraPay — Cobra fácil, cobra global", MARGIN, pageH - 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("kobrapay.mx | soporte@kobrapay.mx", W - MARGIN, pageH - 9, { align: "right" });

  // ── SELLO DIAGONAL ──────────────────────────────────────────────────────────
  if (data.status === "won") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(22, 163, 74, 0.3 as any); // green with opacity hack
    doc.setTextColor(22, 163, 74);
    doc.text("GANADA", W / 2, pageH / 2, {
      align: "center",
      angle: 45,
    });
  }

  // ── GUARDAR ─────────────────────────────────────────────────────────────────
  doc.save(`evidencia-contracargo-caso-${data.id}.pdf`);
}
