import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";

import {
  Eye,
  Search,
  Users,
  Building2,
  Mail,
  Shield,
  AlertTriangle,
  LogIn,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

function getRoleBadge(role: string) {
  switch (role) {
    case "admin": return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Admin</Badge>;
    case "superadmin": return <Badge className="bg-purple-100 text-purple-700 border-purple-200">SuperAdmin</Badge>;
    case "associate": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Asociado</Badge>;
    case "assistant": return <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">Asistente</Badge>;
    default: return <Badge className="bg-gray-100 text-muted-foreground border-gray-200">Usuario</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Activo</span>;
    case "pending": return <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="w-3 h-3" /> Pendiente</span>;
    case "blocked": return <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3 h-3" /> Bloqueado</span>;
    default: return <span className="text-xs text-muted-foreground">{status}</span>;
  }
}

export default function ImpersonateClient() {
  const { data: me } = trpc.auth.me.useQuery();
  const [search, setSearch] = useState("");
  const [impersonating, setImpersonating] = useState<number | null>(null);

  const { data: users, isLoading } = trpc.impersonate.listUsers.useQuery();
  const utils = trpc.useUtils();

  const startSession = trpc.impersonate.startSession.useMutation({
    onSuccess: (data) => {
      toast.success(`Ahora estás viendo la plataforma como ${data.targetUser.name || data.targetUser.email}`);
      setImpersonating(null);
      // Invalidar caché y redirigir al dashboard
      utils.auth.me.invalidate();
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    },
    onError: (err) => {
      toast.error(err.message || "Error al iniciar sesión como cliente");
      setImpersonating(null);
    },
  });

  const handleImpersonate = (userId: number, userName: string) => {
    if (!confirm(`¿Quieres ver la plataforma como "${userName}"?\n\nTendrás acceso completo a su cuenta por hasta 4 horas. Aparecerá una barra de aviso en la parte superior.`)) return;
    setImpersonating(userId);
    startSession.mutate({ userId });
  };

  const filtered = (users || []).filter((u) =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  // Solo superadmin puede acceder
  if (me && !me.isSuperAdmin && me?.role !== 'superadmin') {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Acceso restringido</h2>
          <p className="text-muted-foreground max-w-sm">Esta sección es exclusiva para el SuperAdministrador de la plataforma.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ver como Cliente">
      <div className="space-y-5">
        {/* Header informativo */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Vista de Cliente (Impersonación)</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona un usuario para ver la plataforma exactamente como él la ve. Tendrás acceso completo a su cuenta por <strong>máximo 4 horas</strong>. Aparecerá una barra de aviso en la parte superior para recordarte que estás en modo impersonación.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-700">Cualquier acción que realices afectará la cuenta real del cliente.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o negocio..."
            className="pl-9 border-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Lista de usuarios */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Usuarios de la plataforma
              {users && (
                <span className="text-sm font-normal text-muted-foreground">({filtered.length} de {users.length})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-gray-50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 animate-pulse rounded w-40" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-56" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">{search ? "Sin resultados" : "No hay otros usuarios registrados"}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      {(u.name || u.email || "?")[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{u.name || "Sin nombre"}</p>
                        {getRoleBadge(u.role)}
                        {getStatusBadge(u.accountStatus)}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {u.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" /> {u.email}
                          </span>
                        )}
                        {u.businessName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" /> {u.businessName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">ID: {u.id}</span>
                      </div>
                    </div>

                    {/* Botón impersonar */}
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-500 text-foreground flex-shrink-0 gap-1.5"
                      onClick={() => handleImpersonate(u.id, u.name || u.email || `Usuario #${u.id}`)}
                      disabled={impersonating === u.id || startSession.isPending}
                    >
                      {impersonating === u.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5" />
                          Ver como este usuario
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
