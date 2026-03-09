import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Plus,
  Banknote,
  Globe,
  Smartphone,
  Bitcoin,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En proceso", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
  completed: { label: "Completado", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Fallido", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-500/20 text-muted-foreground border-gray-500/30", icon: <XCircle className="w-3 h-3" /> },
};

const TRANSFER_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  spei: { label: "SPEI Nacional", icon: <Building2 className="w-4 h-4" />, color: "text-blue-400" },
  wire: { label: "Wire Internacional", icon: <Globe className="w-4 h-4" />, color: "text-purple-400" },
  zelle: { label: "Zelle", icon: <Smartphone className="w-4 h-4" />, color: "text-green-400" },
  crypto: { label: "Cripto", icon: <Bitcoin className="w-4 h-4" />, color: "text-orange-400" },
  other: { label: "Otro", icon: <Banknote className="w-4 h-4" />, color: "text-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function formatCurrency(amount: string | number, currency = "MXN") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(num);
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MyDeposits() {

  const [activeTab, setActiveTab] = useState("retiros");
  const [showNewDeposit, setShowNewDeposit] = useState(false);
  const [showNewTransfer, setShowNewTransfer] = useState(false);

  const depositsQuery = trpc.deposits.list.useQuery();
  const transfersQuery = trpc.transferRecords.list.useQuery();
  const utils = trpc.useUtils();

  const createDepositMutation = trpc.deposits.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitud enviada", { description: "Tu solicitud de retiro fue registrada correctamente." });
      utils.deposits.list.invalidate();
      setShowNewDeposit(false);
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const createTransferMutation = trpc.transferRecords.create.useMutation({
    onSuccess: () => {
      toast.success("Transferencia registrada", { description: "El registro fue agregado correctamente." });
      utils.transferRecords.list.invalidate();
      setShowNewTransfer(false);
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  // Resumen
  const deposits = depositsQuery.data ?? [];
  const transfers = transfersQuery.data ?? [];
  const totalRetiros = deposits.filter(d => d.status === "completed").reduce((s, d) => s + parseFloat(d.netAmount), 0);
  const totalRecibido = transfers.filter(t => t.type === "received" && t.status === "completed").reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalEnviado = transfers.filter(t => t.type === "sent" && t.status === "completed").reduce((s, t) => s + parseFloat(t.amount), 0);
  const pendingCount = deposits.filter(d => d.status === "pending").length + transfers.filter(t => t.status === "pending").length;

  return (
    <DashboardLayout title="Mis Depósitos">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Depósitos y Transferencias</h1>
          <p className="text-muted-foreground text-sm mt-1">Historial de retiros a tu cuenta bancaria y movimientos de transferencias</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowDownCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Depositado</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalRetiros)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ArrowDownCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transferencias Recibidas</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalRecibido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowUpCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transferencias Enviadas</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalEnviado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En Proceso</p>
                <p className="text-lg font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="retiros" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground">
              Retiros de Cobros
            </TabsTrigger>
            <TabsTrigger value="transferencias" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground">
              Transferencias
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {activeTab === "retiros" && (
              <Dialog open={showNewDeposit} onOpenChange={setShowNewDeposit}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#00e5a0] hover:bg-[#00c88a] text-black font-semibold">
                    <Plus className="w-4 h-4 mr-1" /> Solicitar Retiro
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle>Solicitar Retiro</DialogTitle>
                  </DialogHeader>
                  <NewDepositForm onSubmit={(data) => createDepositMutation.mutate(data)} loading={createDepositMutation.isPending} />
                </DialogContent>
              </Dialog>
            )}
            {activeTab === "transferencias" && (
              <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#00e5a0] hover:bg-[#00c88a] text-black font-semibold">
                    <Plus className="w-4 h-4 mr-1" /> Nueva Transferencia
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar Transferencia</DialogTitle>
                  </DialogHeader>
                  <NewTransferForm onSubmit={(data) => createTransferMutation.mutate(data)} loading={createTransferMutation.isPending} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tab: Retiros */}
        <TabsContent value="retiros" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Historial de Retiros a Cuenta Bancaria</CardTitle>
            </CardHeader>
            <CardContent>
              {depositsQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowDownCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Sin retiros registrados</p>
                  <p className="text-muted-foreground text-sm mt-1">Cuando solicites un retiro de tus cobros, aparecerá aquí.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Fecha</TableHead>
                      <TableHead className="text-muted-foreground">Monto</TableHead>
                      <TableHead className="text-muted-foreground">Comisión</TableHead>
                      <TableHead className="text-muted-foreground">Neto</TableHead>
                      <TableHead className="text-muted-foreground">Banco Destino</TableHead>
                      <TableHead className="text-muted-foreground">Rastreo SPEI</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((d) => (
                      <TableRow key={d.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-muted-foreground text-sm">{formatDate(d.createdAt)}</TableCell>
                        <TableCell className="text-foreground font-medium">{formatCurrency(d.amount, d.currency)}</TableCell>
                        <TableCell className="text-red-400 text-sm">-{formatCurrency(d.fee, d.currency)}</TableCell>
                        <TableCell className="text-green-400 font-semibold">{formatCurrency(d.netAmount, d.currency)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{d.destinationBank || "—"}</TableCell>
                        <TableCell>
                          {d.trackingNumber ? (
                            <div className="flex items-center gap-1">
                              <span className="text-blue-400 text-xs font-mono">{d.trackingNumber}</span>
                              <button onClick={() => { navigator.clipboard.writeText(d.trackingNumber!); toast.success("Copiado"); }}>
                                <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">Pendiente</span>}
                        </TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Transferencias */}
        <TabsContent value="transferencias" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Historial de Transferencias</CardTitle>
            </CardHeader>
            <CardContent>
              {transfersQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Sin transferencias registradas</p>
                  <p className="text-muted-foreground text-sm mt-1">Aquí verás tus transferencias SPEI, Wire, Zelle y Cripto.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs mx-auto">
                    {Object.entries(TRANSFER_TYPE_CONFIG).map(([key, cfg]) => (
                      <div key={key} className={`flex items-center gap-2 text-xs ${cfg.color} bg-[#1e2d4a]/50 rounded-lg px-3 py-2`}>
                        {cfg.icon} {cfg.label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Fecha</TableHead>
                      <TableHead className="text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-muted-foreground">Dirección</TableHead>
                      <TableHead className="text-muted-foreground">Monto</TableHead>
                      <TableHead className="text-muted-foreground">Concepto</TableHead>
                      <TableHead className="text-muted-foreground">Rastreo</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t) => {
                      const typeCfg = TRANSFER_TYPE_CONFIG[t.transferType] || TRANSFER_TYPE_CONFIG.other;
                      return (
                        <TableRow key={t.id} className="border-border hover:bg-muted/50">
                          <TableCell className="text-muted-foreground text-sm">{formatDate(t.createdAt)}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1.5 text-sm ${typeCfg.color}`}>
                              {typeCfg.icon} {typeCfg.label}
                            </div>
                          </TableCell>
                          <TableCell>
                            {t.type === "received" ? (
                              <span className="flex items-center gap-1 text-green-400 text-xs">
                                <ArrowDownCircle className="w-3 h-3" /> Recibida de {t.senderName || "—"}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400 text-xs">
                                <ArrowUpCircle className="w-3 h-3" /> Enviada a {t.recipientName || "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={`font-semibold ${t.type === "received" ? "text-green-400" : "text-red-400"}`}>
                            {t.type === "received" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t.concept || "—"}</TableCell>
                          <TableCell>
                            {t.trackingNumber ? (
                              <div className="flex items-center gap-1">
                                <span className="text-blue-400 text-xs font-mono">{t.trackingNumber}</span>
                                <button onClick={() => { navigator.clipboard.writeText(t.trackingNumber!); toast.success("Copiado"); }}>
                                  <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}

function NewDepositForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ amount: "", destinationClabe: "", destinationBank: "", beneficiaryName: "" });
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground">Monto a retirar (MXN)</Label>
        <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
      </div>
      <div>
        <Label className="text-muted-foreground">CLABE destino (18 dígitos)</Label>
        <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1 font-mono" placeholder="000000000000000000" maxLength={18} value={form.destinationClabe} onChange={e => setForm(p => ({ ...p, destinationClabe: e.target.value }))} />
      </div>
      <div>
        <Label className="text-muted-foreground">Banco destino</Label>
        <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="BBVA, Banamex, Banorte..." value={form.destinationBank} onChange={e => setForm(p => ({ ...p, destinationBank: e.target.value }))} />
      </div>
      <div>
        <Label className="text-muted-foreground">Nombre del beneficiario</Label>
        <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="Nombre completo" value={form.beneficiaryName} onChange={e => setForm(p => ({ ...p, beneficiaryName: e.target.value }))} />
      </div>
      <p className="text-xs text-muted-foreground">Se aplicará una comisión del 0.5% sobre el monto solicitado. El depósito se procesa en 1-2 días hábiles.</p>
      <Button className="w-full bg-[#00e5a0] hover:bg-[#00c88a] text-black font-semibold" disabled={loading || !form.amount} onClick={() => onSubmit({ amount: parseFloat(form.amount), destinationClabe: form.destinationClabe || undefined, destinationBank: form.destinationBank || undefined, beneficiaryName: form.beneficiaryName || undefined })}>
        {loading ? "Enviando..." : "Solicitar Retiro"}
      </Button>
    </div>
  );
}

function NewTransferForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ type: "sent", transferType: "spei", amount: "", currency: "MXN", concept: "", recipientName: "", recipientBank: "", recipientClabe: "", senderName: "", senderBank: "" });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-muted-foreground text-sm">Dirección</Label>
          <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
            <SelectTrigger className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground">
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="received">Recibida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Tipo</Label>
          <Select value={form.transferType} onValueChange={v => setForm(p => ({ ...p, transferType: v }))}>
            <SelectTrigger className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground">
              <SelectItem value="spei">SPEI Nacional</SelectItem>
              <SelectItem value="wire">Wire Internacional</SelectItem>
              <SelectItem value="zelle">Zelle</SelectItem>
              <SelectItem value="crypto">Cripto</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-muted-foreground text-sm">Monto</Label>
          <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Moneda</Label>
          <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
            <SelectTrigger className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground">
              <SelectItem value="MXN">MXN</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.type === "sent" ? (
        <>
          <div>
            <Label className="text-muted-foreground text-sm">Nombre del destinatario</Label>
            <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="Nombre completo" value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Banco / Plataforma destino</Label>
            <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="BBVA, Zelle, Coinbase..." value={form.recipientBank} onChange={e => setForm(p => ({ ...p, recipientBank: e.target.value }))} />
          </div>
          {form.transferType === "spei" && (
            <div>
              <Label className="text-muted-foreground text-sm">CLABE destino</Label>
              <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1 font-mono" placeholder="000000000000000000" maxLength={18} value={form.recipientClabe} onChange={e => setForm(p => ({ ...p, recipientClabe: e.target.value }))} />
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <Label className="text-muted-foreground text-sm">Nombre del remitente</Label>
            <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="Nombre completo" value={form.senderName} onChange={e => setForm(p => ({ ...p, senderName: e.target.value }))} />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Banco / Plataforma origen</Label>
            <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="BBVA, Zelle, Coinbase..." value={form.senderBank} onChange={e => setForm(p => ({ ...p, senderBank: e.target.value }))} />
          </div>
        </>
      )}
      <div>
        <Label className="text-muted-foreground text-sm">Concepto</Label>
        <Input className="bg-[#1e2d4a] border-[#2e3d5a] text-foreground mt-1" placeholder="Descripción del movimiento" value={form.concept} onChange={e => setForm(p => ({ ...p, concept: e.target.value }))} />
      </div>
      <Button className="w-full bg-[#00e5a0] hover:bg-[#00c88a] text-black font-semibold" disabled={loading || !form.amount} onClick={() => onSubmit({ type: form.type, transferType: form.transferType, amount: parseFloat(form.amount), currency: form.currency, concept: form.concept || undefined, recipientName: form.recipientName || undefined, recipientBank: form.recipientBank || undefined, recipientClabe: form.recipientClabe || undefined, senderName: form.senderName || undefined, senderBank: form.senderBank || undefined })}>
        {loading ? "Guardando..." : "Registrar Transferencia"}
      </Button>
    </div>
  );
}
