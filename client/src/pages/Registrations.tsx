import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Search,
  RefreshCw,
  Shield,
  Mail,
  Calendar,
  LogIn,
} from "lucide-react";
import { useState, useMemo } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  active: { label: "Activo", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  blocked: { label: "Bloqueado", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

const ROLE_LABELS: Record<string, string> = {
  user: "Usuario",
  admin: "Admin",
  superadmin: "Super Admin",
};

export default function Registrations() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "active" | "blocked">("all");
  const [commissionRates, setCommissionRates] = useState<Record<number, number>>({});

  const { data: registrations = [], isLoading, refetch } = trpc.registrations.list.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const approve = trpc.registrations.approve.useMutation({
    onSuccess: () => { toast.success("Cuenta aprobada correctamente"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.registrations.reject.useMutation({
    onSuccess: () => { toast.success("Cuenta bloqueada"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setPending = trpc.registrations.setPending.useMutation({
    onSuccess: () => { toast.success("Cuenta puesta en pendiente"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Verificar que el usuario es superadmin
  const isSuperAdmin = user?.openId === import.meta.env.VITE_APP_ID || (user as Record<string, unknown>)?.isSuperAdmin;

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      const matchSearch = !search ||
        (r.name?.toLowerCase().includes(search.toLowerCase())) ||
        (r.email?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = filterStatus === "all" || r.accountStatus === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [registrations, search, filterStatus]);

  const counts = useMemo(() => ({
    total: registrations.length,
    pending: registrations.filter((r) => r.accountStatus === "pending").length,
    active: registrations.filter((r) => r.accountStatus === "active").length,
    blocked: registrations.filter((r) => r.accountStatus === "blocked").length,
  }), [registrations]);

  return (
    <DashboardLayout title="Gestión de Registros">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Gestión de Registros
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Aprueba o rechaza las cuentas que se registran en KobraPay.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: counts.total, color: "text-gray-700", bg: "bg-gray-50", icon: <Users className="w-5 h-5 text-gray-500" /> },
            { label: "Pendientes", value: counts.pending, color: "text-amber-700", bg: "bg-amber-50", icon: <Clock className="w-5 h-5 text-amber-500" /> },
            { label: "Activos", value: counts.active, color: "text-green-700", bg: "bg-green-50", icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
            { label: "Bloqueados", value: counts.blocked, color: "text-red-700", bg: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" /> },
          ].map((m) => (
            <div key={m.label} className={`${m.bg} rounded-xl p-4 flex items-center gap-3`}>
              {m.icon}
              <div>
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "active", "blocked"] as const).map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(s)}
                className={filterStatus === s ? "bg-blue-600 text-white" : ""}
              >
                {s === "all" ? "Todos" : STATUS_LABELS[s]?.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
              <span className="text-gray-500">Cargando registros...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hay registros</p>
              <p className="text-gray-400 text-sm">
                {filterStatus !== "all" ? "Prueba cambiando el filtro" : "Aún no hay usuarios registrados"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Último acceso</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((reg) => {
                    const statusInfo = STATUS_LABELS[reg.accountStatus] || STATUS_LABELS.pending;
                    const isPending = reg.accountStatus === "pending";
                    const isApproving = approve.isPending && approve.variables?.userId === reg.id;
                    const isRejecting = reject.isPending && reject.variables?.userId === reg.id;
                    return (
                      <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                              {reg.name ? reg.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{reg.name || "Sin nombre"}</p>
                              <p className="text-gray-400 text-xs flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {reg.email || "Sin email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            {ROLE_LABELS[reg.role] || reg.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(reg.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <LogIn className="w-3 h-3" />
                            {new Date(reg.lastSignedIn).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {reg.accountStatus !== "active" && (
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={commissionRates[reg.id] ?? 5}
                                    onChange={(e) => setCommissionRates(prev => ({ ...prev, [reg.id]: parseFloat(e.target.value) || 5 }))}
                                    className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 text-center"
                                    title="Comisión %"
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs gap-1"
                                  onClick={() => approve.mutate({ userId: reg.id, commissionRate: commissionRates[reg.id] ?? 5 })}
                                  disabled={isApproving}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {isApproving ? "..." : "Aprobar"}
                                </Button>
                              </div>
                            )}
                            {reg.accountStatus !== "blocked" && reg.role !== "superadmin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs gap-1"
                                onClick={() => reject.mutate({ userId: reg.id })}
                                disabled={isRejecting}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {isRejecting ? "..." : "Bloquear"}
                              </Button>
                            )}
                            {reg.accountStatus === "blocked" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-200 text-amber-600 hover:bg-amber-50 h-8 px-3 text-xs gap-1"
                                onClick={() => setPending.mutate({ userId: reg.id })}
                              >
                                <Clock className="w-3.5 h-3.5" /> Pendiente
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">¿Cómo funciona el control de acceso?</p>
              <p className="text-blue-700 text-sm mt-1">
                Cuando alguien se registra en KobraPay, su cuenta queda en estado <strong>Pendiente</strong> y no puede acceder al panel.
                Tú debes <strong>Aprobar</strong> la cuenta para que el usuario pueda usar la plataforma.
                También puedes <strong>Bloquear</strong> cuentas en cualquier momento para revocar el acceso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
