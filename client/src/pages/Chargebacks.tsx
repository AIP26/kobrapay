import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  RefreshCw,
  DollarSign,
  FileText,
  Info,
  Eye,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CBStatus = "open" | "under_review" | "won" | "lost" | "closed";

const STATUS_CONFIG: Record<CBStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Abierta", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  under_review: { label: "En revisión", color: "bg-blue-100 text-blue-800", icon: <RefreshCw className="w-3 h-3" /> },
  won: { label: "Ganada", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  lost: { label: "Perdida", color: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
  closed: { label: "Cerrada", color: "bg-gray-100 text-gray-700", icon: <FileText className="w-3 h-3" /> },
};

function fmt(n: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
}

type Chargeback = {
  id: number;
  amount: number;
  currency?: string;
  status: string;
  reason?: string | null;
  reasonEs?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
};

export default function Chargebacks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const { data: chargebacks = [], isLoading, refetch } = trpc.chargebacks.list.useQuery();
  const createMutation = trpc.chargebacks.create.useMutation({
    onSuccess: () => { toast.success("Aclaración registrada"); refetch(); setShowCreate(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.chargebacks.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); setDetailCb(null); },
    onError: (e) => toast.error(e.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: "", reason: "", reasonEs: "", notes: "" });
  const [detailCb, setDetailCb] = useState<Chargeback | null>(null);
  const [newStatus, setNewStatus] = useState<CBStatus>("open");
  const [adminNotes, setAdminNotes] = useState("");

  function resetForm() {
    setForm({ amount: "", reason: "", reasonEs: "", notes: "" });
  }

  function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (!amount || amount < 1) { toast.error("Monto inválido"); return; }
    createMutation.mutate({
      amount,
      reason: form.reason || undefined,
      reasonEs: form.reasonEs || undefined,
      notes: form.notes || undefined,
    });
  }

  function openDetail(cb: Chargeback) {
    setDetailCb(cb);
    setNewStatus((cb.status as CBStatus) || "open");
    setAdminNotes(cb.notes || "");
  }

  function handleUpdateStatus() {
    if (!detailCb) return;
    updateStatusMutation.mutate({
      id: detailCb.id,
      status: newStatus,
      notes: adminNotes || undefined,
    });
  }

  const open = chargebacks.filter(c => c.status === "open").length;
  const inReview = chargebacks.filter(c => c.status === "under_review").length;
  const won = chargebacks.filter(c => c.status === "won").length;
  const lost = chargebacks.filter(c => c.status === "lost").length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aclaraciones / Contracargos</h1>
            <p className="text-gray-500 text-sm mt-1">Gestiona disputas y contracargos de tus transacciones</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nueva Aclaración
          </Button>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">¿Qué es una aclaración?</p>
            <p className="text-sm text-blue-600 mt-0.5">
              Cuando un cliente disputa un cargo con su banco, se genera un contracargo. Tienes <strong>7 días hábiles</strong> para
              enviar evidencia y disputar el caso. Haz clic en <strong>Ver detalle</strong> para agregar información o actualizar el estado.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Abiertas", value: open, color: "text-yellow-600", bg: "bg-yellow-50", icon: <Clock className="w-5 h-5 text-yellow-500" /> },
            { label: "En revisión", value: inReview, color: "text-blue-600", bg: "bg-blue-50", icon: <RefreshCw className="w-5 h-5 text-blue-500" /> },
            { label: "Ganadas", value: won, color: "text-green-600", bg: "bg-green-50", icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
            { label: "Perdidas", value: lost, color: "text-red-600", bg: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" /> },
          ].map(({ label, value, color, bg, icon }) => (
            <Card key={label} className={bg + " border-0"}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={"text-2xl font-bold " + color}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Historial de Aclaraciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-gray-400">Cargando...</div>
            ) : chargebacks.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sin aclaraciones registradas</p>
                <p className="text-gray-400 text-sm mt-1">Cuando tengas contracargos o disputas, aparecerán aquí</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Registrar primera aclaración
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left py-2 px-3 font-medium">ID</th>
                      <th className="text-left py-2 px-3 font-medium">Fecha</th>
                      <th className="text-left py-2 px-3 font-medium">Monto</th>
                      <th className="text-left py-2 px-3 font-medium">Motivo</th>
                      <th className="text-left py-2 px-3 font-medium">Estado</th>
                      <th className="text-left py-2 px-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargebacks.map((cb) => {
                      const st = (cb.status as CBStatus) || "open";
                      const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.open;
                      return (
                        <tr key={cb.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3 font-mono text-xs text-gray-600">#{cb.id}</td>
                          <td className="py-3 px-3 text-gray-600">
                            {new Date(cb.createdAt).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-900">
                            {fmt(cb.amount, cb.currency)}
                          </td>
                          <td className="py-3 px-3 text-gray-600 max-w-[180px] truncate">
                            {cb.reasonEs || cb.reason || "Sin motivo"}
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={cfg.color + " border-0 flex items-center gap-1 w-fit"}>
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-blue-600 hover:bg-blue-50"
                              onClick={() => openDetail(cb as Chargeback)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver detalle
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <DollarSign className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-800 text-sm">Consejos para ganar aclaraciones</p>
                <p className="text-orange-700 text-sm mt-1">
                  Mantén siempre registros de tus transacciones: contratos firmados digitalmente, selfies del pagador,
                  comprobantes de entrega y comunicaciones con clientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Nueva Aclaración */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Aclaración</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Monto en disputa</Label>
              <Input
                type="number"
                placeholder="Ej: 1500"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                placeholder="Ej: Servicio no recibido"
                value={form.reasonEs}
                onChange={e => setForm(f => ({ ...f, reasonEs: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notas adicionales</Label>
              <Textarea
                placeholder="Describe los detalles de la disputa..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {createMutation.isPending ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de Aclaración */}
      <Dialog open={!!detailCb} onOpenChange={(v) => { if (!v) setDetailCb(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Aclaración #{detailCb?.id}
            </DialogTitle>
          </DialogHeader>
          {detailCb && (
            <div className="space-y-4 py-2">
              {/* Info de la aclaración */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monto en disputa</span>
                  <span className="font-bold text-gray-900">{fmt(detailCb.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fecha de apertura</span>
                  <span className="text-gray-700">{new Date(detailCb.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Motivo</span>
                  <span className="text-gray-700">{detailCb.reasonEs || detailCb.reason || "Sin motivo"}</span>
                </div>
                {detailCb.resolvedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fecha de resolución</span>
                    <span className="text-gray-700">{new Date(detailCb.resolvedAt).toLocaleDateString("es-MX")}</span>
                  </div>
                )}
              </div>

              {/* Notas actuales */}
              {detailCb.notes && (
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Notas registradas</Label>
                  <p className="text-sm text-gray-700 mt-1 bg-blue-50 rounded-lg p-3">{detailCb.notes}</p>
                </div>
              )}

              {/* Admin: cambiar estado y agregar notas */}
              {isAdmin ? (
                <>
                  <div>
                    <Label>Actualizar estado</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as CBStatus)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Abierta</SelectItem>
                        <SelectItem value="under_review">En revisión</SelectItem>
                        <SelectItem value="won">Ganada</SelectItem>
                        <SelectItem value="lost">Perdida</SelectItem>
                        <SelectItem value="closed">Cerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notas de resolución</Label>
                    <Textarea
                      placeholder="Agrega notas sobre la resolución de esta aclaración..."
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Estado actual:</strong> {STATUS_CONFIG[(detailCb.status as CBStatus) || "open"]?.label}. El equipo de KobraPay revisará tu caso y actualizará el estado en un plazo de 2-3 días hábiles.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailCb(null)}>Cerrar</Button>
            {isAdmin && (
              <Button
                onClick={handleUpdateStatus}
                disabled={updateStatusMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {updateStatusMutation.isPending ? "Guardando..." : "Actualizar estado"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
