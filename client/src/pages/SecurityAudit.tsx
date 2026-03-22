import { useState } from "react";
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  DollarSign,
  Link2,
  CreditCard,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Globe,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Settings,
  Save,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { toast } from "sonner";

function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatTime(val: any) {
  const d = val instanceof Date ? val : new Date(val);
  return d.toLocaleString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-green-100 text-green-700",
  PUT: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-purple-100 text-purple-700",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  brute_force: "Fuerza bruta",
  sensitive_file_access: "Archivo sensible",
  ip_blocked: "IP bloqueada",
  invalid_api_key: "API key inválida",
  webhook_attack: "Ataque webhook",
  rate_limit_exceeded: "Rate limit",
  ip_not_allowed: "IP no autorizada",
  suspicious_request: "Solicitud sospechosa",
};

export default function SecurityAudit() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: isSuperAdmin } = trpc.security.checkSuperAdmin.useQuery();
  const isSA = !!isSuperAdmin?.isSuperAdmin;

  const { data: stats } = trpc.security.getPlatformStats.useQuery(undefined, { enabled: isSA });
  const { data: auditLogs } = trpc.security.getAuditLogs.useQuery({ limit: 50, severity: "all" }, { enabled: isSA });
  const { data: secStats } = trpc.security.getSecurityStats.useQuery(undefined, { enabled: isSA });
  const { data: allUsers } = trpc.security.getAllUsers.useQuery({ limit: 50 }, { enabled: isSA });
  const { data: securityAlerts, refetch: refetchAlerts } = trpc.security.getSecurityAlerts.useQuery({ limit: 50 }, { enabled: isSA });
  const { data: unreadCount } = trpc.security.getUnreadAlertCount.useQuery(undefined, { enabled: isSA });

  // IP Allowlist (available to all authenticated users)
  const { data: ipAllowlist, refetch: refetchIpList } = trpc.security.getIpAllowlist.useQuery();
  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");

  const setUserActive = trpc.security.setUserActive.useMutation({
    onSuccess: () => utils.security.getAllUsers.invalidate(),
  });

  const markRead = trpc.security.markAlertsRead.useMutation({
    onSuccess: () => {
      utils.security.getSecurityAlerts.invalidate();
      utils.security.getUnreadAlertCount.invalidate();
    },
  });

  const addIp = trpc.security.addIpToAllowlist.useMutation({
    onSuccess: () => {
      refetchIpList();
      setNewIp("");
      setNewIpLabel("");
      toast.success(`IP ${newIp} añadida a la allowlist.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeIp = trpc.security.removeIpFromAllowlist.useMutation({
    onSuccess: () => {
      refetchIpList();
      toast.success("IP removida de la allowlist.");
    },
  });

  if (!isSA) {
    return (
      <DashboardLayout title="Seguridad">
        {/* IP Allowlist — visible para todos los usuarios autenticados */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">IPs Autorizadas para tu API</h1>
              <p className="text-sm text-muted-foreground">Restringe qué IPs pueden usar tus API keys (ContentAI, BrokerHub, etc.)</p>
            </div>
          </div>
          <IpAllowlistSection
            ipAllowlist={ipAllowlist ?? []}
            newIp={newIp}
            setNewIp={setNewIp}
            newIpLabel={newIpLabel}
            setNewIpLabel={setNewIpLabel}
            onAdd={() => addIp.mutate({ ipCidr: newIp, label: newIpLabel || undefined })}
            onRemove={(id) => removeIp.mutate({ id })}
            isAdding={addIp.isPending}
          />
          <div className="p-6 flex flex-col items-center justify-center min-h-[30vh] text-center">
            <Lock className="w-10 h-10 text-red-400 mb-3" />
            <h2 className="text-lg font-bold text-foreground mb-1">Acceso Restringido</h2>
            <p className="text-sm text-muted-foreground max-w-sm">El panel de auditoría completo es exclusivo del superadmin de KobraPay.</p>
            <Link href="/dashboard" className="mt-4 text-sm text-emerald-600 hover:underline">← Volver al panel</Link>
          </div>
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
            <h1 className="text-2xl font-bold text-foreground">Centro de Seguridad</h1>
            <p className="text-sm text-muted-foreground">Panel exclusivo del superadmin — acceso total a la plataforma</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {(unreadCount?.count ?? 0) > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {unreadCount?.count} alertas nuevas
              </Badge>
            )}
            <Badge className="bg-emerald-500 text-white">Superadmin</Badge>
          </div>
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
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Security Stats 24h */}
        {secStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Peticiones (24h)", value: secStats.total, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Advertencias (24h)", value: secStats.warnings, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Alertas críticas", value: secStats.critical, icon: ShieldAlert, color: secStats.critical > 0 ? "text-red-600" : "text-muted-foreground", bg: secStats.critical > 0 ? "bg-red-50" : "bg-gray-50" },
              { label: "IPs sospechosas", value: secStats.blockedIps, icon: Shield, color: secStats.blockedIps > 0 ? "text-red-600" : "text-emerald-600", bg: secStats.blockedIps > 0 ? "bg-red-50" : "bg-emerald-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
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
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Estado de Seguridad — Producción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "HTTPS Forzado (HSTS)", desc: "Todas las comunicaciones cifradas con TLS" },
                { label: "Helmet.js (Headers HTTP)", desc: "CSP, X-Frame-Options, nosniff activos" },
                { label: "Rate Limiting", desc: "200 req/min general · 10 req/15min auth" },
                { label: "IP Allowlist por API Key", desc: "Solo IPs autorizadas pueden usar cada key" },
                { label: "Alertas Automáticas al Owner", desc: "Notificación inmediata ante ataques" },
                { label: "Bloqueo de Archivos Sensibles", desc: ".env, backups, credenciales → 404" },
                { label: "Validación HMAC Webhooks", desc: "Firma verificada en webhooks entrantes" },
                { label: "Aislamiento Multi-Tenant", desc: "Cada cliente solo ve sus propios datos" },
                { label: "Auditoría de Accesos", desc: "Log completo de todas las peticiones API" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-500" />
                Alertas de Seguridad
                {(unreadCount?.count ?? 0) > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">{unreadCount?.count} nuevas</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAlerts()}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Actualizar
                </Button>
                {(unreadCount?.count ?? 0) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unread = securityAlerts?.filter(a => !a.isRead).map(a => a.id) ?? [];
                      if (unread.length) markRead.mutate({ ids: unread });
                    }}
                    className="h-7 text-xs"
                  >
                    <BellOff className="w-3 h-3 mr-1" />
                    Marcar leídas
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {securityAlerts && securityAlerts.length > 0 ? (
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Hora</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Tipo</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Severidad</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">IP</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {securityAlerts.map((alert) => (
                      <tr
                        key={alert.id}
                        className={`hover:bg-gray-50 ${!alert.isRead ? "bg-red-50/30" : ""}`}
                      >
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(alert.createdAt)}
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-xs font-medium text-foreground">
                            {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[alert.severity] ?? "bg-gray-100 text-gray-700"}`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs font-mono text-muted-foreground">
                          {alert.ip ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                          {alert.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Sin alertas de seguridad — todo en orden
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Blocked IPs */}
        <BlockedIpsSection />

        {/* IP Allowlist */}
        <IpAllowlistSection
          ipAllowlist={ipAllowlist ?? []}
          newIp={newIp}
          setNewIp={setNewIp}
          newIpLabel={newIpLabel}
          setNewIpLabel={setNewIpLabel}
          onAdd={() => addIp.mutate({ ipCidr: newIp, label: newIpLabel || undefined })}
          onRemove={(id) => removeIp.mutate({ id })}
          isAdding={addIp.isPending}
        />

        {/* Security Config Panel */}
        <SecurityConfigPanel />

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
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Usuario</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Rol</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-2 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allUsers?.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{u.name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u.email}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                            u.role === "admin" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-muted-foreground"
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
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Hora</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Método</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Ruta</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-2 py-2">Código</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditLogs.map((log, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${log.statusCode && log.statusCode >= 400 ? "bg-red-50/30" : ""}`}>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{formatTime((log as any).createdAt)}</td>
                          <td className="px-2 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${METHOD_COLORS[log.action] || "bg-gray-100 text-muted-foreground"}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-muted-foreground font-mono truncate max-w-[140px]">{log.resource}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs font-mono font-medium ${
                              !log.statusCode ? "text-muted-foreground" :
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
                  <div className="p-8 text-center text-muted-foreground text-sm">
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

// ─── Blocked IPs Section Component ──────────────────────────────────────────
function BlockedIpsSection() {
  const utils = trpc.useUtils();
  const { data: isSuperAdmin } = trpc.security.checkSuperAdmin.useQuery();
  const isSA = !!isSuperAdmin?.isSuperAdmin;

  const { data: blockedIps, refetch } = trpc.security.getBlockedIps.useQuery(
    { limit: 50 },
    { enabled: isSA }
  );

  const unblockMutation = trpc.security.unblockIp.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("IP desbloqueada correctamente.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isSA) return null;

  const active = (blockedIps ?? []).filter((b: any) => b.isActive === 1);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            IPs Bloqueadas Automáticamente
            {active.length > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{active.length} activas</Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Actualizar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          IPs bloqueadas automáticamente tras 5+ intentos no autorizados en 1 hora. Bloqueo de 24 horas.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-64 overflow-y-auto">
          {active.length > 0 ? (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">IP</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Motivo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Intentos</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Bloqueada</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Expira</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground px-2 py-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {active.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 bg-red-50/20">
                    <td className="px-4 py-2.5 text-sm font-mono font-medium text-foreground">{b.ip}</td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground truncate max-w-[180px]">{b.reason}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-xs font-bold text-red-600">{b.alertCount}</span>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {formatTime(b.blockedAt)}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {b.expiresAt ? formatTime(b.expiresAt) : "Permanente"}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unblockMutation.mutate({ id: b.id })}
                        className="h-7 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        Desbloquear
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm bg-gray-50 rounded-xl m-4">
              <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
              Sin IPs bloqueadas — el sistema está limpio.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── IP Allowlist Section Component ──────────────────────────────────────────
function IpAllowlistSection({
  ipAllowlist,
  newIp,
  setNewIp,
  newIpLabel,
  setNewIpLabel,
  onAdd,
  onRemove,
  isAdding,
}: {
  ipAllowlist: any[];
  newIp: string;
  setNewIp: (v: string) => void;
  newIpLabel: string;
  setNewIpLabel: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  isAdding: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          IPs Autorizadas para API Keys
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Si agregas IPs aquí, solo esas IPs podrán usar tus API keys (ContentAI, BrokerHub, etc.).
          Sin entradas = cualquier IP puede usar tus keys.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add IP form */}
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="IP o CIDR (ej: 203.0.113.5 o 203.0.113.0/24)"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="flex-1 min-w-[200px] h-9 text-sm"
          />
          <Input
            placeholder="Etiqueta (ej: ContentAI)"
            value={newIpLabel}
            onChange={(e) => setNewIpLabel(e.target.value)}
            className="w-40 h-9 text-sm"
          />
          <Button
            size="sm"
            onClick={onAdd}
            disabled={!newIp || isAdding}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* IP list */}
        {ipAllowlist.length > 0 ? (
          <div className="space-y-2">
            {ipAllowlist.map((entry: any) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium text-foreground">{entry.ipCidr}</p>
                    {entry.label && (
                      <p className="text-xs text-muted-foreground">{entry.label}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatTime(entry.createdAt)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(entry.id)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm bg-gray-50 rounded-xl">
            <Globe className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            Sin restricciones de IP — cualquier IP puede usar tus API keys.
            <br />
            <span className="text-xs">Agrega IPs para restringir el acceso a ContentAI y BrokerHub.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Security Config Panel ────────────────────────────────────────────────────────────────────
const CONFIG_LABELS: Record<string, { label: string; hint: string; type: "number" | "boolean" }> = {
  auto_block_threshold: { label: "Intentos antes de bloquear", hint: "Número de intentos fallidos en la ventana de tiempo antes de bloquear la IP automáticamente.", type: "number" },
  auto_block_duration_hours: { label: "Duración del bloqueo (horas)", hint: "Cuántas horas permanece bloqueada la IP tras el bloqueo automático.", type: "number" },
  auto_block_window_minutes: { label: "Ventana de tiempo (minutos)", hint: "Ventana de tiempo en minutos para contar intentos fallidos.", type: "number" },
  alert_throttle_minutes: { label: "Throttle de alertas (minutos)", hint: "Minutos entre alertas del mismo tipo/IP para evitar spam de notificaciones.", type: "number" },
  ip_allowlist_enabled: { label: "IP Allowlist activa", hint: "Activar o desactivar la verificación de IP Allowlist globalmente (true/false).", type: "boolean" },
};

function SecurityConfigPanel() {
  const { data: isSuperAdmin } = trpc.security.checkSuperAdmin.useQuery();
  const isSA = !!isSuperAdmin?.isSuperAdmin;

  const { data: configs, refetch } = trpc.security.getSecurityConfig.useQuery(
    undefined,
    { enabled: isSA }
  );

  const [editValues, setEditValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<string | null>(null);

  const updateMutation = trpc.security.updateSecurityConfig.useMutation({
    onSuccess: () => {
      refetch();
      setSaving(null);
      toast.success("Parámetro actualizado correctamente.");
    },
    onError: (err) => {
      setSaving(null);
      toast.error(err.message);
    },
  });

  if (!isSA) return null;

  const handleSave = (key: string) => {
    const value = editValues[key] ?? (configs?.find((c: any) => c.key === key)?.value ?? "");
    setSaving(key);
    updateMutation.mutate({ key: key as any, value });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          Configuración Dinámica de Seguridad
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Ajusta los parámetros del sistema de auto-bloqueo y alertas sin tocar el código. Los cambios aplican en menos de 1 minuto.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(configs ?? []).map((cfg: any) => {
          const meta = CONFIG_LABELS[cfg.key];
          if (!meta) return null;
          const currentVal = editValues[cfg.key] ?? cfg.value;
          return (
            <div key={cfg.key} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <Badge variant="outline" className="text-xs font-mono">{cfg.key}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{meta.hint}</p>
                <Input
                  type={meta.type === "number" ? "number" : "text"}
                  value={currentVal}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                  className="h-8 text-sm w-32 font-mono"
                  min={meta.type === "number" ? 1 : undefined}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave(cfg.key)}
                disabled={saving === cfg.key}
                className="h-8 mt-6 text-xs"
              >
                {saving === cfg.key ? (
                  <span className="animate-spin mr-1">&#8635;</span>
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          );
        })}
        {(!configs || configs.length === 0) && (
          <div className="text-center text-muted-foreground text-sm py-4">
            Cargando configuración...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
