import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { ShieldCheck, Clock, CheckCircle, XCircle, Users, Settings } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"requests" | "users">("requests");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<{ id: number; action: "approve" | "reject" } | null>(null);

  const isAssistant = user?.role === "assistant";
  const isSuperAdmin = (user as any)?.isSuperAdmin;

  if (!isAssistant && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-600">Acceso Restringido</h2>
        <p className="text-gray-500 text-sm">Solo el asistente o el superadmin pueden acceder a este panel.</p>
      </div>
    );
  }

  const { data: requests = [], refetch, isLoading } = trpc.moduleAccess.listPendingForAssistant.useQuery();
  const { data: allUsers = [], isLoading: loadingUsers } = trpc.moduleAccess.listAllUsers.useQuery(undefined, { enabled: isSuperAdmin });

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

  const pending = requests.filter(r => r.status === "pending");
  const preApproved = requests.filter(r => r.status === "assistant_approved");
  const processed = requests.filter(r => r.status === "approved" || r.status === "rejected");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Asistente</h1>
          <p className="text-sm text-gray-500">Gestiona solicitudes de acceso y usuarios de la plataforma</p>
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
          <p className="text-2xl font-bold text-gray-700">{processed.length}</p>
          <p className="text-xs text-gray-500 mt-1">Procesados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "requests" ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Settings className="w-4 h-4 inline mr-1" />
          Solicitudes de Módulos
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "users" ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Gestión de Usuarios
          </button>
        )}
      </div>

      {/* Tab: Solicitudes */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
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
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">Historial procesados ({processed.length})</h3>
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
            <div className="text-center py-10 text-gray-400">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rol actual</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "admin" ? "bg-blue-100 text-blue-700" :
                          u.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                          u.role === "assistant" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {u.role === "admin" ? "Administrador" :
                           u.role === "superadmin" ? "SuperAdmin" :
                           u.role === "assistant" ? "Asistente" : "Usuario"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== "superadmin" && u.role !== "assistant" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`¿Asignar rol de Asistente a ${u.name || u.email}?`)) {
                                setAssistant.mutate({ userId: u.id });
                              }
                            }}
                            className="text-xs"
                          >
                            Hacer Asistente
                          </Button>
                        )}
                        {u.role === "assistant" && (
                          <span className="text-xs text-green-600 font-medium">✓ Es asistente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de notas */}
      {showNotesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-3">
              {showNotesFor.action === "approve" ? "✅ Pre-aprobar solicitud" : "❌ Rechazar solicitud"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">Agrega una nota opcional para el superadmin:</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas de revisión (opcional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-3 mt-4">
              <Button
                className={`flex-1 ${showNotesFor.action === "approve" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"} text-white`}
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
  const status = STATUS_LABELS[req.status] || { label: req.status, color: "bg-gray-100 text-gray-600" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{req.userName || "Usuario"}</span>
            <span className="text-gray-400 text-xs">{req.userEmail}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">
              Módulo: <span className="font-medium text-gray-700">{MODULE_LABELS[req.module] || req.module}</span>
            </span>
            <span className="text-xs text-gray-500">
              Tipo: <span className="font-medium text-gray-700">{BUSINESS_TYPE_LABELS[req.businessType] || req.businessType}</span>
            </span>
            <span className="text-xs text-gray-400">
              {new Date(req.requestedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          {req.message && (
            <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 italic">"{req.message}"</p>
          )}
          {req.reviewNotes && (
            <p className="mt-1 text-xs text-blue-600">📝 {req.reviewNotes}</p>
          )}
        </div>
        {!readonly && isAssistantView && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
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

export default function AssistantPanel() {
  return (
    <DashboardLayout>
      <AssistantPanelInner />
    </DashboardLayout>
  );
}
