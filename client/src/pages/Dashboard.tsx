import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as RouterLink } from "wouter";
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
import { useMemo, useState } from "react";
import { Landmark, Zap, AlertCircle, Repeat } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "Pagado", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-gray-100 text-muted-foreground", icon: Clock },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-600", icon: Clock },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.transactions.stats.useQuery(undefined, {
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  const { data: links, isLoading: linksLoading } = trpc.paymentLinks.list.useQuery();
  const { data: txs } = trpc.transactions.list.useQuery();
  const { data: clientStats } = trpc.clients.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: subStats } = trpc.subscriptions.externalStats.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
  const { data: overdueList = [] } = trpc.subscriptions.getOverdue.useQuery(undefined, {
    staleTime: 120000,
    refetchOnWindowFocus: true,
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
  const { data: connectStatus } = trpc.vendor.connectStatus.useQuery(undefined, {
    enabled: !!user && !user.isSuperAdmin && user.role !== "superadmin",
    staleTime: 60000,
  });
  const showOnboardingBanner = (!user?.isSuperAdmin && user?.role !== "superadmin") && connectStatus && !connectStatus.chargesEnabled;

  return (
    <DashboardLayout title="Panel de Control">
      <div className="space-y-5">
        {/* Banner de Onboarding: Conectar Stripe */}
        {showOnboardingBanner && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold text-yellow-200">Acción requerida para empezar a cobrar</span>
              </div>
              <h3 className="text-lg font-bold">Conecta tu cuenta bancaria</h3>
              <p className="text-emerald-100 text-sm mt-0.5">
                Para recibir los pagos de tus clientes directamente en tu banco, necesitas conectar tu CLABE con Stripe. Toma ~5 minutos.
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-emerald-100">
                <span>✓ CLABE interbancaria (18 dígitos)</span>
                <span>✓ RFC o CURP</span>
                <span>✓ Nombre completo del titular</span>
                <span>✓ Fecha de nacimiento</span>
              </div>
            </div>
            <RouterLink href="/dashboard/connect">
              <Button size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold gap-2 flex-shrink-0">
                <Zap className="w-4 h-4" />
                Conectar ahora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </RouterLink>
          </div>
        )}
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
              href: "/dashboard/sales",
            },
            {
              label: "Comisiones ganadas",
              value: statsLoading ? "..." : formatCurrency(totalCommission),
              icon: DollarSign,
              iconColor: "text-cyan-600",
              iconBg: "bg-cyan-100",
              sub: "Tu ganancia",
              href: "/dashboard/commissions",
            },
            {
              label: "Ventas exitosas",
              value: statsLoading ? "..." : String(stats?.paidLinks ?? 0),
              icon: CheckCircle2,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
              sub: "Pagos completados",
              href: "/dashboard/transactions",
            },
            {
              label: "Pagos pendientes",
              value: statsLoading ? "..." : String(stats?.pendingLinks ?? 0),
              icon: Clock,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-100",
              sub: "Esperando pago",
              href: "/dashboard/links",
            },
          ].map(({ label, value, icon: Icon, iconColor, iconBg, sub, href }) => (
            <RouterLink key={label} href={href}>
              <Card className="border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            </RouterLink>
          ))}
        </div>

        {/* Hoy y Este Mes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Cobrado hoy",
              value: statsLoading ? "..." : formatCurrency(stats?.todayCollected ?? 0),
              icon: TrendingUp,
              iconColor: "text-green-600",
              iconBg: "bg-green-100",
              sub: `${stats?.todayTransactions ?? 0} transacciones hoy`,
              href: "/dashboard/transactions",
            },
            {
              label: "Este mes",
              value: statsLoading ? "..." : formatCurrency(stats?.monthCollected ?? 0),
              icon: BarChart3,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100",
              sub: `${stats?.monthTransactions ?? 0} transacciones`,
              href: "/dashboard/report",
            },
            {
              label: "Clientes",
              value: statsLoading ? "..." : String(stats?.totalCustomers ?? 0),
              icon: Users,
              iconColor: "text-purple-600",
              iconBg: "bg-purple-100",
              sub: "Base de clientes",
              href: "/dashboard/clients",
            },
            {
              label: "Monto neto",
              value: statsLoading ? "..." : formatCurrency(stats?.totalNetAmount ?? 0),
              icon: DollarSign,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
              sub: "Después de comisiones",
              href: "/dashboard/sales",
            },
          ].map(({ label, value, icon: Icon, iconColor, iconBg, sub, href }) => (
            <RouterLink key={label} href={href}>
              <Card className="border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            </RouterLink>
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
                href: "/dashboard/clients",
              },
              {
                label: "Transacciones totales",
                value: String(clientStats.totalTransactions),
                icon: CreditCard,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                sub: "De todos tus clientes",
                href: "/dashboard/transactions",
              },
              {
                label: "Comisión total plataforma",
                value: formatCurrency(clientStats.totalCommissionEarned),
                icon: DollarSign,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                sub: "Ganancia de la plataforma",
                href: "/dashboard/commissions",
              },
              {
                label: "Total de enlaces",
                value: String(stats?.totalLinks ?? 0),
                icon: Link2,
                iconColor: "text-indigo-600",
                iconBg: "bg-indigo-100",
                sub: "Creados en la plataforma",
                href: "/dashboard/links",
              },
            ].map(({ label, value, icon: Icon, iconColor, iconBg, sub, href }) => (
              <RouterLink key={label} href={href}>
              <Card className="border-blue-100 bg-blue-50/50 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
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
              </RouterLink>
            ))}
          </div>
        )}

        {/* Panel de Suscripciones Externas (BrokerHub, ContentAI) */}
        {subStats && subStats.totalActive > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Suscripciones activas → ver todas */}
            <RouterLink href="/dashboard/sales?platform=all">
              <Card className="border-amber-200 bg-amber-50/40 shadow-sm sm:col-span-1 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-amber-700 font-medium">Suscripciones activas</p>
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Repeat className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-amber-900">{subStats.totalActive}</p>
                  <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                    BrokerHub + ContentAI
                    <ArrowRight className="w-3 h-3" />
                  </p>
                </CardContent>
              </Card>
            </RouterLink>

            {/* Card 2: MRR externo → ver detalle */}
            <RouterLink href="/dashboard/sales?platform=all">
              <Card className="border-amber-200 bg-amber-50/40 shadow-sm sm:col-span-1 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-amber-700 font-medium">MRR externo</p>
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-amber-900">{formatCurrency(subStats.totalMonthlyRevenue / 100)}</p>
                  <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                    Ingresos recurrentes/mes
                    <ArrowRight className="w-3 h-3" />
                  </p>
                </CardContent>
              </Card>
            </RouterLink>

            {/* Card 3: Plataformas → links individuales por plataforma */}
            <Card className="border-amber-200 bg-amber-50/40 shadow-sm sm:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-amber-700 font-medium">Plataformas conectadas</p>
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-900">{Object.keys(subStats.byPlatform).length}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {Object.entries(subStats.byPlatform).map(([platform, data]) => (
                    <RouterLink key={platform} href={`/dashboard/sales?platform=${platform}`}>
                      <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-medium cursor-pointer hover:bg-amber-300 transition-colors">
                        {platform === "brokerhub" ? "BrokerHub" : platform === "contentai" ? "ContentAI" : platform} ({data.count})
                      </span>
                    </RouterLink>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerta de suscripciones vencidas */}
        {overdueList.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800">
                {overdueList.length} suscripción{overdueList.length > 1 ? 'es' : ''} con pago vencido
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                {overdueList.map((s: any) => s.customerName || s.customerEmail).join(', ')}
              </p>
            </div>
            <RouterLink href="/dashboard/sales?platform=all">
              <button className="text-xs text-orange-700 font-medium hover:text-orange-900 flex items-center gap-1 flex-shrink-0">
                Ver <ArrowRight className="w-3 h-3" />
              </button>
            </RouterLink>
          </div>
        )}

        {/* Chart + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <Card className="border-gray-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  Ventas últimos 7 días
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 h-8 text-xs">
                  <RouterLink href="/dashboard/sales">
                    Ver detalle <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </RouterLink>
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
              <CardTitle className="text-base font-semibold text-foreground">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {[
                { href: "/dashboard/create", icon: Plus, label: "Nuevo Cobro", sub: "Crear enlace de pago", color: "bg-cyan-500 hover:bg-cyan-400", textColor: "text-foreground", subColor: "text-cyan-100" },
                { href: "/dashboard/links", icon: Link2, label: "Links de Pago", sub: "Ver y gestionar", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-foreground", subColor: "text-muted-foreground" },
                { href: "/dashboard/sales", icon: BarChart3, label: "Mis Ventas", sub: "Historial completo", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-foreground", subColor: "text-muted-foreground" },
                { href: "/dashboard/widget", icon: Code2, label: "Widget de Pago", sub: "Para tu sitio web", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-foreground", subColor: "text-muted-foreground" },
                { href: "/dashboard/recurring", icon: RefreshCw, label: "Cobros Recurrentes", sub: "Suscripciones", color: "bg-white hover:bg-gray-50 border border-gray-200", textColor: "text-foreground", subColor: "text-muted-foreground" },
              ].map(({ href, icon: Icon, label, sub, color, textColor, subColor }) => (
                <RouterLink key={href} href={href}>
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
                </RouterLink>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Links */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Últimos enlaces</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 h-8 text-xs">
                <RouterLink href="/dashboard/links">
                  Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </RouterLink>
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
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">Aún no has creado ningún enlace</p>
                <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-foreground">
                  <RouterLink href="/dashboard/create">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Crear primer enlace
                  </RouterLink>
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
                        <Link2 className={`w-4 h-4 ${link.status === "paid" ? "text-green-600" : link.status === "pending" ? "text-cyan-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{link.clientName}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatCurrency(link.amount, link.currency)}</p>
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
        {/* Simulador de Comisiones */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Simulador de Comisiones
            </CardTitle>
            <p className="text-xs text-muted-foreground">Calcula exactamente cuanto recibiras en cada cobro</p>
          </CardHeader>
          <CardContent className="pt-4">
            <ClientQuoteSimulator />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ClientQuoteSimulator() {
  const { data: settings } = trpc.vendor.getSettings.useQuery();
  const [amount, setAmount] = useState(50000);
  const [mode, setMode] = useState<"online" | "terminal">("online");
  const [showRates, setShowRates] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectName, setProspectName] = useState("");
  const logQuote = trpc.quote.logQuote.useMutation();
  const sendQuote = trpc.quote.sendByEmail.useMutation({
    onSuccess: () => {
      toast.success("Cotización enviada", { description: `Email enviado a ${prospectEmail}` });
      // Registrar en historial de cotizaciones
      logQuote.mutate({
        prospectEmail,
        prospectName,
        singleAmount: amount,
        kpRate: kpRateStr !== "" ? parseFloat(kpRateStr) || 0 : defaultKp,
        mode,
        netAmount,
        totalFee: totalDeductions,
        effectiveRate,
      });
      setShowEmailForm(false);
      setProspectEmail("");
      setProspectName("");
    },
    onError: (e) => toast.error("Error al enviar", { description: e.message }),
  });

  // Tasas editables — se inicializan desde la configuración del usuario
  const defaultKp = parseFloat(String(settings?.commissionRate ?? "4.6"));
  const defaultIva = settings?.ivaEnabled ? parseFloat(String(settings?.ivaRate ?? "16")) : 16;
  // Stripe México: 3.6% + $3 MXN (tarifa real verificada en dashboard Stripe)
  const defaultStripeOnline = 3.6;
  const defaultStripeTerminal = 3.6;
  const defaultStripeFixedOnline = 3.0;
  const defaultStripeFixedTerminal = 3.0;

  const [kpRateStr, setKpRateStr] = useState<string>("");
  const [ivaRateStr, setIvaRateStr] = useState<string>("");
  const [stripeRateStr, setStripeRateStr] = useState<string>("");
  const [stripeFixedStr, setStripeFixedStr] = useState<string>("");

  // Valores efectivos: usa el campo manual si está escrito, si no usa el default
  const kpRate = (kpRateStr !== "" ? parseFloat(kpRateStr) || 0 : defaultKp) / 100;
  const ivaRate = (ivaRateStr !== "" ? parseFloat(ivaRateStr) || 0 : defaultIva) / 100;
  const stripeRate = (stripeRateStr !== "" ? parseFloat(stripeRateStr) || 0
    : mode === "online" ? defaultStripeOnline : defaultStripeTerminal) / 100;
  const stripeFixed = stripeFixedStr !== "" ? parseFloat(stripeFixedStr) || 0
    : mode === "online" ? defaultStripeFixedOnline : defaultStripeFixedTerminal;

  const stripeFee = amount * stripeRate + stripeFixed;
  const kpFee = amount * kpRate;
  const kpIva = kpFee * ivaRate;
  const totalDeductions = stripeFee + kpFee + kpIva;
  const netAmount = amount - totalDeductions;
  const effectiveRate = amount > 0 ? (totalDeductions / amount) * 100 : 0;

  // Cuando cambia el modo, resetear los campos de stripe para que tomen el nuevo default
  const handleModeChange = (m: "online" | "terminal") => {
    setMode(m);
    setStripeRateStr("");
    setStripeFixedStr("");
  };

  return (
    <div className="space-y-4">
      {/* Selector de modo */}
      <div className="flex gap-2">
        <button
          onClick={() => handleModeChange("online")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === "online"
              ? "bg-emerald-600 text-foreground"
              : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
          }`}
        >
          Cobro Online
        </button>
        <button
          onClick={() => handleModeChange("terminal")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === "terminal"
              ? "bg-indigo-600 text-foreground"
              : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
          }`}
        >
          Terminal Fisica
        </button>
      </div>

      {/* Monto */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Monto a cobrar (MXN)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="50000"
        />
        <input
          type="range"
          min={100}
          max={500000}
          step={1000}
          value={Math.min(amount, 500000)}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          className="w-full mt-2 accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>$100</span>
          <span>$500,000</span>
        </div>
      </div>

      {/* Panel de tasas editables */}
      <div>
        <button
          onClick={() => setShowRates(!showRates)}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showRates ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Ajustar porcentajes manualmente
        </button>

        {showRates && (
          <div className="mt-3 grid grid-cols-2 gap-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Comisión KobraPay (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={kpRateStr}
                  onChange={(e) => setKpRateStr(e.target.value)}
                  placeholder={defaultKp.toFixed(2)}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Default: {defaultKp.toFixed(2)}%</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                IVA sobre comisión (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={ivaRateStr}
                  onChange={(e) => setIvaRateStr(e.target.value)}
                  placeholder={defaultIva.toFixed(0)}
                  step="1"
                  min="0"
                  max="100"
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Default: {defaultIva.toFixed(0)}%</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Comisión Stripe (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stripeRateStr}
                  onChange={(e) => setStripeRateStr(e.target.value)}
                  placeholder={mode === "online" ? "2.90" : "2.70"}
                  step="0.1"
                  min="0"
                  max="10"
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Default: {mode === "online" ? "2.90" : "2.70"}%</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Cargo fijo Stripe ($)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stripeFixedStr}
                  onChange={(e) => setStripeFixedStr(e.target.value)}
                  placeholder={mode === "online" ? "0.30" : "0.05"}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">$</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Default: ${mode === "online" ? "0.30" : "0.05"}</p>
            </div>

            <div className="col-span-2">
              <button
                onClick={() => { setKpRateStr(""); setIvaRateStr(""); setStripeRateStr(""); setStripeFixedStr(""); }}
                className="text-xs text-muted-foreground hover:text-red-500 underline transition-colors"
              >
                Restablecer valores por defecto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resultado */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monto bruto</span>
          <span className="font-semibold">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Comision Stripe ({(stripeRate * 100).toFixed(2)}% + ${stripeFixed.toFixed(2)})</span>
          <span className="text-red-500">-{formatCurrency(stripeFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Comision KobraPay ({(kpRate * 100).toFixed(2)}%)</span>
          <span className="text-red-500">-{formatCurrency(kpFee)}</span>
        </div>
        {ivaRate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA sobre comision ({(ivaRate * 100).toFixed(0)}%)</span>
            <span className="text-orange-500">-{formatCurrency(kpIva)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <span className="font-semibold text-foreground">Tu recibe</span>
          <span className="font-bold text-emerald-600 text-lg">{formatCurrency(netAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">Costo efectivo total: {effectiveRate.toFixed(2)}%</p>
      </div>

      {/* Botón enviar cotización */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-semibold py-2.5 rounded-xl text-sm"
          >
            Enviar cotización por email
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Ingresa los datos del prospecto:</p>
            <input
              type="text"
              value={prospectName}
              onChange={e => setProspectName(e.target.value)}
              placeholder="Nombre del prospecto"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="email"
              value={prospectEmail}
              onChange={e => setProspectEmail(e.target.value)}
              placeholder="Email del prospecto"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmailForm(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!prospectName || !prospectEmail) { toast.error("Ingresa nombre y email"); return; }
                  sendQuote.mutate({
                    prospectEmail,
                    prospectName,
                    mode,
                    amount,
                    kobrapayRate: kpRate * 100,
                    ivaRate: ivaRate * 100,
                  });
                }}
                disabled={sendQuote.isPending}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {sendQuote.isPending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
