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
  X,
  ChevronRight,
  CreditCard,
  Hash,
  User,
  Mail,
  CheckCircle2,
  Clock,
  Handshake,
  Star,
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

type DrillDownType = "comisiones" | "transacciones" | "clientes" | "promedio" | null;

type TxDetail = {
  id: number;
  payerName: string | null;
  payerEmail: string | null;
  amount: string;
  commissionAmount: string;
  netAmount: string;
  currency: string;
  cardBrand: string | null;
  cardLast4: string | null;
  operationNumber: string | null;
  createdAt: Date;
  clientName: string;
};

export default function CommissionsPanel() {
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const isAdmin = user?.role === "admin";
  const canAccess = isSuperAdmin || isAdmin;
  const [drillDown, setDrillDown] = useState<DrillDownType>(null);
  const [selectedTx, setSelectedTx] = useState<TxDetail | null>(null);

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

  const top5 = [...clients].sort((a, b) => b.totalCommission - a.totalCommission).slice(0, 5);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  // ─── Tiers de comisión escalonada ────────────────────────────────────────────
  const [showTiers, setShowTiers] = useState(false);
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [tierForm, setTierForm] = useState({ minClients: 1, maxClients: '' as string | number, commissionPct: 1.0, label: '', description: '' });
  const { data: tiersData, refetch: refetchTiers } = trpc.associate.listCommissionTiers.useQuery(undefined, { enabled: isSuperAdmin });
  const updateTierMutation = trpc.associate.updateCommissionTier.useMutation({ onSuccess: () => { refetchTiers(); setEditingTier(null); } });
  const createTierMutation = trpc.associate.createCommissionTier.useMutation({ onSuccess: () => { refetchTiers(); setTierForm({ minClients: 1, maxClients: '', commissionPct: 1.0, label: '', description: '' }); } });
  // ─── Pestañas de comisiones ───────────────────────────────────────────────────
  const [activeCommTab, setActiveCommTab] = useState<string>("mine");
  const { data: associatesData } = trpc.associate.listAllAssociates.useQuery(undefined, {
    enabled: isSuperAdmin,
  });
  const associates = associatesData ?? [];
  const selectedAssociate = associates.find(a => String(a.associate.id) === activeCommTab) ?? null;

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

  // ─── Drill-down panel content ────────────────────────────────────────────────
  const DrillDownPanel = () => {
    if (!drillDown) return null;

    const sortedByCommission = [...clients].sort((a, b) => b.totalCommission - a.totalCommission);
    const sortedByTx = [...clients].sort((a, b) => b.totalTransactions - a.totalTransactions);
    const sortedByRate = [...clients].sort((a, b) => parseFloat(b.commissionRate || "0") - parseFloat(a.commissionRate || "0"));

    const titles: Record<DrillDownType & string, string> = {
      comisiones: "Detalle de Comisiones",
      transacciones: "Detalle de Transacciones",
      clientes: "Clientes Activos",
      promedio: "Comisiones por Cliente",
    };

    return (
      <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDrillDown(null)}>
        <div
          className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto border-l border-gray-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{titles[drillDown]}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {drillDown === "comisiones" && `Total: ${fmt(totalEarned)}`}
                {drillDown === "transacciones" && `${totalTx.toLocaleString()} transacciones`}
                {drillDown === "clientes" && `${activeClients} de ${clients.length} activos`}
                {drillDown === "promedio" && `Promedio: ${avgCommission.toFixed(2)}%`}
              </p>
            </div>
            <button
              onClick={() => setDrillDown(null)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {/* Comisiones: historial mensual + top clientes */}
            {drillDown === "comisiones" && (
              <>
                {data?.monthly && data.monthly.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial mensual</h3>
                    <div className="space-y-2">
                      {[...data.monthly].reverse().map(m => {
                        const [year, mo] = m.month.split("-");
                        const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
                        const pct = totalEarned > 0 ? (m.amount / totalEarned) * 100 : 0;
                        return (
                          <div key={m.month} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-16 flex-shrink-0">{MONTHS[parseInt(mo)-1]} {year.slice(2)}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-emerald-600 w-20 text-right">{fmtShort(m.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por cliente</h3>
                {sortedByCommission.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos aún</p>
                ) : sortedByCommission.map((c, i) => (
                  <div key={c.clientId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-500"}`}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.businessName || c.name}</p>
                      <p className="text-xs text-gray-400">{c.commissionRate}% · {c.totalTransactions} txs</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{fmt(c.totalCommission)}</p>
                  </div>
                ))}
              </>
            )}

            {/* Transacciones: lista real de transacciones individuales */}
            {drillDown === "transacciones" && (() => {
              const txList = (data as Record<string, unknown> & { transactions?: Array<{
                id: number;
                payerName: string | null;
                payerEmail: string | null;
                amount: string;
                commissionAmount: string;
                netAmount: string;
                currency: string;
                cardBrand: string | null;
                cardLast4: string | null;
                operationNumber: string | null;
                createdAt: Date;
                clientName: string;
              }> })?.transactions ?? [];
              return (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-cyan-50 rounded-xl p-4">
                      <p className="text-xs text-cyan-600 font-medium">Total transacciones</p>
                      <p className="text-2xl font-bold text-cyan-700 mt-1">{totalTx.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-xs text-emerald-600 font-medium">Comisiones generadas</p>
                      <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(totalEarned)}</p>
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Transacciones exitosas ({txList.length})</h3>
                  {txList.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Sin transacciones aún</p>
                  ) : txList.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-lg border border-gray-100 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer space-y-1.5 transition-colors"
                      onClick={() => setSelectedTx(tx as TxDetail)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{tx.payerName || "Pagador desconocido"}</p>
                          <p className="text-xs text-gray-400 truncate">{tx.payerEmail || "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{fmt(parseFloat(tx.amount))}</p>
                          <p className="text-xs text-emerald-600 font-medium">+{fmt(parseFloat(tx.commissionAmount))} comisión</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{tx.clientName}</span>
                        {tx.cardBrand && <span>{tx.cardBrand.toUpperCase()} ···{tx.cardLast4}</span>}
                        {tx.operationNumber && <span>#{tx.operationNumber}</span>}
                        <span className="ml-auto">{new Date(tx.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}

            {/* Clientes activos */}
            {drillDown === "clientes" && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-600 font-medium">Activos</p>
                    <p className="text-xl font-bold text-green-700 mt-1">{clients.filter(c => c.status === "active").length}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
                    <p className="text-xl font-bold text-yellow-700 mt-1">{clients.filter(c => c.status === "pending").length}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-red-600 font-medium">Suspendidos</p>
                    <p className="text-xl font-bold text-red-700 mt-1">{clients.filter(c => c.status === "suspended").length}</p>
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Todos los clientes</h3>
                {clients.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin clientes registrados</p>
                ) : clients.map(c => (
                  <div key={c.clientId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-purple-700">{(c.businessName || c.name || "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.businessName || c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                    <Badge
                      className={c.status === "active" ? "bg-green-100 text-green-700 border-green-200" : c.status === "suspended" ? "bg-red-100 text-red-700 border-red-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}
                      variant="outline"
                    >
                      {c.status === "active" ? "Activo" : c.status === "suspended" ? "Suspendido" : "Pendiente"}
                    </Badge>
                  </div>
                ))}
              </>
            )}

            {/* Promedio: tasa de comisión por cliente */}
            {drillDown === "promedio" && (
              <>
                <div className="bg-orange-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-orange-600 font-medium">Comisión promedio global</p>
                  <p className="text-3xl font-bold text-orange-700 mt-1">{avgCommission.toFixed(2)}%</p>
                  <p className="text-xs text-orange-500 mt-1">Calculado sobre {clients.length} clientes</p>
                </div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tasa por cliente</h3>
                {sortedByRate.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos aún</p>
                ) : sortedByRate.map(c => (
                  <div key={c.clientId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.businessName || c.name}</p>
                      <p className="text-xs text-gray-400">{c.totalTransactions} transacciones · {fmt(c.totalVolume)} volumen</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">{c.commissionRate}%</p>
                      <p className="text-xs text-gray-400">{fmt(c.totalCommission)}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Modal desglose de transacción individual ──────────────────────────────
  const TxDetailModal = () => {
    if (!selectedTx) return null;
    const amount = parseFloat(selectedTx.amount);
    const commission = parseFloat(selectedTx.commissionAmount);
    const net = parseFloat(selectedTx.netAmount);
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedTx(null)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold text-sm">Transacción Exitosa</span>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-3xl font-bold">{fmt(amount)}</p>
            <p className="text-emerald-100 text-sm mt-1">
              {new Date(selectedTx.createdAt).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Desglose financiero */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Desglose financiero</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monto cobrado</span>
                <span className="font-semibold text-gray-900">{fmt(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Comisión KobraPay</span>
                <span className="font-semibold text-emerald-600">+{fmt(commission)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2 mt-2">
                <span className="text-gray-500">Neto al cliente</span>
                <span className="font-bold text-gray-900">{fmt(net)}</span>
              </div>
            </div>
          </div>

          {/* Datos del pagador */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del pagador</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{selectedTx.payerName || "No registrado"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{selectedTx.payerEmail || "No registrado"}</span>
              </div>
              {selectedTx.cardBrand && (
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{selectedTx.cardBrand.toUpperCase()} •••• {selectedTx.cardLast4}</span>
                </div>
              )}
            </div>
          </div>

          {/* Datos de la operación */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos de la operación</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">Cliente KobraPay:</span>
                <span className="font-medium text-gray-700">{selectedTx.clientName}</span>
              </div>
              {selectedTx.operationNumber && (
                <div className="flex items-center gap-3 text-sm">
                  <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">No. Operación:</span>
                  <span className="font-mono text-gray-700 text-xs bg-gray-100 px-2 py-0.5 rounded">{selectedTx.operationNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">Fecha:</span>
                <span className="text-gray-700">{new Date(selectedTx.createdAt).toLocaleString("es-MX")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

        {/* ─── Pestañas de Comisiones ─── */}
        {isSuperAdmin && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {/* Pestaña: Mis Comisiones */}
            <button
              onClick={() => setActiveCommTab("mine")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeCommTab === "mine"
                  ? "bg-white text-emerald-700 shadow-sm border border-emerald-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Mis Comisiones
              {activeCommTab === "mine" && (
                <span className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  {fmtShort(totalEarned)}
                </span>
              )}
            </button>
            {/* Pestañas por asociado */}
            {associates.map(assoc => {
              const tabId = String(assoc.associate.id);
              const isActive = activeCommTab === tabId;
              const assocEarned = assoc.totalEarned;
              return (
                <button
                  key={tabId}
                  onClick={() => setActiveCommTab(tabId)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-white text-amber-700 shadow-sm border border-amber-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Handshake className="w-4 h-4" />
                  {assoc.associate.name || assoc.associate.email || `Asociado ${assoc.associate.id}`}
                  {isActive && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                      {fmtShort(assocEarned)}
                    </span>
                  )}
                  {!isActive && assoc.clients.filter((c: Record<string, unknown>) => c.status === 'pending').length > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                      {assoc.clients.filter((c: Record<string, unknown>) => c.status === 'pending').length} pend.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Contenido de pestaña de Asociado ─── */}
        {isSuperAdmin && activeCommTab !== "mine" && selectedAssociate && (
          <AssociateTabContent assoc={selectedAssociate} />
        )}

        {/* ─── Contenido de Mis Comisiones ─── */}
        {(!isSuperAdmin || activeCommTab === "mine") && (
        <>
        {/* KPI Cards — clickeables */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total comisiones */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-emerald-300 group"
            onClick={() => setDrillDown(drillDown === "comisiones" ? null : "comisiones")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600" />
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-24 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{fmtShort(totalEarned)}</p>
              )}
              <p className="text-xs text-gray-500">Total comisiones</p>
            </CardContent>
          </Card>

          {/* Transacciones */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-cyan-300 group"
            onClick={() => setDrillDown(drillDown === "transacciones" ? null : "transacciones")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:text-cyan-600" />
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{totalTx.toLocaleString()}</p>
              )}
              <p className="text-xs text-gray-500">Transacciones exitosas</p>
            </CardContent>
          </Card>

          {/* Clientes activos */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-purple-300 group"
            onClick={() => setDrillDown(drillDown === "clientes" ? null : "clientes")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
              )}
              <p className="text-xs text-gray-500">Clientes activos</p>
            </CardContent>
          </Card>

          {/* Comisión promedio */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-orange-300 group"
            onClick={() => setDrillDown(drillDown === "promedio" ? null : "promedio")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-orange-400 group-hover:text-orange-600" />
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
                <ResponsiveContainer width="100%" height={200}>
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
        </>
        )}
      </div>
      {/* Drill-down panel */}
      <DrillDownPanel />
      {/* Modal desglose individual de transacción */}
      <TxDetailModal />

      {/* ─── Sección de Comisión Escalonada (solo SuperAdmin) ─── */}
      {isSuperAdmin && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowTiers(!showTiers)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Comisión Escalonada para Asociados</p>
                <p className="text-xs text-gray-500">Tabla de porcentajes 0.3%–5% según cartera de clientes</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showTiers ? 'rotate-90' : ''}`} />
          </button>
          {showTiers && (
            <div className="px-6 pb-6 space-y-4">
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nivel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clientes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Comisión %</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(tiersData ?? []).map((tier) => (
                      <tr key={tier.id} className="hover:bg-gray-50/50">
                        {editingTier === tier.id ? (
                          <>
                            <td className="px-4 py-3" colSpan={4}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                  <label className="text-xs text-gray-500">Nivel</label>
                                  <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={tierForm.label} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: Bronce" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">Mín. clientes</label>
                                  <input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={tierForm.minClients} onChange={e => setTierForm(f => ({ ...f, minClients: parseInt(e.target.value) || 1 }))} />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">Máx. clientes</label>
                                  <input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={tierForm.maxClients as number} onChange={e => setTierForm(f => ({ ...f, maxClients: e.target.value ? parseInt(e.target.value) : '' }))} placeholder="Vacío = sin límite" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">Comisión %</label>
                                  <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={tierForm.commissionPct} onChange={e => setTierForm(f => ({ ...f, commissionPct: parseFloat(e.target.value) || 0 }))} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => updateTierMutation.mutate({ id: tier.id, ...tierForm, maxClients: tierForm.maxClients === '' ? null : Number(tierForm.maxClients) })} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 font-medium">Guardar</button>
                                <button onClick={() => setEditingTier(null)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold text-gray-800">{tier.label}</td>
                            <td className="px-4 py-3 text-gray-600">{tier.minClients}{tier.maxClients ? `–${tier.maxClients}` : '+'} clientes</td>
                            <td className="px-4 py-3">
                              <span className="bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full text-sm">{parseFloat(String(tier.commissionPct)).toFixed(1)}%</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{tier.description}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => { setEditingTier(tier.id); setTierForm({ minClients: tier.minClients, maxClients: tier.maxClients ?? '', commissionPct: parseFloat(String(tier.commissionPct)), label: tier.label, description: tier.description ?? '' }); }} className="text-xs text-amber-600 hover:text-amber-800 font-medium">Editar</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Formulario para agregar nuevo tier */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Agregar nuevo nivel</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nombre (ej: Oro)" value={tierForm.label} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} />
                  <input type="number" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Mín. clientes" value={tierForm.minClients} onChange={e => setTierForm(f => ({ ...f, minClients: parseInt(e.target.value) || 1 }))} />
                  <input type="number" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Máx. (vacío=sin límite)" value={tierForm.maxClients as number} onChange={e => setTierForm(f => ({ ...f, maxClients: e.target.value ? parseInt(e.target.value) : '' }))} />
                  <input type="number" step="0.1" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Comisión %" value={tierForm.commissionPct} onChange={e => setTierForm(f => ({ ...f, commissionPct: parseFloat(e.target.value) || 0 }))} />
                  <button onClick={() => createTierMutation.mutate({ ...tierForm, maxClients: tierForm.maxClients === '' ? null : Number(tierForm.maxClients) })} disabled={!tierForm.label || createTierMutation.isPending} className="bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
                    {createTierMutation.isPending ? 'Guardando...' : '+ Agregar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}


// ─── Componente: Comisiones de Asociados (solo SuperAdmin) ────────────────────
function AssociateCommissionsSection() {
  const { data: associatesData, isLoading } = trpc.associate.listAllAssociates.useQuery();
  const updateStatusMutation = trpc.associate.updateClientStatus.useMutation();
  const utils = trpc.useUtils();

  const associates = associatesData ?? [];
  const totalAssociates = associates.length;
  const totalClients = associates.reduce((s, a) => s + a.clients.length, 0);
  const totalEarned = associates.reduce((s, a) => s + a.totalEarned, 0);
  const activeClients = associates.reduce((s, a) => s + a.clients.filter((c: Record<string, unknown>) => c.status === 'active').length, 0);

  const handleApprove = async (clientId: number) => {
    await updateStatusMutation.mutateAsync({ clientId, status: 'active' });
    utils.associate.listAllAssociates.invalidate();
    const { toast } = await import('sonner');
    toast.success('Cliente aprobado y asociado notificado');
  };

  const handleReject = async (clientId: number) => {
    await updateStatusMutation.mutateAsync({ clientId, status: 'rejected' });
    utils.associate.listAllAssociates.invalidate();
    const { toast } = await import('sonner');
    toast.success('Cliente rechazado');
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Handshake className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Comisiones de Asociados</h2>
          <p className="text-xs text-gray-500">Gestiona y aprueba los clientes captados por tus asociados</p>
        </div>
      </div>

      {/* KPIs de asociados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Asociados', value: totalAssociates, icon: Star, color: 'text-amber-600 bg-amber-50' },
          { label: 'Clientes Captados', value: totalClients, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Clientes Activos', value: activeClients, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Comisiones Pagadas', value: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalEarned), icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 space-y-2">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de asociados con sus clientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : associates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay asociados registrados aún</p>
            <p className="text-sm text-gray-400">Los asociados aparecerán aquí cuando se registren en la plataforma</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {associates.map((assoc) => (
            <Card key={assoc.associate.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                      {(assoc.associate.name || assoc.associate.email || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{assoc.associate.name || assoc.associate.email}</p>
                      <p className="text-xs text-gray-400">{assoc.associate.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(assoc.totalEarned)}
                    </p>
                    <p className="text-xs text-gray-400">{assoc.clients.length} clientes</p>
                  </div>
                </div>
              </CardHeader>
              {assoc.clients.length > 0 && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-b border-gray-100 bg-gray-50/50">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Comisión %</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Ganado</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {assoc.clients.map((client: Record<string, unknown>) => (
                          <tr key={client.id as number} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{client.clientName as string}</p>
                              <p className="text-xs text-gray-400">{client.clientEmail as string}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {(client.assignedPlan as string) || 'Sin plan'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-700">{client.commissionRate as string}%</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-emerald-600">
                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(parseFloat(String(client.totalCommissionEarned || '0')))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={
                                  client.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                  client.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                  client.status === 'inactive' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }
                              >
                                {client.status === 'active' ? 'Activo' :
                                 client.status === 'rejected' ? 'Rechazado' :
                                 client.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {client.status === 'pending' && (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleApprove(client.id as number)}
                                    className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600 font-medium"
                                  >
                                    Aprobar
                                  </button>
                                  <button
                                    onClick={() => handleReject(client.id as number)}
                                    className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-200 font-medium"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              )}
                              {client.status !== 'pending' && (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente: Pestaña de un Asociado específico ───────────────────────────
function AssociateTabContent({ assoc }: { assoc: { associate: { id: number; name: string | null; email: string | null }; clients: Record<string, unknown>[]; totalEarned: number } }) {
  const updateStatusMutation = trpc.associate.updateClientStatus.useMutation();
  const utils = trpc.useUtils();
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const handleApprove = async (clientId: number) => {
    await updateStatusMutation.mutateAsync({ clientId, status: 'active' });
    utils.associate.listAllAssociates.invalidate();
    const { toast } = await import('sonner');
    toast.success('Cliente aprobado y asociado notificado');
  };
  const handleReject = async (clientId: number) => {
    await updateStatusMutation.mutateAsync({ clientId, status: 'rejected' });
    utils.associate.listAllAssociates.invalidate();
    const { toast } = await import('sonner');
    toast.success('Cliente rechazado');
  };

  const pendingCount = assoc.clients.filter((c) => c.status === 'pending').length;
  const preApprovedCount = assoc.clients.filter((c) => c.status === 'assistant_approved').length;
  const activeCount = assoc.clients.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
          {(assoc.associate.name || assoc.associate.email || 'A')[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-lg">{assoc.associate.name || assoc.associate.email}</p>
          <p className="text-sm text-gray-500">{assoc.associate.email}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-600">{fmt(assoc.totalEarned)}</p>
          <p className="text-xs text-gray-400">Total comisiones ganadas</p>
        </div>
        <div className="flex flex-col gap-1">
          {pendingCount > 0 && (
            <div className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full text-center">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </div>
          )}
          {preApprovedCount > 0 && (
            <div className="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full text-center">
              {preApprovedCount} pre-aprobado{preApprovedCount > 1 ? 's' : ''}
            </div>
          )}
          {activeCount > 0 && (
            <div className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full text-center">
              {activeCount} activo{activeCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      {assoc.clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Este asociado aún no ha captado clientes</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comisión %</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ganado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assoc.clients.map((client) => (
                    <tr key={client.id as number} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.clientName as string}</p>
                        <p className="text-xs text-gray-400">{client.clientEmail as string}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{(client.assignedPlan as string) || 'Sin plan'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{client.commissionRate as string}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {fmt(parseFloat(String(client.totalCommissionEarned || '0')))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={
                          client.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                          client.status === 'assistant_approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          client.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                          client.status === 'inactive' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }>
                          {client.status === 'active' ? 'Activo' :
                           client.status === 'assistant_approved' ? 'Pre-aprobado' :
                           client.status === 'rejected' ? 'Rechazado' :
                           client.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.status === 'assistant_approved' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleApprove(client.id as number)} className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600 font-medium">✅ Aprobar</button>
                            <button onClick={() => handleReject(client.id as number)} className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-200 font-medium">Rechazar</button>
                          </div>
                        ) : client.status === 'pending' ? (
                          <span className="text-xs text-amber-600 font-medium">⏳ En revisión del asistente</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
