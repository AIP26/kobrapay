import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, DollarSign, Copy, CheckCircle, CreditCard, TrendingUp } from "lucide-react";

export default function SalesAgents() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [payRef, setPayRef] = useState("");

  const { data: agents = [], refetch } = trpc.salesAgents.list.useQuery();
  const createMutation = trpc.salesAgents.create.useMutation({
    onSuccess: () => { toast.success("Vendedor registrado correctamente"); setShowCreate(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const markPaidMutation = trpc.salesAgents.markAsPaid.useMutation({
    onSuccess: () => { toast.success("Comisiones marcadas como pagadas"); setPayRef(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const selectedAgentData = agents.find(a => a.id === selectedAgent);
  const { data: commissionSummary } = trpc.salesAgents.getCommissionSummary.useQuery(
    { agentId: selectedAgent! },
    { enabled: !!selectedAgent }
  );
  const { data: pendingCommissions = [] } = trpc.salesAgents.getPendingCommissions.useQuery(
    { agentId: selectedAgent! },
    { enabled: !!selectedAgent }
  );

  const [form, setForm] = useState({
    name: "", email: "", phone: "", commissionRate: 0.5,
    bankName: "", clabe: "", bankAccountHolder: "",
    paymentCycle: "biweekly" as "weekly" | "biweekly" | "monthly" | "manual" | "custom_day",
    paymentDay: 1,
  });

  const copyReferralLink = (code: string) => {
    const url = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace de referido copiado: " + url);
  };

  return (
    <DashboardLayout>
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendedores / Afiliados</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona tu red de vendedores y sus comisiones</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-700 hover:bg-cyan-800 text-foreground gap-2">
              <Plus className="w-4 h-4" /> Nuevo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Vendedor</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label>Nombre completo *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="María González" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="maria@gmail.com" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="55 1234 5678" />
              </div>
              <div>
                <Label>Comisión que le pagas (%)</Label>
                <Input type="number" min={0} max={10} step={0.1} value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: parseFloat(e.target.value) || 0.5 }))} />
              </div>
              <div className="col-span-2">
                <Label>Ciclo de pago</Label>
                <Select value={form.paymentCycle} onValueChange={v => setForm(f => ({ ...f, paymentCycle: v as "weekly" | "biweekly" | "monthly" | "manual" | "custom_day" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal (cada viernes)</SelectItem>
                    <SelectItem value="biweekly">Quincenal (1 y 15)</SelectItem>
                    <SelectItem value="monthly">Mensual (último día del mes)</SelectItem>
                    <SelectItem value="manual">Manual (yo decido cuándo pagar)</SelectItem>
                    <SelectItem value="custom_day">Día específico del mes</SelectItem>
                  </SelectContent>
                </Select>
                {form.paymentCycle === "custom_day" && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Día del mes (1-28)</Label>
                    <Input
                      type="number" min={1} max={28}
                      value={form.paymentDay}
                      onChange={e => setForm(f => ({ ...f, paymentDay: parseInt(e.target.value) || 1 }))}
                      placeholder="Ej: 10 = cada día 10 del mes"
                    />
                  </div>
                )}
              </div>
              <div className="col-span-2 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Datos bancarios para pago</p>
              </div>
              <div>
                <Label>Banco</Label>
                <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="BBVA, Banorte, HSBC..." />
              </div>
              <div>
                <Label>CLABE (18 dígitos)</Label>
                <Input value={form.clabe} onChange={e => setForm(f => ({ ...f, clabe: e.target.value }))} placeholder="012345678901234567" maxLength={18} />
              </div>
              <div className="col-span-2">
                <Label>Nombre del titular de la cuenta</Label>
                <Input value={form.bankAccountHolder} onChange={e => setForm(f => ({ ...f, bankAccountHolder: e.target.value }))} placeholder="María González López" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.name || !form.email}
                className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-foreground"
              >
                {createMutation.isPending ? "Guardando..." : "Registrar Vendedor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Vendedores</p>
          <p className="text-2xl font-bold text-foreground">{agents.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">{agents.filter(a => a.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Ciclo de pago</p>
          <p className="text-sm font-semibold text-foreground mt-1">Semanal / Quincenal</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">No hay vendedores registrados</p>
            <p className="text-sm">Agrega tu primer vendedor para empezar a crecer</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Vendedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Comisión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ciclo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Código Referido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map(agent => (
                <tr key={agent.id} className={`hover:bg-gray-50 ${selectedAgent === agent.id ? "bg-cyan-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-cyan-700">{agent.commissionRate}%</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{{
                    weekly: "Semanal",
                    biweekly: "Quincenal",
                    monthly: "Mensual",
                    manual: "Manual",
                  }[agent.paymentCycle] || (agent.paymentCycle?.startsWith("day_") ? `Día ${agent.paymentCycle.split("_")[1]}` : agent.paymentCycle)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{agent.referralCode}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyReferralLink(agent.referralCode || "")}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${agent.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-muted-foreground"}`}>
                      {agent.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                      className="text-cyan-700"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Commission detail panel */}
      {selectedAgentData && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-700" />
            Comisiones — {selectedAgentData.name}
          </h2>

          {commissionSummary && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs text-amber-600 font-semibold uppercase mb-1">Por Pagar</p>
                <p className="text-2xl font-bold text-amber-700">${parseFloat(commissionSummary.pending).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-xs text-green-600 font-semibold uppercase mb-1">Pagado</p>
                <p className="text-2xl font-bold text-green-700">${parseFloat(commissionSummary.paid).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</p>
              </div>
              <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                <p className="text-xs text-cyan-600 font-semibold uppercase mb-1">Total Acumulado</p>
                <p className="text-2xl font-bold text-cyan-700">${parseFloat(commissionSummary.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</p>
              </div>
            </div>
          )}

          {/* Datos bancarios */}
          {selectedAgentData.clabe && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Datos para transferencia SPEI
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Banco:</span> <strong>{selectedAgentData.bankName || "—"}</strong></div>
                <div><span className="text-muted-foreground">CLABE:</span> <strong className="font-mono">{selectedAgentData.clabe}</strong></div>
                <div><span className="text-muted-foreground">Titular:</span> <strong>{selectedAgentData.bankAccountHolder || selectedAgentData.name}</strong></div>
              </div>
            </div>
          )}

          {/* Marcar como pagado */}
          {parseFloat(commissionSummary?.pending || "0") > 0 && (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Referencia de pago (folio SPEI)</Label>
                <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Folio de transferencia BBVA / Banorte..." />
              </div>
              <Button
                onClick={() => markPaidMutation.mutate({ agentId: selectedAgentData.id, paymentReference: payRef })}
                disabled={!payRef || markPaidMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-foreground gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Marcar como Pagado
              </Button>
            </div>
          )}

          {pendingCommissions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground mb-2">Comisiones pendientes ({pendingCommissions.length}):</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {pendingCommissions.map((c: { id: number; commissionAmount: string | number; createdAt: Date | null }) => (
                  <div key={c.id} className="flex justify-between text-xs text-muted-foreground py-1 border-b border-gray-100">
                    <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-MX") : "—"}</span>
                    <span className="font-semibold text-amber-600">${parseFloat(String(c.commissionAmount)).toFixed(2)} MXN</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
