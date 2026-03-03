import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Patient = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  photoUrl: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  isActive: boolean;
  createdAt: Date;
};
type Appointment = {
  id: number;
  patientId: number;
  title: string;
  appointmentDate: Date;
  durationMinutes: number;
  status: string;
  notes: string | null;
};
type MedicalRecord = {
  id: number;
  patientId: number;
  appointmentId: number | null;
  recordDate: Date;
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  clinicalNotes: string | null;
  attachments: string | null;
};
type Attachment = { url: string; name: string; category: string; uploadedAt: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(birthDate: string | null): string {
  if (!birthDate) return "—";
  const bd = new Date(birthDate);
  const now = new Date();
  const age = now.getFullYear() - bd.getFullYear();
  return `${age} años`;
}
function statusLabel(s: string) {
  const map: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Programada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    completed: { label: "Completada", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    cancelled: { label: "Cancelada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
    rescheduled: { label: "Reprogramada", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  };
  return map[s] || { label: s, color: "bg-gray-500/20 text-gray-400" };
}

// ─── Mini Calendario ──────────────────────────────────────────────────────────
function MiniCalendar({
  appointments,
  onSelectDate,
}: {
  appointments: Appointment[];
  onSelectDate: (date: Date) => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const apptDays = new Set(
    appointments
      .filter((a) => {
        const d = new Date(a.appointmentDate);
        return d.getFullYear() === year && d.getMonth() === month && a.status === "scheduled";
      })
      .map((a) => new Date(a.appointmentDate).getDate())
  );

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const dayNames = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
        >‹</button>
        <span className="text-white font-semibold text-sm">{monthNames[month]} {year}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
        >›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const hasAppt = apptDays.has(day);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={`relative text-center text-xs py-1.5 rounded-lg font-medium transition-colors
                ${isToday ? "bg-[#FF6B00] text-white" : "text-gray-300 hover:bg-white/10"}
              `}
            >
              {day}
              {hasAppt && !isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF6B00] block" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Formulario de Paciente ───────────────────────────────────────────────────
function PatientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Patient>;
  onSave: (data: Partial<Patient>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    firstName: initial?.firstName || "",
    lastName: initial?.lastName || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    birthDate: initial?.birthDate || "",
    gender: initial?.gender || "",
    address: initial?.address || "",
    bloodType: initial?.bloodType || "",
    allergies: initial?.allergies || "",
    medicalNotes: initial?.medicalNotes || "",
    photoUrl: initial?.photoUrl || "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nombre *</label>
          <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Nombre" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Apellido *</label>
          <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Apellido" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Correo</label>
          <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="correo@ejemplo.com" type="email" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+52 800 000 0000" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fecha de nacimiento</label>
          <Input value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} type="date" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Género</label>
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="femenino">Femenino</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tipo de sangre</label>
          <Select value={form.bloodType} onValueChange={(v) => set("bloodType", v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
        <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Calle, colonia, ciudad" />
      </div>
      <div>
        <label className="text-xs text-red-400 mb-1 block">⚠ Alergias</label>
        <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Penicilina, látex, etc." />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notas médicas</label>
        <Textarea value={form.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} placeholder="Condiciones crónicas, antecedentes..." rows={2} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          className="bg-[#FF6B00] hover:bg-[#e55f00] text-white"
          onClick={() => onSave(form)}
          disabled={!form.firstName || !form.lastName}
        >
          Guardar paciente
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Formulario de Cita ───────────────────────────────────────────────────────
function AppointmentForm({
  patients,
  initial,
  onSave,
  onCancel,
}: {
  patients: Patient[];
  initial?: Partial<Appointment & { patientId: number }>;
  onSave: (data: { patientId: number; title: string; appointmentDate: string; durationMinutes: number; notes: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    patientId: initial?.patientId?.toString() || "",
    title: initial?.title || "",
    appointmentDate: initial?.appointmentDate
      ? new Date(initial.appointmentDate).toISOString().slice(0, 16)
      : "",
    durationMinutes: initial?.durationMinutes?.toString() || "30",
    notes: initial?.notes || "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Paciente *</label>
        <Select value={form.patientId} onValueChange={(v) => set("patientId", v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Motivo / Tipo de cita *</label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Consulta general, limpieza dental, revisión..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fecha y hora *</label>
          <Input value={form.appointmentDate} onChange={(e) => set("appointmentDate", e.target.value)} type="datetime-local" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Duración (minutos)</label>
          <Select value={form.durationMinutes} onValueChange={(v) => set("durationMinutes", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[15,20,30,45,60,90,120].map(d => (
                <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notas adicionales</label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Indicaciones previas, preparación, etc." rows={2} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          className="bg-[#FF6B00] hover:bg-[#e55f00] text-white"
          onClick={() => {
            // Convertir datetime-local (sin TZ) a ISO con offset local para evitar desfase UTC
            let isoDate = form.appointmentDate;
            if (form.appointmentDate && !form.appointmentDate.includes('Z') && !form.appointmentDate.includes('+')) {
              const d = new Date(form.appointmentDate);
              const offset = -d.getTimezoneOffset();
              const sign = offset >= 0 ? '+' : '-';
              const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
              isoDate = form.appointmentDate + ':00' + sign + pad(offset / 60) + ':' + pad(offset % 60);
            }
            onSave({
              patientId: parseInt(form.patientId),
              title: form.title,
              appointmentDate: isoDate,
              durationMinutes: parseInt(form.durationMinutes),
              notes: form.notes,
            });
          }}
          disabled={!form.patientId || !form.title || !form.appointmentDate}
        >
          Guardar cita
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Panel de Detalle del Paciente ────────────────────────────────────────────
function PatientDetailPanel({
  patient: initialPatient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [activeTab, setActiveTab] = useState("info");
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showApptForm, setShowApptForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const updatePatient = trpc.medical.patients.update.useMutation({
    onSuccess: (_data, variables) => {
      // Actualizar el estado local del paciente con los nuevos datos
      setPatient(prev => ({ ...prev, ...variables }));
      utils.medical.patients.list.invalidate();
      setShowEditPatient(false);
      toast.success("Datos del paciente actualizados correctamente");
    },
    onError: (e) => toast.error(`Error al actualizar paciente: ${e.message}`),
  });
  const [uploadCategory, setUploadCategory] = useState("general");
  const [recordForm, setRecordForm] = useState({
    diagnosis: "", treatment: "", prescription: "", clinicalNotes: "", attachments: "",
  });

  const { data: appointments = [] } = trpc.medical.appointments.listByPatient.useQuery({ patientId: patient.id });
  const { data: records = [] } = trpc.medical.records.listByPatient.useQuery({ patientId: patient.id });
  const { data: patientRx = [] } = trpc.prescriptions.list.useQuery({ patientId: patient.id });

  const createAppt = trpc.medical.appointments.create.useMutation({
    onSuccess: () => {
      utils.medical.appointments.listByPatient.invalidate({ patientId: patient.id });
      utils.medical.appointments.list.invalidate();
      setShowApptForm(false);
      toast.success("Cita agendada correctamente");
    },
  });
  const updateAppt = trpc.medical.appointments.update.useMutation({
    onSuccess: () => {
      utils.medical.appointments.listByPatient.invalidate({ patientId: patient.id });
      utils.medical.appointments.list.invalidate();
      setEditingAppt(null);
      toast.success("Cita actualizada");
    },
  });
  const createRecord = trpc.medical.records.create.useMutation({
    onSuccess: () => {
      utils.medical.records.listByPatient.invalidate({ patientId: patient.id });
      setShowRecordForm(false);
      setRecordForm({ diagnosis: "", treatment: "", prescription: "", clinicalNotes: "", attachments: "" });
      toast.success("Expediente guardado");
    },
  });
  const [pendingFileName, setPendingFileName] = useState("");
  const saveFileAsRecord = trpc.medical.records.create.useMutation({
    onSuccess: () => {
      utils.medical.records.listByPatient.invalidate({ patientId: patient.id });
      toast.success("Archivo guardado en el expediente");
    },
    onError: () => toast.error("Error al guardar el archivo"),
  });
  const uploadFile = trpc.medical.uploadFile.useMutation({
    onSuccess: (data) => {
      const newAttachment: Attachment = {
        url: data.url,
        name: pendingFileName || `archivo-${Date.now()}`,
        category: uploadCategory,
        uploadedAt: new Date().toISOString(),
      };
      // Guardar automáticamente como expediente clínico
      saveFileAsRecord.mutate({
        patientId: patient.id,
        clinicalNotes: `Archivo adjunto: ${newAttachment.name} (${uploadCategory})`,
        attachments: JSON.stringify([newAttachment]),
      });
    },
    onError: () => toast.error("Error al subir archivo"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate({
        fileName: file.name,
        fileType: file.type,
        fileBase64: base64,
        patientId: patient.id,
        fileCategory: uploadCategory,
      });
    };
    reader.readAsDataURL(file);
    // Reset input para permitir subir el mismo archivo de nuevo
    e.target.value = "";
  };

  const categoryLabel: Record<string, string> = {
    before: "Antes", after: "Después", xray: "Radiografía", study: "Estudio", general: "General",
  };
  const allAttachments: Attachment[] = records.flatMap((r) => {
    if (!r.attachments) return [];
    try { return JSON.parse(r.attachments) as Attachment[]; } catch { return []; }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl bg-[#111827] border-l border-gray-700 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111827] border-b border-gray-700 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-xl font-bold text-[#FF6B00] overflow-hidden flex-shrink-0">
                {patient.photoUrl
                  ? <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
                  : `${patient.firstName[0]}${patient.lastName[0]}`
                }
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{patient.firstName} {patient.lastName}</h2>
                <div className="flex gap-3 text-sm text-gray-400 mt-1">
                  {patient.birthDate && <span>{calcAge(patient.birthDate)}</span>}
                  {patient.bloodType && <span className="text-red-400 font-semibold">{patient.bloodType}</span>}
                  {patient.gender && <span className="capitalize">{patient.gender}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditPatient(true)}
                className="text-gray-400 hover:text-[#FF6B00] transition-colors p-1 rounded-lg hover:bg-[#FF6B00]/10 text-sm font-medium flex items-center gap-1"
                title="Editar datos del paciente"
              >
                ✏ Editar
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none mt-1">×</button>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="bg-gray-800 border border-gray-700">
              <TabsTrigger value="info" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">Información</TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">Citas ({appointments.length})</TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">Expediente ({records.length})</TabsTrigger>
              <TabsTrigger value="prescriptions" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">💊 Recetas ({patientRx.length})</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">Archivos ({allAttachments.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-6 py-4">
          {/* TAB: Información */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Correo", value: patient.email },
                  { label: "Teléfono", value: patient.phone },
                  { label: "Fecha de nacimiento", value: patient.birthDate ? new Date(patient.birthDate + "T00:00:00").toLocaleDateString("es-MX") : null },
                  { label: "Dirección", value: patient.address },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{label}</div>
                    <div className="text-sm text-white font-medium">{value}</div>
                  </div>
                ) : null)}
              </div>
              {patient.allergies && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3">
                  <div className="text-xs text-red-400 mb-1 font-semibold">⚠ Alergias</div>
                  <div className="text-sm text-red-100">{patient.allergies}</div>
                </div>
              )}
              {patient.medicalNotes && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Notas médicas</div>
                  <div className="text-sm text-gray-200 whitespace-pre-wrap">{patient.medicalNotes}</div>
                </div>
              )}
              <div className="pt-2">
                <Button
                  className="w-full bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold"
                  onClick={() => setShowApptForm(true)}
                >
                  + Agendar nueva cita
                </Button>
              </div>
            </div>
          )}

          {/* TAB: Citas */}
          {activeTab === "appointments" && (
            <div className="space-y-3">
              <Button
                className="w-full bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold"
                onClick={() => setShowApptForm(true)}
              >
                + Nueva cita
              </Button>
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Sin citas registradas</div>
              ) : (
                appointments.map((appt) => {
                  const st = statusLabel(appt.status);
                  return (
                    <div key={appt.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white">{appt.title}</div>
                          <div className="text-sm text-gray-400 mt-1">
                            {new Date(appt.appointmentDate).toLocaleString("es-MX", {
                              weekday: "long", year: "numeric", month: "long", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{appt.durationMinutes} min</div>
                          {appt.notes && <div className="text-sm text-gray-300 mt-2">{appt.notes}</div>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded border ml-2 flex-shrink-0 ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {appt.status === "scheduled" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-gray-600 text-gray-200 hover:bg-gray-700"
                              onClick={() => setEditingAppt(appt)}
                            >
                              ✏ Reagendar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-green-600/50 text-green-400 hover:bg-green-900/30"
                              onClick={() => updateAppt.mutate({ id: appt.id, status: "completed" })}
                            >
                              ✓ Completada
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-600/50 text-red-400 hover:bg-red-900/30"
                              onClick={() => updateAppt.mutate({ id: appt.id, status: "cancelled" })}
                            >
                              ✕ Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB: Expediente Clínico */}
          {activeTab === "records" && (
            <div className="space-y-3">
              <Button
                className="w-full bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold"
                onClick={() => setShowRecordForm(true)}
              >
                + Nuevo registro clínico
              </Button>
              {records.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Sin registros clínicos</div>
              ) : (
                records.map((rec) => (
                  <div key={rec.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
                    <div className="text-xs text-gray-500">
                      {new Date(rec.recordDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                    {rec.diagnosis && (
                      <div>
                        <div className="text-xs text-[#FF6B00] font-semibold mb-1">Diagnóstico</div>
                        <div className="text-sm text-gray-200">{rec.diagnosis}</div>
                      </div>
                    )}
                    {rec.treatment && (
                      <div>
                        <div className="text-xs text-blue-400 font-semibold mb-1">Tratamiento</div>
                        <div className="text-sm text-gray-200">{rec.treatment}</div>
                      </div>
                    )}
                    {rec.prescription && (
                      <div>
                        <div className="text-xs text-green-400 font-semibold mb-1">Prescripción</div>
                        <div className="text-sm text-gray-200">{rec.prescription}</div>
                      </div>
                    )}
                    {rec.clinicalNotes && (
                      <div>
                        <div className="text-xs text-gray-400 font-semibold mb-1">Notas clínicas</div>
                        <div className="text-sm text-gray-300 whitespace-pre-wrap">{rec.clinicalNotes}</div>
                      </div>
                    )}
                    {rec.attachments && (() => {
                      try {
                        const atts = JSON.parse(rec.attachments) as Attachment[];
                        return atts.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {atts.map((a, i) => (
                              <a key={i} href={a.url} target="_blank" rel="noreferrer"
                                className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600">
                                📎 {categoryLabel[a.category] || a.category}
                              </a>
                            ))}
                          </div>
                        ) : null;
                      } catch { return null; }
                    })()}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: Recetas */}
          {activeTab === "prescriptions" && (
            <div className="space-y-3">
              {(patientRx as any[]).length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">💊</div>
                  <div className="text-sm">Sin recetas registradas para este paciente</div>
                </div>
              ) : (
                (patientRx as any[]).map((rx: any) => (
                  <div key={rx.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-white text-sm">
                          {new Date(rx.prescriptionDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                        {rx.diagnosis && (
                          <div className="text-xs text-[#FF6B00] mt-1">Dx: {rx.diagnosis}</div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-700/40">
                        Receta #{rx.id}
                      </span>
                    </div>
                    {rx.medications && (() => {
                      try {
                        const meds = JSON.parse(rx.medications) as Array<{name:string;dose:string;instructions:string}>;
                        return (
                          <div className="mt-2 space-y-1">
                            {meds.map((m: any, i: number) => (
                              <div key={i} className="text-xs bg-gray-700/50 rounded px-2 py-1">
                                <span className="text-white font-medium">{m.name}</span>
                                {m.dose && <span className="text-gray-400 ml-2">{m.dose}</span>}
                                {m.instructions && <span className="text-gray-500 ml-2">— {m.instructions}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      } catch { return <div className="text-xs text-gray-400 mt-1">{rx.medications}</div>; }
                    })()}
                    {rx.instructions && (
                      <div className="text-xs text-gray-400 mt-2 italic">{rx.instructions}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: Archivos */}
          {activeTab === "files" && (
            <div className="space-y-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="text-sm font-semibold text-white mb-3">Subir archivo</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="before">Antes</SelectItem>
                      <SelectItem value="after">Después</SelectItem>
                      <SelectItem value="xray">Radiografía</SelectItem>
                      <SelectItem value="study">Estudio</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="border-gray-600 text-gray-200 hover:bg-gray-700"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadFile.isPending}
                  >
                    {uploadFile.isPending ? "Subiendo..." : "📎 Seleccionar archivo"}
                  </Button>
                </div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>
              {allAttachments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Sin archivos adjuntos</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allAttachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer"
                      className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:bg-gray-700 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">{categoryLabel[a.category] || a.category}</div>
                      <div className="text-sm text-white truncate">📎 {a.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(a.uploadedAt).toLocaleDateString("es-MX")}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Nueva cita para este paciente */}
        <Dialog open={showApptForm} onOpenChange={setShowApptForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agendar cita — {patient.firstName} {patient.lastName}</DialogTitle>
            </DialogHeader>
            <AppointmentForm
              patients={[patient]}
              initial={{ patientId: patient.id }}
              onSave={(data) => createAppt.mutate(data)}
              onCancel={() => setShowApptForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Modal: Reagendar cita */}
        <Dialog open={!!editingAppt} onOpenChange={() => setEditingAppt(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reagendar cita</DialogTitle>
            </DialogHeader>
            {editingAppt && (
              <AppointmentForm
                patients={[patient]}
                initial={editingAppt}
                onSave={(data) => updateAppt.mutate({
                  id: editingAppt.id,
                  title: data.title,
                  appointmentDate: data.appointmentDate,
                  durationMinutes: data.durationMinutes,
                  notes: data.notes,
                  status: "scheduled",
                })}
                onCancel={() => setEditingAppt(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal: Nuevo expediente */}
        <Dialog open={showRecordForm} onOpenChange={setShowRecordForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo registro clínico</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Diagnóstico</label>
                <Textarea value={recordForm.diagnosis} onChange={(e) => setRecordForm(f => ({ ...f, diagnosis: e.target.value }))} rows={2} placeholder="Diagnóstico del paciente" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tratamiento</label>
                <Textarea value={recordForm.treatment} onChange={(e) => setRecordForm(f => ({ ...f, treatment: e.target.value }))} rows={2} placeholder="Plan de tratamiento" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prescripción / Medicamentos</label>
                <Textarea value={recordForm.prescription} onChange={(e) => setRecordForm(f => ({ ...f, prescription: e.target.value }))} rows={2} placeholder="Medicamentos recetados, dosis, frecuencia" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notas clínicas adicionales</label>
                <Textarea value={recordForm.clinicalNotes} onChange={(e) => setRecordForm(f => ({ ...f, clinicalNotes: e.target.value }))} rows={3} placeholder="Observaciones, evolución, próxima cita..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecordForm(false)}>Cancelar</Button>
              <Button
                className="bg-[#FF6B00] hover:bg-[#e55f00] text-white"
                onClick={() => createRecord.mutate({ patientId: patient.id, ...recordForm })}
                disabled={createRecord.isPending}
              >
                Guardar expediente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Modal: Editar datos del paciente */}
        <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
          <DialogContent className="bg-[#1a2035] border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">✏ Editar datos del paciente</DialogTitle>
            </DialogHeader>
            <PatientForm
              initial={patient}
              onSave={(data) => {
                // Convertir null a undefined para compatibilidad con el tipo del procedimiento
                const { id: _id, createdAt: _ca, ...rest } = data as any;
                const cleanData = Object.fromEntries(
                  Object.entries(rest).map(([k, v]) => [k, v === null ? undefined : v])
                );
                updatePatient.mutate({ id: patient.id, ...cleanData });
              }}
              onCancel={() => setShowEditPatient(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MedicalAgenda() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("patients");
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showApptForm, setShowApptForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [showBellPanel, setShowBellPanel] = useState(false);
  const { data: patients = [], isLoading: loadingPatients } = trpc.medical.patients.list.useQuery();
  const { data: appointments = [], isLoading: loadingAppts } = trpc.medical.appointments.list.useQuery();
  const { data: birthdays } = trpc.medical.todayBirthdays.useQuery();

  const createPatient = trpc.medical.patients.create.useMutation({
    onSuccess: () => {
      utils.medical.patients.list.invalidate();
      setShowPatientForm(false);
      toast.success("Paciente registrado correctamente");
    },
    onError: (e) => toast.error(`Error al registrar paciente: ${e.message}`),
  });
  const createAppt = trpc.medical.appointments.create.useMutation({
    onSuccess: () => {
      utils.medical.appointments.list.invalidate();
      setShowApptForm(false);
      toast.success("Cita agendada correctamente");
    },
  });
  const updateAppt = trpc.medical.appointments.update.useMutation({
    onSuccess: () => {
      utils.medical.appointments.list.invalidate();
      setEditingAppt(null);
      toast.success("Cita actualizada");
    },
  });
  const sendBirthdayEmails = trpc.medical.sendBirthdayEmails.useMutation({
    onSuccess: (r) => toast.success(`Se enviaron ${r.sent} emails de cumpleaños`),
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
  // Estado para modal de recordatorio
  const [reminderAppt, setReminderAppt] = useState<Appointment | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  // Estado para campanita de citas del día
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_appt_alerts') || '[]'); } catch { return []; }
  });
  const { data: todayAlertData } = trpc.medical.todayAppointmentsAlert.useQuery();
  const todayAlertAppts = (todayAlertData?.appointments || []).filter((a: any) => !dismissedAlerts.includes(a.id));
  const dismissAlert = (id: number) => {
    const updated = [...dismissedAlerts, id];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_appt_alerts', JSON.stringify(updated));
  };
  const dismissAllAlerts = () => {
    const ids = (todayAlertData?.appointments || []).map((a: any) => a.id);
    const updated = [...dismissedAlerts, ...ids];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_appt_alerts', JSON.stringify(updated));
  };
  // ――― Sonido de timbre al enviar recordatorio ―――
  const playBellSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Nota 1: Do5 (523 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523, ctx.currentTime);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.8);
      // Nota 2: Mi5 (659 Hz) con retraso
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 1.0);
      // Nota 3: Sol5 (784 Hz) con más retraso
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(784, ctx.currentTime + 0.30);
      gain3.gain.setValueAtTime(0, ctx.currentTime);
      gain3.gain.setValueAtTime(0.3, ctx.currentTime + 0.30);
      gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc3.start(ctx.currentTime + 0.30);
      osc3.stop(ctx.currentTime + 1.2);
    } catch (e) {
      // Silenciar error si el navegador no soporta AudioContext
    }
  };

  const sendReminder = trpc.medical.sendAppointmentReminder.useMutation({
    onSuccess: (r) => {
      playBellSound();
      toast.success('🔔 Recordatorio enviado al paciente');
      if (r.whatsappLink && reminderAppt) {
        // No abrir WhatsApp automáticamente, el usuario elige
      }
      setShowReminderModal(false);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
  const handleOpenReminder = (appt: Appointment) => {
    setReminderAppt(appt);
    setShowReminderModal(true);
  };
  const handleSendReminderEmail = () => {
    if (!reminderAppt) return;
    sendReminder.mutate({ appointmentId: reminderAppt.id });
  };
  const handleSendReminderWhatsApp = async () => {
    if (!reminderAppt) return;
    // Obtener el link de WhatsApp del servidor
    sendReminder.mutate({ appointmentId: reminderAppt.id }, {
      onSuccess: (r) => {
        playBellSound();
        if (r.whatsappLink) window.open(r.whatsappLink, '_blank');
        setShowReminderModal(false);
      },
    });
  };
  const sendPostAlert = trpc.medical.sendPostAppointmentAlert.useMutation({
    onSuccess: () => toast.success('Alerta enviada. Revisa las notificaciones para marcar la cita.'),
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const filteredPatients = patients.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.email} ${p.phone}`.toLowerCase().includes(search.toLowerCase())
  );
  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.appointmentDate);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });
  const upcomingAppts = appointments
    .filter((a) => new Date(a.appointmentDate) >= new Date() && a.status === "scheduled")
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
    .slice(0, 20);

  const calendarAppts = calendarDate
    ? appointments.filter((a) => {
        const d = new Date(a.appointmentDate);
        return d.getFullYear() === calendarDate.getFullYear()
          && d.getMonth() === calendarDate.getMonth()
          && d.getDate() === calendarDate.getDate();
      })
    : [];

  const totalBirthdays = (birthdays?.patients?.length || 0) + (birthdays?.employees?.length || 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto bg-[#0f1117] min-h-screen rounded-xl -m-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🏥 Agenda Médica
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Gestión de pacientes, citas y expedientes clínicos
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Campanita de citas del día */}
            {todayAlertAppts.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBellPanel(prev => !prev)}
                  className="relative p-2 rounded-full bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 border border-[#FF6B00]/50 transition-colors"
                  title="Citas de hoy"
                >
                  <span className="text-xl">🔔</span>
                  <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {todayAlertAppts.length}
                  </span>
                </button>
              </div>
            )}
            <Button variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-800" onClick={() => setShowApptForm(true)}>
              + Nueva cita
            </Button>
            <Button
              className="bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold"
              onClick={() => setShowPatientForm(true)}
            >
              + Nuevo paciente
            </Button>
          </div>
        </div>

        {/* Panel de campanita de citas del día */}
        {showBellPanel && todayAlertAppts.length > 0 && (
          <div className="mb-6 bg-[#1a2035] border border-[#FF6B00]/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <span className="text-white font-semibold">Citas de hoy ({todayAlertAppts.length})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={dismissAllAlerts}
                  className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1"
                >
                  Marcar todas como vistas
                </button>
                <button onClick={() => setShowBellPanel(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
              </div>
            </div>
            <div className="space-y-2">
              {todayAlertAppts.map((a: any) => {
                const t = new Date(a.appointmentDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                return (
                  <div key={a.id} className="flex items-center justify-between bg-[#111827] rounded-lg px-3 py-2">
                    <div>
                      <span className="text-white text-sm font-medium">{a.title}</span>
                      <span className="text-gray-400 text-xs ml-2">{a.patientName} — {t}</span>
                    </div>
                    <button
                      onClick={() => dismissAlert(a.id)}
                      className="text-xs text-green-400 hover:text-green-300 border border-green-700 rounded px-2 py-1"
                    >
                      ✓ Visto
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal de recordatorio Email + WhatsApp */}
        <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
          <DialogContent className="bg-[#1a2035] border-gray-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">📨 Enviar recordatorio de cita</DialogTitle>
            </DialogHeader>
            {reminderAppt && (
              <div className="space-y-4">
                <div className="bg-[#111827] rounded-lg p-3">
                  <div className="text-sm text-gray-300"><span className="text-gray-500">Cita:</span> {reminderAppt.title}</div>
                  <div className="text-sm text-gray-300"><span className="text-gray-500">Fecha:</span> {new Date(reminderAppt.appointmentDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                  <div className="text-sm text-gray-300"><span className="text-gray-500">Hora:</span> {new Date(reminderAppt.appointmentDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                </div>
                <p className="text-gray-400 text-sm">¿Cómo deseas enviar el recordatorio al paciente?</p>
                <div className="flex flex-col gap-2">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    onClick={handleSendReminderEmail}
                    disabled={sendReminder.isPending}
                  >
                    📧 Enviar por Email
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                    onClick={handleSendReminderWhatsApp}
                    disabled={sendReminder.isPending}
                  >
                    📱 Enviar por WhatsApp
                  </Button>
                  <Button
                    className="bg-[#FF6B00] hover:bg-[#e55f00] text-white w-full"
                    onClick={() => { handleSendReminderEmail(); setTimeout(() => handleSendReminderWhatsApp(), 1500); }}
                    disabled={sendReminder.isPending}
                  >
                    📧📱 Enviar por ambos
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setShowReminderModal(false)}>Cancelar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Banner de cumpleaños de hoy */}
        {totalBirthdays > 0 && (
          <div className="mb-6 bg-gradient-to-r from-[#FF6B00]/20 to-orange-900/20 border border-[#FF6B00]/40 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎂</span>
              <div>
                <div className="text-white font-semibold">
                  {totalBirthdays === 1 ? "¡Hay 1 cumpleaños hoy!" : `¡Hay ${totalBirthdays} cumpleaños hoy!`}
                </div>
                <div className="text-gray-300 text-sm">
                  {[
                    ...(birthdays?.patients || []).map((p: { name: string }) => `${p.name} (paciente)`),
                    ...(birthdays?.employees || []).map((e: { name: string }) => `${e.name} (empleado)`),
                  ].join(" · ")}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(birthdays?.patients?.length || 0) > 0 && (
                <Button
                  size="sm"
                  className="bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs"
                  onClick={() => sendBirthdayEmails.mutate({ type: "patients" })}
                  disabled={sendBirthdayEmails.isPending}
                >
                  📧 Felicitar pacientes
                </Button>
              )}
              {(birthdays?.employees?.length || 0) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#FF6B00]/50 text-[#FF6B00] hover:bg-[#FF6B00]/10 text-xs"
                  onClick={() => sendBirthdayEmails.mutate({ type: "employees" })}
                  disabled={sendBirthdayEmails.isPending}
                >
                  📧 Felicitar empleados
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stats rápidas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total pacientes", value: patients.length, icon: "👥" },
            { label: "Citas hoy", value: todayAppts.length, icon: "📅" },
            { label: "Próximas citas", value: upcomingAppts.length, icon: "⏰" },
            { label: "Citas este mes", value: appointments.filter(a => {
              const d = new Date(a.appointmentDate);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length, icon: "📊" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-[#1a1f2e] rounded-xl p-4 border border-gray-700">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border border-gray-700 mb-4">
            <TabsTrigger value="patients" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">Pacientes</TabsTrigger>
            <TabsTrigger value="agenda" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">Agenda de citas</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white text-gray-300">📆 Calendario</TabsTrigger>
          </TabsList>

          {/* TAB: Pacientes */}
          <TabsContent value="patients">
            <div className="mb-4">
              <Input
                placeholder="Buscar paciente por nombre, correo o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            {loadingPatients ? (
              <div className="text-center py-12 text-gray-400">Cargando pacientes...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">👤</div>
                <div className="font-semibold text-white">Sin pacientes registrados</div>
                <div className="text-sm mt-1">Agrega tu primer paciente con el botón de arriba</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPatients.map((patient) => {
                  const patientAppts = appointments.filter(a => a.patientId === patient.id && a.status === "scheduled");
                  const nextAppt = patientAppts.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0];
                  return (
                    <div
                      key={patient.id}
                      className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#FF6B00]/50 hover:bg-[#1f2535] transition-colors"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-sm font-bold text-[#FF6B00] overflow-hidden flex-shrink-0">
                        {patient.photoUrl
                          ? <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
                          : `${patient.firstName[0]}${patient.lastName[0]}`
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{patient.firstName} {patient.lastName}</div>
                        <div className="flex gap-3 text-sm text-gray-400 mt-0.5 flex-wrap">
                          {patient.phone && <span>📞 {patient.phone}</span>}
                          {patient.email && <span>✉ {patient.email}</span>}
                          {patient.birthDate && <span>🎂 {calcAge(patient.birthDate)}</span>}
                          {patient.bloodType && <span className="text-red-400 font-semibold">{patient.bloodType}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {nextAppt ? (
                          <div>
                            <div className="text-xs text-[#FF6B00] font-semibold">Próxima cita</div>
                            <div className="text-xs text-gray-400">
                              {new Date(nextAppt.appointmentDate).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                              {" "}
                              {new Date(nextAppt.appointmentDate).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Sin citas próximas</div>
                        )}
                        <div className="text-[#FF6B00] mt-1">›</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB: Agenda */}
          <TabsContent value="agenda">
            <div className="space-y-4">
              {/* Citas de hoy */}
              {todayAppts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#FF6B00] mb-2 uppercase tracking-wide">Hoy</h3>
                  <div className="space-y-2">
                    {todayAppts.map((appt) => {
                      const p = patients.find(pt => pt.id === appt.patientId);
                      const st = statusLabel(appt.status);
                      return (
                        <div key={appt.id} className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-lg p-4 flex items-center gap-4 flex-wrap">
                          <div className="text-center w-16 flex-shrink-0">
                            <div className="text-lg font-bold text-white">
                              {new Date(appt.appointmentDate).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-gray-400">{appt.durationMinutes}min</div>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{appt.title}</div>
                            {p && <div className="text-sm text-gray-300">{p.firstName} {p.lastName}</div>}
                            {appt.notes && <div className="text-xs text-gray-400 mt-1">{appt.notes}</div>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded border ${st.color}`}>{st.label}</span>
                            {appt.status === "scheduled" && (
                              <>
                                <Button size="sm" variant="outline" className="text-xs border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                                  onClick={() => handleOpenReminder(appt)}>
                                  📧 Recordar
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/30"
                                  onClick={() => sendPostAlert.mutate({ appointmentId: appt.id })}>
                                  ⏰ Alerta
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs border-gray-600 text-gray-200 hover:bg-gray-700"
                                  onClick={() => setEditingAppt(appt)}>
                                  ✏ Reagendar
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs border-green-600/50 text-green-400 hover:bg-green-900/30"
                                  onClick={() => updateAppt.mutate({ id: appt.id, status: "completed" })}>
                                  ✓ Completar
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs border-red-600/50 text-red-400 hover:bg-red-900/30"
                                  onClick={() => updateAppt.mutate({ id: appt.id, status: "cancelled" })}>
                                  ✕ Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Próximas citas */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Próximas citas</h3>
                {loadingAppts ? (
                  <div className="text-center py-8 text-gray-400">Cargando...</div>
                ) : upcomingAppts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-3">📅</div>
                    <div>Sin citas programadas</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAppts.map((appt) => {
                      const p = patients.find(pt => pt.id === appt.patientId);
                      const d = new Date(appt.appointmentDate);
                      return (
                        <div key={appt.id} className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4 flex items-center gap-4 flex-wrap">
                          <div className="text-center w-16 flex-shrink-0">
                            <div className="text-sm font-bold text-white">
                              {d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{appt.title}</div>
                            {p && (
                              <div
                                className="text-sm text-[#FF6B00] cursor-pointer hover:underline"
                                onClick={() => setSelectedPatient(p)}
                              >
                                {p.firstName} {p.lastName}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{appt.durationMinutes} min</div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm" variant="outline" className="text-xs border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                              onClick={() => handleOpenReminder(appt)}
                            >
                              📧 Recordar
                            </Button>
                            <Button
                              size="sm" variant="outline" className="text-xs border-gray-600 text-gray-200 hover:bg-gray-700"
                              onClick={() => setEditingAppt(appt)}
                            >
                              ✏ Reagendar
                            </Button>
                            <Button
                              size="sm" variant="outline" className="text-xs border-green-600/50 text-green-400 hover:bg-green-900/30"
                              onClick={() => updateAppt.mutate({ id: appt.id, status: "completed" })}
                            >
                              ✓ Completar
                            </Button>
                            <Button
                              size="sm" variant="outline" className="text-xs border-red-600/50 text-red-400 hover:bg-red-900/30"
                              onClick={() => updateAppt.mutate({ id: appt.id, status: "cancelled" })}
                            >
                              ✕ Cancelar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB: Calendario */}
          <TabsContent value="calendar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <MiniCalendar
                  appointments={appointments}
                  onSelectDate={(date) => setCalendarDate(date)}
                />
                {calendarDate && (
                  <div className="mt-2 text-center text-sm text-gray-400">
                    Mostrando citas del{" "}
                    <span className="text-white font-semibold">
                      {calendarDate.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
              <div>
                {!calendarDate ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">📆</div>
                    <div>Selecciona un día en el calendario para ver las citas</div>
                  </div>
                ) : calendarAppts.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">📅</div>
                    <div>Sin citas para este día</div>
                    <Button
                      className="mt-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white"
                      onClick={() => setShowApptForm(true)}
                    >
                      + Agendar cita
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-white mb-2">{calendarAppts.length} cita(s)</div>
                    {calendarAppts.map((appt) => {
                      const p = patients.find(pt => pt.id === appt.patientId);
                      const st = statusLabel(appt.status);
                      return (
                        <div key={appt.id} className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-white">{appt.title}</div>
                              {p && <div className="text-sm text-[#FF6B00]">{p.firstName} {p.lastName}</div>}
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(appt.appointmentDate).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · {appt.durationMinutes} min
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded border ml-2 ${st.color}`}>{st.label}</span>
                          </div>
                          {appt.status === "scheduled" && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              <Button size="sm" variant="outline" className="text-xs border-gray-600 text-gray-200 hover:bg-gray-700"
                                onClick={() => setEditingAppt(appt)}>
                                ✏ Reagendar
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs border-green-600/50 text-green-400 hover:bg-green-900/30"
                                onClick={() => updateAppt.mutate({ id: appt.id, status: "completed" })}>
                                ✓ Completar
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs border-red-600/50 text-red-400 hover:bg-red-900/30"
                                onClick={() => updateAppt.mutate({ id: appt.id, status: "cancelled" })}>
                                ✕ Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: Nuevo paciente */}
      <Dialog open={showPatientForm} onOpenChange={setShowPatientForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar nuevo paciente</DialogTitle>
          </DialogHeader>
          <PatientForm
            onSave={(data) => createPatient.mutate(data as Parameters<typeof createPatient.mutate>[0])}
            onCancel={() => setShowPatientForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Nueva cita global */}
      <Dialog open={showApptForm} onOpenChange={setShowApptForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar nueva cita</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            patients={patients}
            onSave={(data) => createAppt.mutate(data)}
            onCancel={() => setShowApptForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Reagendar cita (desde agenda/calendario) */}
      <Dialog open={!!editingAppt && !selectedPatient} onOpenChange={() => setEditingAppt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reagendar cita</DialogTitle>
          </DialogHeader>
          {editingAppt && (
            <AppointmentForm
              patients={patients}
              initial={editingAppt}
              onSave={(data) => updateAppt.mutate({
                id: editingAppt.id,
                title: data.title,
                appointmentDate: data.appointmentDate,
                durationMinutes: data.durationMinutes,
                notes: data.notes,
                status: "scheduled",
              })}
              onCancel={() => setEditingAppt(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Panel lateral de paciente */}
      {selectedPatient && (
        <PatientDetailPanel
          patient={selectedPatient}
          onClose={() => { setSelectedPatient(null); setEditingAppt(null); }}
        />
      )}
    </DashboardLayout>
  );
}
