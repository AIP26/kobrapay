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
  MessageCircle,
  Trash2,
  KeyRound,
  Lock,
  CheckSquare,
  Square,
  X,
  Repeat,
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { generateEvidencePdf } from "@/lib/generateEvidencePdf";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

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
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-muted-foreground border-gray-200", icon: RefreshCw },
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
  // Sistema 3: Trazabilidad OXXO/SPEI tardío
  paidAfterExpiry?: boolean | null;
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
  currentUser,
}: {
  tx: Transaction;
  onClose: () => void;
  currentUser?: { role?: string; staffRole?: string | null } | null;
}) {
  const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const gross = Number(tx.amount);
  const commRate = Number(tx.commissionRate || 0);
  const commAmt = Number(tx.commissionAmount || 0);
  const net = Number(tx.netAmount || gross);
  const { data: settings } = trpc.vendor.getSettings.useQuery();
  const ivaRate = settings?.ivaEnabled !== false ? Number(settings?.ivaRate || 16) / 100 : 0;
  const ivaAmt = commAmt * ivaRate;
  const totalKobraPay = commAmt + ivaAmt;
  const failureDetails = tx.status === "failed" ? getFailureDetails(tx.errorMessage) : null;
  const operationNumber = generateOperationNumber(tx);
  const description = tx.metadata ? (() => { try { return JSON.parse(tx.metadata).description || ""; } catch { return ""; } })() : "";
  // Empleado = rol 'user' con staffRole asignado. Solo puede SOLICITAR reembolsos.
  const isEmployee = currentUser?.role === 'user' && currentUser?.staffRole != null;
  const [isGeneratingEvidencePdf, setIsGeneratingEvidencePdf] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  // Obtener el contracargo de esta transacción si existe
  const { data: txChargebacks = [] } = trpc.chargebacks.list.useQuery();
  const txChargeback = txChargebacks.find(cb => cb.transactionId === tx.id);
  const submitEvidenceMutation = trpc.chargebacks.submitEvidence.useMutation({
    onSuccess: () => {
      toast.success('✅ Evidencia enviada a Stripe. La disputa está en revisión.');
      setIsSubmittingEvidence(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Error al enviar evidencia');
      setIsSubmittingEvidence(false);
    },
  });
  const [refundReason, setRefundReason] = useState<"requested_by_customer" | "duplicate" | "fraudulent">("requested_by_customer");
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundPartialAmount, setRefundPartialAmount] = useState("");
  const refundMutation = trpc.payments.refund.useMutation({
    onSuccess: (data) => {
      if ((data as { pending?: boolean }).pending) {
        toast.success("⚠️ Solicitud enviada. El administrador debe aprobarla antes de procesar el reembolso.");
      } else {
        toast.success("Reembolso procesado. El cliente recibirá el dinero en 5-10 días hábiles.");
      }
      setShowRefundConfirm(false);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Error al procesar el reembolso"),
  });

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
            <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DialogTitle className="text-foreground">Detalle de la transacción</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Monto y estatus */}
          <div className="text-center py-4">
            <p className={`text-4xl font-black mb-2 ${tx.status === "succeeded" ? "text-foreground" : "text-muted-foreground line-through"}`}>
              {formatCurrency(gross, tx.currency)}
            </p>
            {tx.status === "pending" ? (
              <span className="relative group inline-flex">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border cursor-help ${cfg.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {cfg.label}
                  <svg className="w-3.5 h-3.5 ml-0.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4M12 8h.01"/></svg>
                </span>
                {/* Tooltip burbuja */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-card text-foreground text-xs rounded-xl shadow-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  <p className="font-semibold text-amber-300 mb-1.5">¿Por qué está pendiente?</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> El cliente abrió el enlace pero no completó el pago</li>
                    <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> No ingresó todos sus datos de tarjeta</li>
                    <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> Cerró la ventana antes de confirmar</li>
                    <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> El banco requirió verificación adicional (3D Secure) y no la completó</li>
                    <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> El pago está en proceso de autorización</li>
                  </ul>
                  <p className="text-muted-foreground mt-2 text-[10px]">Si el cliente ya pagó y sigue pendiente, espera unos minutos y actualiza.</p>
                  {/* Flecha del tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.color}`}>
                <StatusIcon className="w-4 h-4" />
                {cfg.label}
              </span>
            )}
            <p className="text-xs text-muted-foreground mt-2">{formatDate(tx.createdAt)}</p>
            {/* Sistema 3: Badge de pago tardío OXXO/SPEI */}
            {tx.paidAfterExpiry && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Pago tardío — link estaba expirado
              </div>
            )}
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
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> N.° de Operación
                </p>
                <p className="text-lg font-black text-foreground font-mono tracking-wide">{operationNumber}</p>
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del cliente</p>
            <div className="space-y-2">
              {tx.payerName && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-sm font-medium text-foreground">{tx.payerName}</p>
                  </div>
                </div>
              )}
              {tx.payerEmail && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">{tx.payerEmail}</p>
                  </div>
                </div>
              )}
              {tx.payerPhone && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm font-medium text-foreground">{tx.payerPhone}</p>
                  </div>
                </div>
              )}
              {tx.cardBrand && tx.cardLast4 && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Medio de pago</p>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {tx.cardBrand} •••• {tx.cardLast4}
                    </p>
                  </div>
                </div>
              )}
              {description && (
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Concepto</p>
                    <p className="text-sm font-medium text-foreground">{description}</p>
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
                  <span className="text-muted-foreground">Monto bruto</span>
                  <span className="font-semibold text-foreground">{formatCurrency(gross, tx.currency)}</span>
                </div>
                 {commRate > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Comisión KobraPay ({commRate}%)</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(commAmt)}</span>
                    </div>
                    {ivaRate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA sobre comisión ({(ivaRate * 100).toFixed(0)}%)</span>
                        <span className="font-semibold text-orange-600">-{formatCurrency(ivaAmt)}</span>
                      </div>
                    )}
                    {ivaRate > 0 && (
                      <div className="flex justify-between text-sm bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <span className="text-orange-800 font-semibold">Total KobraPay (comisión + IVA)</span>
                        <span className="font-bold text-orange-800">-{formatCurrency(totalKobraPay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                      <span className="font-bold text-foreground">Monto neto para ti</span>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Evidencia de identidad
              </p>
              <div className="grid grid-cols-3 gap-2">
                {tx.selfieUrl && (
                  <a href={tx.selfieUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
                      <img src={tx.selfieUrl} alt="Selfie" className="w-full h-24 object-cover" />
                      <p className="text-center text-xs text-muted-foreground py-1.5 font-medium">Foto</p>
                    </div>
                  </a>
                )}
                {tx.signatureUrl && (
                  <a href={tx.signatureUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
                      <img src={tx.signatureUrl} alt="Firma" className="w-full h-24 object-contain p-2" />
                      <p className="text-center text-xs text-muted-foreground py-1.5 font-medium">Firma</p>
                    </div>
                  </a>
                )}
                {tx.idDocumentUrl && (
                  <a href={tx.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
                      <img src={tx.idDocumentUrl} alt="ID" className="w-full h-24 object-cover" />
                      <p className="text-center text-xs text-muted-foreground py-1.5 font-medium">ID</p>
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
              <p className="text-xs text-muted-foreground">Referencia Stripe</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{tx.stripePaymentIntentId}</p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pt-2">
            {tx.status === "succeeded" && (tx.selfieUrl || tx.signatureUrl || tx.idDocumentUrl) && (
              <Button
                onClick={handleDownloadEvidencePdf}
                disabled={isGeneratingEvidencePdf}
                className="w-full bg-blue-600 hover:bg-blue-700 text-foreground"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {isGeneratingEvidencePdf ? "Generando PDF..." : "Descargar evidencia (PDF)"}
              </Button>
            )}
            {tx.status === "succeeded" && tx.payerPhone && (
              <Button
                onClick={() => {
                  const phone = tx.payerPhone!.replace(/[^0-9]/g, "");
                  const msg = encodeURIComponent(
                    `Hola ${tx.payerName || ""}, te confirmamos que tu pago de $${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(Number(tx.amount))} MXN fue procesado exitosamente.\n\nN° de operación: ${operationNumber}\nFecha: ${new Date(tx.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}\n\nGracias por tu pago. — KobraPay`
                  );
                  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                  toast.success("Abriendo WhatsApp...");
                }}
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-foreground"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar comprobante por WhatsApp
              </Button>
            )}
            {/* Botón de Reembolso */}
            {tx.status === "succeeded" && tx.stripePaymentIntentId && (
              <div className="border-t border-gray-100 pt-3">
                {!showRefundConfirm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowRefundConfirm(true)}
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {isEmployee ? 'Solicitar Reembolso' : 'Emitir Reembolso'}
                  </Button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-700">{isEmployee ? 'Solicitar reembolso' : 'Confirmar reembolso'} de {formatCurrency(tx.amount, tx.currency)}</p>
                    <p className="text-xs text-red-600">{isEmployee ? 'Tu solicitud será enviada al administrador para aprobación. El reembolso no se procesará hasta que sea aprobado.' : 'Esta acción es irreversible. El cliente recibirá el dinero en 5-10 días hábiles.'}</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
                      <p className="text-xs text-amber-800">⚠️ <strong>Aviso legal:</strong> El cliente recibirá el <strong>100% del monto cobrado</strong> ({formatCurrency(tx.amount, tx.currency)}).</p>
                      <p className="text-xs text-amber-700">La comisión de KobraPay ya fue descontada automáticamente al momento del pago y <strong>no es recuperable</strong>. El costo del reembolso es absorbido por el negocio.</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Tipo de reembolso:</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRefundType('full')}
                          className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${refundType === 'full' ? 'bg-red-600 text-foreground border-red-600' : 'bg-white text-muted-foreground border-gray-200 hover:border-red-300'}`}
                        >
                          Total ({formatCurrency(tx.amount, tx.currency)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefundType('partial')}
                          className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${refundType === 'partial' ? 'bg-red-600 text-foreground border-red-600' : 'bg-white text-muted-foreground border-gray-200 hover:border-red-300'}`}
                        >
                          Parcial
                        </button>
                      </div>
                      {refundType === 'partial' && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Monto a reembolsar (máx. {formatCurrency(tx.amount, tx.currency)}):</p>
                          <input
                            type="number"
                            min="1"
                            max={Number(tx.amount)}
                            step="0.01"
                            value={refundPartialAmount}
                            onChange={(e) => setRefundPartialAmount(e.target.value)}
                            placeholder="Ej. 500.00"
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Motivo:</p>
                      <select
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value as typeof refundReason)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      >
                        <option value="requested_by_customer">Solicitado por el cliente</option>
                        <option value="duplicate">Pago duplicado</option>
                        <option value="fraudulent">Transacción fraudulenta</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowRefundConfirm(false)} className="flex-1 text-sm">
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          const amountCents = refundType === 'partial' && refundPartialAmount
                            ? Math.round(parseFloat(refundPartialAmount) * 100)
                            : undefined;
                          refundMutation.mutate({ transactionId: tx.id, reason: refundReason, amountCents });
                        }}
                        disabled={refundMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-foreground text-sm"
                      >
                        {refundMutation.isPending ? (isEmployee ? 'Enviando...' : 'Procesando...') : (isEmployee ? 'Enviar Solicitud' : 'Confirmar Reembolso')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              )}
            </div>

            {/* Panel de contracargo si existe */}
            {txChargeback && (
              <div className={`mt-4 rounded-xl border p-4 ${
                txChargeback.status === 'won'
                  ? 'bg-green-50 border-green-200'
                  : txChargeback.status === 'lost'
                  ? 'bg-gray-50 border-gray-200'
                  : txChargeback.status === 'under_review'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={`text-sm font-bold mb-1 ${
                      txChargeback.status === 'won' ? 'text-green-800'
                      : txChargeback.status === 'lost' ? 'text-foreground'
                      : txChargeback.status === 'under_review' ? 'text-blue-800'
                      : 'text-red-800'
                    }`}>
                      {txChargeback.status === 'won' && '✅ Contracargo — Cerrado a tu favor'}
                      {txChargeback.status === 'lost' && '❌ Contracargo — Cerrado en contra'}
                      {txChargeback.status === 'under_review' && '🔍 Contracargo — En revisión por Stripe'}
                      {txChargeback.status === 'open' && '⚠️ Contracargo — Requiere respuesta'}
                      {!['won','lost','under_review','open'].includes(txChargeback.status) && `⚠️ Contracargo — ${txChargeback.reasonEs || txChargeback.status}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {txChargeback.status === 'won' && 'Disputamos el contracargo y se resolvió a tu favor. El dinero fue devuelto a tu cuenta.'}
                      {txChargeback.status === 'lost' && 'Disputamos el contracargo y se resolvió a favor del cliente. El banco te debitó el monto.'}
                      {txChargeback.status === 'under_review' && 'La evidencia fue enviada a Stripe y está siendo revisada por el banco emisor.'}
                      {txChargeback.status === 'open' && `Motivo: ${txChargeback.reasonEs || txChargeback.reason || 'Contracargo'}. Envía la evidencia para disputarlo.`}
                    </p>
                    {txChargeback.dueBy && txChargeback.status === 'open' && (
                      <p className="text-xs font-semibold text-red-700 mt-1">
                        ⏰ Fecha límite: {new Date(txChargeback.dueBy).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {txChargeback.status === 'open' && txChargeback.stripeDisputeId && (
                    <button
                      onClick={async () => {
                        setIsSubmittingEvidence(true);
                        await submitEvidenceMutation.mutateAsync({
                          chargebackId: txChargeback.id,
                          stripeDisputeId: txChargeback.stripeDisputeId!,
                        });
                      }}
                      disabled={isSubmittingEvidence}
                      className="flex-shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-foreground text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {isSubmittingEvidence ? (
                        <>⏳ Enviando...</>
                      ) : (
                        <>⚔️ Disputar</>  
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
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
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";

  // Leer query param ?platform= para navegación desde el Dashboard
  const initialPlatform = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("platform");
    if (p === "kobrapay" || p === "brokerhub" || p === "contentai" || p === "all") return p;
    return "all";
  }, []);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "succeeded" | "pending" | "failed">("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | "kobrapay" | "brokerhub" | "contentai">(initialPlatform);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Estado para modal de eliminación con PIN
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deletePin, setDeletePin] = useState(["", "", "", ""]);
  const [isDeleting, setIsDeleting] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Estado para selección múltiple (bulk delete)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPin, setBulkPin] = useState(["", "", "", ""]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const bulkPinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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
  const { data: externalSubs = [] } = trpc.subscriptions.listExternal.useQuery(undefined, { refetchInterval: 60000 });
  const { data: subsCsvData, refetch: fetchSubsCsv } = trpc.subscriptions.exportCsv.useQuery(
    { platform: platformFilter === 'all' ? undefined : platformFilter },
    { enabled: false }
  );
  const { data: stats } = trpc.transactions.stats.useQuery();
  const { data: exportData, refetch: fetchExport } = trpc.transactions.exportCsv.useQuery(
    undefined,
    { enabled: false }
  );
  const { data: pinStatus } = trpc.vendor.hasDeletePin.useQuery(undefined, { enabled: isSuperAdmin });
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  // Cargar contracargos para mostrar badges en las transacciones
  const { data: chargebacks = [] } = trpc.chargebacks.list.useQuery();
  // Mapa de transactionId -> chargeback para acceso rápido
  const chargebackMap = useMemo(() => {
    const map = new Map<number, typeof chargebacks[0]>();
    for (const cb of chargebacks) {
      if (cb.transactionId) map.set(cb.transactionId, cb);
    }
    return map;
  }, [chargebacks]);
  const { data: pendingRefunds = [], refetch: refetchPendingRefunds } = trpc.transactions.listPendingRefunds.useQuery(undefined, { enabled: isAdmin });
  const approveRefundMutation = trpc.payments.approveRefund.useMutation({
    onSuccess: (data) => {
      if (data.action === 'approved') toast.success('Reembolso aprobado y procesado correctamente');
      else toast.success('Solicitud de reembolso rechazada');
      refetchPendingRefunds();
      refetch();
    },
    onError: (err) => toast.error(err.message || 'Error al procesar la solicitud'),
  });
  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Transacción eliminada correctamente");
      setDeleteTarget(null);
      setDeletePin(["", "", "", ""]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar");
      setDeletePin(["", "", "", ""]);
      pinRefs[0].current?.focus();
    },
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const pin = deletePin.join("");
    if (pin.length !== 4) { toast.error("Ingresa los 4 dígitos del PIN"); return; }
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ transactionId: deleteTarget.id, pin });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteManyMutation = trpc.transactions.deleteMany.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deleted} transacción${data.deleted !== 1 ? "es" : ""} eliminada${data.deleted !== 1 ? "s" : ""} correctamente`);
      setBulkDeleteOpen(false);
      setBulkPin(["", "", "", ""]);
      setSelectedIds(new Set());
      setSelectMode(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar");
      setBulkPin(["", "", "", ""]);
      bulkPinRefs[0].current?.focus();
    },
  });

  const handleBulkDeleteConfirm = async () => {
    const pin = bulkPin.join("");
    if (pin.length !== 4) { toast.error("Ingresa los 4 dígitos del PIN"); return; }
    if (selectedIds.size === 0) { toast.error("No hay transacciones seleccionadas"); return; }
    setIsBulkDeleting(true);
    try {
      await deleteManyMutation.mutateAsync({ transactionIds: Array.from(selectedIds), pin });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((tx) => tx.id)));
    }
  };

  // Combinar transacciones con suscripciones externas como items unificados
  const filtered = useMemo(() => {
    if (!transactions) return [];
    let result = [...transactions];
    // Aplicar filtro de plataforma
    if (platformFilter === "kobrapay") {
      result = result.filter((tx) => !(tx as any).sourcePlatform || (tx as any).sourcePlatform === "kobrapay");
    }
    return result;
  }, [transactions, platformFilter]);

  // Suscripciones externas filtradas para mostrar en panel separado
  const filteredSubs = useMemo(() => {
    if (!externalSubs) return [];
    let result = externalSubs.filter((s) => s.sourcePlatform !== "kobrapay");
    if (platformFilter === "brokerhub") result = result.filter((s) => s.sourcePlatform === "brokerhub");
    else if (platformFilter === "contentai") result = result.filter((s) => s.sourcePlatform === "contentai");
    else if (platformFilter === "kobrapay") result = [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => 
        s.customerEmail?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.planName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [externalSubs, platformFilter, search]);

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
        {/* Bandeja de aprobaciones de reembolsos pendientes - solo para admin */}
        {isAdmin && pendingRefunds.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 text-sm">Solicitudes de reembolso pendientes ({pendingRefunds.length})</h3>
            </div>
            <div className="space-y-3">
              {pendingRefunds.map((tx) => (
                <div key={tx.id} className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{tx.payerName || 'Cliente'} — {formatCurrency(tx.amount, tx.currency)}</p>
                    <p className="text-xs text-muted-foreground">{tx.payerEmail || ''} · {formatDate(tx.createdAt)}</p>
                    <p className="text-xs text-amber-700 mt-0.5">Motivo: {tx.refundRequestReason === 'duplicate' ? 'Pago duplicado' : tx.refundRequestReason === 'fraudulent' ? 'Transacción fraudulenta' : 'Solicitado por el cliente'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      disabled={approveRefundMutation.isPending}
                      onClick={() => approveRefundMutation.mutate({ transactionId: tx.id, action: 'reject' })}
                    >
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-foreground text-xs"
                      disabled={approveRefundMutation.isPending}
                      onClick={() => approveRefundMutation.mutate({ transactionId: tx.id, action: 'approve' })}
                    >
                      Aprobar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total cobrado",
              value: formatCurrency(stats?.totalCollected ?? 0),
              icon: TrendingUp,
              iconColor: "text-green-600",
              iconBg: "bg-green-100",
              filterValue: "succeeded",
            },
            {
              label: "Ventas exitosas",
              value: String(stats?.paidLinks ?? 0),
              icon: CheckCircle2,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
              filterValue: "succeeded",
            },
            {
              label: "Pendientes",
              value: String(stats?.pendingLinks ?? 0),
              icon: Clock,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-100",
              filterValue: "pending",
            },
            {
              label: "Total enlaces",
              value: String(stats?.totalLinks ?? 0),
              icon: BarChart3,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100",
              filterValue: "all",
            },
          ].map(({ label, value, icon: Icon, iconColor, iconBg, filterValue }) => (
            <Card
              key={label}
              className={`border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all ${filterValue && filter === filterValue ? 'ring-2 ring-emerald-400 border-emerald-300' : ''}`}
              onClick={() => filterValue && setFilter(filterValue as typeof filter)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
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
              <CardTitle className="text-base font-semibold text-foreground flex-1">
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
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                    className={`h-8 text-xs ${selectMode ? "border-cyan-400 text-cyan-700 bg-cyan-50" : "border-gray-200"}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                    Seleccionar
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
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
                          ? "bg-cyan-500 text-foreground"
                          : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
                      }`}
                    >
                      {f === "all" ? "Todos" : f === "succeeded" ? "Pagados" : f === "pending" ? "Pendientes" : "Fallidos"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Platform filter */}
              {externalSubs.some((s) => s.sourcePlatform !== "kobrapay") && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-shrink-0">Plataforma:</span>
                  <div className="flex gap-1 flex-wrap">
                    {(["all", "kobrapay", "brokerhub", "contentai"] as const).map((p) => {
                      const labels: Record<string, string> = { all: "Todas", kobrapay: "KobraPay", brokerhub: "BrokerHub", contentai: "ContentAI" };
                      const colors: Record<string, string> = { kobrapay: "bg-emerald-500", brokerhub: "bg-amber-500", contentai: "bg-purple-500", all: "bg-cyan-500" };
                      return (
                        <button
                          key={p}
                          onClick={() => setPlatformFilter(p)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            platformFilter === p ? `${colors[p]} text-white` : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
                          }`}
                        >
                          {labels[p]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Date range filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground flex-shrink-0">Desde</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 text-xs border-gray-200 flex-1"
                  />
                  <span className="text-xs text-muted-foreground flex-shrink-0">Hasta</span>
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
            {/* Barra de acciones de selección masiva */}
            {selectMode && (
              <div className="flex items-center justify-between px-6 py-3 bg-cyan-50 border-b border-cyan-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-900 transition-colors"
                  >
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedIds.size === filtered.length && filtered.length > 0 ? "Deseleccionar todo" : "Seleccionar todo"}
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="text-xs text-cyan-600 bg-cyan-100 px-2 py-0.5 rounded-full font-medium">
                      {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-red-600 hover:bg-red-700 text-foreground"
                      onClick={() => { setBulkDeleteOpen(true); setBulkPin(["", "", "", ""]); }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Eliminar {selectedIds.size}
                    </Button>
                  )}
                  <button
                    onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
                  <BarChart3 className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground mb-1">
                  {search || filter !== "all" || dateFrom || dateTo ? "Sin resultados" : "Sin transacciones aún"}
                </p>
                <p className="text-sm text-muted-foreground">
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
                        <p className="text-xs font-semibold text-muted-foreground capitalize">{label}</p>
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
                        const isSelected = selectedIds.has(tx.id);
                        const txChargeback = chargebackMap.get(tx.id);
                        return (
                          <div
                            key={tx.id}
                            onClick={() => {
                              if (selectMode) {
                                const next = new Set(selectedIds);
                                if (next.has(tx.id)) next.delete(tx.id);
                                else next.add(tx.id);
                                setSelectedIds(next);
                              } else {
                                setSelectedTx(tx as Transaction);
                              }
                            }}
                            className={`flex items-center gap-4 px-6 py-4 transition-colors cursor-pointer border-b border-gray-50 last:border-0 ${
                              isSelected ? "bg-cyan-50 border-l-2 border-l-cyan-400" : "hover:bg-cyan-50/30"
                            }`}
                          >
                            {/* Checkbox de selección */}
                            {selectMode && (
                              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    const next = new Set(selectedIds);
                                    if (next.has(tx.id)) next.delete(tx.id);
                                    else next.add(tx.id);
                                    setSelectedIds(next);
                                  }}
                                  className="p-0.5 rounded transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-cyan-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-muted-foreground hover:text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                            )}
                            {/* Ícono de bolsa con estado */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                                tx.status === "succeeded"
                                  ? "bg-gray-100 border-gray-200"
                                  : tx.status === "failed"
                                  ? "bg-gray-100 border-red-200"
                                  : "bg-gray-100 border-gray-200"
                              }`}>
                                <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm6.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                              </div>
                              {tx.status === "failed" && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <span className="text-foreground text-xs font-bold leading-none">!</span>
                                </div>
                              )}
                            </div>

                            {/* Info central */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {tx.status === "failed" ? (
                                    <span className="text-red-600">Rechazado</span>
                                  ) : tx.status === "succeeded" ? (
                                    <span className="text-foreground">Venta</span>
                                  ) : (
                                    <span className="text-amber-600">Pendiente</span>
                                  )}
                                  {tx.payerName ? ` · ${tx.payerName}` : ""}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 font-mono">Operación {opNum}</p>
                              {failInfo && (
                                <p className="text-xs text-red-500 mt-0.5">{failInfo.title}</p>
                              )}
                              {/* Badge de contracargo */}
                              {txChargeback && (
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                                  txChargeback.status === 'won'
                                    ? 'bg-green-100 text-green-700'
                                    : txChargeback.status === 'lost'
                                    ? 'bg-gray-100 text-muted-foreground line-through'
                                    : txChargeback.status === 'under_review'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {txChargeback.status === 'won' && '✅ Contracargo cerrado a tu favor'}
                                  {txChargeback.status === 'lost' && '❌ Contracargo cerrado en contra'}
                                  {txChargeback.status === 'under_review' && '🔍 Contracargo · En revisión'}
                                  {txChargeback.status === 'open' && '⚠️ Contracargo · Disputando'}
                                  {!['won','lost','under_review','open'].includes(txChargeback.status) && `⚠️ Contracargo · ${txChargeback.reasonEs || txChargeback.status}`}
                                </span>
                              )}
                            </div>

                            {/* Monto y hora */}
                            <div className="text-right flex-shrink-0">
                              <p className={`font-bold text-sm ${
                                tx.status === "succeeded"
                                  ? "text-green-600"
                                  : "text-muted-foreground line-through"
                              }`}>
                                {tx.status === "succeeded" ? "+" : ""}{formatCurrency(tx.status === "succeeded" ? net : gross, tx.currency)}
                              </p>
                              {commAmt > 0 && tx.status === "succeeded" && (
                                <p className="text-xs text-orange-400">-{formatCurrency(commAmt)} comisión</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">{timeStr} hs</p>
                            </div>
                            {/* Botón eliminar (solo superadmin) */}
                            {isSuperAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(tx as Transaction); setDeletePin(["","","",""]); }}
                                className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                title="Eliminar transacción"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Summary Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {filtered.length} transacción{filtered.length !== 1 ? "es" : ""}
                      {" · "}
                      <span className="text-muted-foreground">Haz clic en una fila para ver el detalle</span>
                    </p>
                    <div className="flex items-center gap-4">
                      {totalCommission > 0 && (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Bruto</p>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalFiltered)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Comisión</p>
                            <p className="text-sm font-semibold text-orange-600">-{formatCurrency(totalCommission)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Neto</p>
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

        {/* Panel de Suscripciones Externas (BrokerHub, ContentAI) */}
        {filteredSubs.length > 0 && platformFilter !== "kobrapay" && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Repeat className="w-4 h-4 text-amber-500" />
                Suscripciones externas
                <span className="text-xs font-normal text-muted-foreground ml-1">({filteredSubs.length})</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={async () => {
                  const result = await fetchSubsCsv();
                  if (result.data?.csv) {
                    const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `suscripciones-${platformFilter === 'all' ? 'todas' : platformFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="w-3 h-3" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {filteredSubs.map((sub) => {
                  const platformColors: Record<string, string> = {
                    brokerhub: "bg-amber-100 text-amber-800 border-amber-200",
                    contentai: "bg-purple-100 text-purple-800 border-purple-200",
                    kobrapay: "bg-emerald-100 text-emerald-800 border-emerald-200",
                  };
                  const platformLabels: Record<string, string> = {
                    brokerhub: "BrokerHub",
                    contentai: "ContentAI",
                    kobrapay: "KobraPay",
                  };
                  const statusColors: Record<string, string> = {
                    active: "text-green-600",
                    incomplete: "text-amber-600",
                    canceled: "text-red-500",
                    paused: "text-blue-500",
                    past_due: "text-orange-600",
                  };
                  const statusLabels: Record<string, string> = {
                    active: "Activa",
                    incomplete: "Pendiente",
                    canceled: "Cancelada",
                    paused: "Pausada",
                    past_due: "Vencida",
                  };
                  const platform = sub.sourcePlatform || "kobrapay";
                  const intervalLabel: Record<string, string> = { month: "mes", year: "año", week: "semana", day: "día" };
                  return (
                    <div key={sub.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/dashboard/subscriptions/${sub.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Repeat className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{sub.planName}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${platformColors[platform] || platformColors.kobrapay}`}>
                              {platformLabels[platform] || platform}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {sub.customerName || sub.customerEmail}
                            {sub.customerName && <span className="text-muted-foreground/70"> · {sub.customerEmail}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {new Intl.NumberFormat("es-MX", { style: "currency", currency: sub.currency?.toUpperCase() || "MXN" }).format((sub.amount || 0) / 100)}
                            <span className="text-xs text-muted-foreground font-normal">/{intervalLabel[sub.interval] || sub.interval}</span>
                          </p>
                          <p className={`text-xs font-medium ${statusColors[sub.status] || "text-muted-foreground"}`}>
                            {statusLabels[sub.status] || sub.status}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground w-20 text-right">
                          {new Date(sub.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-muted-foreground">
                  {filteredSubs.filter((s) => s.status === "active").length} activa{filteredSubs.filter((s) => s.status === "active").length !== 1 ? "s" : ""}
                  {" · "}
                  Ingresos recurrentes mensuales:{" "}
                  <span className="font-semibold text-green-600">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                      filteredSubs.filter((s) => s.status === "active").reduce((sum, s) => {
                        const monthly = s.interval === "year" ? (s.amount || 0) / 12 :
                          s.interval === "week" ? (s.amount || 0) * 4.33 :
                          s.interval === "day" ? (s.amount || 0) * 30 :
                          (s.amount || 0);
                        return sum + monthly;
                      }, 0) / 100
                    )}
                    /mes
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} currentUser={user as { role?: string; staffRole?: string | null } | null} />
      )}

      {/* Modal de eliminación masiva con PIN */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => { if (!open) { setBulkDeleteOpen(false); setBulkPin(["","","",""]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar {selectedIds.size} transacción{selectedIds.size !== 1 ? "es" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!pinStatus?.hasPin ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">No tienes un PIN configurado</p>
                    <p className="text-amber-700 text-xs mt-1">Ve a <strong>Ajustes &gt; Seguridad</strong> para crear tu PIN de 4 dígitos antes de eliminar transacciones.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">
                    ¿Eliminar <strong>{selectedIds.size} transacción{selectedIds.size !== 1 ? "es" : ""}</strong> seleccionada{selectedIds.size !== 1 ? "s" : ""}?
                  </p>
                  <p className="text-xs text-red-500 mt-1">Esta acción es <strong>irreversible</strong>. Los registros se borrarán permanentemente.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Ingresa tu PIN de seguridad
                  </p>
                  <div className="flex gap-3 justify-center">
                    {bulkPin.map((digit, i) => (
                      <input
                        key={i}
                        ref={bulkPinRefs[i]}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const newPin = [...bulkPin];
                          newPin[i] = val;
                          setBulkPin(newPin);
                          if (val && i < 3) bulkPinRefs[i + 1].current?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !bulkPin[i] && i > 0) bulkPinRefs[i - 1].current?.focus();
                          if (e.key === "Enter" && bulkPin.join("").length === 4) handleBulkDeleteConfirm();
                        }}
                        className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setBulkDeleteOpen(false); setBulkPin(["","","",""]); }} disabled={isBulkDeleting}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-foreground"
                    onClick={handleBulkDeleteConfirm}
                    disabled={isBulkDeleting || bulkPin.join("").length !== 4}
                  >
                    {isBulkDeleting ? "Eliminando..." : `Eliminar ${selectedIds.size}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de eliminación con PIN */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeletePin(["","","",""]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar transacción
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!pinStatus?.hasPin ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">No tienes un PIN configurado</p>
                    <p className="text-amber-700 text-xs mt-1">Ve a <strong>Ajustes &gt; Seguridad</strong> para crear tu PIN de 4 dígitos antes de eliminar transacciones.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">
                    ¿Eliminar la transacción de <strong>{deleteTarget?.payerName || "cliente"}</strong> por <strong>{formatCurrency(Number(deleteTarget?.amount || 0))}</strong>?
                  </p>
                  <p className="text-xs text-red-500 mt-1">Esta acción es <strong>irreversible</strong>. El registro se borrará permanentemente.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Ingresa tu PIN de seguridad
                  </p>
                  <div className="flex gap-3 justify-center">
                    {deletePin.map((digit, i) => (
                      <input
                        key={i}
                        ref={pinRefs[i]}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const newPin = [...deletePin];
                          newPin[i] = val;
                          setDeletePin(newPin);
                          if (val && i < 3) pinRefs[i + 1].current?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !deletePin[i] && i > 0) pinRefs[i - 1].current?.focus();
                          if (e.key === "Enter" && deletePin.join("").length === 4) handleDeleteConfirm();
                        }}
                        className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setDeleteTarget(null); setDeletePin(["","","",""]); }} disabled={isDeleting}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-foreground"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || deletePin.join("").length !== 4}
                  >
                    {isDeleting ? "Eliminando..." : "Confirmar eliminación"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
