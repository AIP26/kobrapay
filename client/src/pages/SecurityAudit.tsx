import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  TrendingUp,
  DollarSign,
  Link2,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-green-100 text-green-700",
  PUT: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-purple-100 text-purple-700",
};

export default function SecurityAudit() {
  const { user } = useAuth();
  const { data: isSuperAdmin } = trpc.security.checkSuperAdmin.useQuery();
  const { data: stats } = trpc.security.getPlatformStats.useQuery(undefined, {
    enabled: !!isSuperAdmin?.isSuperAdmin,
  });
  const { data: auditLogs } = trpc.security.getAuditLogs.useQuery(
    { limit: 50 },
    { enabled: !!isSuperAdmin?.isSuperAdmin }
  );
  const { data: allUsers } = trpc.security.getAllUsers.useQuery(
    { limit: 50 },
    { enabled: !!isSuperAdmin?.isSuperAdmin }
  );

  const setUserActive = trpc.security.setUserActive.useMutation({
    onSuccess: () => trpc.useUtils().security.getAllUsers.invalidate(),
  });

  if (!isSuperAdmin?.isSuperAdmin) {
    return (
      <DashboardLayout title="Seguridad">
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-500 max-w-sm">
            Esta sección es exclusiva del administrador de la plataforma KobraPay. No tienes permisos para acceder a esta área.
          </p>
          <Link href="/dashboard" className="mt-6 text-sm text-emerald-600 hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Seguridad y Auditoría">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centro de Seguridad</h1>
            <p className="text-sm text-gray-500">Panel exclusivo del superadmin — acceso total a la plataforma</p>
          </div>
          <Badge className="ml-auto bg-emerald-500 text-white">Superadmin</Badge>
        </div>

        {/* Platform Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Usuarios totales", value: stats.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Clientes activos", value: stats.totalClients, icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Links creados", value: stats.totalLinks, icon: Link2, color: "text-cyan-600", bg: "bg-cyan-50" },
              { label: "Transacciones", value: stats.totalTransactions, icon: CreditCard, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Ingresos totales", value: formatMXN(stats.totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Security Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Estado de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Helmet.js (Headers HTTP)", status: "activo", desc: "CSP, HSTS, X-Frame-Options, nosniff" },
                { label: "Rate Limiting", status: "activo", desc: "200 req/min general · 10 req/15min auth" },
                { label: "Slow Down Middleware", status: "activo", desc: "Retraso progresivo tras 50 req/min" },
                { label: "Aislamiento Multi-Tenant", status: "activo", desc: "Cada cliente solo ve sus propios datos" },
                { label: "Roles y Permisos", status: "activo", desc: "superadmin → admin → user" },
                { label: "Auditoría de Accesos", status: "activo", desc: "Log de todas las peticiones API" },
              ].map(({ label, status, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* All Users */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Todos los Usuarios ({allUsers?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Usuario</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-2 py-2">Rol</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-2 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allUsers?.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{u.name || "Sin nombre"}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{u.email}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                            u.role === "admin" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => setUserActive.mutate({ userId: u.id, isActive: !u.isActive })}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                              u.isActive
                                ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                                : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                            }`}
                            title={u.isActive ? "Click para suspender" : "Click para activar"}
                          >
                            {u.isActive ? "Activo" : "Suspendido"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-500" />
                Log de Auditoría (últimas 50 peticiones)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {auditLogs && auditLogs.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Hora</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-2 py-2">Método</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-2 py-2">Ruta</th>
                        <th className="text-center text-xs font-semibold text-gray-500 px-2 py-2">Código</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditLogs.map((log, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${log.statusCode && log.statusCode >= 400 ? "bg-red-50/30" : ""}`}>
                          <td className="px-4 py-2 text-xs text-gray-500">{formatTime(log.timestamp)}</td>
                          <td className="px-2 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${METHOD_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-600 font-mono truncate max-w-[140px]">{log.resource}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs font-mono font-medium ${
                              !log.statusCode ? "text-gray-400" :
                              log.statusCode < 300 ? "text-green-600" :
                              log.statusCode < 400 ? "text-yellow-600" :
                              "text-red-600"
                            }`}>
                              {log.statusCode ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No hay registros de auditoría aún
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
