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
import { Shield, Save } from "lucide-react";

const ALL_PERMISSIONS = [
  { key: "canCreateLinks", label: "Crear enlaces de pago", description: "Puede generar y compartir links de cobro" },
  { key: "canViewSales", label: "Ver historial de ventas", description: "Acceso al historial y reporte de ventas" },
  { key: "canManageContracts", label: "Gestionar contratos", description: "Crear, firmar y gestionar contratos" },
  { key: "canManageClients", label: "Gestionar clientes/pagadores", description: "Ver y administrar su base de clientes" },
  { key: "canViewReports", label: "Ver reportes y estad\u00edsticas", description: "Acceso a reportes mensuales y m\u00e9tricas" },
  { key: "canManageStaff", label: "Gestionar colaboradores", description: "Invitar y administrar su equipo" },
  { key: "canAccessSettings", label: "Configuraci\u00f3n de cuenta", description: "Modificar datos del negocio y ajustes" },
  { key: "canManageHR", label: "Expedientes RH", description: "Gestionar expedientes de empleados" },
  { key: "canManageNomina", label: "N\u00f3mina", description: "Calcular y gestionar n\u00f3mina del equipo" },
  { key: "canManageCatalog", label: "Cat\u00e1logo de productos", description: "Crear y gestionar su cat\u00e1logo" },
  { key: "canManageChargebacks", label: "Aclaraciones/Disputas", description: "Gestionar contracargos y disputas" },
  { key: "canManageInvoices", label: "Facturas", description: "Crear y gestionar facturas" },
  { key: "canManageExpedientes", label: "Expedientes de clientes", description: "Gestionar expedientes de sus clientes" },
  { key: "canManageRecurring", label: "Cobros recurrentes", description: "Configurar suscripciones y cobros autom\u00e1ticos" },
  { key: "canManagePOS", label: "Punto de venta", description: "Acceso al POS para cobros presenciales" },
] as const;

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
  const { data, isLoading, refetch } = trpc.clients.getDetail.useQuery({ id: clientId });
  const utils = trpc.useUtils();

  // Edición de comisión
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionValue, setCommissionValue] = useState("");
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Comisión actualizada");
      setEditingCommission(false);
      utils.clients.getDetail.invalidate({ id: clientId });
      utils.clients.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Asignación de asociado
  const [assigningAssociate, setAssigningAssociate] = useState(false);
  const [selectedAssocCommId, setSelectedAssocCommId] = useState<string>("");
  const assignAssociate = trpc.clients.assignAssociate.useMutation({
    onSuccess: () => {
      toast.success("Asociado asignado correctamente");
      setAssigningAssociate(false);
      utils.clients.getDetail.invalidate({ id: clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Tabs
  const [activeTab, setActiveTab] = useState<"resumen" | "perfil" | "negocio" | "asociado" | "permisos" | "transacciones">("resumen");

  // Permisos — hooks DEBEN estar antes de cualquier early return (reglas de React)
  const parsePerms = (raw: string | null): Record<string, boolean> => {
    if (!raw) return Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true]));
    try { return JSON.parse(raw) as Record<string, boolean>; } catch { return {}; }
  };
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [permsDirty, setPermsDirty] = useState(false);
  const updatePerms = trpc.clients.updatePermissions.useMutation({
    onSuccess: () => { toast.success("Permisos actualizados"); setPermsDirty(false); utils.clients.getDetail.invalidate({ id: clientId }); },
    onError: () => toast.error("Error al guardar permisos"),
  });
  const togglePerm = (key: string) => {
    setLocalPerms(prev => { const next = { ...prev, [key]: !prev[key] }; setPermsDirty(true); return next; });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Volver a clientes
        </button>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { client, stats, recentTransactions, recentLinks, profile, userAccount, vendorConfig, referringAssociate, availableAssociates, permissions } = data;
  const cfg = statusConfig[client.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const currentCommission = parseFloat(String(client.commissionRate ?? 7));

  // Sincronizar permisos cuando llegan los datos (si aún no están cargados)
  const parsedPerms = parsePerms(permissions);
  const effectivePerms = Object.keys(localPerms).length > 0 ? localPerms : parsedPerms;

  const TABS = [
    { id: "resumen", label: "Resumen" },
    { id: "perfil", label: "Perfil" },
    { id: "negocio", label: "Negocio" },
    { id: "asociado", label: "Asociado" },
    { id: "permisos", label: "Permisos" },
    { id: "transacciones", label: "Transacciones" },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a clientes
      </button>

      {/* Header card */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt={client.name} className="w-14 h-14 rounded-2xl object-cover" />
                : <span className="text-white text-lg font-bold">{initials}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800">{client.name}</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" />{cfg.label}
                </span>
                {userAccount?.role && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{userAccount.role}</span>
                )}
              </div>
              {(client.businessName || vendorConfig?.businessName) && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />{client.businessName || vendorConfig?.businessName}
                </p>
              )}
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                {client.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                {userAccount?.lastSignedIn && (
                  <span className="text-xs text-gray-400">Último acceso: {formatDate(userAccount.lastSignedIn)}</span>
                )}
              </div>
            </div>
            {/* Comisión editable */}
            <div className="flex-shrink-0">
              {editingCommission ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={commissionValue}
                    onChange={e => setCommissionValue(e.target.value)}
                    className="w-20 text-sm border border-cyan-300 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    autoFocus
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white h-8 px-3"
                    disabled={updateClient.isPending}
                    onClick={() => updateClient.mutate({ id: client.id as number, commissionRate: parseFloat(commissionValue) })}>
                    {updateClient.isPending ? "..." : "✓"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-400" onClick={() => setEditingCommission(false)}>✕</Button>
                </div>
              ) : (
                <button
                  onClick={() => { setCommissionValue(currentCommission.toFixed(1)); setEditingCommission(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors group"
                  title="Clic para editar comisión"
                >
                  <Percent className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-sm font-bold text-cyan-700">{currentCommission.toFixed(1)}%</span>
                  <span className="text-xs text-cyan-400 group-hover:text-cyan-600 ml-1">editar</span>
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── TAB: RESUMEN ── */}
      {activeTab === "resumen" && (
        <div className="space-y-4">
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
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center"><Link2 className="w-4 h-4 text-indigo-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Enlaces de pago</p>
                  <p className="text-base font-bold text-gray-800">{stats.totalLinks} total · {stats.activeLinks} pendientes · {(stats as any).paidLinks ?? 0} pagados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center"><AlertCircle className="w-4 h-4 text-orange-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total de transacciones</p>
                  <p className="text-base font-bold text-gray-800">{stats.totalTransactions} registros</p>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Últimas transacciones */}
          {recentTransactions && recentTransactions.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-500" />Últimas transacciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {recentTransactions.slice(0, 5).map((tx) => {
                    const txCfg = txStatusConfig[tx.status] ?? { label: tx.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{tx.payerName || "—"}</p>
                          <p className="text-xs text-gray-400">{tx.operationNumber} · {formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-800">{formatCurrency(tx.amount)}</p>
                          <p className="text-xs text-cyan-600">Comisión: {formatCurrency(tx.commissionAmount)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${txCfg.color} flex-shrink-0`}>{txCfg.label}</span>
                      </div>
                    );
                  })}
                </div>
                {recentTransactions.length > 5 && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button onClick={() => setActiveTab("transacciones")} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                      Ver todas las transacciones ({recentTransactions.length}) →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Últimos enlaces */}
          {recentLinks && recentLinks.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-500" />Últimos enlaces de pago
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {recentLinks.slice(0, 5).map((l: any) => {
                    const lCfg = txStatusConfig[l.status] ?? { label: l.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <div key={l.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{l.clientName}</p>
                          <p className="text-xs text-gray-400">{formatDate(l.createdAt)}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800 flex-shrink-0">{formatCurrency(l.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lCfg.color} flex-shrink-0`}>{lCfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {/* KYC */}
          <ClientKYCSection clientEmail={client.email} />
        </div>
      )}

      {/* ── TAB: PERFIL ── */}
      {activeTab === "perfil" && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800">Perfil Personal y Fiscal</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!profile ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Este cliente aún no ha completado su perfil</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Nombre completo", value: profile.fullName },
                  { label: "Teléfono", value: profile.phone },
                  { label: "Fecha de nacimiento", value: profile.birthDate },
                  { label: "CURP", value: profile.curp },
                  { label: "RFC", value: profile.rfc },
                  { label: "Nombre del negocio", value: profile.businessName },
                  { label: "Tipo de negocio", value: profile.businessType },
                  { label: "Razón social", value: profile.razonSocial },
                  { label: "Dirección fiscal", value: profile.direccionFiscal },
                  { label: "Código postal", value: profile.codigoPostal },
                  { label: "Ciudad", value: profile.ciudad },
                  { label: "Estado", value: profile.estado },
                  { label: "Sitio web", value: profile.sitioWeb },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                    <p className="text-sm text-gray-800 font-medium">{value}</p>
                  </div>
                ) : null)}
                {/* Datos bancarios */}
                {(profile.clabe || profile.banco) && (
                  <div className="sm:col-span-2 bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                    <p className="text-xs font-semibold text-cyan-700 mb-2">Datos bancarios (SPEI)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {profile.clabe && <div><p className="text-xs text-gray-400">CLABE</p><p className="text-sm font-mono font-bold text-gray-800">{profile.clabe}</p></div>}
                      {profile.banco && <div><p className="text-xs text-gray-400">Banco</p><p className="text-sm font-medium text-gray-800">{profile.banco}</p></div>}
                      {profile.titularCuenta && <div><p className="text-xs text-gray-400">Titular</p><p className="text-sm font-medium text-gray-800">{profile.titularCuenta}</p></div>}
                    </div>
                  </div>
                )}
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${profile.profileCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {profile.profileCompleted ? "✓ Perfil completado" : "⚠ Perfil incompleto"}
                  </span>
                  {userAccount?.emailVerified !== undefined && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${userAccount.emailVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {userAccount.emailVerified ? "✓ Email verificado" : "Email no verificado"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: NEGOCIO ── */}
      {activeTab === "negocio" && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800">Configuración del Negocio</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!vendorConfig ? (
              <div className="text-center py-10">
                <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin configuración de negocio aún</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Nombre del negocio", value: vendorConfig.businessName },
                    { label: "Email del negocio", value: vendorConfig.businessEmail },
                    { label: "Teléfono del negocio", value: vendorConfig.businessPhone },
                    { label: "País de operación", value: vendorConfig.businessCountry },
                    { label: "Slug (URL pública)", value: vendorConfig.businessSlug ? `kobrapay.mx/p/${vendorConfig.businessSlug}` : null },
                    { label: "Sitio web", value: vendorConfig.websiteUrl },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                      <p className="text-sm text-gray-800 font-medium">{value}</p>
                    </div>
                  ) : null)}
                </div>
                {/* Stripe Connect */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 mb-2">Stripe Connect</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      vendorConfig.stripeConnectStatus === "active" ? "bg-green-100 text-green-700" :
                      vendorConfig.stripeConnectStatus === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      Estado: {vendorConfig.stripeConnectStatus}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${vendorConfig.stripeConnectChargesEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {vendorConfig.stripeConnectChargesEnabled ? "✓ Cobros habilitados" : "✗ Cobros no habilitados"}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-cyan-100 text-cyan-700">
                      Comisión plataforma: {vendorConfig.commissionRate?.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${vendorConfig.publicProfileEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {vendorConfig.publicProfileEnabled ? "✓ Perfil público activo" : "Perfil público inactivo"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: ASOCIADO ── */}
      {activeTab === "asociado" && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Asociado Referidor
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Indica qué asociado refirió a este cliente. Cuando el cliente procesa pagos, el asociado recibe su comisión automáticamente.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            {referringAssociate ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {referringAssociate.associateName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{referringAssociate.associateName}</p>
                      <p className="text-xs text-gray-500">{referringAssociate.associateEmail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Comisión del asociado</p>
                      <p className="text-lg font-bold text-cyan-600">{referringAssociate.commissionRate?.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      referringAssociate.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      Estado: {referringAssociate.status}
                    </span>
                    <span className="text-xs text-gray-400">ID registro: #{referringAssociate.commissionRecordId}</span>
                  </div>
                </div>
                {availableAssociates && availableAssociates.length > 0 && (
                  <div>
                    {!assigningAssociate ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setAssigningAssociate(true); setSelectedAssocCommId(String(referringAssociate.commissionRecordId)); }}
                          className="text-xs">Cambiar asociado</Button>
                        <Button size="sm" variant="outline" onClick={() => assignAssociate.mutate({ clientId: client.id as number, associateCommissionId: null })}
                          disabled={assignAssociate.isPending}
                          className="text-xs text-red-500 border-red-200 hover:bg-red-50">
                          {assignAssociate.isPending ? "..." : "Quitar asociado"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedAssocCommId}
                          onChange={e => setSelectedAssocCommId(e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <option value="">— Seleccionar asociado —</option>
                          {availableAssociates.map((a: any) => (
                            <option key={a.commissionRecordId} value={String(a.commissionRecordId)}>
                              {a.name} ({a.email})
                            </option>
                          ))}
                        </select>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white"
                          disabled={!selectedAssocCommId || assignAssociate.isPending}
                          onClick={() => assignAssociate.mutate({ clientId: client.id as number, associateCommissionId: parseInt(selectedAssocCommId) })}>
                          {assignAssociate.isPending ? "..." : "Guardar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAssigningAssociate(false)}>Cancelar</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Sin asociado asignado</p>
                  <p className="text-xs text-gray-400 mt-1">Este cliente no tiene un asociado referidor</p>
                </div>
                {!client.userId ? (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-lg p-3">
                    ⚠ El cliente debe tener cuenta activa para asignarle un asociado
                  </p>
                ) : availableAssociates && availableAssociates.length > 0 ? (
                  <div>
                    {!assigningAssociate ? (
                      <Button size="sm" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white" onClick={() => setAssigningAssociate(true)}>
                        + Asignar asociado referidor
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedAssocCommId}
                          onChange={e => setSelectedAssocCommId(e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <option value="">— Seleccionar asociado —</option>
                          {availableAssociates.map((a: any) => (
                            <option key={a.commissionRecordId} value={String(a.commissionRecordId)}>
                              {a.name} ({a.email})
                            </option>
                          ))}
                        </select>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white"
                          disabled={!selectedAssocCommId || assignAssociate.isPending}
                          onClick={() => assignAssociate.mutate({ clientId: client.id as number, associateCommissionId: parseInt(selectedAssocCommId) })}>
                          {assignAssociate.isPending ? "Asignando..." : "Asignar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAssigningAssociate(false)}>Cancelar</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-center text-gray-400 bg-gray-50 rounded-lg p-3">
                    No hay asociados registrados en la plataforma
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: PERMISOS ── */}
      {activeTab === "permisos" && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-500" />Accesos y Permisos
              </CardTitle>
              {permsDirty && (
                <Button onClick={() => updatePerms.mutate({ clientId: client.id as number, permissions: JSON.stringify(localPerms) })}
                  disabled={updatePerms.isPending} size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white gap-1.5">
                  <Save className="w-3.5 h-3.5" />{updatePerms.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Activa o desactiva los módulos que este negocio puede usar en su panel.</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_PERMISSIONS.map(({ key, label, description }) => {
                const enabled = effectivePerms[key] !== false;
                return (
                  <button key={key} onClick={() => togglePerm(key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      enabled ? "border-cyan-200 bg-cyan-50/50 hover:bg-cyan-50" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 opacity-60"
                    }`}>
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${enabled ? "bg-cyan-500" : "bg-gray-300"}`}>
                      {enabled
                        ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${enabled ? "text-cyan-800" : "text-gray-500"}`}>{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TAB: TRANSACCIONES ── */}
      {activeTab === "transacciones" && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-500" />Todas las transacciones ({recentTransactions?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!recentTransactions || recentTransactions.length === 0 ? (
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
                        <p className="text-sm font-medium text-gray-800 truncate">{tx.payerName || "—"}</p>
                        <p className="text-xs text-gray-400">{tx.operationNumber} · {formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{formatCurrency(tx.amount)}</p>
                        <p className="text-xs text-cyan-600">Comisión: {formatCurrency(tx.commissionAmount)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${txCfg.color} flex-shrink-0`}>{txCfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Expediente KYC del cliente ─────────────────────────────────────────────────────
function ClientKYCSection({ clientEmail }: { clientEmail: string }) {
  const { data: contracts = [], isLoading } = trpc.contracts.getByClientEmail.useQuery({ clientEmail });

  const docLabels: Record<string, string> = {
    ineUrl: 'INE / Credencial',
    passportUrl: 'Pasaporte',
    addressProofUrl: 'Comprobante de Domicilio',
    rfcDocUrl: 'Constancia de RFC / Situación Fiscal',
    curpDocUrl: 'CURP',
    signatureUrl: 'Firma Digital (Cliente)',
    adminSignatureUrl: 'Firma Digital (KobraPay)',
  };

  if (isLoading) return null;
  if (contracts.length === 0) return null;

  // Tomar el contrato más reciente
  const contract = contracts[0];
  const docs = [
    { key: 'ineUrl', url: contract.ineUrl },
    { key: 'passportUrl', url: contract.passportUrl },
    { key: 'addressProofUrl', url: contract.addressProofUrl },
    { key: 'rfcDocUrl', url: contract.rfcDocUrl },
    { key: 'curpDocUrl', url: contract.curpDocUrl },
    { key: 'signatureUrl', url: contract.signatureUrl },
    { key: 'adminSignatureUrl', url: contract.adminSignatureUrl },
  ].filter(d => d.url);

  const hasKycData = docs.length > 0 || contract.razonSocial || contract.representanteLegal;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          Expediente KYC y Documentos
          {contract.signedAt && (
            <span className="ml-auto text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Contrato firmado ✓
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {!hasKycData ? (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">El cliente aún no ha subido documentos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Datos de empresa */}
            {(contract.razonSocial || contract.representanteLegal || contract.rfcEmpresa) && (
              <div className="bg-cyan-50 rounded-xl p-3 border border-cyan-100">
                <p className="text-xs font-semibold text-cyan-700 mb-2">Datos de empresa</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {contract.razonSocial && (
                    <div><span className="text-gray-500 text-xs">Razón Social:</span><br/><strong className="text-gray-800">{contract.razonSocial}</strong></div>
                  )}
                  {contract.representanteLegal && (
                    <div><span className="text-gray-500 text-xs">Representante Legal:</span><br/><strong className="text-gray-800">{contract.representanteLegal}</strong></div>
                  )}
                  {contract.rfcEmpresa && (
                    <div><span className="text-gray-500 text-xs">RFC Empresa:</span><br/><strong className="text-gray-800">{contract.rfcEmpresa}</strong></div>
                  )}
                </div>
              </div>
            )}
            {/* Documentos */}
            {docs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Documentos subidos</p>
                <div className="grid grid-cols-2 gap-2">
                  {docs.map(({ key, url }) => (
                    <a
                      key={key}
                      href={url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-cyan-50 hover:border-cyan-200 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{docLabels[key] || key}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {/* Firmas */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-2.5 rounded-lg border text-xs text-center ${contract.signedAt ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                {contract.signedAt ? `✓ Cliente firmó el ${formatDate(contract.signedAt)}` : 'Pendiente firma del cliente'}
              </div>
              <div className={`p-2.5 rounded-lg border text-xs text-center ${contract.adminSignedAt ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {contract.adminSignedAt ? `✓ KobraPay firmó el ${formatDate(contract.adminSignedAt)}` : 'Pendiente firma KobraPay'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// ─── Panel de desglose de comisiones ─────────────────────────────────────────────────────
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
  const { data: clients, isLoading, refetch } = trpc.clients.list.useQuery(
    undefined,
    { refetchInterval: 60_000 } // Auto-refresh cada 60 segundos
  );
  const { data: stats } = trpc.clients.getStats.useQuery(
    undefined,
    { refetchInterval: 60_000 }
  );

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
                        <div key={client.id} className="flex items-center gap-4 px-5 py-4 hover:bg-cyan-50/40 transition-colors cursor-pointer" onClick={() => setSelectedClientId(client.id)}>
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
                                onClick={(e) => { e.stopPropagation(); updateClient.mutate({ id: client.id, status: "suspended" }); }}
                                className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                                title="Suspender cliente"
                              >
                                Suspender
                              </button>
                            ) : client.status === "suspended" ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateClient.mutate({ id: client.id, status: "active" }); }}
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
