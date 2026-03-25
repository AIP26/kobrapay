import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  RefreshCw,
  Plus,
  Pause,
  Play,
  X,
  Mail,
  User,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Copy,
  Link2,
  Send,
  Trash2,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Subscription = {
  id: number;
  name: string;
  description?: string | null;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  customerEmail: string;
  customerName?: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  createdAt: Date | string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function intervalLabel(interval: string, count: number) {
  const labels: Record<string, string> = {
    day: count === 1 ? "Diario" : `Cada ${count} días`,
    week: count === 1 ? "Semanal" : `Cada ${count} semanas`,
    month: count === 1 ? "Mensual" : `Cada ${count} meses`,
    year: count === 1 ? "Anual" : `Cada ${count} años`,
  };
  return labels[interval] ?? interval;
}

function statusBadge(status: string, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd) return <Badge variant="destructive" className="text-xs">Cancelando</Badge>;
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Activa", variant: "default" },
    paused: { label: "Pausada", variant: "secondary" },
    incomplete: { label: "Pendiente pago", variant: "outline" },
    canceled: { label: "Cancelada", variant: "destructive" },
    past_due: { label: "Vencida", variant: "destructive" },
  };
  const info = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={info.variant} className="text-xs">{info.label}</Badge>;
}

// ─── Modal de nueva suscripción ───────────────────────────────────────────────
function NewSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: "",
    currency: "mxn",
    interval: "month",
    intervalCount: "1",
    customerEmail: "",
    customerName: "",
    sourcePlatform: "kobrapay",
  });

  const [createdLink, setCreatedLink] = useState<{ url: string; email: string; emailSent: boolean } | null>(null);

  const createMutation = trpc.subscriptions.create.useMutation({
    onSuccess: (data) => {
      utils.subscriptions.list.invalidate();
      if (data.checkoutUrl) {
        setCreatedLink({
          url: data.checkoutUrl,
          email: form.customerEmail,
          emailSent: data.emailSent ?? false,
        });
        if (data.emailSent) {
          toast.success(`✅ Link enviado a ${form.customerEmail}`);
        } else {
          toast.success("Suscripción creada. Copia el link y envíaselo al cliente.");
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("El nombre del plan es requerido"); return; }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 10) {
      toast.error("El monto mínimo es $10 MXN"); return;
    }
    if (!form.customerEmail.includes("@")) { toast.error("Correo del cliente inválido"); return; }

    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      amount: Number(form.amount),
      currency: form.currency as "mxn" | "usd",
      interval: form.interval as "day" | "week" | "month" | "year",
      intervalCount: Number(form.intervalCount),
      customerEmail: form.customerEmail,
      customerName: form.customerName || undefined,
      origin: window.location.origin,
      sourcePlatform: form.sourcePlatform as "kobrapay" | "brokerhub" | "contentai",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Nueva Suscripción Recurrente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Nombre del plan */}
          <div>
            <Label>Nombre del Plan *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Membresía Mensual Premium" />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ej: Acceso completo a todos los servicios" />
          </div>

          {/* Monto y moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="10"
                  step="0.01"
                  className="pl-9"
                  value={form.amount}
                  onChange={e => set("amount", e.target.value)}
                  placeholder="500.00"
                />
              </div>
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mxn">MXN (Peso Mexicano)</SelectItem>
                  <SelectItem value="usd">USD (Dólar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frecuencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frecuencia</Label>
              <Select value={form.interval} onValueChange={v => set("interval", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Diario</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensual</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cada cuánto</Label>
              <Select value={form.intervalCount} onValueChange={v => set("intervalCount", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? "1 (estándar)" : `${n}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plataforma de origen */}
          <div>
            <Label>Plataforma</Label>
            <Select value={form.sourcePlatform} onValueChange={v => set("sourcePlatform", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kobrapay">KobraPay (directo)</SelectItem>
                <SelectItem value="brokerhub">BrokerHub</SelectItem>
                <SelectItem value="contentai">ContentAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datos del cliente */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Datos del Cliente</p>
            <div className="space-y-3">
              <div>
                <Label>Correo del Cliente *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" className="pl-9" value={form.customerEmail} onChange={e => set("customerEmail", e.target.value)} placeholder="cliente@ejemplo.com" />
                </div>
              </div>
              <div>
                <Label>Nombre del Cliente (opcional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" value={form.customerName} onChange={e => set("customerName", e.target.value)} placeholder="Juan Pérez" />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen */}
          {form.amount && form.name && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">Resumen:</p>
              <p className="text-muted-foreground">
                Se cobrará <strong>{form.currency.toUpperCase()} ${form.amount}</strong> {intervalLabel(form.interval, Number(form.intervalCount)).toLowerCase()} a {form.customerEmail || "el cliente"}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                El cliente recibirá un link de Stripe para ingresar su tarjeta.
              </p>
            </div>
          )}
        </div>
        {/* Resultado: link generado */}
        {createdLink && (
          <div className="border-t pt-4 space-y-3">
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
              createdLink.emailSent ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {createdLink.emailSent ? (
                <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Link enviado por email a <strong>{createdLink.email}</strong></>
              ) : (
                <><Mail className="w-4 h-4 flex-shrink-0" /> Copia este link y envíaselo al cliente</>  
              )}
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={createdLink.url}
                className="text-xs font-mono bg-gray-50 text-muted-foreground border-gray-200"
              />
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 border-gray-200"
                onClick={() => { navigator.clipboard.writeText(createdLink.url); toast.success('Link copiado'); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 border-gray-200"
                onClick={() => window.open(createdLink.url, '_blank')}
                title="Abrir link"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          {!createdLink ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : <><Send className="w-4 h-4 mr-2" />Crear y Enviar Link al Cliente</>}
              </Button>
            </>
          ) : (
            <Button onClick={() => { setCreatedLink(null); onClose(); }} className="w-full bg-cyan-500 hover:bg-cyan-400 text-foreground">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Listo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tarjeta de suscripción ───────────────────────────────────────────────────
function SubscriptionCard({ sub, onAction }: { sub: Subscription; onAction: (action: "pause" | "resume" | "cancel", id: number) => void }) {
  const isActive = sub.status === "active" && !sub.cancelAtPeriodEnd;
  const isPaused = sub.status === "paused";
  const isCanceled = sub.status === "canceled" || sub.cancelAtPeriodEnd;
  const isPending = sub.status === "incomplete";
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const resendMutation = trpc.subscriptions.resendLink.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success(`Link reenviado a ${sub.customerEmail}`);
      } else if (data.checkoutUrl) {
        navigator.clipboard.writeText(data.checkoutUrl);
        setCopiedId(sub.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success('Link copiado al portapapeles');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{sub.name}</h3>
              {statusBadge(sub.status, sub.cancelAtPeriodEnd)}
            </div>
            {sub.description && <p className="text-sm text-muted-foreground mb-2 truncate">{sub.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {formatAmount(sub.amount, sub.currency)}
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                {intervalLabel(sub.interval, sub.intervalCount)}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {sub.customerEmail}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(sub.createdAt).toLocaleDateString("es-MX")}
              </span>
            </div>
          </div>
          {/* Acciones */}
          {!isCanceled && (
            <div className="flex gap-2 flex-shrink-0">
              {isPending && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                  onClick={() => resendMutation.mutate({ id: sub.id, origin: window.location.origin })}
                  disabled={resendMutation.isPending}
                  title="Reenviar link al cliente"
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : copiedId === sub.id ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span className="ml-1 text-xs hidden sm:inline">Reenviar</span>
                </Button>
              )}
              {isActive && (
                <Button size="sm" variant="outline" onClick={() => onAction("pause", sub.id)} title="Pausar">
                  <Pause className="w-4 h-4" />
                </Button>
              )}
              {isPaused && (
                <Button size="sm" variant="outline" onClick={() => onAction("resume", sub.id)} title="Reanudar">
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onAction("cancel", sub.id)} title="Cancelar">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Recurring() {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";

  const subsQuery = trpc.subscriptions.list.useQuery();
  const utils = trpc.useUtils();

  const pauseMutation = trpc.subscriptions.pause.useMutation({
    onSuccess: () => { toast.success("Suscripción pausada"); utils.subscriptions.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const resumeMutation = trpc.subscriptions.resume.useMutation({
    onSuccess: () => { toast.success("Suscripción reanudada"); utils.subscriptions.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => { toast.success("Suscripción cancelada al final del período"); utils.subscriptions.list.invalidate(); setConfirmCancel(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCanceledMutation = trpc.subscriptions.deleteCanceled.useMutation({
    onSuccess: () => { toast.success("Suscripción eliminada permanentemente"); utils.subscriptions.list.invalidate(); setConfirmDelete(null); },
    onError: (e) => toast.error(e.message),
  });

  // Notificación de éxito/cancelación desde Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("¡Suscripción activada exitosamente!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (searchParams.get("canceled") === "1") {
      toast.info("El cliente canceló el proceso de pago.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const subs = (subsQuery.data ?? []) as Subscription[];
  const activeSubs = subs.filter(s => s.status === "active" && !s.cancelAtPeriodEnd);
  const pausedSubs = subs.filter(s => s.status === "paused");
  const pendingSubs = subs.filter(s => s.status === "incomplete");
  const canceledSubs = subs.filter(s => s.status === "canceled" || s.cancelAtPeriodEnd);

  const handleAction = (action: "pause" | "resume" | "cancel", id: number) => {
    if (action === "pause") pauseMutation.mutate({ id });
    else if (action === "resume") resumeMutation.mutate({ id });
    else if (action === "cancel") setConfirmCancel(id);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary" />
              Cobros Recurrentes
            </h1>
            <p className="text-muted-foreground text-sm">Gestiona suscripciones y cobros automáticos con Stripe Billing</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Suscripción
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{activeSubs.length}</p>
                  <p className="text-xs text-muted-foreground">Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <Pause className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{pausedSubs.length}</p>
                  <p className="text-xs text-muted-foreground">Pausadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingSubs.length}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {activeSubs.length > 0
                      ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
                          activeSubs.filter(s => s.currency === "mxn").reduce((sum, s) => sum + s.amount / 100, 0)
                        )
                      : "$0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Ingreso recurrente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de suscripciones */}
        {subsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">Sin suscripciones aún</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Crea tu primera suscripción recurrente para automatizar tus cobros.
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primera suscripción
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Activas */}
            {activeSubs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Activas ({activeSubs.length})
                </h2>
                <div className="space-y-3">
                  {activeSubs.map(s => <SubscriptionCard key={s.id} sub={s} onAction={handleAction} />)}
                </div>
              </div>
            )}
            {/* Pendientes de pago */}
            {pendingSubs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Pendientes de pago ({pendingSubs.length})
                </h2>
                <div className="space-y-3">
                  {pendingSubs.map(s => <SubscriptionCard key={s.id} sub={s} onAction={handleAction} />)}
                </div>
              </div>
            )}
            {/* Pausadas */}
            {pausedSubs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Pause className="w-4 h-4 text-amber-500" /> Pausadas ({pausedSubs.length})
                </h2>
                <div className="space-y-3">
                  {pausedSubs.map(s => <SubscriptionCard key={s.id} sub={s} onAction={handleAction} />)}
                </div>
              </div>
            )}
            {/* Canceladas */}
            {canceledSubs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" /> Canceladas ({canceledSubs.length})
                  </h2>
                  {isSuperAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs h-7 gap-1"
                      onClick={() => {
                        if (canceledSubs.length === 1) {
                          setConfirmDelete(canceledSubs[0].id);
                        } else {
                          // Mostrar selector o eliminar todas
                          if (confirm(`¿Eliminar las ${canceledSubs.length} suscripciones canceladas? Esta acción no se puede deshacer.`)) {
                            canceledSubs.forEach(s => deleteCanceledMutation.mutate({ id: s.id }));
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpiar canceladas
                    </Button>
                  )}
                </div>
                <div className="space-y-3 opacity-60">
                  {canceledSubs.map(s => (
                    <div key={s.id} className="relative">
                      <SubscriptionCard sub={s} onAction={handleAction} />
                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                          title="Eliminar permanentemente"
                          onClick={() => setConfirmDelete(s.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de nueva suscripción */}
      <NewSubscriptionModal open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Confirmación de eliminación permanente (superadmin) */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Eliminar suscripción permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro de la base de datos de forma permanente. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete !== null && deleteCanceledMutation.mutate({ id: confirmDelete })}
            >
              Sí, eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de cancelación */}
      <AlertDialog open={confirmCancel !== null} onOpenChange={() => setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              La suscripción se cancelará al final del período actual. El cliente no será cobrado nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmCancel !== null && cancelMutation.mutate({ id: confirmCancel })}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
