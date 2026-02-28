import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Calculator,
  Download,
  Edit2,
  Users,
  DollarSign,
  Clock,
  Calendar,
  Building2,
  CreditCard,
  CheckCircle,
} from "lucide-react";

type PayrollRow = {
  employeeId: number;
  employeeNumber: string;
  fullName: string;
  position: string;
  department: string;
  hourlyRate: number;
  totalHours: number;
  daysWorked: number;
  grossPay: number;
  imss: number;
  isr: number;
  netPay: number;
  paymentCycle: string;
  bankName: string;
  clabe: string;
  bankAccountHolder: string;
  status: string;
};

function getDefaultDates(cycle: string) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (cycle === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  } else if (cycle === "biweekly") {
    if (day <= 15) {
      return {
        start: new Date(year, month, 1).toISOString().slice(0, 10),
        end: new Date(year, month, 15).toISOString().slice(0, 10),
      };
    } else {
      return {
        start: new Date(year, month, 16).toISOString().slice(0, 10),
        end: new Date(year, month + 1, 0).toISOString().slice(0, 10),
      };
    }
  } else {
    // weekly
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  }
}

const CYCLE_LABELS: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

export default function Nomina() {
  const [cycle, setCycle] = useState<"weekly" | "biweekly" | "monthly">("biweekly");
  const defaultDates = useMemo(() => getDefaultDates(cycle), [cycle]);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [queryDates, setQueryDates] = useState({ start: defaultDates.start, end: defaultDates.end, cycle });

  // Edit payroll data dialog
  const [editEmployee, setEditEmployee] = useState<PayrollRow | null>(null);
  const [editForm, setEditForm] = useState({
    hourlyRate: "",
    paymentCycle: "biweekly" as "weekly" | "biweekly" | "monthly",
    bankName: "",
    clabe: "",
    bankAccountHolder: "",
  });

  const { data: payrollData, isLoading, refetch } = trpc.payroll.calculate.useQuery(
    { startDate: queryDates.start, endDate: queryDates.end, cycle: queryDates.cycle },
    { enabled: true }
  );

  const updatePayroll = trpc.payroll.updatePayrollData.useMutation({
    onSuccess: () => {
      toast.success("Datos actualizados", { description: "Los datos de nómina se guardaron correctamente." });
      setEditEmployee(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows: PayrollRow[] = payrollData?.rows ?? [];
  const activeRows = rows.filter((r) => r.status === "active");

  const totals = useMemo(() => ({
    grossPay: activeRows.reduce((s, r) => s + r.grossPay, 0),
    imss: activeRows.reduce((s, r) => s + r.imss, 0),
    isr: activeRows.reduce((s, r) => s + r.isr, 0),
    netPay: activeRows.reduce((s, r) => s + r.netPay, 0),
    totalHours: activeRows.reduce((s, r) => s + r.totalHours, 0),
  }), [activeRows]);

  function handleCalculate() {
    setQueryDates({ start: startDate, end: endDate, cycle });
  }

  function openEdit(row: PayrollRow) {
    setEditEmployee(row);
    setEditForm({
      hourlyRate: row.hourlyRate > 0 ? String(row.hourlyRate) : "",
      paymentCycle: (row.paymentCycle as "weekly" | "biweekly" | "monthly") || "biweekly",
      bankName: row.bankName,
      clabe: row.clabe,
      bankAccountHolder: row.bankAccountHolder,
    });
  }

  function handleSaveEdit() {
    if (!editEmployee) return;
    updatePayroll.mutate({
      employeeId: editEmployee.employeeId,
      hourlyRate: editForm.hourlyRate || undefined,
      paymentCycle: editForm.paymentCycle,
      bankName: editForm.bankName || undefined,
      clabe: editForm.clabe || undefined,
      bankAccountHolder: editForm.bankAccountHolder || undefined,
    });
  }

  function exportHTML() {
    const fmt = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    const rows_html = activeRows.map((r) => `
      <tr>
        <td>${r.employeeNumber || "-"}</td>
        <td>${r.fullName}</td>
        <td>${r.position}</td>
        <td>${r.department}</td>
        <td>${r.daysWorked}</td>
        <td>${r.totalHours}h</td>
        <td>${fmt(r.hourlyRate)}/h</td>
        <td>${fmt(r.grossPay)}</td>
        <td>${fmt(r.imss)}</td>
        <td>${fmt(r.isr)}</td>
        <td><strong>${fmt(r.netPay)}</strong></td>
        <td>${r.bankName || "-"}</td>
        <td>${r.clabe ? "****" + r.clabe.slice(-4) : "-"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nómina ${queryDates.start} al ${queryDates.end}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
  h1 { color: #1a1a2e; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1a1a2e; color: white; padding: 8px 6px; text-align: left; }
  td { padding: 6px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .totals td { font-weight: bold; background: #f0f4ff; border-top: 2px solid #1a1a2e; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<h1>Nómina ${CYCLE_LABELS[queryDates.cycle]} — ${queryDates.start} al ${queryDates.end}</h1>
<p>Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
<table>
  <thead><tr>
    <th>No.</th><th>Colaborador</th><th>Puesto</th><th>Depto.</th>
    <th>Días</th><th>Horas</th><th>Tarifa</th>
    <th>Salario Bruto</th><th>IMSS</th><th>ISR</th><th>Neto a Pagar</th>
    <th>Banco</th><th>CLABE</th>
  </tr></thead>
  <tbody>${rows_html}</tbody>
  <tfoot><tr class="totals">
    <td colspan="4">TOTALES (${activeRows.length} colaboradores)</td>
    <td>-</td><td>${totals.totalHours.toFixed(1)}h</td><td>-</td>
    <td>${fmt(totals.grossPay)}</td>
    <td>${fmt(totals.imss)}</td>
    <td>${fmt(totals.isr)}</td>
    <td>${fmt(totals.netPay)}</td>
    <td colspan="2">-</td>
  </tr></tfoot>
</table>
<br><p style="font-size:10px;color:#999">* IMSS calculado al 1.75% (cuota obrera). ISR estimado: 6.4% para salarios entre $5,000-$10,000 y 10% para salarios mayores a $10,000. Consulte a su contador para cálculos definitivos.</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nomina_${queryDates.start}_${queryDates.end}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Nómina exportada", { description: "Abre el archivo y usa Ctrl+P para imprimir como PDF." });
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" />
              Nómina
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cálculo automático de pago por colaborador basado en horas del Reloj Checador
            </p>
          </div>
          {activeRows.length > 0 && (
            <Button onClick={exportHTML} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Nómina
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label>Tipo de período</Label>
              <Select value={cycle} onValueChange={(v) => {
                const c = v as "weekly" | "biweekly" | "monthly";
                setCycle(c);
                const d = getDefaultDates(c);
                setStartDate(d.start);
                setEndDate(d.end);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quincenal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha fin</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handleCalculate} className="gap-2">
              <Calculator className="w-4 h-4" />
              Calcular
            </Button>
          </div>
        </div>

        {/* KPIs */}
        {activeRows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: Users, label: "Colaboradores", value: activeRows.length.toString(), color: "text-blue-500" },
              { icon: Clock, label: "Horas Totales", value: `${totals.totalHours.toFixed(1)}h`, color: "text-purple-500" },
              { icon: DollarSign, label: "Salario Bruto", value: `$${totals.grossPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, color: "text-orange-500" },
              { icon: Building2, label: "Deducciones", value: `$${(totals.imss + totals.isr).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, color: "text-red-500" },
              { icon: CheckCircle, label: "Total Neto", value: `$${totals.netPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, color: "text-green-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="font-bold text-foreground">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabla de nómina */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Calculando nómina...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay colaboradores registrados</p>
            <p className="text-sm">Agrega colaboradores en Expedientes RH para calcular la nómina.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">No.</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Colaborador</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Puesto / Depto.</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Días</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Horas</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Tarifa/h</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Bruto</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">IMSS</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">ISR</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-green-600">Neto</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Banco</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.employeeId} className={`border-b border-border hover:bg-muted/30 transition-colors ${row.status !== "active" ? "opacity-50" : ""}`}>
                      <td className="p-3 text-muted-foreground text-xs">{row.employeeNumber || "-"}</td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{row.fullName}</div>
                        {row.status !== "active" && (
                          <Badge variant="secondary" className="text-xs mt-0.5">Inactivo</Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        <div>{row.position || "-"}</div>
                        <div>{row.department || "-"}</div>
                      </td>
                      <td className="p-3 text-right font-medium">{row.daysWorked}</td>
                      <td className="p-3 text-right font-medium">{row.totalHours}h</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.hourlyRate > 0 ? `$${row.hourlyRate.toFixed(2)}` : (
                          <span className="text-amber-500 text-xs">Sin tarifa</span>
                        )}
                      </td>
                      <td className="p-3 text-right">${row.grossPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-red-500 text-xs">-${row.imss.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-red-500 text-xs">-${row.isr.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right font-bold text-green-600">
                        ${row.netPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        {row.clabe ? (
                          <div className="text-xs">
                            <div className="font-medium">{row.bankName || "Banco"}</div>
                            <div className="text-muted-foreground">****{row.clabe.slice(-4)}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin datos</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(row)} className="h-7 w-7 p-0">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totales */}
                <tfoot>
                  <tr className="bg-muted/50 font-bold border-t-2 border-border">
                    <td colSpan={3} className="p-3 text-sm">TOTALES ({activeRows.length} colaboradores activos)</td>
                    <td className="p-3 text-right text-sm">-</td>
                    <td className="p-3 text-right text-sm">{totals.totalHours.toFixed(1)}h</td>
                    <td className="p-3 text-right text-sm">-</td>
                    <td className="p-3 text-right text-sm">${totals.grossPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-sm text-red-500">-${totals.imss.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-sm text-red-500">-${totals.isr.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-sm text-green-600">${totals.netPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                * IMSS: 1.75% cuota obrera. ISR estimado: 6.4% ($5K-$10K) / 10% (&gt;$10K). Consulte a su contador para cálculos definitivos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: editar datos de nómina */}
      <Dialog open={!!editEmployee} onOpenChange={(o) => !o && setEditEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Datos de Nómina — {editEmployee?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Salario por hora (MXN)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej: 75.00"
                  value={editForm.hourlyRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Ciclo de pago</Label>
                <Select value={editForm.paymentCycle} onValueChange={(v) => setEditForm((f) => ({ ...f, paymentCycle: v as "weekly" | "biweekly" | "monthly" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Banco</Label>
              <Input placeholder="Ej: BBVA, Banamex, HSBC..." value={editForm.bankName} onChange={(e) => setEditForm((f) => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>CLABE interbancaria (18 dígitos)</Label>
              <Input placeholder="000000000000000000" maxLength={18} value={editForm.clabe} onChange={(e) => setEditForm((f) => ({ ...f, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) }))} />
            </div>
            <div className="space-y-1">
              <Label>Titular de la cuenta</Label>
              <Input placeholder="Nombre del titular" value={editForm.bankAccountHolder} onChange={(e) => setEditForm((f) => ({ ...f, bankAccountHolder: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmployee(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updatePayroll.isPending}>
              {updatePayroll.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
