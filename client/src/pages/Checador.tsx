import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Clock,
  LogIn,
  LogOut,
  Users,
  Search,
  Calendar,
  Timer,
  Download,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Coffee,
  Stethoscope,
  FileCheck,
  FileX,
  PlusCircle,
} from "lucide-react";

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ABSENCE_TYPES = [
  { value: "rest",         label: "Descanso",           icon: Coffee,        color: "bg-blue-100 text-blue-700" },
  { value: "sick_leave",   label: "Incapacidad",         icon: Stethoscope,   color: "bg-red-100 text-red-700" },
  { value: "paid_leave",   label: "Permiso con goce",    icon: FileCheck,     color: "bg-green-100 text-green-700" },
  { value: "unpaid_leave", label: "Permiso sin goce",    icon: FileX,         color: "bg-orange-100 text-orange-700" },
];

function getAbsenceConfig(type: string) {
  return ABSENCE_TYPES.find(a => a.value === type) || ABSENCE_TYPES[0];
}

function formatTime(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Reloj en tiempo real
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="text-center">
      <div className="text-5xl font-mono font-bold text-primary tabular-nums">
        {time.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {time.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}

type AttRec = {
  id: number;
  employeeId: number;
  type: string;
  timestamp: Date | string;
  notes?: string | null;
  absenceType?: string | null;
  comment?: string | null;
  editedAt?: Date | string | null;
};

type EmpInfo = {
  id: number;
  fullName: string;
  employeeNumber?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  dailyRate?: string | null;
};

// ─── Modal historial detallado de un colaborador ─────────────────────────────
function EmployeeHistoryModal({
  employee,
  isAdmin,
  onClose,
  onAbsence,
}: {
  employee: EmpInfo | null;
  isAdmin: boolean;
  onClose: () => void;
  onAbsence: (emp: EmpInfo) => void;
}) {
  const today = new Date();
  const [histYear, setHistYear] = useState(today.getFullYear());
  const [histMonth, setHistMonth] = useState(today.getMonth() + 1);
  const [editRec, setEditRec] = useState<AttRec | null>(null);
  const [editForm, setEditForm] = useState({ type: "in", timestamp: "", notes: "", absenceType: "rest", comment: "" });

  // Sin filtro de mes por defecto para mostrar todos los registros disponibles
  const historyQuery = trpc.attendance.employeeHistory.useQuery(
    { employeeId: employee?.id ?? 0, year: histYear, month: histMonth },
    { enabled: !!employee, staleTime: 0 }
  );

  const utils = trpc.useUtils();

  const editMutation = trpc.attendance.editRecord.useMutation({
    onSuccess: () => {
      toast.success("Registro actualizado");
      historyQuery.refetch();
      utils.attendance.getAll.invalidate();
      setEditRec(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.attendance.deleteRecord.useMutation({
    onSuccess: () => {
      toast.success("Registro eliminado");
      historyQuery.refetch();
      utils.attendance.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(rec: AttRec) {
    setEditRec(rec);
    const ts = new Date(rec.timestamp);
    const localISO = new Date(ts.getTime() - ts.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditForm({
      type: rec.type,
      timestamp: localISO,
      notes: rec.notes || "",
      absenceType: rec.absenceType || "rest",
      comment: rec.comment || "",
    });
  }

  function handleEdit() {
    if (!editRec) return;
    editMutation.mutate({
      id: editRec.id,
      type: editForm.type as "in" | "out" | "absence",
      timestamp: editForm.type !== "absence" && editForm.timestamp ? new Date(editForm.timestamp).toISOString() : undefined,
      notes: editForm.notes || null,
      absenceType: editForm.type === "absence" ? editForm.absenceType as "rest" | "sick_leave" | "paid_leave" | "unpaid_leave" : null,
      comment: editForm.comment || null,
    });
  }

  const records: AttRec[] = (historyQuery.data?.records ?? []) as AttRec[];

  // Agrupar por día
  const byDay: Record<string, AttRec[]> = {};
  for (const r of records) {
    const day = new Date(r.timestamp).toISOString().split("T")[0];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(r);
  }
  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  const totalWorkedMins = sortedDays.reduce((sum, day) => {
    const recs = byDay[day];
    const inRec = recs.find(r => r.type === "in");
    const outRec = recs.find(r => r.type === "out");
    if (inRec && outRec) {
      const mins = Math.round((new Date(outRec.timestamp).getTime() - new Date(inRec.timestamp).getTime()) / 60000);
      return sum + (mins > 0 ? mins : 0);
    }
    return sum;
  }, 0);

  if (!employee) return null;

  return (
    <>
      <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Historial — {employee.fullName}
              {employee.employeeNumber && <span className="text-xs text-muted-foreground font-normal">#{employee.employeeNumber}</span>}
            </DialogTitle>
            {employee.position && <p className="text-sm text-muted-foreground">{employee.position}</p>}
          </DialogHeader>

          {/* Selector de mes/año */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(histMonth)} onValueChange={v => setHistMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(histYear)} onValueChange={v => setHistYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {employee.dailyRate && (
              <span className="text-sm text-muted-foreground ml-auto">
                Salario diario: <strong className="text-primary">${parseFloat(employee.dailyRate).toFixed(2)}</strong>
              </span>
            )}
          </div>

          {/* Resumen */}
          {sortedDays.length > 0 && (
            <div className="flex gap-4 bg-muted/40 rounded-lg p-3 text-sm flex-wrap">
              <div className="text-center">
                <p className="font-bold text-lg">{sortedDays.length}</p>
                <p className="text-xs text-muted-foreground">Días registrados</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{Math.floor(totalWorkedMins / 60)}h {totalWorkedMins % 60}m</p>
                <p className="text-xs text-muted-foreground">Total horas</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{records.filter(r => r.type === "absence").length}</p>
                <p className="text-xs text-muted-foreground">Ausencias</p>
              </div>
            </div>
          )}

          {/* Lista de días */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {historyQuery.isLoading ? (
              <p className="text-center text-muted-foreground py-6">Cargando historial...</p>
            ) : sortedDays.length === 0 ? (
              <div className="text-center py-10">
                <Timer className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground text-sm">Sin registros en este período</p>
              </div>
            ) : (
              sortedDays.map(day => {
                const recs = byDay[day];
                const inRec = recs.find(r => r.type === "in");
                const outRec = recs.find(r => r.type === "out");
                const absRec = recs.find(r => r.type === "absence");
                let hoursWorked = "";
                if (inRec && outRec) {
                  const totalMs = new Date(outRec.timestamp).getTime() - new Date(inRec.timestamp).getTime();
                  const totalSecs = Math.round(totalMs / 1000);
                  const mins = Math.round(totalMs / 60000);
                  if (totalSecs < 60) {
                    hoursWorked = `${totalSecs}s`;
                  } else if (mins < 60) {
                    hoursWorked = `${mins}m`;
                  } else {
                    hoursWorked = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                  }
                }
                return (
                  <div key={day} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <span className="font-medium text-sm capitalize">{formatDateFull(day)}</span>
                      <div className="flex items-center gap-2">
                        {hoursWorked && <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{hoursWorked}</span>}
                        {absRec && (
                          <Badge className={`border-0 text-xs ${getAbsenceConfig(absRec.absenceType || "rest").color}`}>
                            {getAbsenceConfig(absRec.absenceType || "rest").label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {recs.map(r => (
                        <div key={r.id} className="group flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2 py-1">
                          {r.type === "in" && <LogIn className="w-3.5 h-3.5 text-green-500" />}
                          {r.type === "out" && <LogOut className="w-3.5 h-3.5 text-red-500" />}
                          {r.type === "absence" && <AlertCircle className="w-3.5 h-3.5 text-orange-500" />}
                          <span>
                            {r.type === "in" && `Entrada: ${formatTime(r.timestamp)}`}
                            {r.type === "out" && `Salida: ${formatTime(r.timestamp)}`}
                            {r.type === "absence" && (r.comment ? `${getAbsenceConfig(r.absenceType || "rest").label}: ${r.comment}` : getAbsenceConfig(r.absenceType || "rest").label)}
                          </span>
                          {r.editedAt && <span className="text-muted-foreground/50 text-xs" title="Editado por admin">✎</span>}
                          {isAdmin && (
                            <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                              <button onClick={() => openEdit(r)} className="text-blue-400 hover:text-blue-600 p-0.5"><Pencil className="w-3 h-3" /></button>
                              <button
                                onClick={() => {
                                  if (confirm("¿Eliminar este registro? Esta acción no se puede deshacer."))
                                    deleteMutation.mutate({ id: r.id });
                                }}
                                className="text-red-400 hover:text-red-600 p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            {isAdmin && (
              <Button
                className="bg-orange-500 hover:bg-orange-400 text-white"
                onClick={() => { onAbsence(employee); onClose(); }}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Registrar ausencia
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar registro */}
      {isAdmin && (
        <Dialog open={!!editRec} onOpenChange={v => { if (!v) setEditRec(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-500" />
                Editar Registro #{editRec?.id}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Tipo</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Salida</SelectItem>
                    <SelectItem value="absence">Ausencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.type !== "absence" && (
                <div>
                  <Label>Fecha y hora</Label>
                  <Input type="datetime-local" value={editForm.timestamp} onChange={e => setEditForm(f => ({ ...f, timestamp: e.target.value }))} className="mt-1" />
                </div>
              )}
              {editForm.type === "absence" && (
                <>
                  <div>
                    <Label>Tipo de ausencia</Label>
                    <Select value={editForm.absenceType} onValueChange={v => setEditForm(f => ({ ...f, absenceType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ABSENCE_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Comentario</Label>
                    <Textarea value={editForm.comment} onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))} rows={2} className="mt-1" />
                  </div>
                </>
              )}
              <div>
                <Label>Notas</Label>
                <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas opcionales..." className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRec(null)}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={editMutation.isPending} className="bg-blue-600 hover:bg-blue-500 text-white">
                {editMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Tarjeta de empleado ─────────────────────────────────────────────────────
function EmployeeCheckCard({
  employee,
  onCheckIn,
  isPending,
  onViewHistory,
  onAbsence,
  isAdmin,
}: {
  employee: EmpInfo;
  onCheckIn: (type: "in" | "out") => void;
  isPending: boolean;
  onViewHistory: () => void;
  onAbsence: () => void;
  isAdmin: boolean;
}) {
  const lastRecordQuery = trpc.attendance.getLastRecord.useQuery({ employeeId: employee.id });
  const lastRecord = lastRecordQuery.data;
  const isCurrentlyIn = lastRecord?.type === "in";
  const initials = employee.fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
      <button onClick={onViewHistory} className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-full" title={`Ver historial de ${employee.fullName}`}>
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={employee.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-bold text-primary text-sm">
            {initials}
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewHistory}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate hover:text-primary transition-colors">{employee.fullName}</p>
          {employee.employeeNumber && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{employee.employeeNumber}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{employee.position ?? "Sin puesto"}</p>
        {lastRecord && (
          <p className="text-xs text-muted-foreground">
            {lastRecord.type === "in" ? "✅ Entrada" : lastRecord.type === "out" ? "🔴 Salida" : "⚠️ Ausencia"}{" "}
            {new Date(lastRecord.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
        <Button
          size="sm"
          variant={isCurrentlyIn ? "outline" : "default"}
          className={isCurrentlyIn ? "" : "bg-green-600 hover:bg-green-700 text-white"}
          onClick={() => onCheckIn("in")}
          disabled={isPending || isCurrentlyIn}
          title="Registrar Entrada"
        >
          <LogIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={isCurrentlyIn ? "destructive" : "outline"}
          onClick={() => onCheckIn("out")}
          disabled={isPending || !isCurrentlyIn}
          title="Registrar Salida"
        >
          <LogOut className="w-4 h-4" />
        </Button>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={onAbsence} title="Registrar Ausencia" className="text-orange-500 border-orange-200 hover:bg-orange-50">
            <AlertCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Checador() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmpInfo | null>(null);
  const [absenceEmployee, setAbsenceEmployee] = useState<EmpInfo | null>(null);
  const [absenceForm, setAbsenceForm] = useState({
    date: new Date().toISOString().split("T")[0],
    absenceType: "rest",
    comment: "",
  });

  const employeesQuery = trpc.employees.list.useQuery();
  const attendanceQuery = trpc.attendance.getAll.useQuery({ startDate: dateFilter, endDate: dateFilter });
  const utils = trpc.useUtils();

  const checkInMutation = trpc.attendance.checkIn.useMutation({
    onSuccess: (data) => {
      const label = data.type === "in" ? "✅ Entrada registrada" : "🔴 Salida registrada";
      toast.success(label, { description: formatTime(data.timestamp) });
      utils.attendance.getAll.invalidate();
      utils.attendance.getLastRecord.invalidate({ employeeId: data.employeeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const absenceMutation = trpc.attendance.registerAbsence.useMutation({
    onSuccess: () => {
      toast.success("Ausencia registrada");
      utils.attendance.getAll.invalidate();
      setAbsenceEmployee(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const employees = (employeesQuery.data ?? []) as EmpInfo[];
  const attendance = attendanceQuery.data ?? [];

  const filteredEmployees = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (e.position ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (e.employeeNumber ?? "").includes(search)
  );

  const todayIn = attendance.filter(a => a.type === "in").length;
  const todayOut = attendance.filter(a => a.type === "out").length;
  const todayAbsences = attendance.filter(a => a.type === "absence").length;

  // Generar reporte mensual HTML
  const generateReport = async () => {
    setGeneratingPdf(true);
    try {
      const result = await utils.attendance.getMonthlyReport.fetch({ year: reportYear, month: reportMonth });
      if (!result) { toast.error("No se pudo obtener los datos"); return; }
      const monthLabel = `${MONTH_NAMES[result.month - 1]} ${result.year}`;
      const rows = result.employees.map(emp => {
        const detail = emp.dailyDetails.map(d =>
          `<tr><td style="padding:5px 10px;font-size:12px;border-bottom:1px solid #f3f4f6;">${d.date}</td><td style="padding:5px 10px;font-size:12px;border-bottom:1px solid #f3f4f6;">${d.checkIn}</td><td style="padding:5px 10px;font-size:12px;border-bottom:1px solid #f3f4f6;">${d.checkOut}</td><td style="padding:5px 10px;font-size:12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${d.hours}</td></tr>`
        ).join("");
        return `<div style="margin-bottom:28px;page-break-inside:avoid;">
          <div style="background:#f0fdf4;border-left:4px solid #00c853;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div><strong style="font-size:14px;">${emp.name}</strong>${emp.employeeNumber ? `<span style="color:#6b7280;font-size:12px;margin-left:8px;">#${emp.employeeNumber}</span>` : ""}${emp.position ? `<span style="color:#6b7280;font-size:12px;margin-left:8px;">· ${emp.position}</span>` : ""}</div>
            <span style="font-size:13px;color:#00c853;font-weight:700;">${emp.daysWorked} días · ${emp.totalHours}</span>
          </div>
          <table width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;">
            <thead><tr style="background:#f9fafb;"><th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Fecha</th><th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Entrada</th><th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Salida</th><th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Horas</th></tr></thead>
            <tbody>${detail || '<tr><td colspan="4" style="padding:10px;color:#9ca3af;font-size:12px;text-align:center;">Sin registros este mes</td></tr>'}</tbody>
          </table></div>`;
      }).join("");
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte de Asistencia ${monthLabel}</title><style>@media print{body{margin:0;}}body{font-family:Arial,sans-serif;padding:32px;color:#111;max-width:800px;margin:0 auto;}</style></head><body>
        <div style="text-align:center;margin-bottom:28px;border-bottom:2px solid #00c853;padding-bottom:16px;">
          <h1 style="color:#00c853;font-size:26px;margin:0;font-weight:800;">KobraPay</h1>
          <h2 style="font-size:18px;margin:6px 0 4px;color:#111;">Reporte de Asistencia</h2>
          <p style="color:#6b7280;font-size:14px;margin:0;">${monthLabel} · Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}</p>
        </div>
        <div style="margin-bottom:20px;background:#f9fafb;border-radius:8px;padding:12px 16px;display:flex;gap:24px;">
          <div><span style="font-size:12px;color:#6b7280;">Total colaboradores</span><br><strong style="font-size:20px;">${result.employees.length}</strong></div>
          <div><span style="font-size:12px;color:#6b7280;">Con registros</span><br><strong style="font-size:20px;">${result.employees.filter(e => e.daysWorked > 0).length}</strong></div>
        </div>${rows}
        <div style="margin-top:32px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px;">KobraPay · kobrapay.mx · Reporte generado automáticamente</div>
      </body></html>`;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Asistencia_${MONTH_NAMES[result.month - 1]}_${result.year}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Reporte de ${monthLabel} descargado`, { description: "Abre el archivo HTML e imprime como PDF." });
    } catch { toast.error("Error al generar el reporte"); }
    finally { setGeneratingPdf(false); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Reloj Checador
            </h1>
            <p className="text-muted-foreground text-sm">Haz clic en un colaborador para ver su historial completo</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className="text-sm border border-border rounded-md px-2 py-1.5 bg-background">
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="text-sm border border-border rounded-md px-2 py-1.5 bg-background">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={generateReport} disabled={generatingPdf}>
              {generatingPdf ? <><FileText className="w-4 h-4 mr-1.5 animate-pulse" />Generando...</> : <><Download className="w-4 h-4 mr-1.5" />Reporte Mensual</>}
            </Button>
          </div>
        </div>

        {/* Reloj + KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="pt-6 pb-4"><LiveClock /></CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><LogIn className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-2xl font-bold">{todayIn}</p><p className="text-xs text-muted-foreground">Entradas hoy</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><LogOut className="w-5 h-5 text-red-500" /></div>
                <div><p className="text-2xl font-bold">{todayOut}</p><p className="text-xs text-muted-foreground">Salidas hoy</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {todayAbsences > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-orange-700">
            <AlertCircle className="w-4 h-4" />
            <span>{todayAbsences} ausencia{todayAbsences > 1 ? "s" : ""} registrada{todayAbsences > 1 ? "s" : ""} hoy</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de colaboradores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Registrar Asistencia
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar colaborador..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="max-h-[480px] overflow-y-auto space-y-2">
              {employeesQuery.isLoading ? (
                <p className="text-center text-muted-foreground py-4">Cargando...</p>
              ) : filteredEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No hay colaboradores registrados</p>
              ) : (
                filteredEmployees.map(emp => (
                  <EmployeeCheckCard
                    key={emp.id}
                    employee={emp}
                    onCheckIn={(type) => checkInMutation.mutate({ employeeId: emp.id, type })}
                    isPending={checkInMutation.isPending && checkInMutation.variables?.employeeId === emp.id}
                    onViewHistory={() => setSelectedEmployee(emp)}
                    onAbsence={() => setAbsenceEmployee(emp)}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Historial del día */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Historial del Día
              </CardTitle>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full" />
            </CardHeader>
            <CardContent className="max-h-[480px] overflow-y-auto space-y-2">
              {attendanceQuery.isLoading ? (
                <p className="text-center text-muted-foreground py-4">Cargando...</p>
              ) : attendance.length === 0 ? (
                <div className="text-center py-8">
                  <Timer className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Sin registros para esta fecha</p>
                </div>
              ) : (
                attendance.map(record => {
                  const emp = employees.find(e => e.id === record.employeeId);
                  const isAbsence = record.type === "absence";
                  const absConfig = isAbsence ? getAbsenceConfig((record as AttRec).absenceType || "rest") : null;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => emp && setSelectedEmployee(emp)}
                      title="Ver historial completo"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${record.type === "in" ? "bg-green-100" : isAbsence ? "bg-orange-100" : "bg-red-100"}`}>
                        {record.type === "in" && <LogIn className="w-4 h-4 text-green-600" />}
                        {record.type === "out" && <LogOut className="w-4 h-4 text-red-500" />}
                        {isAbsence && <AlertCircle className="w-4 h-4 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{emp?.fullName ?? `#${record.employeeId}`}</p>
                        <p className="text-xs text-muted-foreground">{emp?.position ?? ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {!isAbsence && <p className="text-sm font-mono font-bold">{formatTime(record.timestamp)}</p>}
                        {isAbsence ? (
                          <Badge className={`text-xs border-0 ${absConfig?.color}`}>{absConfig?.label}</Badge>
                        ) : (
                          <Badge variant={record.type === "in" ? "default" : "destructive"} className="text-xs">
                            {record.type === "in" ? "Entrada" : "Salida"}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal historial por colaborador */}
      <EmployeeHistoryModal
        employee={selectedEmployee}
        isAdmin={isAdmin}
        onClose={() => setSelectedEmployee(null)}
        onAbsence={(emp) => setAbsenceEmployee(emp)}
      />

      {/* Modal registrar ausencia */}
      <Dialog open={!!absenceEmployee} onOpenChange={v => { if (!v) setAbsenceEmployee(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Registrar Ausencia — {absenceEmployee?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fecha de ausencia</Label>
              <Input type="date" value={absenceForm.date} onChange={e => setAbsenceForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Tipo de ausencia</Label>
              <Select value={absenceForm.absenceType} onValueChange={v => setAbsenceForm(f => ({ ...f, absenceType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ABSENCE_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comentario / Motivo</Label>
              <Textarea
                placeholder="Describe el motivo de la ausencia..."
                value={absenceForm.comment}
                onChange={e => setAbsenceForm(f => ({ ...f, comment: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceEmployee(null)}>Cancelar</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-400 text-white"
              onClick={() => {
                if (!absenceEmployee) return;
                absenceMutation.mutate({
                  employeeId: absenceEmployee.id,
                  date: absenceForm.date,
                  absenceType: absenceForm.absenceType as "rest" | "sick_leave" | "paid_leave" | "unpaid_leave",
                  comment: absenceForm.comment || undefined,
                });
              }}
              disabled={absenceMutation.isPending}
            >
              {absenceMutation.isPending ? "Guardando..." : "Registrar ausencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
