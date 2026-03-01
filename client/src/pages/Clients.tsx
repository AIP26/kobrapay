import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  DollarSign,
  BarChart3,
  Link2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(amount));
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const statusConfig = {
  active: { label: "Activo", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  suspended: { label: "Suspendido", color: "bg-red-100 text-red-600", icon: XCircle },
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700", icon: Clock },
};

const txStatusConfig: Record<string, { label: string; color: string }> = {
  succeeded: { label: "Exitosa", color: "bg-green-100 text-green-700" },
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  failed: { label: "Fallida", color: "bg-red-100 text-red-600" },
  refunded: { label: "Reembolsada", color: "bg-purple-100 text-purple-700" },
  processing: { label: "Procesando", color: "bg-blue-100 text-blue-700" },
};

interface CreateClientForm {
  name: string;
  email: string;
  businessName: string;
  phone: string;
  commissionRate: number;
}

function CreateClientDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdClient, setCreatedClient] = useState<{ tempPassword: string; email: string } | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateClientForm>({
    defaultValues: { commissionRate: 7 },
  });

  const createClient = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      setCreatedClient({ tempPassword: data.tempPassword || "", email: data.email });
      onSuccess();
      reset();
      toast.success("Cliente creado exitosamente");
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear el cliente");
    },
  });

  const handleClose = () => {
    setOpen(false);
    setCreatedClient(null);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button className="bg-cyan-500 hover:bg-cyan-400 text-white gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-800">
            {createdClient ? "✅ Cliente creado" : "Crear nuevo cliente"}
          </DialogTitle>
        </DialogHeader>

        {createdClient ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-700 font-medium mb-3">
                El cliente puede iniciar sesión con estas credenciales:
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-mono font-medium text-gray-800">{createdClient.email}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdClient.email); toast.success("Email copiado"); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                  <div>
                    <p className="text-xs text-gray-500">Contraseña temporal</p>
                    <p className="text-sm font-mono font-medium text-gray-800">
                      {showPassword ? createdClient.tempPassword : "••••••••••"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdClient.tempPassword); toast.success("Contraseña copiada"); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">⚠️ Comparte estas credenciales de forma segura.</p>
            </div>
            <Button onClick={handleClose} className="w-full bg-cyan-500 hover:bg-cyan-400 text-white">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit((data) => createClient.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name" className="text-sm text-gray-700">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="Juan García"
                  {...register("name", { required: "Requerido" })}
                  className={errors.name ? "border-red-400" : ""}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email" className="text-sm text-gray-700">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@empresa.com"
                  {...register("email", { required: "Requerido" })}
                  className={errors.email ? "border-red-400" : ""}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="businessName" className="text-sm text-gray-700">Nombre del negocio</Label>
                <Input id="businessName" placeholder="Mi Empresa S.A." {...register("businessName")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm text-gray-700">Teléfono</Label>
                <Input id="phone" placeholder="+52 55 1234 5678" {...register("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commissionRate" className="text-sm text-gray-700">Comisión %</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="7"
                  {...register("commissionRate", { valueAsNumber: true })}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={createClient.isPending}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
            >
              {createClient.isPending ? "Creando..." : "Crear Cliente"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Panel de detalle de un cliente ─────────────────────────────────────────
function ClientDetailPanel({ clientId, onBack }: { clientId: number; onBack: () => void }) {
  const { data, isLoading } = trpc.clients.getDetail.useQuery({ id: clientId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Volver a clientes
        </button>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { client, stats, recentTransactions } = data;
  const cfg = statusConfig[client.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a clientes
      </button>

      {/* Client header */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800">{client.name}</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
              </div>
              {client.businessName && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {client.businessName}
                </p>
              )}
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" />{client.email}
                </span>
                {client.phone && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" />{client.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 rounded-lg flex-shrink-0">
              <Percent className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700">
                {parseFloat(String(client.commissionRate ?? 7)).toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Transacciones exitosas", value: stats.succeededTransactions, icon: CheckCircle2, iconColor: "text-green-600", iconBg: "bg-green-100" },
          { label: "Volumen total cobrado", value: formatCurrency(stats.totalVolume), icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-100" },
          { label: "Tu comisión total", value: formatCurrency(stats.totalCommission), icon: TrendingUp, iconColor: "text-cyan-600", iconBg: "bg-cyan-100" },
          { label: "Neto del cliente", value: formatCurrency(stats.totalNet), icon: BarChart3, iconColor: "text-purple-600", iconBg: "bg-purple-100" },
        ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
          <Card key={label} className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">{value}</p>
                </div>
                <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Link2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Enlaces de pago</p>
              <p className="text-base font-bold text-gray-800">{stats.totalLinks} total · {stats.activeLinks} pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Todas las transacciones</p>
              <p className="text-base font-bold text-gray-800">{stats.totalTransactions} registros</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-cyan-500" />
            Últimas 20 transacciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10">
              <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Este cliente aún no tiene transacciones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTransactions.map((tx) => {
                const txCfg = txStatusConfig[tx.status] ?? { label: tx.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {tx.payerName || "—"}
                      </p>
                      <p className="text-xs text-gray-400">{tx.operationNumber} · {formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(tx.amount)}</p>
                      <p className="text-xs text-cyan-600">Comisión: {formatCurrency(tx.commissionAmount)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${txCfg.color} flex-shrink-0`}>
                      {txCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Panel de desglose de comisiones ─────────────────────────────────────────
function CommissionBreakdownPanel({ onSelectClient }: { onSelectClient: (id: number) => void }) {
  const { data, isLoading } = trpc.clients.getCommissionBreakdown.useQuery();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Grand total */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-cyan-700 font-medium mb-1">Volumen total de todos los negocios</p>
            <p className="text-2xl font-bold text-cyan-800">{formatCurrency(data.grandTotalVolume)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-green-700 font-medium mb-1">Tu comisión total acumulada</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(data.grandTotalCommission)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-500" />
            Desglose por negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.breakdown.length === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aún no hay datos de comisiones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.breakdown.map((b, idx) => {
                const pct = data.grandTotalCommission > 0
                  ? (b.totalCommission / data.grandTotalCommission) * 100
                  : 0;
                const cfg = statusConfig[b.status] ?? statusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={b.clientId} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{b.clientName}</p>
                          {b.businessName && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{b.businessName}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />{cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                          <span>{b.transactionCount} transacciones exitosas</span>
                          <span>·</span>
                          <span>Comisión: <strong className="text-cyan-600">{b.commissionRate.toFixed(1)}%</strong></span>
                          <span>·</span>
                          <span>Volumen: <strong className="text-gray-700">{formatCurrency(b.totalVolume)}</strong></span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      {/* Commission amount */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-cyan-700">{formatCurrency(b.totalCommission)}</p>
                        <p className="text-xs text-gray-400">{pct.toFixed(1)}% del total</p>
                      </div>
                      {/* View detail */}
                      <button
                        onClick={() => onSelectClient(b.clientId)}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Ver detalle del cliente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Clients() {
  const { data: clients, isLoading, refetch } = trpc.clients.list.useQuery();
  const { data: stats } = trpc.clients.getStats.useQuery();

  const [activeTab, setActiveTab] = useState<"clients" | "commissions">("clients");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Cliente actualizado"); },
    onError: (err) => toast.error(err.message),
  });

  // Si hay un cliente seleccionado, mostrar su detalle
  if (selectedClientId !== null) {
    return (
      <DashboardLayout title="Detalle del Cliente">
        <ClientDetailPanel clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mis Clientes">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total clientes", value: stats?.totalClients ?? 0, icon: Users, iconColor: "text-blue-600", iconBg: "bg-blue-100" },
            { label: "Clientes activos", value: stats?.activeClients ?? 0, icon: CheckCircle2, iconColor: "text-green-600", iconBg: "bg-green-100" },
            { label: "Transacciones totales", value: stats?.totalTransactions ?? 0, icon: CreditCard, iconColor: "text-purple-600", iconBg: "bg-purple-100" },
            { label: "Comisiones ganadas", value: formatCurrency(stats?.totalCommissionEarned ?? 0), icon: TrendingUp, iconColor: "text-cyan-600", iconBg: "bg-cyan-100" },
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

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "clients"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Mis Clientes
            </span>
          </button>
          <button
            onClick={() => setActiveTab("commissions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "commissions"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Desglose de Comisiones
            </span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "commissions" ? (
          <CommissionBreakdownPanel onSelectClient={(id) => setSelectedClientId(id)} />
        ) : (
          <>
            {/* Clients Table */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-500" />
                    Clientes de la Plataforma
                  </CardTitle>
                  <CreateClientDialog onSuccess={() => refetch()} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-0">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                        <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-36" />
                          <div className="h-3 bg-gray-100 animate-pulse rounded w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !clients || clients.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium mb-1">Sin clientes aún</p>
                    <p className="text-sm text-gray-400 mb-4">Crea tu primer cliente para que pueda usar la plataforma</p>
                    <CreateClientDialog onSuccess={() => refetch()} />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {clients.map((client) => {
                      const cfg = statusConfig[client.status] ?? statusConfig.pending;
                      const StatusIcon = cfg.icon;
                      const initials = client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

                      return (
                        <div key={client.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                          {/* Avatar */}
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">{initials}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800">{client.name}</p>
                              {client.businessName && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {client.businessName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {client.email}
                              </span>
                              {client.phone && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {client.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Commission */}
                          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 rounded-lg flex-shrink-0">
                            <Percent className="w-3.5 h-3.5 text-cyan-600" />
                            <span className="text-sm font-bold text-cyan-700">
                              {parseFloat(String(client.commissionRate ?? 7)).toFixed(1)}%
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>

                            {/* Toggle status */}
                            {client.status === "active" ? (
                              <button
                                onClick={() => updateClient.mutate({ id: client.id, status: "suspended" })}
                                className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                                title="Suspender cliente"
                              >
                                Suspender
                              </button>
                            ) : client.status === "suspended" ? (
                              <button
                                onClick={() => updateClient.mutate({ id: client.id, status: "active" })}
                                className="text-xs text-green-600 hover:text-green-700 hover:underline transition-colors"
                                title="Activar cliente"
                              >
                                Activar
                              </button>
                            ) : null}
                          </div>

                          {/* Ver detalle */}
                          <button
                            onClick={() => setSelectedClientId(client.id)}
                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Ver detalle del cliente"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-cyan-200 bg-cyan-50/50">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Percent className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cyan-800">Sistema de comisiones</p>
                    <p className="text-xs text-cyan-700 mt-0.5">
                      Cada cliente tiene una comisión personalizada. Cuando un cliente de tu plataforma procesa un pago,
                      la comisión se descuenta automáticamente del monto y se registra como ingreso tuyo.
                      La comisión por defecto es del <strong>7%</strong> pero puedes personalizarla por cliente.
                      Usa la pestaña <strong>Desglose de Comisiones</strong> para ver el resumen por negocio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
