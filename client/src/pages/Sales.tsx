import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
  AlertCircle,
  Copy,
  Phone,
  Mail,
  User,
  Calendar,
  Hash,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useState, useMemo } from "react";
import { generateEvidencePdf } from "@/lib/generateEvidencePdf";
import { toast } from "sonner";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  processing: { label: "Procesando", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  succeeded: { label: "Pagado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  failed: { label: "Fallido", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-600 border-gray-200", icon: RefreshCw },
};

// Mapa de códigos de error de Stripe a mensajes en español
function getFailureDetails(errorMessage: string | null | undefined): {
  title: string;
  description: string;
  action: string;
  icon: "fraud" | "bank" | "card" | "funds" | "generic";
} {
  const msg = (errorMessage || "").toLowerCase();

  if (msg.includes("insufficient_funds") || msg.includes("insufficient funds")) {
    return {
      title: "Fondos insuficientes",
      description: "La tarjeta no tiene saldo suficiente para completar el pago.",
      action: "Recomiéndale a tu cliente usar otra tarjeta con saldo disponible.",
      icon: "card",
    };
  }
  if (msg.includes("do_not_honor") || msg.includes("do not honor")) {
    return {
      title: "Banco no autorizó la transacción",
      description: "El banco emisor de la tarjeta rechazó el pago sin especificar el motivo.",
      action: "El cliente debe llamar a su banco para autorizar compras en línea o usar otra tarjeta.",
      icon: "bank",
    };
  }
  if (msg.includes("fraudulent") || msg.includes("fraud") || msg.includes("radar") || msg.includes("suspicious")) {
    return {
      title: "Pago sospechoso detectado",
      description: "El sistema de seguridad detectó actividad inusual en esta transacción.",
      action: "Recomiéndale a tu cliente que pague con el dispositivo y tarjeta que suele usar para compras online.",
      icon: "fraud",
    };
  }
  if (msg.includes("expired_card") || msg.includes("expired card")) {
    return {
      title: "Tarjeta vencida",
      description: "La fecha de vencimiento de la tarjeta ha expirado.",
      action: "El cliente debe usar una tarjeta vigente.",
      icon: "card",
    };
  }
  if (msg.includes("incorrect_cvc") || msg.includes("incorrect cvc") || msg.includes("cvv")) {
    return {
      title: "Código de seguridad incorrecto",
      description: "El CVV o código de seguridad ingresado no coincide con el de la tarjeta.",
      action: "El cliente debe verificar el código de seguridad (CVV/CVC) de su tarjeta.",
      icon: "card",
    };
  }
  if (msg.includes("lost_card") || msg.includes("stolen_card") || msg.includes("lost card") || msg.includes("stolen card")) {
    return {
      title: "Tarjeta reportada",
      description: "La tarjeta ha sido reportada como perdida o robada por el banco.",
      action: "El cliente debe contactar a su banco para obtener una nueva tarjeta.",
      icon: "bank",
    };
  }
  if (msg.includes("card_velocity_exceeded") || msg.includes("velocity")) {
    return {
      title: "Límite de intentos excedido",
      description: "Se realizaron demasiados intentos de pago en poco tiempo.",
      action: "El cliente debe esperar 24 horas o usar otra tarjeta.",
      icon: "card",
    };
  }
  if (msg.includes("authentication_required") || msg.includes("3d secure") || msg.includes("3ds")) {
    return {
      title: "Requiere autenticación del banco",
      description: "El banco requiere verificación adicional (3D Secure) para autorizar el pago.",
      action: "El cliente debe autorizar el pago desde la app de su banco o intentar de nuevo.",
      icon: "bank",
    };
  }
  if (msg.includes("card_declined") || msg.includes("card declined") || msg.includes("declined")) {
    return {
      title: "Tarjeta rechazada por el banco",
      description: "El banco emisor de la tarjeta rechazó el pago.",
      action: "Recomiéndale a tu cliente que llame a su banco o use otra tarjeta.",
      icon: "bank",
    };
  }
  if (msg.includes("processing_error") || msg.includes("processing error")) {
    return {
      title: "Error de procesamiento",
      description: "Ocurrió un error técnico al procesar el pago.",
      action: "El cliente puede intentar de nuevo en unos minutos.",
      icon: "generic",
    };
  }

  return {
    title: "Pago no completado",
    description: "El pago no pudo procesarse en este momento.",
    action: "Recomiéndale a tu cliente intentar de nuevo o usar otra tarjeta.",
    icon: "generic",
  };
}

type Transaction = {
  id: number;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  commissionRate?: string | number | null;
  commissionAmount?: string | number | null;
  netAmount?: string | number | null;
  errorMessage?: string | null;
  metadata?: string | null;
  createdAt: Date | string;
  ipAddress?: string | null;
  operationNumber?: string | null;
  selfieUrl?: string | null;
  signatureUrl?: string | null;
  idDocumentUrl?: string | null;
  selfieVerified?: boolean | null;
  faceMatchScore?: number | string | null;
};

function generateOperationNumber(tx: Transaction): string {
  // Usar el operationNumber guardado en BD si existe (es la fuente de verdad)
  if (tx.operationNumber) return tx.operationNumber;
  // Fallback: generar localmente
  const id = String(tx.id).padStart(6, "0");
  const ts = new Date(tx.createdAt).getTime().toString().slice(-8);
  return `KP${ts}${id}`;
}

function TransactionDetailModal({
  tx,
  onClose,
}: {
  tx: Transaction;
  onClose: () => void;
}) {
  const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const gross = Number(tx.amount);
  const commRate = Number(tx.commissionRate || 0);
  const commAmt = Number(tx.commissionAmount || 0);
  const net = Number(tx.netAmount || gross);
  const failureDetails = tx.status === "failed" ? getFailureDetails(tx.errorMessage) : null;
  const operationNumber = generateOperationNumber(tx);
  const description = tx.metadata ? (() => { try { return JSON.parse(tx.metadata).description || ""; } catch { return ""; } })() : "";
  const [isGeneratingEvidencePdf, setIsGeneratingEvidencePdf] = useState(false);

  const handleDownloadEvidencePdf = async () => {
    if (!tx.selfieUrl && !tx.signatureUrl && !tx.idDocumentUrl) {
      toast.error("Esta transacción no tiene evidencia de identidad");
      return;
    }
    setIsGeneratingEvidencePdf(true);
    try {
      await generateEvidencePdf({
        payerName: tx.payerName || "Cliente",
        payerEmail: tx.payerEmail || "",
        payerPhone: tx.payerPhone,
        operationNumber,
        amount: tx.amount,
        currency: tx.currency,
        createdAt: tx.createdAt,
        description,
        cardBrand: tx.cardBrand,
        cardLast4: tx.cardLast4,
        selfieUrl: tx.selfieUrl,
        signatureUrl: tx.signatureUrl,
        idDocumentUrl: tx.idDocumentUrl,
        faceMatchScore: tx.faceMatchScore,
        selfieVerified: tx.selfieVerified,
      });
    } catch {
      toast.error("Error al generar el PDF de evidencia");
    } finally {
      setIsGeneratingEvidencePdf(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (tx.status !== "succeeded") {
      toast.error("Solo se pueden descargar comprobantes de pagos exitosos");
      return;
    }

    const receiptHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Pago - KobraPay</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; padding: 40px 20px; color: #1a1a1a; }
    .receipt { max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #00c896 0%, #00a8e0 100%); padding: 32px 36px; color: white; }
    .header-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .header-logo .logo-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; }
    .header-logo .brand { font-size: 22px; font-weight: 800; }
    .header-logo .tagline { font-size: 11px; opacity: 0.8; }
    .amount-section { text-align: center; }
    .amount-label { font-size: 13px; opacity: 0.85; margin-bottom: 6px; }
    .amount-value { font-size: 48px; font-weight: 900; letter-spacing: -1px; }
    .amount-currency { font-size: 18px; opacity: 0.8; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.25); border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-top: 12px; }
    .body { padding: 28px 36px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 14px; margin-top: 24px; }
    .section-title:first-child { margin-top: 0; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-size: 13px; color: #6b7280; }
    .detail-value { font-size: 13px; font-weight: 600; color: #1f2937; text-align: right; max-width: 240px; }
    .operation-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; margin: 20px 0; }
    .operation-label { font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
    .operation-number { font-size: 18px; font-weight: 800; color: #1f2937; font-family: monospace; letter-spacing: 1px; }
    .totals-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 18px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
    .total-label { font-size: 13px; color: #374151; }
    .total-value { font-size: 13px; font-weight: 600; color: #374151; }
    .total-net { font-size: 16px; font-weight: 800; color: #16a34a; }
    .footer { background: #f9fafb; border-top: 1px solid #f3f4f6; padding: 20px 36px; text-align: center; }
    .footer p { font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .footer strong { color: #6b7280; }
    .secure-badges { display: flex; justify-content: center; gap: 16px; margin-top: 12px; }
    .badge { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 700; color: #374151; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="header-logo">
        <div class="logo-icon">K</div>
        <div>
          <div class="brand">KobraPay</div>
          <div class="tagline">Cobra fácil, cobra global</div>
        </div>
      </div>
      <div class="amount-section">
        <div class="amount-label">Total pagado</div>
        <div>
          <span class="amount-value">${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gross)}</span>
          <span class="amount-currency"> ${tx.currency}</span>
        </div>
        <div class="status-badge">✓ Pago Exitoso</div>
      </div>
    </div>

    <div class="body">
      <div class="operation-box">
        <div class="operation-label">N.° de Operación</div>
        <div class="operation-number">${operationNumber}</div>
      </div>

      <div class="section-title">Detalles del pago</div>
      <div class="detail-row">
        <span class="detail-label">Fecha y hora</span>
        <span class="detail-value">${formatDate(tx.createdAt)}</span>
      </div>
      ${description ? `<div class="detail-row"><span class="detail-label">Concepto</span><span class="detail-value">${description}</span></div>` : ""}
      ${tx.cardBrand && tx.cardLast4 ? `<div class="detail-row"><span class="detail-label">Medio de pago</span><span class="detail-value">${tx.cardBrand.charAt(0).toUpperCase() + tx.cardBrand.slice(1)} •••• ${tx.cardLast4}</span></div>` : ""}
      ${tx.stripePaymentIntentId ? `<div class="detail-row"><span class="detail-label">Referencia Stripe</span><span class="detail-value" style="font-size:11px;font-family:monospace">${tx.stripePaymentIntentId}</span></div>` : ""}

      <div class="section-title">Datos del cliente</div>
      ${tx.payerName ? `<div class="detail-row"><span class="detail-label">Nombre</span><span class="detail-value">${tx.payerName}</span></div>` : ""}
      ${tx.payerEmail ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${tx.payerEmail}</span></div>` : ""}
      ${tx.payerPhone ? `<div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">${tx.payerPhone}</span></div>` : ""}

      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Monto bruto</span>
          <span class="total-value">${formatCurrency(gross, tx.currency)}</span>
        </div>
        ${commRate > 0 ? `
        <div class="total-row">
          <span class="total-label">Comisión plataforma (${commRate}%)</span>
          <span class="total-value" style="color:#dc2626">-${formatCurrency(commAmt)}</span>
        </div>
        <div class="total-row" style="border-top:1px solid #bbf7d0;margin-top:8px;padding-top:8px">
          <span class="total-label" style="font-weight:700">Monto neto</span>
          <span class="total-net">${formatCurrency(net)}</span>
        </div>
        ` : ""}
      </div>
    </div>

    <div class="footer">
      <p>Este comprobante fue generado por <strong>KobraPay</strong>.<br>Pago procesado de forma segura con cifrado SSL 256-bit.</p>
      <div class="secure-badges">
        <span class="badge">VISA</span>
        <span class="badge">MASTERCARD</span>
        <span class="badge">AMEX</span>
        <span class="badge">🔒 SSL</span>
      </div>
      <p style="margin-top:10px;font-size:10px">Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([receiptHtml], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprobante-${operationNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comprobante descargado");
  };

  const copyOperationNumber = () => {
    navigator.clipboard.writeText(operationNumber);
    toast.success("Número de operación copiado");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DialogTitle className="text-gray-800">Detalle de la transacción</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Monto y estatus */}
          <div className="text-center py-4">
            <p className={`text-4xl font-black mb-2 ${tx.status === "succeeded" ? "text-gray-900" : "text-gray-400 line-through"}`}>
              {formatCurrency(gross, tx.currency)}
            </p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {cfg.label}
            </span>
            <p className="text-xs text-gray-400 mt-2">{formatDate(tx.createdAt)}</p>
          </div>

          {/* Alerta de fallo */}
          {failureDetails && (
            <div className="border-l-4 border-red-500 bg-red-50 rounded-r-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm mb-1">{failureDetails.title}</p>
                  <p className="text-red-700 text-sm mb-2">{failureDetails.description}</p>
                  <p className="text-red-600 text-xs font-medium">{failureDetails.action}</p>
                </div>
              </div>
            </div>
          )}

          {/* Número de operación */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> N.° de Operación
                </p>
                <p className="text-lg font-black text-gray-800 font-mono tracking-wide">{operationNumber}</p>
              </div>
              <button
                onClick={copyOperationNumber}
                className="text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Datos del cliente */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del cliente</p>
            <div className="space-y-2">
              {tx.payerName && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Nombre</p>
                    <p className="text-sm font-medium text-gray-800">{tx.payerName}</p>
                  </div>
                </div>
              )}
              {tx.payerEmail && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-800">{tx.payerEmail}</p>
                  </div>
                </div>
              )}
              {tx.payerPhone && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Teléfono</p>
                    <p className="text-sm font-medium text-gray-800">{tx.payerPhone}</p>
                  </div>
                </div>
              )}
              {tx.cardBrand && tx.cardLast4 && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Medio de pago</p>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {tx.cardBrand} •••• {tx.cardLast4}
                    </p>
                  </div>
                </div>
              )}
              {description && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Concepto</p>
                    <p className="text-sm font-medium text-gray-800">{description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desglose financiero */}
          {tx.status === "succeeded" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Desglose financiero</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto bruto</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(gross, tx.currency)}</span>
                </div>
                {commRate > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comisión ({commRate}%)</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(commAmt)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                      <span className="font-bold text-gray-800">Monto neto</span>
                      <span className="font-black text-green-700 text-base">{formatCurrency(net)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Evidencia del cliente */}
          {(tx.selfieUrl || tx.signatureUrl || tx.idDocumentUrl) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Evidencia de identidad
              </p>
              <div className="grid grid-cols-3 gap-2">
                {tx.selfieUrl && (
                  <a href={tx.selfieUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
                      <img src={tx.selfieUrl} alt="Selfie" className="w-full h-24 object-cover" />
                      <p className="text-center text-xs text-gray-500 py-1.5 font-medium">Foto</p>
                    </div>
                  </a>
                )}
                {tx.signatureUrl && (
                  <a href={tx.signatureUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
                      <img src={tx.signatureUrl} alt="Firma" className="w-full h-24 object-contain p-2" />
                      <p className="text-center text-xs text-gray-500 py-1.5 font-medium">Firma</p>
                    </div>
                  </a>
                )}
                {tx.idDocumentUrl && (
                  <a href={tx.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
                      <img src={tx.idDocumentUrl} alt="ID" className="w-full h-24 object-cover" />
                      <p className="text-center text-xs text-gray-500 py-1.5 font-medium">ID</p>
                    </div>
                  </a>
                )}
              </div>
              {tx.selfieVerified && (
                <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Identidad verificada {tx.faceMatchScore ? `(${tx.faceMatchScore}% coincidencia)` : ""}
                </p>
              )}
            </div>
          )}

          {/* Referencia Stripe */}
          {tx.stripePaymentIntentId && (
            <div className="text-center">
              <p className="text-xs text-gray-400">Referencia Stripe</p>
              <p className="text-xs font-mono text-gray-500 mt-0.5">{tx.stripePaymentIntentId}</p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pt-2">
            {tx.status === "succeeded" && (tx.selfieUrl || tx.signatureUrl || tx.idDocumentUrl) && (
              <Button
                onClick={handleDownloadEvidencePdf}
                disabled={isGeneratingEvidencePdf}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {isGeneratingEvidencePdf ? "Generando PDF..." : "Descargar evidencia (PDF)"}
              </Button>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cerrar
              </Button>
              {tx.status === "succeeded" && (
                <Button
                  onClick={() => {
                    const blob = new Blob([`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Comprobante - KobraPay</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;padding:40px 20px;color:#1a1a1a}.receipt{max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12)}.header{background:linear-gradient(135deg,#00c896 0%,#00a8e0 100%);padding:32px 36px;color:white;text-align:center}.brand{font-size:22px;font-weight:800;margin-bottom:16px}.amount{font-size:48px;font-weight:900}.badge{display:inline-block;background:rgba(255,255,255,0.25);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;margin-top:12px}.body{padding:28px 36px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px}.label{color:#6b7280}.value{font-weight:600;color:#1f2937}.op-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;margin:20px 0}.op-label{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px}.op-num{font-size:18px;font-weight:800;font-family:monospace}.footer{background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 36px;text-align:center;font-size:11px;color:#9ca3af}@media print{body{background:white;padding:0}.receipt{box-shadow:none;border-radius:0}}</style></head><body><div class="receipt"><div class="header"><div class="brand">&#x1F40D; KobraPay</div><div class="amount">$${new Intl.NumberFormat("es-MX",{minimumFractionDigits:2}).format(Number(tx.amount))} ${tx.currency}</div><div class="badge">&#x2713; Pago Exitoso</div></div><div class="body"><div class="op-box"><div class="op-label">N.&deg; de Operaci&oacute;n</div><div class="op-num">${operationNumber}</div></div><div class="row"><span class="label">Fecha</span><span class="value">${new Date(tx.createdAt).toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span></div><div class="row"><span class="label">Cliente</span><span class="value">${tx.payerName||"&mdash;"}</span></div><div class="row"><span class="label">Email</span><span class="value">${tx.payerEmail||"&mdash;"}</span></div>${description?`<div class="row"><span class="label">Descripci&oacute;n</span><span class="value">${description}</span></div>`:""}<div class="row"><span class="label">Tarjeta</span><span class="value">${tx.cardBrand?`${tx.cardBrand} ****${tx.cardLast4}`:"&mdash;"}</span></div><div class="row"><span class="label">Monto bruto</span><span class="value">$${new Intl.NumberFormat("es-MX",{minimumFractionDigits:2}).format(Number(tx.amount))} ${tx.currency}</span></div><div class="row"><span class="label">Comisi&oacute;n</span><span class="value">$${new Intl.NumberFormat("es-MX",{minimumFractionDigits:2}).format(Number(tx.commissionAmount||0))}</span></div><div class="row"><span class="label">Monto neto</span><span class="value" style="color:#16a34a;font-weight:800">$${new Intl.NumberFormat("es-MX",{minimumFractionDigits:2}).format(Number(tx.netAmount||tx.amount))} ${tx.currency}</span></div></div><div class="footer">KobraPay &mdash; kobrapay.mx &mdash; <a href="mailto:soporte@kobrapay.mx">soporte@kobrapay.mx</a><br>&copy; ${new Date().getFullYear()} KobraPay. Todos los derechos reservados.</div></div></body></html>`], { type: "text/html;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                    setTimeout(() => URL.revokeObjectURL(url), 15000);
                  }}
                  variant="outline"
                  className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Ver
                </Button>
              )}
              {tx.status === "succeeded" && (
                <Button
                  onClick={handleDownloadReceipt}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function groupByDate(txs: Transaction[]) {
  const groups: { label: string; items: Transaction[] }[] = [];
  const seen = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const d = new Date(tx.createdAt);
    const label = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    if (!seen.has(label)) {
      seen.set(label, []);
      groups.push({ label, items: seen.get(label)! });
    }
    seen.get(label)!.push(tx);
  }
  return groups;
}

export default function Sales() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "succeeded" | "pending" | "failed">("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Debounce the search input
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const queryInput = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: filter !== "all" ? filter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [debouncedSearch, filter, dateFrom, dateTo]);

  const { data: transactions, isLoading, refetch, isFetching } = trpc.transactions.list.useQuery(
    queryInput,
    { refetchInterval: 30000 }
  );
  const { data: stats } = trpc.transactions.stats.useQuery();
  const { data: exportData, refetch: fetchExport } = trpc.transactions.exportCsv.useQuery(
    undefined,
    { enabled: false }
  );

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions;
  }, [transactions]);

  const groupedByDate = useMemo(() => groupByDate(filtered), [filtered]);

  const totalFiltered = filtered.reduce((sum, tx) => {
    if (tx.status === "succeeded") return sum + Number(tx.amount);
    return sum;
  }, 0);

  const totalCommission = filtered.reduce((sum, tx) => {
    if (tx.status === "succeeded") return sum + Number(tx.commissionAmount || 0);
    return sum;
  }, 0);

  const totalNet = totalFiltered - totalCommission;

  const handleExportCSV = async () => {
    try {
      const result = await fetchExport();
      if (result.data?.csv) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ventas-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${result.data.count} transacciones exportadas`);
      }
    } catch {
      toast.error("Error al exportar");
    }
  };

  return (
    <DashboardLayout title="Mis Ventas">
      <div className="space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total cobrado",
              value: formatCurrency(stats?.totalCollected ?? 0),
              icon: TrendingUp,
              iconColor: "text-green-600",
              iconBg: "bg-green-100",
            },
            {
              label: "Ventas exitosas",
              value: String(stats?.paidLinks ?? 0),
              icon: CheckCircle2,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
            },
            {
              label: "Pendientes",
              value: String(stats?.pendingLinks ?? 0),
              icon: Clock,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-100",
            },
            {
              label: "Total enlaces",
              value: String(stats?.totalLinks ?? 0),
              icon: BarChart3,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100",
            },
          ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
            <Card key={label} className="border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
                  </div>
                  <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Card */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex-1">
                Historial de transacciones
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-8 text-xs border-gray-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 text-xs border-gray-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar por cliente, email o N.° de operación..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-8 text-sm border-gray-200"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(["all", "succeeded", "pending", "failed"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filter === f
                          ? "bg-cyan-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {f === "all" ? "Todos" : f === "succeeded" ? "Pagados" : f === "pending" ? "Pendientes" : "Fallidos"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Date range filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 flex-shrink-0">Desde</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 text-xs border-gray-200 flex-1"
                  />
                  <span className="text-xs text-gray-500 flex-shrink-0">Hasta</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 text-xs border-gray-200 flex-1"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    Limpiar fechas
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 animate-pulse rounded w-32" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-48" />
                    </div>
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-20" />
                    <div className="h-6 bg-gray-100 animate-pulse rounded w-16" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-600 mb-1">
                  {search || filter !== "all" || dateFrom || dateTo ? "Sin resultados" : "Sin transacciones aún"}
                </p>
                <p className="text-sm text-gray-400">
                  {search || filter !== "all" || dateFrom || dateTo
                    ? "Intenta con otros filtros o cambia el rango de fechas"
                    : "Las transacciones aparecerán aquí cuando tus clientes paguen"}
                </p>
              </div>
            ) : (
              <>
                {/* Activity Feed agrupado por fecha - estilo MercadoPago */}
                <div className="divide-y divide-gray-50">
                  {groupedByDate.map(({ label, items }) => (
                    <div key={label}>
                      {/* Separador de fecha */}
                      <div className="px-6 py-2 bg-gray-50/70 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 capitalize">{label}</p>
                      </div>
                      {/* Items del día */}
                      {items.map((tx) => {
                        const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
                        const gross = Number(tx.amount);
                        const commAmt = Number(tx.commissionAmount || 0);
                        const net = Number(tx.netAmount || gross);
                        const opNum = generateOperationNumber(tx as Transaction);
                        const failInfo = tx.status === "failed" ? getFailureDetails(tx.errorMessage) : null;
                        const timeStr = new Date(tx.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
                        return (
                          <div
                            key={tx.id}
                            onClick={() => setSelectedTx(tx as Transaction)}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-cyan-50/30 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                          >
                            {/* Ícono de bolsa con estado */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                                tx.status === "succeeded"
                                  ? "bg-gray-100 border-gray-200"
                                  : tx.status === "failed"
                                  ? "bg-gray-100 border-red-200"
                                  : "bg-gray-100 border-gray-200"
                              }`}>
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm6.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                              </div>
                              {tx.status === "failed" && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold leading-none">!</span>
                                </div>
                              )}
                            </div>

                            {/* Info central */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {tx.status === "failed" ? (
                                    <span className="text-red-600">Rechazado</span>
                                  ) : tx.status === "succeeded" ? (
                                    <span className="text-gray-800">Venta</span>
                                  ) : (
                                    <span className="text-amber-600">Pendiente</span>
                                  )}
                                  {tx.payerName ? ` · ${tx.payerName}` : ""}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 font-mono">Operación {opNum}</p>
                              {failInfo && (
                                <p className="text-xs text-red-500 mt-0.5">{failInfo.title}</p>
                              )}
                            </div>

                            {/* Monto y hora */}
                            <div className="text-right flex-shrink-0">
                              <p className={`font-bold text-sm ${
                                tx.status === "succeeded"
                                  ? "text-green-600"
                                  : "text-gray-400 line-through"
                              }`}>
                                {tx.status === "succeeded" ? "+" : ""}{formatCurrency(tx.status === "succeeded" ? net : gross, tx.currency)}
                              </p>
                              {commAmt > 0 && tx.status === "succeeded" && (
                                <p className="text-xs text-orange-400">-{formatCurrency(commAmt)} comisión</p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5">{timeStr} hs</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Summary Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      {filtered.length} transacción{filtered.length !== 1 ? "es" : ""}
                      {" · "}
                      <span className="text-gray-400">Haz clic en una fila para ver el detalle</span>
                    </p>
                    <div className="flex items-center gap-4">
                      {totalCommission > 0 && (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Bruto</p>
                            <p className="text-sm font-semibold text-gray-700">{formatCurrency(totalFiltered)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Comisión</p>
                            <p className="text-sm font-semibold text-orange-600">-{formatCurrency(totalCommission)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Neto</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrency(totalNet)}</p>
                          </div>
                        </>
                      )}
                      {totalCommission === 0 && (
                        <p className="text-sm font-semibold text-green-600">
                          Total: {formatCurrency(totalFiltered)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalle */}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </DashboardLayout>
  );
}
