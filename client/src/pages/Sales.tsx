import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  processing: { label: "Procesando", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  succeeded: { label: "Exitoso", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  failed: { label: "Fallido", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-600 border-gray-200", icon: XCircle },
};

export default function Sales() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "succeeded" | "pending" | "failed">("all");

  const { data: transactions, isLoading, refetch, isFetching } = trpc.transactions.list.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );
  const { data: stats } = trpc.transactions.stats.useQuery();
  const { data: exportData, refetch: fetchExport } = trpc.transactions.exportCsv.useQuery(
    undefined,
    { enabled: false }
  );

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      const matchSearch =
        !search ||
        tx.payerName?.toLowerCase().includes(search.toLowerCase()) ||
        tx.payerEmail?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || tx.status === filter;
      return matchSearch && matchFilter;
    });
  }, [transactions, search, filter]);

  const totalFiltered = filtered.reduce((sum, tx) => {
    if (tx.status === "succeeded") return sum + Number(tx.amount);
    return sum;
  }, 0);

  const totalCommission = filtered.reduce((sum, tx) => {
    if (tx.status === "succeeded") return sum + Number(tx.commissionAmount || 0);
    return sum;
  }, 0);

  const totalNet = totalFiltered - totalCommission;

  const handleExportCSV = async () => {
    try {
      const result = await fetchExport();
      if (result.data?.csv) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ventas-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${result.data.count} transacciones exportadas`);
      }
    } catch {
      toast.error("Error al exportar");
    }
  };

  return (
    <DashboardLayout title="Mis Ventas">
      <div className="space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total cobrado",
              value: formatCurrency(stats?.totalCollected ?? 0),
              icon: TrendingUp,
              iconColor: "text-green-600",
              iconBg: "bg-green-100",
            },
            {
              label: "Ventas exitosas",
              value: String(stats?.paidLinks ?? 0),
              icon: CheckCircle2,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-100",
            },
            {
              label: "Pendientes",
              value: String(stats?.pendingLinks ?? 0),
              icon: Clock,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-100",
            },
            {
              label: "Total enlaces",
              value: String(stats?.totalLinks ?? 0),
              icon: BarChart3,
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

        {/* Table Card */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex-1">
                Historial de transacciones
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-8 text-xs border-gray-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 text-xs border-gray-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm border-gray-200"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "succeeded", "pending", "failed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filter === f
                        ? "bg-cyan-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? "Todos" : f === "succeeded" ? "Exitosos" : f === "pending" ? "Pendientes" : "Fallidos"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 animate-pulse rounded w-32" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-48" />
                    </div>
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-20" />
                    <div className="h-6 bg-gray-100 animate-pulse rounded w-16" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-600 mb-1">
                  {search || filter !== "all" ? "Sin resultados" : "Sin transacciones aún"}
                </p>
                <p className="text-sm text-gray-400">
                  {search || filter !== "all"
                    ? "Intenta con otros filtros"
                    : "Las transacciones aparecerán aquí cuando tus clientes paguen"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Cliente</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Tarjeta</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Monto bruto</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Comisión</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Neto</th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((tx, i) => {
                        const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
                        const StatusIcon = cfg.icon;
                        const gross = Number(tx.amount);
                        const commRate = Number(tx.commissionRate || 0);
                        const commAmt = Number(tx.commissionAmount || 0);
                        const net = Number(tx.netAmount || gross);
                        return (
                          <tr
                            key={tx.id}
                            className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.status === "succeeded" ? "bg-green-100" : tx.status === "failed" ? "bg-red-100" : "bg-gray-100"}`}>
                                  <CreditCard className={`w-4 h-4 ${tx.status === "succeeded" ? "text-green-600" : tx.status === "failed" ? "text-red-500" : "text-gray-400"}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{tx.payerName || "—"}</p>
                                  <p className="text-xs text-gray-400">{tx.payerEmail || ""}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {tx.cardBrand && tx.cardLast4 ? (
                                <span className="text-xs text-gray-500 capitalize font-mono">
                                  {tx.cardBrand} •••• {tx.cardLast4}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`text-sm font-bold ${tx.status === "succeeded" ? "text-gray-800" : "text-gray-500"}`}>
                                {formatCurrency(gross, tx.currency)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {commRate > 0 ? (
                                <div>
                                  <span className="text-xs font-medium text-orange-600">
                                    -{formatCurrency(commAmt)}
                                  </span>
                                  <p className="text-xs text-gray-400">{commRate}%</p>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`text-sm font-bold ${tx.status === "succeeded" ? "text-green-600" : "text-gray-500"}`}>
                                {formatCurrency(net, tx.currency)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-xs text-gray-400">{formatDate(tx.createdAt)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filtered.map((tx) => {
                    const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
                    const StatusIcon = cfg.icon;
                    const gross = Number(tx.amount);
                    const commAmt = Number(tx.commissionAmount || 0);
                    const net = Number(tx.netAmount || gross);
                    return (
                      <div key={tx.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.status === "succeeded" ? "bg-green-100" : "bg-gray-100"}`}>
                              <CreditCard className={`w-4 h-4 ${tx.status === "succeeded" ? "text-green-600" : "text-gray-400"}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{tx.payerName || "—"}</p>
                              <p className="text-xs text-gray-400">{tx.payerEmail || ""}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">{formatCurrency(gross, tx.currency)}</p>
                            {commAmt > 0 && (
                              <p className="text-xs text-green-600 font-medium">Neto: {formatCurrency(net)}</p>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${cfg.color}`}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">{filtered.length} transacción{filtered.length !== 1 ? "es" : ""}</p>
                    <div className="flex items-center gap-4">
                      {totalCommission > 0 && (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Bruto</p>
                            <p className="text-sm font-semibold text-gray-700">{formatCurrency(totalFiltered)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Comisión</p>
                            <p className="text-sm font-semibold text-orange-600">-{formatCurrency(totalCommission)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Neto</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrency(totalNet)}</p>
                          </div>
                        </>
                      )}
                      {totalCommission === 0 && (
                        <p className="text-sm font-semibold text-green-600">
                          Total: {formatCurrency(totalFiltered)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
