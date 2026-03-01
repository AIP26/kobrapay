import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  ArrowUpRight,
  Building2,
  Calendar,
  Activity,
  Download,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

export default function CommissionsPanel() {
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const isAdmin = user?.role === "admin";
  const canAccess = isSuperAdmin || isAdmin;

  const { data, isLoading } = trpc.commissions.summary.useQuery(undefined, {
    enabled: canAccess,
  });

  const chartData = useMemo(() => {
    if (!data?.monthly) return [];
    return data.monthly.map(({ month, amount }) => {
      const [year, m] = month.split("-");
      return {
        label: `${MONTH_LABELS[m] || m} ${year.slice(2)}`,
        amount,
      };
    });
  }, [data]);

  // Mientras carga la sesión, no mostrar error de acceso
  if (authLoading) {
    return (
      <DashboardLayout title="Comisiones">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!canAccess) {
    return (
      <DashboardLayout title="Comisiones">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Acceso restringido</p>
            <p className="text-sm text-gray-400">Solo el administrador puede ver este panel</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalEarned = data?.totalEarned ?? 0;
  const totalTx = data?.totalTransactions ?? 0;
  const clients = data?.clients ?? [];
  const activeClients = clients.filter(c => c.status === "active").length;
  const avgCommission = clients.length > 0
    ? clients.reduce((s, c) => s + parseFloat(c.commissionRate || "0"), 0) / clients.length
    : 0;

  // Top 5 clientes por comisión
  const top5 = [...clients].sort((a, b) => b.totalCommission - a.totalCommission).slice(0, 5);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const generateCommissionReport = async () => {
    setGeneratingPdf(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-MX", { dateStyle: "full" });
      const rows = clients
        .slice().sort((a, b) => b.totalCommission - a.totalCommission)
        .map((c, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}"><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">${i + 1}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;font-weight:600;">${c.businessName || c.name}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">${c.commissionRate}%</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">${c.totalTransactions}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">${fmt(c.totalVolume)}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669;">${fmt(c.totalCommission)}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;"><span style="background:${c.status === "active" ? "#d1fae5" : "#fee2e2"};color:${c.status === "active" ? "#065f46" : "#991b1b"};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">${c.status === "active" ? "Activo" : "Suspendido"}</span></td></tr>`)
        .join("");
      const monthlyRows = (data?.monthly ?? []).map(m => {
        const [year, mo] = m.month.split("-");
        const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        return `<tr><td style="padding:6px 12px;font-size:12px;border-bottom:1px solid #e5e7eb;">${MONTHS[parseInt(mo)-1]} ${year}</td><td style="padding:6px 12px;font-size:12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669;">${fmt(m.amount)}</td></tr>`;
      }).join("");
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte de Comisiones KobraPay</title><style>@media print{body{margin:0;}}body{font-family:Arial,sans-serif;padding:32px;color:#111;max-width:900px;margin:0 auto;}</style></head><body><div style="text-align:center;margin-bottom:28px;border-bottom:2px solid #00c853;padding-bottom:16px;"><h1 style="color:#00c853;font-size:26px;margin:0;font-weight:800;">KobraPay</h1><h2 style="font-size:18px;margin:6px 0 4px;color:#111;">Reporte de Comisiones</h2><p style="color:#6b7280;font-size:13px;margin:0;">Generado el ${dateStr}</p></div><div style="display:flex;gap:20px;margin-bottom:24px;"><div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px 18px;"><p style="font-size:11px;color:#6b7280;margin:0 0 4px;">Total Comisiones Ganadas</p><p style="font-size:22px;font-weight:800;color:#059669;margin:0;">${fmt(totalEarned)}</p></div><div style="flex:1;background:#f9fafb;border-radius:8px;padding:14px 18px;"><p style="font-size:11px;color:#6b7280;margin:0 0 4px;">Total Transacciones</p><p style="font-size:22px;font-weight:800;margin:0;">${totalTx}</p></div><div style="flex:1;background:#f9fafb;border-radius:8px;padding:14px 18px;"><p style="font-size:11px;color:#6b7280;margin:0 0 4px;">Clientes Activos</p><p style="font-size:22px;font-weight:800;margin:0;">${activeClients}</p></div><div style="flex:1;background:#f9fafb;border-radius:8px;padding:14px 18px;"><p style="font-size:11px;color:#6b7280;margin:0 0 4px;">Comisión Promedio</p><p style="font-size:22px;font-weight:800;margin:0;">${avgCommission.toFixed(1)}%</p></div></div><h3 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#111;">Desglose por Negocio</h3><table width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;margin-bottom:28px;"><thead><tr style="background:#f0fdf4;"><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">#</th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">Negocio</th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">Comisión %</th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">Transacciones</th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">Volumen</th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">Tu Comisión</th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;">Estatus</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#9ca3af;">Sin clientes registrados</td></tr>'}</tbody></table>${data?.monthly?.length ? `<h3 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#111;">Historial Mensual</h3><table width="40%" style="border-collapse:collapse;font-family:Arial,sans-serif;"><thead><tr style="background:#f9fafb;"><th style="padding:6px 12px;font-size:11px;text-align:left;color:#6b7280;">Mes</th><th style="padding:6px 12px;font-size:11px;text-align:left;color:#6b7280;">Comisiones</th></tr></thead><tbody>${monthlyRows}</tbody></table>` : ""}<div style="margin-top:32px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px;">KobraPay · kobrapay.mx · Reporte generado automáticamente</div></body></html>`;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Comisiones_KobraPay_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      const { toast } = await import("sonner");
      toast.success("Reporte descargado", { description: "Abre el archivo HTML e imprime como PDF (Ctrl+P)." });
    } catch {
      const { toast } = await import("sonner");
      toast.error("Error al generar el reporte");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <DashboardLayout title="Panel de Comisiones">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Comisiones</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ingresos de la plataforma por comisiones de clientes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={generateCommissionReport} disabled={generatingPdf || isLoading}>
              {generatingPdf ? <><FileText className="w-4 h-4 mr-1.5 animate-pulse" />Generando...</> : <><Download className="w-4 h-4 mr-1.5" />Descargar Reporte</>}
            </Button>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5" variant="outline">
              <Activity className="w-3.5 h-3.5" />
              Super Admin
            </Badge>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-24 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{fmtShort(totalEarned)}</p>
              )}
              <p className="text-xs text-gray-500">Total comisiones</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{totalTx.toLocaleString()}</p>
              )}
              <p className="text-xs text-gray-500">Transacciones exitosas</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
              )}
              <p className="text-xs text-gray-500">Clientes activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{avgCommission.toFixed(1)}%</p>
              )}
              <p className="text-xs text-gray-500">Comisión promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart + Top clients */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Comisiones por mes (últimos 12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-gray-50 animate-pulse rounded-lg" />
              ) : chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  Sin datos de comisiones aún
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmt(v), "Comisión"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === chartData.length - 1 ? "#10b981" : "#6ee7b7"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top 5 clients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-500" />
                Top clientes por comisión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : top5.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Sin datos</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {top5.map((c, i) => (
                    <div key={c.clientId} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-gray-100 text-gray-600" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {c.businessName || c.name}
                        </p>
                        <p className="text-xs text-gray-400">{c.totalTransactions} transacciones</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          {fmtShort(c.totalCommission)}
                        </p>
                        <p className="text-xs text-gray-400">{c.commissionRate}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full client table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              Detalle por cliente
              {clients.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{clients.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    <div className="flex-1 h-4 bg-gray-100 animate-pulse rounded" />
                    <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
                    <div className="w-20 h-4 bg-gray-100 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No hay clientes registrados aún
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comisión</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Volumen</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Txs</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Última tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients.map((c) => (
                      <tr key={c.clientId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="font-medium text-gray-900">{c.businessName || c.name}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="font-semibold text-emerald-600">{fmt(c.totalCommission)}</p>
                          <p className="text-xs text-gray-400">{c.commissionRate}% tasa</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="text-gray-700">{fmt(c.totalVolume)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="text-gray-700">{c.totalTransactions}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            className={
                              c.status === "active"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : c.status === "suspended"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }
                            variant="outline"
                          >
                            {c.status === "active" ? "Activo" : c.status === "suspended" ? "Suspendido" : "Pendiente"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right text-xs text-gray-400">
                          {c.lastTransactionAt
                            ? new Date(c.lastTransactionAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
