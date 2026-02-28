import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
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

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default function Chargebacks() {
  const { data: chargebacks = [], isLoading, refetch } = trpc.chargebacks.list.useQuery();
  const createMutation = trpc.chargebacks.create.useMutation({
    onSuccess: () => { toast.success("Aclaración registrada"); refetch(); setShowCreate(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: "", reason: "", reasonEs: "", notes: "" });

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
              enviar evidencia y disputar el caso.
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
                      <th className="text-left py-2 px-3 font-medium">Notas</th>
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
                            {fmt(cb.amount)}
                          </td>
                          <td className="py-3 px-3 text-gray-600 max-w-[180px] truncate">
                            {cb.reasonEs || cb.reason || "Sin motivo"}
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={cfg.color + " border-0 flex items-center gap-1 w-fit"}>
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-xs max-w-[200px] truncate">
                            {cb.notes || "Sin notas"}
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
              <Label>Monto en disputa (MXN)</Label>
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
    </DashboardLayout>
  );
}
