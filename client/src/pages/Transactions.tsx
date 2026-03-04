import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, CheckCircle2, Clock, CreditCard, XCircle, Search,
  Download, RefreshCw, Filter, TrendingUp, DollarSign, AlertCircle,
} from "lucide-react";
import { useState, useMemo } from "react";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const statusConfig = {
  pending:    { label: "Pendiente",    variant: "secondary" as const, icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50" },
  processing: { label: "Procesando",  variant: "secondary" as const, icon: Clock,        color: "text-blue-600",   bg: "bg-blue-50" },
  succeeded:  { label: "Exitoso",     variant: "default" as const,   icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50" },
  failed:     { label: "Fallido",     variant: "destructive" as const, icon: XCircle,    color: "text-red-600",    bg: "bg-red-50" },
  refunded:   { label: "Reembolsado", variant: "outline" as const,   icon: XCircle,      color: "text-gray-600",   bg: "bg-gray-50" },
};

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: transactions, isLoading, refetch } = trpc.transactions.list.useQuery(
    { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined,
      dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    { refetchOnWindowFocus: false }
  );

  const filtered = useMemo(() => transactions ?? [], [transactions]);

  const stats = useMemo(() => {
    const succeeded = filtered.filter(t => t.status === "succeeded");
    return {
      total: filtered.length,
      succeeded: succeeded.length,
      failed: filtered.filter(t => t.status === "failed").length,
      totalAmount: succeeded.reduce((sum, t) => sum + Number(t.amount), 0),
    };
  }, [filtered]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Fecha", "Cliente", "Email", "Monto", "Moneda", "Estado", "Tarjeta"];
    const rows = filtered.map(tx => [
      formatDate(tx.createdAt),
      tx.payerName || "",
      tx.payerEmail || "",
      tx.amount,
      tx.currency,
      statusConfig[tx.status as keyof typeof statusConfig]?.label || tx.status,
      tx.cardBrand && tx.cardLast4 ? `${tx.cardBrand} ****${tx.cardLast4}` : "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transacciones-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Historial de Transacciones">
      <div className="space-y-5">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Exitosas", value: stats.succeeded, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "Fallidas", value: stats.failed, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
            { label: "Cobrado", value: formatCurrency(stats.totalAmount), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-bold text-foreground text-sm">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="succeeded">Exitosos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                  <SelectItem value="refunded">Reembolsados</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
                <span className="text-muted-foreground text-xs">—</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}>
                  Limpiar
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Actualizar
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Sin transacciones</h3>
              <p className="text-muted-foreground text-sm">
                {search || statusFilter !== "all" || dateFrom || dateTo
                  ? "No hay resultados para los filtros aplicados."
                  : "Las transacciones aparecerán aquí cuando tus clientes realicen pagos."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => {
              const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <Card key={tx.id} className="border-border hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <CreditCard className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{tx.payerName || "Cliente"}</p>
                            <p className="text-xs text-muted-foreground truncate">{tx.payerEmail || ""}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-foreground">{formatCurrency(tx.amount, tx.currency)}</p>
                            <Badge variant={cfg.variant} className="text-xs mt-0.5">
                              <StatusIcon className="w-2.5 h-2.5 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3">
                            {tx.cardBrand && tx.cardLast4 && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {tx.cardBrand} •••• {tx.cardLast4}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0">{formatDate(tx.createdAt)}</p>
                        </div>
                        {tx.errorMessage && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {tx.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
