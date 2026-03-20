import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Repeat,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  Calendar,
  User,
  Mail,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function formatCurrency(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Activa", color: "text-green-600 bg-green-100", icon: CheckCircle2 },
  past_due: { label: "Vencida", color: "text-orange-600 bg-orange-100", icon: AlertTriangle },
  incomplete: { label: "Pendiente", color: "text-amber-600 bg-amber-100", icon: Clock },
  canceled: { label: "Cancelada", color: "text-red-500 bg-red-100", icon: XCircle },
  paused: { label: "Pausada", color: "text-blue-500 bg-blue-100", icon: Clock },
  trialing: { label: "En prueba", color: "text-purple-600 bg-purple-100", icon: Clock },
};

const platformLabels: Record<string, string> = {
  brokerhub: "BrokerHub",
  contentai: "ContentAI",
  kobrapay: "KobraPay",
};

const platformColors: Record<string, string> = {
  brokerhub: "bg-amber-100 text-amber-800 border-amber-200",
  contentai: "bg-purple-100 text-purple-800 border-purple-200",
  kobrapay: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const intervalLabels: Record<string, string> = {
  month: "mes",
  year: "año",
  week: "semana",
  day: "día",
};

const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  paid: { label: "Pagada", color: "text-green-600" },
  open: { label: "Abierta", color: "text-amber-600" },
  void: { label: "Anulada", color: "text-gray-500" },
  uncollectible: { label: "Incobrable", color: "text-red-500" },
  draft: { label: "Borrador", color: "text-gray-400" },
};

export default function SubscriptionDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id ?? "0", 10);

  const { data: sub, isLoading, refetch } = trpc.subscriptions.getDetail.useQuery(
    { id },
    { enabled: !!id }
  );
  const cancelMutation = trpc.subscriptions.cancelWithOptions.useMutation({
    onSuccess: () => {
      toast.success("Suscripción cancelada correctamente");
      setConfirmOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout title="Detalle de suscripción">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sub) {
    return (
      <DashboardLayout title="Detalle de suscripción">
        <div className="text-center py-20 text-muted-foreground">
          <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Suscripción no encontrada</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/dashboard/sales")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Mis Ventas
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusCfg = statusConfig[sub.status] ?? { label: sub.status, color: "text-gray-500 bg-gray-100", icon: Clock };
  const StatusIcon = statusCfg.icon;
  const platform = (sub as any).sourcePlatform || "kobrapay";
  const canCancel = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";

  return (
    <DashboardLayout title="Detalle de suscripción">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/sales")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Mis Ventas
          </Button>
        </div>

        {/* Info principal */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Repeat className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {sub.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${platformColors[platform] || platformColors.kobrapay}`}>
                      {platformLabels[platform] || platform}
                    </span>
                    {sub.cancelAtPeriodEnd && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                        Cancela al vencer
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(sub.amount, sub.currency || "MXN")}
                </p>
                <p className="text-xs text-muted-foreground">
                  por {intervalLabels[sub.interval] || sub.interval}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium text-foreground">{sub.customerName || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground truncate">{sub.customerEmail || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(sub.createdAt instanceof Date ? sub.createdAt.getTime() : sub.createdAt)}</p>
                </div>
              </div>
              {sub.currentPeriodEnd && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Próxima renovación</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.getTime() : sub.currentPeriodEnd as any)}</p>
                  </div>
                </div>
              )}
              {sub.stripeSubscriptionId && (
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">ID Stripe</p>
                    <p className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">{sub.stripeSubscriptionId}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botón cancelar */}
            {canCancel && !sub.cancelAtPeriodEnd && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar suscripción
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de pagos */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-500" />
              Historial de pagos
              {(sub as any).invoices?.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({(sub as any).invoices.length} facturas)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!(sub as any).invoices?.length ? (
              <div className="py-10 text-center text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Sin historial de pagos disponible</p>
                {!sub.stripeSubscriptionId && (
                  <p className="text-xs mt-1 text-muted-foreground/70">Esta suscripción no tiene ID de Stripe asociado</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(sub as any).invoices.map((inv: any) => {
                  const invStatus = invoiceStatusConfig[inv.status] ?? { label: inv.status, color: "text-gray-500" };
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inv.status === "paid" ? "bg-green-500" : inv.status === "open" ? "bg-amber-500" : "bg-gray-300"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(inv.paidAt || inv.periodStart)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(inv.periodStart)} — {formatDate(inv.periodEnd)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(inv.amount, inv.currency || "MXN")}
                          </p>
                          <p className={`text-xs font-medium ${invStatus.color}`}>{invStatus.label}</p>
                        </div>
                        {inv.invoiceUrl && (
                          <a
                            href={inv.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-500 hover:text-cyan-700 transition-colors"
                            title="Ver factura"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmación de cancelación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancelar suscripción
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              ¿Cómo deseas cancelar la suscripción de <strong>{sub.customerName || sub.customerEmail}</strong>?
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="cancel_type"
                  checked={!cancelImmediately}
                  onChange={() => setCancelImmediately(false)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Al final del período</p>
                  <p className="text-xs text-muted-foreground">El cliente sigue con acceso hasta {formatDate(sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.getTime() : sub.currentPeriodEnd as any)}. Recomendado.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-red-200 cursor-pointer hover:bg-red-50 transition-colors">
                <input
                  type="radio"
                  name="cancel_type"
                  checked={cancelImmediately}
                  onChange={() => setCancelImmediately(true)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-red-600">Inmediatamente</p>
                  <p className="text-xs text-muted-foreground">El acceso se revoca de inmediato. No se emite reembolso.</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate({ id, immediately: cancelImmediately })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
