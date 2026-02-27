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
} from "lucide-react";

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
  const { data: stats, isLoading: statsLoading } = trpc.transactions.stats.useQuery();
  const { data: links, isLoading: linksLoading } = trpc.paymentLinks.list.useQuery();

  const recentLinks = links?.slice(0, 5) ?? [];

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
            },
            {
              label: "Ventas exitosas",
              value: statsLoading ? "..." : String(stats?.paidLinks ?? 0),
              icon: CheckCircle2,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
            },
            {
              label: "Pagos pendientes",
              value: statsLoading ? "..." : String(stats?.pendingLinks ?? 0),
              icon: Clock,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-100",
            },
            {
              label: "Total de enlaces",
              value: statsLoading ? "..." : String(stats?.totalLinks ?? 0),
              icon: Link2,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100",
            },
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/create">
            <div className="flex items-center gap-3 p-4 bg-cyan-500 hover:bg-cyan-400 rounded-xl cursor-pointer transition-all group">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">Nuevo Cobro</p>
                <p className="text-cyan-100 text-xs">Crear enlace de pago</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link href="/dashboard/links">
            <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50 rounded-xl cursor-pointer transition-all group">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">Links de Pago</p>
                <p className="text-gray-500 text-xs">Ver y gestionar enlaces</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link href="/dashboard/sales">
            <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50 rounded-xl cursor-pointer transition-all group">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">Mis Ventas</p>
                <p className="text-gray-500 text-xs">Historial de transacciones</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
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
                  const cfg = statusConfig[link.status] ?? statusConfig.pending;
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
