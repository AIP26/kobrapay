import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  Server,
  Globe,
  Webhook,
} from "lucide-react";

type StatusType = "operational" | "degraded" | "down";

function StatusBadge({ status }: { status: StatusType }) {
  if (status === "operational") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5">
        <CheckCircle2 className="h-3 w-3" />
        Operacional
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5">
        <AlertCircle className="h-3 w-3" />
        Degradado
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1.5">
      <XCircle className="h-3 w-3" />
      Sin conexión
    </Badge>
  );
}

function WebhookStatusIcon({ success }: { success: boolean }) {
  return success ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function SystemStatus() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, refetch } = trpc.security.getSystemStatus.useQuery(undefined, {
    refetchInterval: 30_000, // Auto-refresh cada 30 segundos
    staleTime: 15_000,
  });

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetch();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            Estado del Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor en tiempo real de KobraPay v2 · Se actualiza cada 30 segundos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {isLoading && !data && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Cargando estado del sistema...
        </div>
      )}

      {data && (
        <>
          {/* Estado general — 3 tarjetas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KobraPay */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Server className="h-4 w-4 text-cyan-400" />
                KobraPay Platform
              </div>
              <StatusBadge status={data.platform.status} />
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Versión</span>
                  <span className="text-foreground font-mono">v{data.platform.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entorno</span>
                  <span className="text-foreground capitalize">{data.platform.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span className="text-emerald-400 font-mono">{formatUptime(data.platform.uptime)}</span>
                </div>
              </div>
            </div>

            {/* ContentAI */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4 text-purple-400" />
                ContentAI Hub
              </div>
              <StatusBadge status={data.contentAI.status} />
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Latencia</span>
                  <span className={`font-mono ${data.contentAI.latencyMs && data.contentAI.latencyMs < 1000 ? "text-emerald-400" : "text-amber-400"}`}>
                    {data.contentAI.latencyMs != null ? `${data.contentAI.latencyMs}ms` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Webhook URL</span>
                  <span className="text-foreground font-mono truncate max-w-[120px]" title={data.contentAI.webhookUrl}>
                    aicontentlab.co
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Arquitectura</span>
                  <span className="text-foreground">Hub-Spoke</span>
                </div>
              </div>
            </div>

            {/* Seguridad */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4 text-amber-400" />
                Seguridad
              </div>
              <StatusBadge status="operational" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>HTTPS/HSTS</span>
                  <span className="text-emerald-400">✓ Activo</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-bloqueo IP</span>
                  <span className="text-emerald-400">✓ Activo</span>
                </div>
                <div className="flex justify-between">
                  <span>HMAC Webhooks</span>
                  <span className="text-emerald-400">✓ Activo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas de transacciones (últimos 7 días) */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <h2 className="font-semibold text-foreground">Mis Transacciones — Últimos 7 días</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{data.userStats.totalLinks}</p>
                <p className="text-xs text-muted-foreground mt-1">Links totales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{data.userStats.totalTx}</p>
                <p className="text-xs text-muted-foreground mt-1">Transacciones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{data.userStats.succeededTx}</p>
                <p className="text-xs text-muted-foreground mt-1">Exitosas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{data.userStats.failedTx}</p>
                <p className="text-xs text-muted-foreground mt-1">Fallidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{formatCurrency(data.userStats.volumeMxn)}</p>
                <p className="text-xs text-muted-foreground mt-1">Volumen MXN</p>
              </div>
            </div>
            {data.userStats.totalTx > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Tasa de éxito</span>
                  <span className={`font-semibold ${data.userStats.successRate >= 90 ? "text-emerald-400" : data.userStats.successRate >= 70 ? "text-amber-400" : "text-red-400"}`}>
                    {data.userStats.successRate}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${data.userStats.successRate >= 90 ? "bg-emerald-500" : data.userStats.successRate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${data.userStats.successRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Monitor de Webhooks */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-purple-400" />
                <h2 className="font-semibold text-foreground">Monitor de Webhooks — Últimas 24h</h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  Total: <span className="text-foreground font-semibold">{data.webhooks.total}</span>
                </span>
                <span className="text-emerald-400">
                  ✓ {data.webhooks.succeeded}
                </span>
                <span className="text-red-400">
                  ✗ {data.webhooks.failed}
                </span>
                {data.webhooks.total > 0 && (
                  <Badge
                    className={`text-xs ${data.webhooks.successRate >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : data.webhooks.successRate >= 70 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}
                  >
                    {data.webhooks.successRate}% éxito
                  </Badge>
                )}
              </div>
            </div>

            {data.webhooks.recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin actividad de webhooks en las últimas 24h</p>
                <p className="text-xs mt-1">Los eventos aparecerán aquí cuando se disparen pagos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.webhooks.recent.map((wh) => (
                  <div
                    key={wh.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <WebhookStatusIcon success={wh.success} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground">{wh.event}</span>
                        {wh.statusCode && (
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${wh.statusCode < 300 ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}
                          >
                            HTTP {wh.statusCode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTime(wh.attemptedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            Última actualización: {formatTime(data.generatedAt)} ·
            Auto-refresh cada 30s
          </div>
        </>
      )}
    </div>
  );
}
