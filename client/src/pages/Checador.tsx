import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatTime(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

export default function Checador() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const employeesQuery = trpc.employees.list.useQuery();
  const attendanceQuery = trpc.attendance.getAll.useQuery({
    startDate: dateFilter,
    endDate: dateFilter,
  });
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

  const employees = employeesQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];

  const filteredEmployees = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (e.position ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (e.employeeNumber ?? "").includes(search)
  );

  const todayIn = attendance.filter(a => a.type === "in").length;
  const todayOut = attendance.filter(a => a.type === "out").length;

  // Generar reporte mensual HTML descargable
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
        return `
          <div style="margin-bottom:28px;page-break-inside:avoid;">
            <div style="background:#f0fdf4;border-left:4px solid #00c853;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="font-size:14px;">${emp.name}</strong>
                ${emp.employeeNumber ? `<span style="color:#6b7280;font-size:12px;margin-left:8px;">#${emp.employeeNumber}</span>` : ""}
                ${emp.position ? `<span style="color:#6b7280;font-size:12px;margin-left:8px;">· ${emp.position}</span>` : ""}
              </div>
              <span style="font-size:13px;color:#00c853;font-weight:700;">${emp.daysWorked} días · ${emp.totalHours}</span>
            </div>
            <table width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
              <thead><tr style="background:#f9fafb;">
                <th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Fecha</th>
                <th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Entrada</th>
                <th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Salida</th>
                <th style="padding:7px 10px;font-size:11px;text-align:left;color:#6b7280;">Horas</th>
              </tr></thead>
              <tbody>${detail || '<tr><td colspan="4" style="padding:10px;color:#9ca3af;font-size:12px;text-align:center;">Sin registros este mes</td></tr>'}</tbody>
            </table>
          </div>`;
      }).join("");

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Asistencia ${monthLabel}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; max-width: 800px; margin: 0 auto; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:28px;border-bottom:2px solid #00c853;padding-bottom:16px;">
    <h1 style="color:#00c853;font-size:26px;margin:0;font-weight:800;">KobraPay</h1>
    <h2 style="font-size:18px;margin:6px 0 4px;color:#111;">Reporte de Asistencia</h2>
    <p style="color:#6b7280;font-size:14px;margin:0;">${monthLabel} · Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}</p>
  </div>
  <div style="margin-bottom:20px;background:#f9fafb;border-radius:8px;padding:12px 16px;display:flex;gap:24px;">
    <div><span style="font-size:12px;color:#6b7280;">Total colaboradores</span><br><strong style="font-size:20px;">${result.employees.length}</strong></div>
    <div><span style="font-size:12px;color:#6b7280;">Con registros</span><br><strong style="font-size:20px;">${result.employees.filter(e => e.daysWorked > 0).length}</strong></div>
  </div>
  ${rows}
  <div style="margin-top:32px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px;">
    KobraPay · kobrapay.mx · Reporte generado automáticamente
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Asistencia_${MONTH_NAMES[result.month - 1]}_${result.year}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Reporte de ${monthLabel} descargado`, { description: "Abre el archivo HTML en tu navegador e imprime como PDF." });
    } catch (e) {
      toast.error("Error al generar el reporte");
    } finally {
      setGeneratingPdf(false);
    }
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
            <p className="text-muted-foreground text-sm">Registra entradas y salidas de tus colaboradores</p>
          </div>
          {/* Reporte mensual */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={reportMonth}
              onChange={e => setReportMonth(Number(e.target.value))}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
            >
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={reportYear}
              onChange={e => setReportYear(Number(e.target.value))}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={generateReport} disabled={generatingPdf}>
              {generatingPdf
                ? <><FileText className="w-4 h-4 mr-1.5 animate-pulse" />Generando...</>
                : <><Download className="w-4 h-4 mr-1.5" />Reporte Mensual</>}
            </Button>
          </div>
        </div>

        {/* Reloj + Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="pt-6 pb-4">
              <LiveClock />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayIn}</p>
                  <p className="text-xs text-muted-foreground">Entradas hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayOut}</p>
                  <p className="text-xs text-muted-foreground">Salidas hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Colaboradores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Registrar Asistencia
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
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
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Historial del día */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Historial
              </CardTitle>
              <Input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full"
              />
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-2">
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
                  return (
                    <div key={record.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${record.type === "in" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                        {record.type === "in"
                          ? <LogIn className="w-4 h-4 text-green-600" />
                          : <LogOut className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{emp?.fullName ?? `#${record.employeeId}`}</p>
                        <p className="text-xs text-muted-foreground">{emp?.position ?? ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono font-bold">{formatTime(record.timestamp)}</p>
                        <Badge variant={record.type === "in" ? "default" : "destructive"} className="text-xs">
                          {record.type === "in" ? "Entrada" : "Salida"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Tarjeta de empleado con botones de entrada/salida ───────────────────────
function EmployeeCheckCard({
  employee,
  onCheckIn,
  isPending,
}: {
  employee: { id: number; fullName: string; position?: string | null; photoUrl?: string | null; employeeNumber?: string | null };
  onCheckIn: (type: "in" | "out") => void;
  isPending: boolean;
}) {
  const lastRecordQuery = trpc.attendance.getLastRecord.useQuery({ employeeId: employee.id });
  const lastRecord = lastRecordQuery.data;
  const isCurrentlyIn = lastRecord?.type === "in";
  const initials = employee.fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {employee.photoUrl ? (
        <img src={employee.photoUrl} alt={employee.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{employee.fullName}</p>
          {employee.employeeNumber && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{employee.employeeNumber}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{employee.position ?? "Sin puesto"}</p>
        {lastRecord && (
          <p className="text-xs text-muted-foreground">
            Último: {lastRecord.type === "in" ? "Entrada" : "Salida"} {new Date(lastRecord.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
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
      </div>
    </div>
  );
}
