/**
 * ModuleAccessManager — Para el ADMIN de una empresa
 * Permite al admin gestionar qué colaboradores tienen acceso
 * a los módulos de Prescripciones y Farmacia (si el admin tiene acceso).
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldX, User, Pill, ClipboardList,
  Lock, Users, AlertTriangle, CheckCircle2
} from "lucide-react";

const MODULE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  prescriptions: { label: "Prescripciones Médicas", icon: ClipboardList, color: "text-blue-600" },
  pharmacy: { label: "Farmacia", icon: Pill, color: "text-green-600" },
};

const MODULES = ["prescriptions", "pharmacy"];

function ModuleAccessManagerInner() {
  const utils = trpc.useUtils();
  const { user } = useAuth();

  // Verificar acceso del admin a cada módulo
  const { data: accessPrescriptions } = trpc.moduleAccess.check.useQuery({ module: "prescriptions" });
  const { data: accessPharmacy } = trpc.moduleAccess.check.useQuery({ module: "pharmacy" });

  // Accesos activos (para ver quién ya tiene acceso) — usamos listAccess del superadmin
  // Para el admin, simplemente mostramos los usuarios que tienen acceso y los que puede gestionar
  const [collaborators] = useState<any[]>([]);
  const loadingCollabs = false;

  // Accesos activos (para ver quién ya tiene acceso)
  const { data: allAccesses = [] } = trpc.moduleAccess.listAccess.useQuery();

  const grantMutation = trpc.moduleAccess.grantToCollaborator.useMutation({
    onSuccess: () => { toast.success("Acceso otorgado"); utils.moduleAccess.listAccess.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });
  const revokeMutation = trpc.moduleAccess.revokeFromCollaborator.useMutation({
    onSuccess: () => { toast.success("Acceso revocado"); utils.moduleAccess.listAccess.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const adminHasAccess = {
    prescriptions: accessPrescriptions?.hasAccess ?? false,
    pharmacy: accessPharmacy?.hasAccess ?? false,
  };

  const hasAnyAccess = adminHasAccess.prescriptions || adminHasAccess.pharmacy;

  const userHasModuleAccess = (userId: number, module: string) => {
    return (allAccesses as any[]).some(a => a.userId === userId && a.module === module && a.isActive);
  };

  if (!hasAnyAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Lock className="w-12 h-12 text-muted-foreground opacity-40" />
        <h2 className="text-lg font-semibold text-foreground">Sin módulos especiales activos</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tu empresa aún no tiene acceso a los módulos de Prescripciones Médicas o Farmacia.
          Ve a cada módulo para solicitar acceso al administrador de KobraPay.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Gestión de Accesos — Módulos Especiales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controla qué colaboradores de tu empresa pueden usar los módulos especiales
        </p>
      </div>

      {/* Módulos disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULES.map(mod => {
          const info = MODULE_INFO[mod];
          const ModIcon = info.icon;
          const hasAccess = adminHasAccess[mod as keyof typeof adminHasAccess];
          return (
            <Card key={mod} className={hasAccess ? "border-primary/30" : "opacity-60"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ModIcon className={`w-4 h-4 ${info.color}`} />
                  {info.label}
                  {hasAccess ? (
                    <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs">Activo</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto text-xs">Sin acceso</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              {hasAccess && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Tu empresa tiene acceso. Puedes activarlo para tus colaboradores.
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Lista de colaboradores con toggle de acceso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Colaboradores y sus Accesos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCollabs ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (collaborators as any[]).length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 mx-auto text-muted-foreground opacity-30 mb-2" />
              <p className="text-sm text-muted-foreground">No tienes colaboradores registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(collaborators as any[]).map((collab: any) => (
                <div key={collab.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{collab.name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
                  </div>
                  {/* Accesos por módulo */}
                  <div className="flex items-center gap-2 shrink-0">
                    {MODULES.filter(m => adminHasAccess[m as keyof typeof adminHasAccess]).map(mod => {
                      const info = MODULE_INFO[mod];
                      const ModIcon = info.icon;
                      const hasIt = userHasModuleAccess(collab.id, mod);
                      return (
                        <div key={mod} className="flex items-center gap-1">
                          <ModIcon className={`w-3.5 h-3.5 ${info.color}`} />
                          {hasIt ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => revokeMutation.mutate({ collaboratorUserId: collab.id, module: mod })}
                              title={`Revocar ${info.label}`}
                            >
                              <ShieldX className="w-3.5 h-3.5 mr-1" /> Revocar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => grantMutation.mutate({ collaboratorUserId: collab.id, module: mod })}
                              title={`Dar acceso a ${info.label}`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Dar acceso
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nota informativa */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-medium">Importante</p>
          <p className="text-blue-700 mt-0.5">
            Solo puedes dar acceso a módulos que tu empresa ya tiene habilitados.
            Si necesitas activar un módulo adicional, solicítalo directamente al administrador de KobraPay.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ModuleAccessManager() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Solo admin y superadmin
  const role = (user as any)?.role;
  const isSuperAdmin = (user as any)?.isSuperAdmin;
  if (role !== "admin" && !isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Lock className="w-12 h-12 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">Solo los administradores pueden gestionar accesos</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ModuleAccessManagerInner />
    </DashboardLayout>
  );
}
