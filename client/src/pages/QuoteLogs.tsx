import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Mail, TrendingUp, Users, DollarSign, BarChart3,
  ChevronLeft, ChevronRight, Search, CheckCircle2,
  Clock, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function QuoteLogs() {
  const { user } = useAuth();
  const isSuperAdmin = (user as any)?.isSuperAdmin;
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const statsQuery = trpc.quote.getStats.useQuery(
    { all: showAll && isSuperAdmin },
    { refetchInterval: 60_000 }
  );

  const logsQuery = trpc.quote.getLogs.useQuery(
    { page, limit: 20, all: showAll && isSuperAdmin },
    { refetchInterval: 60_000 }
  );

  const stats = statsQuery.data;
  const logs = logsQuery.data?.logs ?? [];
  const total = logsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search.trim()
    ? logs.filter((l: any) =>
        l.prospectEmail?.toLowerCase().includes(search.toLowerCase()) ||
        l.prospectName?.toLowerCase().includes(search.toLowerCase()) ||
        l.senderName?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-emerald-400" />
            Cotizaciones Enviadas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Historial de cotizaciones enviadas por email a prospectos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAll(!showAll); setPage(1); }}
              className={`border-border text-sm ${showAll ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "text-muted-foreground hover:text-foreground"}`}
            >
              {showAll ? "Viendo todas" : "Ver solo las mías"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { statsQuery.refetch(); logsQuery.refetch(); }}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">Total enviadas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.totalSent ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Convertidas</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats?.totalConverted ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Tasa de conversión</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats?.conversionRate ?? 0}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-muted-foreground">Volumen cotizado</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{fmt(stats?.totalVolumeQuoted ?? 0)}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, nombre del prospecto o asesor..."
          className="pl-9 bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
        />
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Prospecto</th>
                {(showAll && isSuperAdmin) && (
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Asesor</th>
                )}
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Modo</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Monto</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Tasa KP</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Neto</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Efectiva</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logsQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No hay cotizaciones enviadas aún</p>
                    <p className="text-muted-foreground text-xs mt-1">Las cotizaciones que envíes desde el simulador aparecerán aquí</p>
                  </td>
                </tr>
              ) : (
                filtered.map((log: any) => (
                  <tr key={log.id} className="border-b border-border hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{log.prospectName || "—"}</p>
                      <p className="text-muted-foreground text-xs">{log.prospectEmail}</p>
                    </td>
                    {(showAll && isSuperAdmin) && (
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.senderName || "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.mode === "terminal"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {log.mode === "terminal" ? "Terminal" : "Online"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-mono text-xs">
                      {fmt(Number(log.singleAmount || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {Number(log.kpRate || 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs font-semibold">
                      {fmt(Number(log.netAmount || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {Number(log.effectiveRate || 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.registered ? (
                        <span className="flex items-center justify-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Registrado
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {fmtDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {total} cotizaciones · Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nota de actualización */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Se actualiza automáticamente cada 60 segundos
      </p>
    </div>
  );
}
