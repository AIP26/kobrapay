import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Zap, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Copy, Eye, EyeOff, ExternalLink, Info } from "lucide-react";

const EVENT_OPTIONS = [
  { value: "payment.success", label: "Pago exitoso", description: "Se dispara cuando un cliente paga un enlace" },
  { value: "payment.failed", label: "Pago fallido", description: "Se dispara cuando un pago es rechazado" },
  { value: "payment.refunded", label: "Reembolso", description: "Se dispara cuando se procesa un reembolso" },
  { value: "chargeback.created", label: "Contracargo", description: "Se dispara cuando se abre una disputa" },
];

export default function Webhooks() {
  const [showCreate, setShowCreate] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<number, boolean>>({});
  const [newSecret, setNewSecret] = useState<{ id: number; secret: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ url: "", description: "", events: ["payment.success"] });

  const { data: webhooks, refetch } = trpc.webhooks.list.useQuery();
  const createMutation = trpc.webhooks.create.useMutation({
    onSuccess: (data) => {
      setNewSecret({ id: (data as any).id ?? 0, secret: data.secret });
      setShowCreate(false);
      setForm({ url: "", description: "", events: ["payment.success"] });
      refetch();
      toast.success("Webhook registrado correctamente");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.webhooks.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Webhook eliminado"); setDeleteId(null); },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.webhooks.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Estado actualizado"); },
    onError: (err) => toast.error(err.message),
  });
  const [pendingRegenerateId, setPendingRegenerateId] = useState<number | null>(null);
  const regenerateMutation = trpc.webhooks.regenerateSecret.useMutation({
    onSuccess: (data) => {
      setNewSecret({ id: pendingRegenerateId ?? 0, secret: data.secret });
      setPendingRegenerateId(null);
      refetch();
      toast.success("Secret regenerado");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleEvent = (event: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  const copyToClipboard = (text: string, label = "Copiado") => {
    navigator.clipboard.writeText(text).then(() => toast.success(label + " al portapapeles"));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-sky-500" />
            Webhooks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Recibe notificaciones automáticas en tu plataforma cuando ocurran eventos de pago.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Webhook
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-800 dark:text-sky-300 space-y-1">
          <p className="font-semibold">¿Cómo funcionan los webhooks?</p>
          <p>Cuando se procese un pago, KobraPay enviará un <strong>POST</strong> automático a tu URL con los datos del evento. Verifica la autenticidad usando el header <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">X-KobraPay-Signature</code> (HMAC-SHA256 del body con tu secret).</p>
        </div>
      </div>

      {/* Lista de webhooks */}
      {!webhooks || webhooks.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No tienes webhooks registrados</p>
          <p className="text-muted-foreground text-sm mt-1">Crea uno para recibir notificaciones automáticas de pagos</p>
          <Button onClick={() => setShowCreate(true)} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Crear primer webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => {
            const events: string[] = (() => { try { return JSON.parse(wh.events); } catch { return []; } })();
            return (
              <div key={wh.id} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium text-foreground truncate max-w-xs">{wh.url}</span>
                      <Badge variant={wh.isActive ? "default" : "secondary"} className={wh.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                        {wh.isActive ? <><CheckCircle2 className="w-3 h-3 mr-1" />Activo</> : <><XCircle className="w-3 h-3 mr-1" />Inactivo</>}
                      </Badge>
                      {wh.lastStatusCode && (
                        <Badge variant="outline" className={wh.lastStatusCode >= 200 && wh.lastStatusCode < 300 ? "text-emerald-600" : "text-red-600"}>
                          HTTP {wh.lastStatusCode}
                        </Badge>
                      )}
                    </div>
                    {wh.description && <p className="text-xs text-muted-foreground mt-0.5">{wh.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {events.map(e => (
                        <span key={e} className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleMutation.mutate({ id: wh.id, isActive: !wh.isActive })} title={wh.isActive ? "Desactivar" : "Activar"}>
                      {wh.isActive ? <XCircle className="w-4 h-4 text-muted-foreground" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPendingRegenerateId(wh.id); regenerateMutation.mutate({ id: wh.id }); }} title="Regenerar secret">
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(wh.id)} title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                {/* Secret */}
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground font-medium w-14 flex-shrink-0">Secret:</span>
                  <span className="font-mono text-xs flex-1 truncate">
                    {showSecret[wh.id] ? wh.secret : "whsec_" + "•".repeat(20)}
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowSecret(s => ({ ...s, [wh.id]: !s[wh.id] }))}>
                    {showSecret[wh.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(wh.secret, "Secret copiado")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {wh.lastTriggeredAt && (
                  <p className="text-xs text-muted-foreground">
                    Último disparo: {new Date(wh.lastTriggeredAt).toLocaleString("es-MX")}
                    {(wh.failureCount ?? 0) > 0 && <span className="text-red-500 ml-2">· {wh.failureCount} fallos consecutivos</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear webhook */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-sky-500" />Nuevo Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>URL del endpoint *</Label>
              <Input
                placeholder="https://tu-plataforma.com/api/webhooks/kobrapay"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">KobraPay enviará un POST a esta URL cuando ocurra un evento.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="ej. BrokerHub producción"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Eventos a escuchar *</Label>
              {EVENT_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={opt.value}
                    checked={form.events.includes(opt.value)}
                    onCheckedChange={() => toggleEvent(opt.value)}
                    className="mt-0.5"
                  />
                  <label htmlFor={opt.value} className="cursor-pointer">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white"
              disabled={!form.url || form.events.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "Registrando..." : "Registrar Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal mostrar secret nuevo */}
      <Dialog open={!!newSecret} onOpenChange={() => setNewSecret(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="w-5 h-5" />Webhook registrado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">⚠️ Guarda este secret ahora</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Solo se muestra una vez. Úsalo para verificar la autenticidad de los webhooks recibidos.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Webhook Secret</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={newSecret?.secret || ""} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(newSecret?.secret || "", "Secret copiado")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">Cómo verificar en Node.js:</p>
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">{`const crypto = require('crypto');
const sig = req.headers['x-kobrapay-signature'];
const expected = crypto
  .createHmac('sha256', process.env.KOBRAPAY_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
if (sig !== expected) return res.status(401).send('Invalid');`}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Entendido, ya lo guardé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar webhook?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El endpoint dejará de recibir notificaciones.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
