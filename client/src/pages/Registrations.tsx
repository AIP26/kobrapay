import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Users, Search, RefreshCw, Shield,
  Mail, Calendar, LogIn, ChevronRight, Building2, CreditCard, FileText,
  User, Phone, MapPin, Globe, Banknote, Lock, Eye, Settings2, X,
  Briefcase, UserCheck, UserCog, UserX,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SECTOR_TEMPLATES, templateToPermissionsJson, type SectorTemplate } from "@shared/sectorTemplates";

// ─── Componente de estadísticas del usuario ─────────────────────────────────
function UserDetailStats({ userId }: { userId: number }) {
  const [commission, setCommission] = useState("");
  const { data, isLoading } = trpc.registrations.getUserDetail.useQuery({ userId }, { enabled: !!userId });
  const updateCommission = trpc.registrations.updateCommission.useMutation({
    onSuccess: () => { toast.success("Comisión actualizada"); },
    onError: () => { toast.error("Error al actualizar comisión"); },
  });

  if (isLoading) return <div className="py-4 text-center text-xs text-muted-foreground">Cargando estadísticas...</div>;
  if (!data) return null;

  const { stats, recentTransactions } = data;

  return (
    <div className="space-y-4">
      {/* Estadísticas de cobros */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Actividad de Cobros</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-700">{stats.cobrosExitosos}</p>
            <p className="text-xs text-green-600">Cobros exitosos</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-700">${stats.totalCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-blue-600">Total cobrado MXN</p>
          </div>
          {(stats.totalCobros - stats.cobrosExitosos) > 0 && (
            <div className="bg-red-50 rounded-xl p-3 text-center col-span-2">
              <p className="text-lg font-bold text-red-700">{stats.totalCobros - stats.cobrosExitosos}</p>
              <p className="text-xs text-red-600">Cobros fallidos</p>
            </div>
          )}
        </div>
      </div>
      {/* Últimas transacciones */}
      {recentTransactions && recentTransactions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Últimos Cobros</h3>
          <div className="space-y-1.5">
            {recentTransactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-foreground truncate max-w-[120px]">{tx.payerName || "Cobro"}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${tx.status === "succeeded" ? "text-green-600" : "text-red-500"}`}>
                    ${parseFloat(String(tx.amount)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    tx.status === "succeeded" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>{tx.status === "succeeded" ? "Exitoso" : "Fallido"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Control de comisión */}
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Comisión Personalizada</h3>
        <p className="text-xs text-muted-foreground mb-2">Comisión actual: <span className="font-semibold text-foreground">{stats.commissionRate ?? "7"}%</span></p>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="Ej: 5.5"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!commission || updateCommission.isPending}
            onClick={() => updateCommission.mutate({ userId, commissionRate: parseFloat(commission) })}
          >
            {updateCommission.isPending ? "..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tipos de cuenta disponibles ─────────────────────────────────────────────
const ACCOUNT_TYPES = [
  {
    id: "business",
    label: "Negocio Cliente",
    icon: <Building2 className="w-5 h-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    activeColor: "bg-blue-600 border-blue-600 text-foreground",
    description: "Puede cobrar, crear enlaces de pago, ver sus ventas y gestionar sus clientes.",
    defaultPermissions: {
      canCreateLinks: true, canViewSales: true, canManageContracts: false,
      canManageClients: true, canViewReports: true, canManageStaff: false,
      canAccessSettings: true, canViewCommissions: false,
    },
  },
  {
    id: "admin",
    label: "Admin de Empresa",
    icon: <UserCog className="w-5 h-5" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    activeColor: "bg-purple-600 border-purple-600 text-foreground",
    description: "Gestiona su propio equipo de cobros, puede invitar empleados y ver reportes completos.",
    defaultPermissions: {
      canCreateLinks: true, canViewSales: true, canManageContracts: true,
      canManageClients: true, canViewReports: true, canManageStaff: true,
      canAccessSettings: true, canViewCommissions: false,
    },
  },
  {
    id: "employee",
    label: "Empleado / Operador",
    icon: <UserCheck className="w-5 h-5" />,
    color: "bg-green-50 border-green-200 text-green-700",
    activeColor: "bg-green-600 border-green-600 text-foreground",
    description: "Solo puede crear enlaces de pago y ver sus propias ventas. Sin acceso a configuración.",
    defaultPermissions: {
      canCreateLinks: true, canViewSales: true, canManageContracts: false,
      canManageClients: false, canViewReports: false, canManageStaff: false,
      canAccessSettings: false, canViewCommissions: false,
    },
  },
  {
    id: "assistant",
    label: "Asistente",
    icon: <Briefcase className="w-5 h-5" />,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    activeColor: "bg-amber-600 border-amber-600 text-foreground",
    description: "Gestiona contratos, documentos y clientes. No puede cobrar directamente.",
    defaultPermissions: {
      canCreateLinks: false, canViewSales: true, canManageContracts: true,
      canManageClients: true, canViewReports: true, canManageStaff: false,
      canAccessSettings: false, canViewCommissions: false,
    },
  },
];

const PERMISSIONS_LIST = [
  { key: "canCreateLinks", label: "Crear enlaces de pago", icon: <CreditCard className="w-4 h-4" /> },
  { key: "canViewSales", label: "Ver historial de ventas", icon: <Eye className="w-4 h-4" /> },
  { key: "canManageContracts", label: "Gestionar contratos", icon: <FileText className="w-4 h-4" /> },
  { key: "canManageClients", label: "Gestionar clientes", icon: <Users className="w-4 h-4" /> },
  { key: "canViewReports", label: "Ver reportes y estadísticas", icon: <Settings2 className="w-4 h-4" /> },
  { key: "canManageStaff", label: "Gestionar equipo / staff", icon: <UserCog className="w-4 h-4" /> },
  { key: "canAccessSettings", label: "Acceder a configuración", icon: <Settings2 className="w-4 h-4" /> },
  { key: "canViewCommissions", label: "Ver comisiones de plataforma", icon: <Banknote className="w-4 h-4" /> },
];

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  active: { label: "Activo", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  blocked: { label: "Bloqueado", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

type Registration = {
  id: number; name: string | null; email: string | null; role: string;
  accountStatus: string; isActive: boolean; createdAt: Date; lastSignedIn: Date;
  loginMethod: string | null; fullName?: string | null; birthDate?: string | null;
  curp?: string | null; rfc?: string | null; phone?: string | null;
  businessName?: string | null; businessType?: string | null;
  accountType?: string | null; permissions?: string | null;
  profileCompleted?: boolean | null;
  totalCobros?: number | null;
  cobrosExitosos?: number | null;
  totalCobrado?: string | null;
};

type Permissions = Record<string, boolean>;

export default function Registrations() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "active" | "blocked">("all");
  const [filterDate, setFilterDate] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState("business");
  const [permissions, setPermissions] = useState<Permissions>({});
  const [commissionRate, setCommissionRate] = useState(5);
  const [selectedSectorTemplate, setSelectedSectorTemplate] = useState<string | null>(null);

  const { data: registrations = [], isLoading, refetch } = trpc.registrations.list.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const approve = trpc.registrations.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Cuenta aprobada y email de bienvenida enviado");
      setSelectedReg(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.registrations.reject.useMutation({
    onSuccess: () => {
      toast.success("Cuenta bloqueada y email de rechazo enviado");
      setSelectedReg(null);
      setShowRejectReason(false);
      setRejectReason("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const setPending = trpc.registrations.setPending.useMutation({
    onSuccess: () => { toast.success("Cuenta puesta en pendiente"); setSelectedReg(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Verificación definitiva: usar isSuperAdmin del servidor O role en BD
  const { data: meData, isLoading: meLoading } = trpc.auth.me.useQuery();
  const isSuperAdmin = Boolean(meData?.isSuperAdmin) || meData?.role === "superadmin" || user?.role === "superadmin";

  const filtered = useMemo(() => {
    return (registrations as Registration[]).filter((r) => {
      const matchSearch = !search ||
        (r.name?.toLowerCase().includes(search.toLowerCase())) ||
        (r.email?.toLowerCase().includes(search.toLowerCase())) ||
        (r.fullName?.toLowerCase().includes(search.toLowerCase())) ||
        (r.businessName?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = filterStatus === "all" || r.accountStatus === filterStatus;
      let matchDate = true;
      if (filterDate !== "all") {
        const days = filterDate === "7d" ? 7 : filterDate === "30d" ? 30 : 90;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        matchDate = new Date(r.createdAt) >= cutoff;
      }
      return matchSearch && matchStatus && matchDate;
    });
  }, [registrations, search, filterStatus, filterDate]);

  const counts = useMemo(() => ({
    total: (registrations as Registration[]).length,
    pending: (registrations as Registration[]).filter((r) => r.accountStatus === "pending").length,
    active: (registrations as Registration[]).filter((r) => r.accountStatus === "active").length,
    blocked: (registrations as Registration[]).filter((r) => r.accountStatus === "blocked").length,
  }), [registrations]);

  const openApproval = (reg: Registration) => {
    setSelectedReg(reg);
    const type = reg.accountType || "business";
    setSelectedAccountType(type);
    const accountType = ACCOUNT_TYPES.find((t) => t.id === type) || ACCOUNT_TYPES[0];
    // Cargar permisos existentes o usar los por defecto del tipo
    if (reg.permissions) {
      try { setPermissions(JSON.parse(reg.permissions)); return; } catch {}
    }
    setPermissions({ ...accountType.defaultPermissions });
    setCommissionRate(5);
  };

  const handleAccountTypeChange = (typeId: string) => {
    setSelectedAccountType(typeId);
    const accountType = ACCOUNT_TYPES.find((t) => t.id === typeId) || ACCOUNT_TYPES[0];
    setPermissions({ ...accountType.defaultPermissions });
  };

  const handleSectorTemplate = (templateId: string) => {
    const template = SECTOR_TEMPLATES.find((t: SectorTemplate) => t.id === templateId);
    if (!template) return;
    setSelectedSectorTemplate(templateId);
    // Aplicar los permisos de la plantilla
    setPermissions(templateToPermissionsJson(template) as Record<string, boolean>);
    toast.success(`Plantilla "${template.name}" aplicada`);
  };

  const handleApprove = () => {
    if (!selectedReg) return;
    approve.mutate({
      userId: selectedReg.id,
      commissionRate,
      accountType: selectedAccountType,
      permissions: JSON.stringify(permissions),
    });
  };

  // Mostrar cargando mientras se verifica la sesión O mientras carga meData del servidor
  if (authLoading || meLoading) {
    return (
      <DashboardLayout title="Solicitudes de Registro">
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Verificando acceso...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  // Solo bloquear si AMBOS ya cargaron y definitivamente NO es super-admin
  if (!authLoading && !meLoading && !isSuperAdmin) {
    return (
      <DashboardLayout title="Solicitudes de Registro">
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Acceso restringido</p>
            <p className="text-muted-foreground text-sm">Solo el super-admin puede gestionar registros</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Solicitudes de Registro">
      <div className="flex gap-0 lg:gap-6 h-full relative">
        {/* ── Columna izquierda: lista ── */}
        <div className={`flex-1 space-y-5 transition-all min-w-0 ${selectedReg ? "lg:max-w-[calc(100%-420px)]" : ""}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Solicitudes de Registro
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Revisa y aprueba las cuentas que se registran en KobraPay.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                // Exportar a CSV
                const headers = ["ID","Nombre","Email","Negocio","Estado","Tipo","Cobros totales","Cobros exitosos","Total cobrado (MXN)","Registro","Último acceso"];
                const rows = (registrations as Registration[]).map(r => [
                  r.id,
                  r.fullName || r.name || "",
                  r.email || "",
                  r.businessName || "",
                  r.accountStatus,
                  r.accountType || "",
                  r.totalCobros ?? 0,
                  r.cobrosExitosos ?? 0,
                  parseFloat(r.totalCobrado || "0").toFixed(2),
                  new Date(r.createdAt).toLocaleDateString("es-MX"),
                  new Date(r.lastSignedIn).toLocaleDateString("es-MX"),
                ]);
                const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `kobrapay-usuarios-${new Date().toISOString().slice(0,10)}.csv`;
                a.click(); URL.revokeObjectURL(url);
                toast.success("CSV exportado correctamente");
              }} className="gap-2">
                <Download className="w-4 h-4" /> Exportar CSV
              </Button>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Actualizar
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total", value: counts.total, color: "text-foreground", bg: "bg-gray-50", icon: <Users className="w-5 h-5 text-muted-foreground" /> },
              { label: "Pendientes", value: counts.pending, color: "text-amber-700", bg: "bg-amber-50", icon: <Clock className="w-5 h-5 text-amber-500" /> },
              { label: "Activos", value: counts.active, color: "text-green-700", bg: "bg-green-50", icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
              { label: "Bloqueados", value: counts.blocked, color: "text-red-700", bg: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" /> },
            ].map((m) => (
              <div key={m.label} className={`${m.bg} rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setFilterStatus(m.label === "Total" ? "all" : m.label.toLowerCase() as "pending" | "active" | "blocked")}>
                {m.icon}
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nombre, email o negocio..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-medium">Estado:</span>
              {(["all", "pending", "active", "blocked"] as const).map((s) => (
                <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm"
                  onClick={() => setFilterStatus(s)}
                  className={filterStatus === s ? "bg-blue-600 text-white" : ""}>
                  {s === "all" ? "Todos" : STATUS_LABELS[s]?.label}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground font-medium ml-2">Registro:</span>
              {(["all", "7d", "30d", "90d"] as const).map((d) => (
                <Button key={d} variant={filterDate === d ? "default" : "outline"} size="sm"
                  onClick={() => setFilterDate(d)}
                  className={filterDate === d ? "bg-emerald-600 text-white" : ""}>
                  {d === "all" ? "Siempre" : d === "7d" ? "Últimos 7 días" : d === "30d" ? "Últimos 30 días" : "Últimos 90 días"}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de solicitudes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mr-2" />
                <span className="text-muted-foreground">Cargando solicitudes...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No hay solicitudes</p>
                <p className="text-muted-foreground text-sm">
                  {filterStatus !== "all" ? "Prueba cambiando el filtro" : "Aún no hay usuarios registrados"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((reg) => {
                  const statusInfo = STATUS_LABELS[reg.accountStatus] || STATUS_LABELS.pending;
                  const isSelected = selectedReg?.id === reg.id;
                  const accountTypeInfo = ACCOUNT_TYPES.find((t) => t.id === (reg.accountType || "business"));
                  return (
                    <div key={reg.id}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}
                      onClick={() => openApproval(reg)}>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(reg.fullName || reg.name || "?").charAt(0).toUpperCase()}
                      </div>
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {reg.fullName || reg.name || "Sin nombre"}
                          </p>
                          {reg.profileCompleted && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Perfil completo</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 flex-shrink-0" /> {reg.email || "Sin email"}
                        </p>
                        {reg.businessName && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 flex-shrink-0" /> {reg.businessName}
                          </p>
                        )}
                      </div>
                      {/* Cobros del usuario */}
                      {reg.accountStatus === "active" && (
                        <div className="hidden sm:flex flex-col items-center gap-0.5 flex-shrink-0 px-3 border-r border-gray-100">
                          <p className="text-sm font-bold text-emerald-700">{reg.cobrosExitosos ?? 0}</p>
                          <p className="text-xs text-muted-foreground">cobros</p>
                          {Number(reg.totalCobrado || 0) > 0 && (
                            <p className="text-xs font-semibold text-emerald-600">
                              ${parseFloat(reg.totalCobrado || "0").toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Estado y tipo */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        {accountTypeInfo && reg.accountStatus === "active" && (
                          <span className="text-xs text-muted-foreground">{accountTypeInfo.label}</span>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(reg.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel lateral de aprobación ── */}
        {selectedReg && (
          <div className="fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:w-[400px] lg:flex-shrink-0 flex items-end lg:items-start justify-center lg:justify-start">
            {/* Overlay en móvil */}
            <div className="absolute inset-0 bg-black/50 lg:hidden" onClick={() => setSelectedReg(null)} />
            <div className="relative w-full max-w-lg lg:max-w-none lg:w-[400px] bg-white border border-gray-200 rounded-t-2xl lg:rounded-xl overflow-y-auto max-h-[90vh] lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-4">
            {/* Header del panel */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {(selectedReg.fullName || selectedReg.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{selectedReg.fullName || selectedReg.name || "Sin nombre"}</p>
                  <p className="text-xs text-muted-foreground">{selectedReg.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReg(null)} className="text-muted-foreground hover:text-muted-foreground p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Datos del solicitante */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del Solicitante</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: <User className="w-3.5 h-3.5" />, label: "Nombre", value: selectedReg.fullName || selectedReg.name },
                    { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: selectedReg.email },
                    { icon: <Phone className="w-3.5 h-3.5" />, label: "Teléfono", value: selectedReg.phone },
                    { icon: <FileText className="w-3.5 h-3.5" />, label: "CURP", value: selectedReg.curp },
                    { icon: <FileText className="w-3.5 h-3.5" />, label: "RFC", value: selectedReg.rfc },
                    { icon: <Building2 className="w-3.5 h-3.5" />, label: "Negocio", value: selectedReg.businessName },
                    { icon: <Briefcase className="w-3.5 h-3.5" />, label: "Giro", value: selectedReg.businessType },
                    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Registro", value: new Date(selectedReg.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) },
                    { icon: <LogIn className="w-3.5 h-3.5" />, label: "Último acceso", value: new Date(selectedReg.lastSignedIn).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) },
                  ].filter((f) => f.value).map((f) => (
                    <div key={f.label} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{f.icon}</span>
                      <span className="text-muted-foreground flex-shrink-0 w-20">{f.label}:</span>
                      <span className="text-foreground font-medium break-all">{f.value}</span>
                    </div>
                  ))}
                  {!selectedReg.profileCompleted && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-2.5 text-xs">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      El usuario aún no ha completado su perfil extendido.
                    </div>
                  )}
                </div>
              </div>

              {/* Plantilla de Sector — selector rápido */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Plantilla por Sector</h3>
                <p className="text-xs text-muted-foreground mb-3">Selecciona el tipo de negocio para asignar permisos automáticamente.</p>
                <div className="grid grid-cols-2 gap-2 mb-1">
                  {SECTOR_TEMPLATES.map((tpl: SectorTemplate) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSectorTemplate(tpl.id)}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                        selectedSectorTemplate === tpl.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-emerald-300 bg-white"
                      }`}
                    >
                      <span className="text-lg leading-none mt-0.5">{tpl.icon}</span>
                      <div>
                        <p className={`text-xs font-semibold leading-tight ${
                          selectedSectorTemplate === tpl.id ? "text-emerald-700" : "text-foreground"
                        }`}>{tpl.name}</p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-2">{tpl.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de cuenta */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tipo de Cuenta</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleAccountTypeChange(type.id)}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${selectedAccountType === type.id ? type.activeColor : "bg-white border-gray-200 hover:border-gray-300"}`}
                    >
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <span className="text-xs font-semibold">{type.label}</span>
                      </div>
                      <p className={`text-xs leading-tight ${selectedAccountType === type.id ? "opacity-80" : "text-muted-foreground"}`}>
                        {type.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permisos granulares */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Permisos Asignados</h3>
                <div className="space-y-2">
                  {PERMISSIONS_LIST.map((perm) => (
                    <label key={perm.key} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${permissions[perm.key] ? "bg-blue-600" : "bg-gray-200"}`}
                        onClick={() => setPermissions((prev) => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${permissions[perm.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`${permissions[perm.key] ? "text-blue-600" : "text-muted-foreground"}`}>{perm.icon}</span>
                        <span className={`${permissions[perm.key] ? "text-foreground" : "text-muted-foreground"}`}>{perm.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comisión */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Comisión de Plataforma</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="range" min="0" max="20" step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span><span>10%</span><span>20%</span>
                    </div>
                  </div>
                  <div className="w-16 text-center">
                    <div className="text-2xl font-bold text-blue-600">{commissionRate}%</div>
                    <div className="text-xs text-muted-foreground">por cobro</div>
                  </div>
                </div>
              </div>

              {/* Estadísticas de cobros y comisión */}
              <UserDetailStats userId={selectedReg.id} />

              {/* Acciones */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {selectedReg.accountStatus !== "active" && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-foreground gap-2"
                    onClick={handleApprove}
                    disabled={approve.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {approve.isPending ? "Aprobando..." : "Aprobar y Activar Cuenta"}
                  </Button>
                )}
                {selectedReg.accountStatus !== "blocked" && (
                  <div className="w-full space-y-2">
                    {showRejectReason ? (
                      <>
                        <label className="text-xs text-muted-foreground font-medium">Motivo del rechazo (se enviará por email al usuario)</label>
                        <Textarea
                          placeholder="Ej: Información incompleta, actividad sospechosa..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => { setShowRejectReason(false); setRejectReason(""); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-foreground"
                            onClick={() => reject.mutate({ userId: selectedReg.id, reason: rejectReason || undefined })}
                            disabled={reject.isPending}
                          >
                            {reject.isPending ? "Bloqueando..." : "Confirmar Bloqueo"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
                        onClick={() => setShowRejectReason(true)}
                        disabled={reject.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        Bloquear Cuenta
                      </Button>
                    )}
                  </div>
                )}
                {selectedReg.accountStatus !== "pending" && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => setPending.mutate({ userId: selectedReg.id })}
                    disabled={setPending.isPending}
                  >
                    <Clock className="w-4 h-4" />
                    Poner en Pendiente
                  </Button>
                )}
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
