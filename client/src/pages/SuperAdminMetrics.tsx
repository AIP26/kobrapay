import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Link2,
  RefreshCw,
  DollarSign,
  UserPlus,
  Activity,
  Crown,
} from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border ${alert ? "border-red-300 bg-red-50" : "border-gray-200"} p-5 flex items-start gap-4 shadow-sm`}>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${alert ? "text-red-600" : "text-foreground"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function SuperAdminMetrics() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user && user.role !== "superadmin" && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.metrics.getDashboard.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <DashboardLayout title="Panel de Métricas">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel de Métricas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Actualización automática cada 30 segundos · Última actualización: {lastUpdated}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Alertas */}
            {data.alerts.pendingChargebacks > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">
                  Hay <strong>{data.alerts.pendingChargebacks}</strong> aclaración{data.alerts.pendingChargebacks !== 1 ? "es" : ""} pendiente{data.alerts.pendingChargebacks !== 1 ? "s" : ""} de atender.
                </p>
              </div>
            )}

            {/* Métricas del día */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Hoy</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard
                  icon={DollarSign}
                  label="Ventas del día"
                  value={fmt(data.today.salesTotal)}
                  sub={`${data.today.salesCount} transacciones`}
                  color="bg-emerald-500"
                />
                <MetricCard
                  icon={UserPlus}
                  label="Nuevos registros"
                  value={String(data.today.newUsers)}
                  sub="usuarios hoy"
                  color="bg-blue-500"
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="Aclaraciones pendientes"
                  value={String(data.alerts.pendingChargebacks)}
                  sub="requieren atención"
                  color="bg-red-500"
                  alert={data.alerts.pendingChargebacks > 0}
                />
              </div>
            </div>

            {/* Métricas de la semana */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Esta semana</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard
                  icon={TrendingUp}
                  label="Ventas 7 días"
                  value={fmt(data.week.salesTotal)}
                  sub={`${data.week.salesCount} transacciones`}
                  color="bg-violet-500"
                />
                <MetricCard
                  icon={Link2}
                  label="Links activos"
                  value={String(data.alerts.activeLinks)}
                  sub="enlaces de pago vigentes"
                  color="bg-cyan-500"
                />
                <MetricCard
                  icon={Activity}
                  label="Usuarios activos (30d)"
                  value={String(data.month.activeUsers)}
                  sub="con al menos 1 cobro"
                  color="bg-amber-500"
                />
              </div>
            </div>

            {/* Métricas del mes */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Este mes</h2>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <MetricCard
                  icon={Users}
                  label="Nuevos registros"
                  value={String(data.month.newUsers)}
                  sub="usuarios en 30 días"
                  color="bg-indigo-500"
                />
                <MetricCard
                  icon={Activity}
                  label="Usuarios con cobros"
                  value={String(data.month.activeUsers)}
                  sub="procesaron al menos 1 pago"
                  color="bg-teal-500"
                />
              </div>
            </div>

            {/* Top usuarios */}
            {data.topUsers.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Top vendedores del mes
                </h2>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Usuario</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Transacciones</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total vendido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topUsers.map((u, i) => (
                        <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {i === 0 && <Crown className="w-4 h-4 text-amber-500" />}
                              <span className={`font-bold ${i === 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                                {i + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{u.count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                            {fmt(parseFloat(u.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No se pudieron cargar las métricas.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
