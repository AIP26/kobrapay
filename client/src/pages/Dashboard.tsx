import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Link2,
  Plus,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Code2,
  Users,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "Pagado", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-gray-100 text-gray-500", icon: Clock },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-600", icon: Clock },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.transactions.stats.useQuery();
  const { data: links, isLoading: linksLoading } = trpc.paymentLinks.list.useQuery();
  const { data: txs } = trpc.transactions.list.useQuery();
  const { data: clientStats } = trpc.clients.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const recentLinks = links?.slice(0, 5) ?? [];

  // Build chart data from last 7 days
  const chartData = useMemo(() => {
    const days: Record<string, { date: string; monto: number; cobros: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
      days[key] = { date: key, monto: 0, cobros: 0 };
    }

    if (txs) {
      txs
        .filter((t) => t.status === "succeeded")
        .forEach((t) => {
          const d = new Date(t.createdAt);
          const key = d.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
          if (days[key]) {
            days[key].monto += parseFloat(String(t.amount));
            days[key].cobros += 1;
          }
        });
    }

    return Object.values(days);
  }, [txs]);

  const totalCommission = useMemo(() => {
    if (!txs) return 0;
    return txs
      .filter((t) => t.status === "succeeded")
      .reduce((sum, t) => sum + parseFloat(String(t.commissionAmount || 0)), 0);
  }, [txs]);

  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout title="Panel de Control">
      <div className="space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total cobrado",
              value: statsLoading ? "..." : formatCurrency(stats?.totalCollected ?? 0),
              icon: TrendingUp,
              iconColor: "text-green-600",
              iconBg: "bg-green-100",
              sub: "Monto bruto total",
            },
            {
              label: "Comisiones ganadas",
              value: statsLoading ? "..." : formatCurrency(totalCommission),
              icon: DollarSign,
              iconColor: "text-cyan-600",
              iconBg: "bg-cyan-100",
              sub: "Tu ganancia",
            },
            {
              label: "Ventas exitosas",
              value: statsLoading ? "..." : String(stats?.paidLinks ?? 0),
              icon: CheckCircle2,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
              sub: "Pagos completados",
            },
            {
              label: "Pagos pendientes",
              value: statsLoading ? "..." : String(stats?.pendingLinks ?? 0),
              icon: Clock,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-100",
              sub: "Esperando pago",
            },
          ].map(({ label, value, icon: Icon, iconColor, iconBg, sub }) => (
            <Card key={label} className="border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Stats */}
        {isAdmin && clientStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Clientes activos",
                value: String(clientStats.activeClients),
                icon: Users,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                sub: `${clientStats.totalClients} total`,
              },
              {
                label: "Transacciones totales",
                value: String(clientStats.totalTransactions),
                icon: CreditCard,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                sub: "De todos tus clientes",
              },
              {
                label: "Comisión total plataforma",
                value: formatCurrency(clientStats.totalCommissionEarned),
                icon: DollarSign,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                sub: "Ganancia de la plataforma",
              },
              {
                label: "Total de enlaces",
                value: String(stats?.totalLinks ?? 0),
                icon: Link2,
                iconColor: "text-indigo-600",
                iconBg: "bg-indigo-100",
                sub: "Creados en la plataforma",
              },
            ].map(({ label, value, icon: Icon, iconColor, iconBg, sub }) => (
              <Card key={label} className="border-blue-100 bg-blue-50/50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-blue-600 font-medium">{label}</p>
                    <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-900">{value}</p>
                  <p className="text-xs text-blue-400 mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Chart + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <Card className="border-gray-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  Ventas últimos 7 días
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 h-8 text-xs">
                  <Link href="/dashboard/sales">
                    Ver detalle <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(value: number) => [formatCurrency(value), "Monto"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="monto"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#colorMonto)"
                    dot={{ fill: "#06b6d4", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-800">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {[
                { href: "/dashboard/create", icon: Plus, label: "Nuevo Cobro", sub: "Crear enlace de pago", color: "bg-cyan-500 hover:bg-cyan-400", textColor: "text-white", subColor: "text-cyan-100" },
                { href: "/dashboard/links", icon: Link2, label: "Links de Pago", sub: "Ver y gestionar", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-gray-800", subColor: "text-gray-400" },
                { href: "/dashboard/sales", icon: BarChart3, label: "Mis Ventas", sub: "Historial completo", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-gray-800", subColor: "text-gray-400" },
                { href: "/dashboard/widget", icon: Code2, label: "Widget de Pago", sub: "Para tu sitio web", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-gray-800", subColor: "text-gray-400" },
                { href: "/dashboard/recurring", icon: RefreshCw, label: "Cobros Recurrentes", sub: "Suscripciones", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-gray-800", subColor: "text-gray-400" },
              ].map(({ href, icon: Icon, label, sub, color, textColor, subColor }) => (
                <Link key={href} href={href}>
                  <div className={`flex items-center gap-3 p-3 ${color} rounded-xl cursor-pointer transition-all group`}>
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${textColor}`}>{label}</p>
                      <p className={`text-xs ${subColor}`}>{sub}</p>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 ${textColor} opacity-60 group-hover:translate-x-0.5 transition-transform`} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Links */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800">Últimos enlaces</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 h-8 text-xs">
                <Link href="/dashboard/links">
                  Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {linksLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50">
                    <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 animate-pulse rounded w-28" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-40" />
                    </div>
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-16" />
                  </div>
                ))}
              </div>
            ) : recentLinks.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">Aún no has creado ningún enlace</p>
                <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white">
                  <Link href="/dashboard/create">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Crear primer enlace
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentLinks.map((link) => {
                  const cfg = statusConfig[link.status as keyof typeof statusConfig] ?? statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={link.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${link.status === "paid" ? "bg-green-100" : link.status === "pending" ? "bg-cyan-100" : "bg-gray-100"}`}>
                        <Link2 className={`w-4 h-4 ${link.status === "paid" ? "text-green-600" : link.status === "pending" ? "text-cyan-600" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{link.clientName}</p>
                        <p className="text-xs text-gray-400 truncate">{link.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{formatCurrency(link.amount, link.currency)}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
