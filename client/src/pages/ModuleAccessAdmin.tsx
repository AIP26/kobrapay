import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldX, Clock, CheckCircle2, XCircle, User,
  Building2, Pill, ClipboardList, Search, Plus, Trash2,
  AlertTriangle, Lock
} from "lucide-react";

const MODULE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  prescriptions: { label: "Prescripciones Médicas", icon: ClipboardList, color: "text-blue-600" },
  pharmacy: { label: "Farmacia", icon: Pill, color: "text-green-600" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Aprobada", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-700 border-red-200" },
};

// ─── Modal Revisar Solicitud ──────────────────────────────────────────────────
function ReviewModal({
  open, onClose, request,
}: {
  open: boolean;
  onClose: () => void;
  request: any;
}) {
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");
  const approveMutation = trpc.moduleAccess.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("✅ Acceso aprobado y notificado");
      utils.moduleAccess.listRequests.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });
  const rejectMutation = trpc.moduleAccess.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud rechazada");
      utils.moduleAccess.listRequests.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  if (!request) return null;
  const moduleInfo = MODULE_LABELS[request.module] || { label: request.module, icon: ShieldCheck, color: "text-primary" };
  const ModuleIcon = moduleInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Revisar Solicitud de Acceso
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{request.userName || "Sin nombre"}</span>
              <Badge variant="outline" className="text-xs">{request.userRole}</Badge>
            </div>
            {request.userEmail && (
              <p className="text-sm text-muted-foreground">{request.userEmail}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <ModuleIcon className={`w-4 h-4 ${moduleInfo.color}`} />
              <span className="text-sm font-medium">{moduleInfo.label}</span>
            </div>
            {request.businessType && (
              <p className="text-sm"><span className="text-muted-foreground">Tipo de negocio:</span> {request.businessType}</p>
            )}
            {request.message && (
              <p className="text-sm italic text-muted-foreground">"{request.message}"</p>
            )}
            <p className="text-xs text-muted-foreground">
              Solicitado: {new Date(request.requestedAt).toLocaleString("es-MX")}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Notas de revisión (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Razón de aprobación o rechazo..."
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => rejectMutation.mutate({ requestId: request.id, notes })}
              disabled={rejectMutation.isPending || approveMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" /> Rechazar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate({ requestId: request.id, notes })}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {approveMutation.isPending ? "Aprobando..." : "Aprobar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Otorgar Acceso Directo ─────────────────────────────────────────────
function GrantDirectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [userId, setUserId] = useState("");
  const [module, setModule] = useState("prescriptions");
  const [notes, setNotes] = useState("");

  const grantMutation = trpc.moduleAccess.grantAccess.useMutation({
    onSuccess: () => {
      toast.success("Acceso otorgado correctamente");
      utils.moduleAccess.listAccess.invalidate();
      onClose();
      setUserId(""); setModule("prescriptions"); setNotes("");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Otorgar Acceso Directo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>ID del usuario</Label>
            <Input
              type="number"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Ej: 42"
            />
            <p className="text-xs text-muted-foreground">Puedes ver el ID en la lista de usuarios registrados</p>
          </div>
          <div className="space-y-1">
            <Label>Módulo</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prescriptions">Prescripciones Médicas</SelectItem>
                <SelectItem value="pharmacy">Farmacia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Razón del acceso..." />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1"
              onClick={() => grantMutation.mutate({ userId: parseInt(userId), module, notes })}
              disabled={!userId || grantMutation.isPending}
            >
              {grantMutation.isPending ? "Otorgando..." : "Otorgar Acceso"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function ModuleAccessAdminInner() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: requests = [], isLoading: loadingReqs } = trpc.moduleAccess.listRequests.useQuery();
  const { data: accesses = [], isLoading: loadingAccess } = trpc.moduleAccess.listAccess.useQuery();

  const revokeMutation = trpc.moduleAccess.revokeAccess.useMutation({
    onSuccess: () => { toast.success("Acceso revocado"); utils.moduleAccess.listAccess.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [reviewRequest, setReviewRequest] = useState<any>(null);
  const [showGrantDirect, setShowGrantDirect] = useState(false);
  const [searchAccess, setSearchAccess] = useState("");

  const pendingRequests = (requests as any[]).filter(r => r.status === "pending");
  const reviewedRequests = (requests as any[]).filter(r => r.status !== "pending");
  const filteredAccesses = (accesses as any[]).filter(a =>
    !searchAccess ||
    a.userName?.toLowerCase().includes(searchAccess.toLowerCase()) ||
    a.userEmail?.toLowerCase().includes(searchAccess.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Control de Acceso a Módulos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona quién puede acceder a Prescripciones Médicas y Farmacia
          </p>
        </div>
        <Button onClick={() => setShowGrantDirect(true)}>
          <Plus className="w-4 h-4 mr-1" /> Otorgar Acceso Directo
        </Button>
      </div>

      {/* Alertas de solicitudes pendientes */}
      {pendingRequests.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">
              {pendingRequests.length} solicitud{pendingRequests.length > 1 ? "es" : ""} pendiente{pendingRequests.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-amber-700">Revisa y aprueba o rechaza las solicitudes de acceso</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Solicitudes
            {pendingRequests.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-amber-500 text-white">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Accesos Activos
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{accesses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Historial
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Solicitudes Pendientes ─── */}
        <TabsContent value="requests" className="mt-4 space-y-3">
          {loadingReqs ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 opacity-60 mb-3" />
                <p className="text-muted-foreground">No hay solicitudes pendientes</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((req: any) => {
              const moduleInfo = MODULE_LABELS[req.module] || { label: req.module, icon: ShieldCheck, color: "text-primary" };
              const ModuleIcon = moduleInfo.icon;
              return (
                <Card key={req.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{req.userName || "Sin nombre"}</span>
                          <Badge variant="outline" className="text-xs">{req.userRole}</Badge>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_MAP.pending.color}`}>
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        </div>
                        {req.userEmail && <p className="text-sm text-muted-foreground">{req.userEmail}</p>}
                        <div className="flex items-center gap-1.5 text-sm">
                          <ModuleIcon className={`w-4 h-4 ${moduleInfo.color}`} />
                          <span className="font-medium">{moduleInfo.label}</span>
                        </div>
                        {req.businessType && (
                          <p className="text-sm text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5 inline mr-1" />
                            {req.businessType}
                          </p>
                        )}
                        {req.message && (
                          <p className="text-sm italic text-muted-foreground">"{req.message}"</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleString("es-MX")}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setReviewRequest(req)}>
                        Revisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ─── Tab: Accesos Activos ─── */}
        <TabsContent value="active" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o correo..."
              value={searchAccess}
              onChange={e => setSearchAccess(e.target.value)}
            />
          </div>

          {loadingAccess ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredAccesses.filter((a: any) => a.isActive).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-muted-foreground">No hay accesos activos</p>
                <Button className="mt-3" size="sm" onClick={() => setShowGrantDirect(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Otorgar Primer Acceso
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredAccesses.filter((a: any) => a.isActive).map((access: any) => {
                const moduleInfo = MODULE_LABELS[access.module] || { label: access.module, icon: ShieldCheck, color: "text-primary" };
                const ModuleIcon = moduleInfo.icon;
                return (
                  <Card key={access.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{access.userName || "Usuario #" + access.userId}</span>
                              <div className={`flex items-center gap-1 text-xs ${moduleInfo.color}`}>
                                <ModuleIcon className="w-3.5 h-3.5" /> {moduleInfo.label}
                              </div>
                            </div>
                            {access.userEmail && (
                              <p className="text-xs text-muted-foreground">{access.userEmail}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Desde {new Date(access.grantedAt).toLocaleDateString("es-MX")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => {
                            if (confirm(`¿Revocar acceso a ${access.userName || "este usuario"}?`)) {
                              revokeMutation.mutate({ userId: access.userId, module: access.module });
                            }
                          }}
                        >
                          <ShieldX className="w-3.5 h-3.5 mr-1" /> Revocar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Historial ─── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {reviewedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No hay solicitudes revisadas aún</p>
              </CardContent>
            </Card>
          ) : (
            reviewedRequests.map((req: any) => {
              const moduleInfo = MODULE_LABELS[req.module] || { label: req.module, icon: ShieldCheck, color: "text-primary" };
              const ModuleIcon = moduleInfo.icon;
              const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
              return (
                <Card key={req.id} className="opacity-80">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{req.userName || "Sin nombre"}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <div className={`flex items-center gap-1 text-xs ${moduleInfo.color}`}>
                            <ModuleIcon className="w-3.5 h-3.5" /> {moduleInfo.label}
                          </div>
                        </div>
                        {req.reviewNotes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">Nota: {req.reviewNotes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Revisada: {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString("es-MX") : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <ReviewModal open={!!reviewRequest} onClose={() => setReviewRequest(null)} request={reviewRequest} />
      <GrantDirectModal open={showGrantDirect} onClose={() => setShowGrantDirect(false)} />
    </div>
  );
}

export default function ModuleAccessAdmin() {
  const { loading } = useAuth();
  const { data: me, isLoading: loadingMe } = trpc.auth.me.useQuery();

  if (loading || loadingMe) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Solo superadmin o asistente pueden ver esta página
  const isSuperAdmin = (me as any)?.isSuperAdmin || me?.role === 'admin';
  const isAssistant = me?.role === 'assistant';
  if (!isSuperAdmin && !isAssistant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Lock className="w-12 h-12 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">Acceso restringido</p>
          <p className="text-sm text-muted-foreground">Solo el super-administrador puede acceder a esta sección</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ModuleAccessAdminInner />
    </DashboardLayout>
  );
}
