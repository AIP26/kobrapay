import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { ShieldCheck, Clock, CheckCircle, XCircle, Users, Settings, ClipboardList, Star, Handshake, ChevronDown, ChevronUp } from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  prescriptions: "Prescripciones Médicas",
  pharmacy: "Farmacia",
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  farmacia: "Farmacia",
  clinica_medica: "Clínica Médica",
  consultorio_medico: "Consultorio Médico",
  hospital: "Hospital",
  consultorio_dental: "Dentista / Consultorio Dental",
  medicina_estetica: "Medicina Estética",
  spa: "Spa / Centro de Bienestar",
  nutricion: "Nutrición / Dietética",
  psicologia: "Psicología / Salud Mental",
  fisioterapia: "Fisioterapia / Rehabilitación",
  veterinaria: "Veterinaria",
  laboratorio: "Laboratorio Clínico",
  optometria: "Optometría",
  quiropraxia: "Quiropráctica",
  otro: "Otro",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  assistant_approved: { label: "Pre-aprobado", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Aprobado", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
};

function AssistantPanelInner() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "surveys" | "users" | "associates">("requests");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<{ id: number; action: "approve" | "reject" } | null>(null);

  const isAssistant = user?.role === "assistant";
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";

  if (!isAssistant && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-muted-foreground">Acceso Restringido</h2>
        <p className="text-muted-foreground text-sm">Solo el asistente o el superadmin pueden acceder a este panel.</p>
      </div>
    );
  }

  const { data: requests = [], refetch, isLoading } = trpc.moduleAccess.listPendingForAssistant.useQuery();
  const { data: allUsers = [], isLoading: loadingUsers } = trpc.moduleAccess.listAllUsers.useQuery(undefined, { enabled: isSuperAdmin });
  // Encuestas de onboarding
  const { data: surveys = [], refetch: refetchSurveys, isLoading: loadingSurveys } = trpc.onboarding.listSurveys.useQuery(undefined);
  const [selectedSurvey, setSelectedSurvey] = useState<number | null>(null);
  const [surveyNotes, setSurveyNotes] = useState("");
  const [surveyAction, setSurveyAction] = useState<"approve" | "reject" | null>(null);
  const [finalPlan, setFinalPlan] = useState("express");
  const [finalCommission, setFinalCommission] = useState(3.5);
  const assistantReview = trpc.onboarding.assistantReview.useMutation({
    onSuccess: () => { toast.success("Encuesta revisada"); refetchSurveys(); setSelectedSurvey(null); setSurveyNotes(""); setSurveyAction(null); },
    onError: (e) => toast.error(e.message),
  });
  const adminApprove = trpc.onboarding.adminApprove.useMutation({
    onSuccess: () => { toast.success("Plan asignado y cuenta activada"); refetchSurveys(); setSelectedSurvey(null); setSurveyNotes(""); setSurveyAction(null); },
    onError: (e) => toast.error(e.message),
  });
  // Asociados
  const { data: allAssociates = [], refetch: refetchAssociates, isLoading: loadingAssociates } = trpc.associate.listAllAssociates.useQuery(undefined, { enabled: !!isSuperAdmin });
  // Clientes pendientes para el asistente (flujo de dos pasos)
  const { data: pendingForAssistant = [], refetch: refetchPendingAssistant, isLoading: loadingPendingAssistant } = trpc.associate.listPendingForAssistant.useQuery(undefined, { enabled: isAssistant || !!isSuperAdmin });
  const assistantPreApproveClient = trpc.associate.assistantPreApprove.useMutation({
    onSuccess: () => { toast.success("✅ Cliente pre-aprobado — el superadmin recibirá notificación para aprobación final"); refetchPendingAssistant(); refetchAssociates(); setSelectedAssociateClient(null); },
    onError: (e) => toast.error(e.message),
  });
  const assistantRejectClient = trpc.associate.assistantReject.useMutation({
    onSuccess: () => { toast.success("Cliente rechazado"); refetchPendingAssistant(); refetchAssociates(); setSelectedAssociateClient(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateClientStatus = trpc.associate.updateClientStatus.useMutation({
    onSuccess: () => { toast.success("Estado del cliente actualizado"); refetchAssociates(); refetchPendingAssistant(); setSelectedAssociateClient(null); },
    onError: () => toast.error("Error al actualizar el estado"),
  });
  const [selectedAssociateClient, setSelectedAssociateClient] = useState<{ id: number; name: string; currentStatus?: string; associateName?: string } | null>(null);
  const [associateClientPlan, setAssociateClientPlan] = useState("express");
  const [associateClientCommission, setAssociateClientCommission] = useState(1.5);
  const [associateClientNotes, setAssociateClientNotes] = useState("");
  const [expandedAssociate, setExpandedAssociate] = useState<number | null>(null);
  const pendingAssistantClients = (pendingForAssistant as any[]).filter(c => c.status === 'pending');
  const preApprovedClients = (pendingForAssistant as any[]).filter(c => c.status === 'assistant_approved');

  const pendingSurveys = (surveys as any[]).filter((s) => s.survey?.status === "pending_review" || s.survey?.status === "pending");
  const reviewedSurveys = (surveys as any[]).filter((s) => s.survey?.status === "assistant_approved" || s.survey?.status === "pending_info");
  const doneSurveys = (surveys as any[]).filter((s) => s.survey?.status === "approved" || s.survey?.status === "rejected");

  const preApprove = trpc.moduleAccess.assistantPreApprove.useMutation({
    onSuccess: () => { toast.success("Solicitud pre-aprobada — pasará a revisión del superadmin"); refetch(); setShowNotesFor(null); setNotes(""); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.moduleAccess.assistantReject.useMutation({
    onSuccess: () => { toast.success("Solicitud rechazada"); refetch(); setShowNotesFor(null); setNotes(""); },
    onError: (e) => toast.error(e.message),
  });
  const setAssistant = trpc.moduleAccess.setAssistantRole.useMutation({
    onSuccess: () => { toast.success("Rol de asistente asignado"); },
    onError: (e) => toast.error(e.message),
  });
  const setAssociate = trpc.moduleAccess.setAssociateRole.useMutation({
    onSuccess: () => { toast.success("Rol de Asociado asignado"); },
    onError: (e) => toast.error(e.message),
  });

  const pending = requests.filter(r => r.status === "pending");
  const preApproved = requests.filter(r => r.status === "assistant_approved");
  const processed = requests.filter(r => r.status === "approved" || r.status === "rejected");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Asistente</h1>
          <p className="text-sm text-muted-foreground">Gestiona solicitudes de acceso y usuarios de la plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{pending.length}</p>
          <p className="text-xs text-yellow-600 mt-1">Pendientes de revisión</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{preApproved.length}</p>
          <p className="text-xs text-blue-600 mt-1">Pre-aprobados (en espera del superadmin)</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{processed.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Procesados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 flex-wrap">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "requests" ? "border-purple-600 text-purple-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Settings className="w-4 h-4 inline mr-1" />
          Solicitudes de Módulos
        </button>
        <button
          onClick={() => setActiveTab("surveys")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1 ${activeTab === "surveys" ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <ClipboardList className="w-4 h-4" />
          Encuestas de Clientes
          {pendingSurveys.length > 0 && (
            <span className="ml-1 bg-red-500 text-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingSurveys.length}</span>
          )}
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "users" ? "border-purple-600 text-purple-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Gestión de Usuarios
          </button>
        )}
        <button
          onClick={() => setActiveTab("associates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1 ${activeTab === "associates" ? "border-amber-600 text-amber-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Handshake className="w-4 h-4" />
          Clientes de Asociados
          {pendingAssistantClients.length > 0 && (
            <span className="ml-1 bg-amber-500 text-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingAssistantClients.length}</span>
          )}
        </button>
      </div>

      {/* Tab: Solicitudes */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay solicitudes pendientes</p>
            </div>
          ) : (
            <>
              {/* Pendientes */}
              {pending.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Pendientes de tu revisión ({pending.length})
                  </h3>
                  <div className="space-y-3">
                    {pending.map(req => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        showNotesFor={showNotesFor}
                        notes={notes}
                        setNotes={setNotes}
                        setShowNotesFor={setShowNotesFor}
                        onPreApprove={(id, n) => preApprove.mutate({ requestId: id, notes: n })}
                        onReject={(id, n) => reject.mutate({ requestId: id, notes: n })}
                        loading={preApprove.isPending || reject.isPending}
                        isAssistantView
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pre-aprobados */}
              {preApproved.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Pre-aprobados — esperando visto bueno del superadmin ({preApproved.length})
                  </h3>
                  <div className="space-y-3">
                    {preApproved.map(req => (
                      <RequestCard key={req.id} req={req} readonly />
                    ))}
                  </div>
                </div>
              )}

              {/* Procesados */}
              {processed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Historial procesados ({processed.length})</h3>
                  <div className="space-y-3">
                    {processed.map(req => (
                      <RequestCard key={req.id} req={req} readonly />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Usuarios */}
      {activeTab === "users" && isSuperAdmin && (
        <div>
          {loadingUsers ? (
            <div className="text-center py-10 text-muted-foreground">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol actual</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-foreground">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "admin" ? "bg-blue-100 text-blue-700" :
                          u.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                          u.role === "assistant" ? "bg-green-100 text-green-700" :
                          u.role === "associate" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-muted-foreground"
                        }`}>
                          {u.role === "admin" ? "Administrador" :
                           u.role === "superadmin" ? "SuperAdmin" :
                           u.role === "assistant" ? "Asistente" :
                           u.role === "associate" ? "Asociado" : "Usuario"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {u.role !== "superadmin" && u.role !== "assistant" && u.role !== "associate" && (
                            <Button size="sm" variant="outline" onClick={() => { if (confirm(`¿Asignar rol de Asistente a ${u.name || u.email}?`)) { setAssistant.mutate({ userId: u.id }); } }} className="text-xs">
                              Hacer Asistente
                            </Button>
                          )}
                          {u.role !== "superadmin" && u.role !== "assistant" && u.role !== "associate" && (
                            <Button size="sm" variant="outline" onClick={() => { if (confirm(`¿Asignar rol de Asociado a ${u.name || u.email}?`)) { setAssociate.mutate({ userId: u.id }); } }} className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50">
                              Hacer Asociado
                            </Button>
                          )}
                          {u.role === "assistant" && <span className="text-xs text-green-600 font-medium">✓ Es asistente</span>}
                          {u.role === "associate" && <span className="text-xs text-amber-600 font-medium">✓ Es asociado</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Clientes de Asociados */}
      {activeTab === "associates" && (
        <div className="space-y-6">
          {/* Sección para el Asistente: pre-aprobar clientes pendientes */}
          <div>
            <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendientes de tu revisión ({pendingAssistantClients.length})
              <span className="text-xs font-normal text-muted-foreground ml-1">— Pre-aprueba para enviar al superadmin</span>
            </h3>
            {loadingPendingAssistant ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Cargando...</div>
            ) : pendingAssistantClients.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm bg-gray-50 rounded-xl">
                <Handshake className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No hay clientes pendientes de revisión
              </div>
            ) : (
              <div className="space-y-2">
                {pendingAssistantClients.map((c: any) => (
                  <div key={c.id} className="bg-white border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{c.clientName}</p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-xs text-muted-foreground">{c.clientEmail}</p>
                        {c.clientBusinessName && <span className="text-xs bg-gray-100 text-muted-foreground px-2 py-0.5 rounded-full">{c.clientBusinessName}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-amber-700 font-medium">Asociado: {c.associateName}</span>
                        {c.assignedPlan && <span className="text-xs text-emerald-600">Plan sugerido: {c.assignedPlan}</span>}
                        {c.notes && <span className="text-xs text-muted-foreground italic">{c.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-foreground text-xs h-7"
                        onClick={() => { setSelectedAssociateClient({ id: c.id, name: c.clientName, currentStatus: 'pending', associateName: c.associateName }); setAssociateClientPlan(c.assignedPlan || 'express'); setAssociateClientCommission(1.5); setAssociateClientNotes(""); }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Pre-aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
                        onClick={() => { if (confirm(`¿Rechazar al cliente ${c.clientName}?`)) assistantRejectClient.mutate({ clientId: c.id }); }}>
                        <XCircle className="w-3 h-3 mr-1" /> Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección: Pre-aprobados esperando aprobación final del superadmin */}
          {preApprovedClients.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Pre-aprobados — esperando aprobación del superadmin ({preApprovedClients.length})
              </h3>
              <div className="space-y-2">
                {preApprovedClients.map((c: any) => (
                  <div key={c.id} className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{c.clientName}</p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-xs text-muted-foreground">{c.clientEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-amber-700 font-medium">Asociado: {c.associateName}</span>
                        {c.assignedPlan && <span className="text-xs text-emerald-600">Plan: {c.assignedPlan}</span>}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex-shrink-0">⏳ Esperando superadmin</span>
                    {isSuperAdmin && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-foreground text-xs h-7 flex-shrink-0"
                        onClick={() => { setSelectedAssociateClient({ id: c.id, name: c.clientName, currentStatus: 'assistant_approved', associateName: c.associateName }); setAssociateClientPlan(c.assignedPlan || 'express'); setAssociateClientCommission(1.5); setAssociateClientNotes(""); }}>
                        Aprobar definitivamente
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista expandida de todos los asociados (solo superadmin) */}
          {isSuperAdmin && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Todos los asociados y sus clientes
              </h3>
              {loadingAssociates ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Cargando asociados...</div>
              ) : (allAssociates as any[]).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm bg-gray-50 rounded-xl">
                  <p>No hay asociados registrados aún</p>
                  <p className="text-xs mt-1">Asigna el rol de Asociado desde la pestaña Gestión de Usuarios</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(allAssociates as any[]).map((item: any) => {
                    const assoc = item.associate;
                    const clients = item.clients || [];
                    const pendingCount = clients.filter((c: any) => c.status === 'pending').length;
                    const preApprovedCount = clients.filter((c: any) => c.status === 'assistant_approved').length;
                    const activeCount = clients.filter((c: any) => c.status === 'active').length;
                    const isExpanded = expandedAssociate === assoc.id;
                    return (
                      <div key={assoc.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors" onClick={() => setExpandedAssociate(isExpanded ? null : assoc.id)}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">{(assoc.name || 'A').charAt(0).toUpperCase()}</div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground text-sm">{assoc.name || 'Sin nombre'}</p>
                              <p className="text-xs text-muted-foreground">{assoc.email}</p>
                            </div>
                            <div className="flex gap-2 ml-2">
                              {pendingCount > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>}
                              {preApprovedCount > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{preApprovedCount} pre-aprobado{preApprovedCount > 1 ? 's' : ''}</span>}
                              {activeCount > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{activeCount} activo{activeCount > 1 ? 's' : ''}</span>}
                              <span className="px-2 py-0.5 bg-gray-100 text-muted-foreground rounded-full text-xs">{clients.length} total</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-emerald-700">${item.totalEarned.toFixed(2)} MXN</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-5 py-4">
                            {clients.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">Este asociado aún no ha registrado clientes</p>
                            ) : (
                              <div className="space-y-2">
                                {clients.map((c: any) => (
                                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">{c.clientName}</p>
                                      <p className="text-xs text-muted-foreground">{c.clientEmail}{c.clientBusinessName ? ` · ${c.clientBusinessName}` : ''}</p>
                                      {c.assignedPlan && <span className="text-xs text-emerald-600 font-medium">Plan: {c.assignedPlan}</span>}
                                      {c.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate max-w-xs">{c.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        c.status === 'active' ? 'bg-green-100 text-green-700' :
                                        c.status === 'assistant_approved' ? 'bg-blue-100 text-blue-700' :
                                        c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        c.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-muted-foreground'
                                      }`}>
                                        {c.status === 'active' ? 'Activo' : c.status === 'assistant_approved' ? 'Pre-aprobado' : c.status === 'pending' ? 'Pendiente' : c.status === 'rejected' ? 'Rechazado' : 'Inactivo'}
                                      </span>
                                      {c.status === 'assistant_approved' && (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-foreground text-xs h-7"
                                          onClick={() => { setSelectedAssociateClient({ id: c.id, name: c.clientName, currentStatus: 'assistant_approved', associateName: assoc.name || assoc.email }); setAssociateClientPlan(c.assignedPlan || 'express'); setAssociateClientCommission(parseFloat(String(c.commissionRate)) || 1.5); setAssociateClientNotes(""); }}>
                                          Aprobar definitivamente
                                        </Button>
                                      )}
                                      {c.status === 'pending' && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-foreground text-xs h-7"
                                          onClick={() => { setSelectedAssociateClient({ id: c.id, name: c.clientName, currentStatus: 'pending', associateName: assoc.name || assoc.email }); setAssociateClientPlan(c.assignedPlan || 'express'); setAssociateClientCommission(1.5); setAssociateClientNotes(""); }}>
                                          Pre-aprobar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Modal de revisión de cliente del asociado (flujo de dos pasos) */}
      {selectedAssociateClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">
              {selectedAssociateClient.currentStatus === 'assistant_approved' && isSuperAdmin
                ? '✅ Aprobación final del cliente'
                : '⏳ Pre-aprobar cliente (Paso 1 de 2)'}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">{selectedAssociateClient.name}</p>
            {selectedAssociateClient.associateName && (
              <p className="text-xs text-amber-600 mb-4">Asociado: {selectedAssociateClient.associateName}</p>
            )}
            {selectedAssociateClient.currentStatus === 'assistant_approved' && isSuperAdmin ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700">Este cliente fue pre-aprobado por el asistente. Tú das la aprobación final para activar la cuenta.</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">Al pre-aprobar, el superadmin recibirá una notificación para dar la aprobación final.</p>
              </div>
            )}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Plan a asignar</label>
                <select value={associateClientPlan} onChange={e => setAssociateClientPlan(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="express">Express - Básico</option>
                  <option value="connect">Connect - Estándar</option>
                  <option value="custom">Custom - Avanzado</option>
                  <option value="enterprise">Enterprise - Corporativo</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Comisión del asociado (%)</label>
                <input type="number" step="0.1" min="0" max="5" value={associateClientCommission} onChange={e => setAssociateClientCommission(parseFloat(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Notas (opcional)</label>
                <textarea value={associateClientNotes} onChange={e => setAssociateClientNotes(e.target.value)} placeholder="Notas internas..." className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3">
              {selectedAssociateClient.currentStatus === 'assistant_approved' && isSuperAdmin ? (
                <>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-foreground" onClick={() => updateClientStatus.mutate({ clientId: selectedAssociateClient.id, status: 'active', assignedPlan: associateClientPlan as any, commissionRate: associateClientCommission, notes: associateClientNotes || undefined })} disabled={updateClientStatus.isPending}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Activar cliente
                  </Button>
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateClientStatus.mutate({ clientId: selectedAssociateClient.id, status: 'rejected', notes: associateClientNotes || undefined })} disabled={updateClientStatus.isPending}>
                    <XCircle className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-foreground" onClick={() => assistantPreApproveClient.mutate({ clientId: selectedAssociateClient.id, assignedPlan: associateClientPlan as any, commissionRate: associateClientCommission, notes: associateClientNotes || undefined })} disabled={assistantPreApproveClient.isPending}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Pre-aprobar
                  </Button>
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => assistantRejectClient.mutate({ clientId: selectedAssociateClient.id, notes: associateClientNotes || undefined })} disabled={assistantRejectClient.isPending}>
                    <XCircle className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => { setSelectedAssociateClient(null); setAssociateClientNotes(""); }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
      {/* Tab: Encuestas de Onboarding */}
      {activeTab === "surveys" && (
        <div className="space-y-4">
          {loadingSurveys ? (
            <div className="text-center py-10 text-muted-foreground">Cargando encuestas...</div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay encuestas de clientes aun</p>
            </div>
          ) : (
            <>
              {pendingSurveys.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> Pendientes ({pendingSurveys.length})</h3>
                  <div className="space-y-3">
                    {pendingSurveys.map((row: any) => (
                      <SurveyCard key={row.survey.id} row={row} isSuperAdmin={isSuperAdmin}
                        onAction={(id, action) => { setSelectedSurvey(id); setSurveyAction(action); setSurveyNotes(""); setFinalPlan(row.survey.recommendedPlan || "express"); setFinalCommission(parseFloat(row.survey.recommendedCommission) || 3.5); }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {reviewedSurveys.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1"><Star className="w-4 h-4" /> Pre-aprobados — esperando aprobacion final ({reviewedSurveys.length})</h3>
                  <div className="space-y-3">
                    {reviewedSurveys.map((row: any) => (
                      <SurveyCard key={row.survey.id} row={row} isSuperAdmin={isSuperAdmin}
                        onAction={(id, action) => { setSelectedSurvey(id); setSurveyAction(action); setSurveyNotes(""); setFinalPlan(row.survey.recommendedPlan || "express"); setFinalCommission(parseFloat(row.survey.recommendedCommission) || 3.5); }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {doneSurveys.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Procesados ({doneSurveys.length})</h3>
                  <div className="space-y-3">
                    {doneSurveys.map((row: any) => (
                      <SurveyCard key={row.survey.id} row={row} isSuperAdmin={isSuperAdmin} readonly />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de revision de encuesta */}
      {selectedSurvey !== null && surveyAction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-3">
              {surveyAction === "approve" ? "Aprobar encuesta" : "Rechazar encuesta"}
            </h3>
            {isSuperAdmin && surveyAction === "approve" && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Plan a asignar</label>
                  <select value={finalPlan} onChange={e => setFinalPlan(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="express">Express - Basico</option>
                    <option value="connect">Connect - Estandar</option>
                    <option value="custom">Custom - Avanzado</option>
                    <option value="enterprise">Enterprise - Corporativo</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Comision (%)</label>
                  <input type="number" step="0.1" min="1" max="10" value={finalCommission} onChange={e => setFinalCommission(parseFloat(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}
            <textarea
              value={surveyNotes}
              onChange={e => setSurveyNotes(e.target.value)}
              placeholder={isSuperAdmin ? "Notas para el cliente (opcional)..." : "Notas para el superadmin (opcional)..."}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-3 mt-4">
              <Button
                className={`flex-1 ${surveyAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-foreground`}
                onClick={() => {
                  if (isSuperAdmin) {
                    adminApprove.mutate({ surveyId: selectedSurvey, finalPlan, finalCommission, adminNotes: surveyNotes || undefined, action: surveyAction });
                  } else {
                    assistantReview.mutate({ surveyId: selectedSurvey, assistantNotes: surveyNotes || undefined, action: surveyAction });
                  }
                }}
                disabled={assistantReview.isPending || adminApprove.isPending}
              >
                {surveyAction === "approve" ? (isSuperAdmin ? "Aprobar y activar cuenta" : "Pre-aprobar") : "Rechazar"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setSelectedSurvey(null); setSurveyAction(null); setSurveyNotes(""); }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de notas */}
      {showNotesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-3">
              {showNotesFor.action === "approve" ? "✅ Pre-aprobar solicitud" : "❌ Rechazar solicitud"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Agrega una nota opcional para el superadmin:</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas de revisión (opcional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-3 mt-4">
              <Button
                className={`flex-1 ${showNotesFor.action === "approve" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"} text-foreground`}
                onClick={() => {
                  if (showNotesFor.action === "approve") {
                    preApprove.mutate({ requestId: showNotesFor.id, notes: notes || undefined });
                  } else {
                    reject.mutate({ requestId: showNotesFor.id, notes: notes || undefined });
                  }
                }}
                disabled={preApprove.isPending || reject.isPending}
              >
                {showNotesFor.action === "approve" ? "Pre-aprobar" : "Rechazar"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setShowNotesFor(null); setNotes(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({
  req,
  showNotesFor,
  notes,
  setNotes,
  setShowNotesFor,
  onPreApprove,
  onReject,
  loading,
  readonly,
  isAssistantView,
}: {
  req: any;
  showNotesFor?: any;
  notes?: string;
  setNotes?: (v: string) => void;
  setShowNotesFor?: (v: any) => void;
  onPreApprove?: (id: number, notes?: string) => void;
  onReject?: (id: number, notes?: string) => void;
  loading?: boolean;
  readonly?: boolean;
  isAssistantView?: boolean;
}) {
  const status = STATUS_LABELS[req.status] || { label: req.status, color: "bg-gray-100 text-muted-foreground" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{req.userName || "Usuario"}</span>
            <span className="text-muted-foreground text-xs">{req.userEmail}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Módulo: <span className="font-medium text-foreground">{MODULE_LABELS[req.module] || req.module}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Tipo: <span className="font-medium text-foreground">{BUSINESS_TYPE_LABELS[req.businessType] || req.businessType}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(req.requestedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          {req.message && (
            <p className="mt-2 text-xs text-muted-foreground bg-gray-50 rounded-lg p-2 italic">"{req.message}"</p>
          )}
          {req.reviewNotes && (
            <p className="mt-1 text-xs text-blue-600">📝 {req.reviewNotes}</p>
          )}
        </div>
        {!readonly && isAssistantView && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-foreground text-xs"
              onClick={() => setShowNotesFor?.({ id: req.id, action: "approve" })}
              disabled={loading}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Pre-aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
              onClick={() => setShowNotesFor?.({ id: req.id, action: "reject" })}
              disabled={loading}
            >
              <XCircle className="w-3 h-3 mr-1" /> Rechazar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const SURVEY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  pending_review: { label: "Pendiente de revisión", color: "bg-yellow-100 text-yellow-800" },
  assistant_approved: { label: "Pre-aprobado", color: "bg-blue-100 text-blue-800" },
  pending_info: { label: "Solicita más info", color: "bg-orange-100 text-orange-800" },
  approved: { label: "Aprobado ✅", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
};

const PLAN_LABELS: Record<string, string> = {
  express: "Express",
  connect: "Connect",
  custom: "Custom",
  enterprise: "Enterprise",
};

function SurveyCard({ row, isSuperAdmin, onAction, readonly }: {
  row: any;
  isSuperAdmin: boolean;
  onAction?: (id: number, action: "approve" | "reject") => void;
  readonly?: boolean;
}) {
  const s = row.survey;
  const status = SURVEY_STATUS_LABELS[s.status] || { label: s.status, color: "bg-gray-100 text-muted-foreground" };
  const services = (() => { try { return JSON.parse(s.interestedModules || "[]"); } catch { return []; } })();
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{row.userName || "Usuario"}</span>
            <span className="text-muted-foreground text-xs">{row.userEmail}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
            {s.recommendedPlan && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Plan sugerido: {PLAN_LABELS[s.recommendedPlan] || s.recommendedPlan}
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-xs text-muted-foreground">Tipo: <span className="font-medium text-foreground">{s.businessType}</span></span>
            <span className="text-xs text-muted-foreground">Tamano: <span className="font-medium text-foreground">{s.businessSize}</span></span>
            <span className="text-xs text-muted-foreground">Ingresos: <span className="font-medium text-foreground">{s.monthlyRevenueEstimate}</span></span>
            <span className="text-xs text-muted-foreground">Multi-cuenta: <span className="font-medium text-foreground">{s.needsMultipleBankAccounts ? "Si" : "No"}</span></span>
          </div>
          {services.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {services.map((svc: string) => (
                <span key={svc} className="px-1.5 py-0.5 bg-gray-100 text-muted-foreground rounded text-xs">{svc}</span>
              ))}
            </div>
          )}
          {s.mainChallenge && (
            <p className="mt-2 text-xs text-muted-foreground bg-gray-50 rounded-lg p-2 italic">"{s.mainChallenge}"</p>
          )}
          {s.assistantNotes && (
            <p className="mt-1 text-xs text-blue-600">Notas asistente: {s.assistantNotes}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{new Date(s.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
        {!readonly && onAction && (
          <div className="flex gap-2 shrink-0 flex-col">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-foreground text-xs" onClick={() => onAction(s.id, "approve")}>
              <CheckCircle className="w-3 h-3 mr-1" /> {isSuperAdmin ? "Aprobar" : "Pre-aprobar"}
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => onAction(s.id, "reject")}>
              <XCircle className="w-3 h-3 mr-1" /> Rechazar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssistantPanel() {
  return (
    <DashboardLayout>
      <AssistantPanelInner />
    </DashboardLayout>
  );
}
