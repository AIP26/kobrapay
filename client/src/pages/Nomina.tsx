import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Calculator, Download, Edit2, Users, DollarSign, Clock } from "lucide-react";

const DAYS_ES: Record<string, string> = {
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
  thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
};

const CYCLE_ES: Record<string, string> = {
  weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual",
};

function getDefaultDates(cycle: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (cycle === "weekly") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
  }
  if (cycle === "biweekly") {
    const d = now.getDate();
    if (d <= 15) {
      return { start: `${year}-${String(month + 1).padStart(2, "0")}-01`, end: `${year}-${String(month + 1).padStart(2, "0")}-15` };
    } else {
      const last = new Date(year, month + 1, 0).getDate();
      return { start: `${year}-${String(month + 1).padStart(2, "0")}-16`, end: `${year}-${String(month + 1).padStart(2, "0")}-${last}` };
    }
  }
  const last = new Date(year, month + 1, 0).getDate();
  return { start: `${year}-${String(month + 1).padStart(2, "0")}-01`, end: `${year}-${String(month + 1).padStart(2, "0")}-${last}` };
}

type EditState = {
  id: number; name: string;
  dailyRate: string; dailyHours: string; restDay: string;
  overtimeEnabled: boolean; overtimeRate: string;
  paymentCycle: string; bankName: string; clabe: string; bankAccountHolder: string;
};

export default function Nomina() {
  const [cycle, setCycle] = useState<"weekly" | "biweekly" | "monthly">("biweekly");
  const defaultDates = useMemo(() => getDefaultDates(cycle), [cycle]);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [queryDates, setQueryDates] = useState<{ start: string; end: string; cycle: string } | null>(null);
  const [editEmp, setEditEmp] = useState<EditState | null>(null);

  const { data: payrollData, isLoading } = trpc.payroll.calculate.useQuery(
    {
      startDate: queryDates?.start ?? startDate,
      endDate: queryDates?.end ?? endDate,
      cycle: (queryDates?.cycle ?? cycle) as "weekly" | "biweekly" | "monthly",
    },
    { enabled: !!queryDates }
  );

  const utils = trpc.useUtils();
  const updatePayroll = trpc.payroll.updatePayrollData.useMutation({
    onSuccess: () => {
      toast.success("Datos de nómina actualizados");
      setEditEmp(null);
      utils.payroll.calculate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleCalculate() {
    setQueryDates({ start: startDate, end: endDate, cycle });
  }

  function handleDownload() {
    if (!payrollData?.rows?.length) return;
    const rows = payrollData.rows;
    const totalGross = rows.reduce((s, r) => s + r.grossPay, 0);
    const totalNet = rows.reduce((s, r) => s + r.netPay, 0);
    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nómina ${queryDates?.start} – ${queryDates?.end}</title>
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#111}
  h1{color:#0f172a}h2{color:#334155;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
  th{background:#0f172a;color:#fff;padding:8px 10px;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  .total{font-weight:bold;background:#f1f5f9!important}
  .footer{margin-top:24px;font-size:11px;color:#64748b}
</style>
</head>
<body>
<h1>Reporte de Nómina — KobraPay</h1>
<h2>Período: ${queryDates?.start} – ${queryDates?.end} | Ciclo: ${CYCLE_ES[queryDates?.cycle ?? "biweekly"]}</h2>
<table>
  <thead><tr>
    <th>#</th><th>Colaborador</th><th>Puesto</th>
    <th>Días Trab.</th><th>Hrs Reg.</th><th>Hrs Extra</th>
    <th>Salario/Día</th><th>Hrs/Día</th><th>Descanso</th>
    <th>Pago Bruto</th><th>IMSS</th><th>ISR</th><th>Pago Neto</th>
    <th>Banco</th><th>CLABE</th>
  </tr></thead>
  <tbody>
    ${rows.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${r.fullName}</strong>${r.employeeNumber ? ` (#${r.employeeNumber})` : ""}</td>
      <td>${r.position || "—"}</td>
      <td>${r.daysWorked}</td>
      <td>${(r.regularHours ?? r.totalHours).toFixed(2)} hrs</td>
      <td>${r.overtimeEnabled && r.overtimeHours > 0 ? `${r.overtimeHours.toFixed(2)} hrs` : "—"}</td>
      <td>$${(r.dailyRate ?? 0).toFixed(2)}</td>
      <td>${r.dailyHours ?? 8} hrs</td>
      <td>${DAYS_ES[r.restDay ?? "sunday"] ?? "Domingo"}</td>
      <td>$${r.grossPay.toFixed(2)}</td>
      <td>-$${r.imss.toFixed(2)}</td>
      <td>-$${r.isr.toFixed(2)}</td>
      <td><strong>$${r.netPay.toFixed(2)}</strong></td>
      <td>${r.bankName || "—"}</td>
      <td>${r.clabe ? "****" + r.clabe.slice(-4) : "—"}</td>
    </tr>`).join("")}
    <tr class="total">
      <td colspan="9"><strong>TOTALES (${rows.length} colaboradores)</strong></td>
      <td><strong>$${totalGross.toFixed(2)}</strong></td>
      <td><strong>-$${rows.reduce((s, r) => s + r.imss, 0).toFixed(2)}</strong></td>
      <td><strong>-$${rows.reduce((s, r) => s + r.isr, 0).toFixed(2)}</strong></td>
      <td><strong>$${totalNet.toFixed(2)}</strong></td>
      <td colspan="2"></td>
    </tr>
  </tbody>
</table>
<div class="footer">
  Generado el ${new Date().toLocaleString("es-MX")} | KobraPay<br>
  * IMSS al 1.75% (cuota obrera). ISR estimado. Consulte a su contador para cálculos definitivos.
</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nomina_${queryDates?.start}_${queryDates?.end}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado — ábrelo en el navegador e imprime como PDF");
  }

  const rows = payrollData?.rows ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nómina</h1>
            <p className="text-muted-foreground text-sm">Cálculo automático de pago por período</p>
          </div>
          {rows.length > 0 && (
            <Button onClick={handleDownload} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Descargar Reporte
            </Button>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <Label>Ciclo de pago</Label>
                <Select value={cycle} onValueChange={(v) => {
                  setCycle(v as typeof cycle);
                  const d = getDefaultDates(v);
                  setStartDate(d.start);
                  setEndDate(d.end);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button onClick={handleCalculate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Calculator className="w-4 h-4" /> Calcular Nómina
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && queryDates && (
          <div className="text-center py-12 text-muted-foreground">Calculando nómina...</div>
        )}

        {payrollData && !isLoading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">Colaboradores</p><p className="text-2xl font-bold">{rows.length}</p></div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">Total Bruto</p><p className="text-2xl font-bold">${rows.reduce((s, r) => s + r.grossPay, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p></div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-600 shrink-0" />
                <div><p className="text-xs text-muted-foreground">Total Neto</p><p className="text-2xl font-bold">${rows.reduce((s, r) => s + r.netPay, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p></div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">Total Horas</p><p className="text-2xl font-bold">{rows.reduce((s, r) => s + r.totalHours, 0).toFixed(1)}</p></div>
              </CardContent></Card>
            </div>

            {/* Tabla */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Desglose — {payrollData.startDate} al {payrollData.endDate}</CardTitle>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No hay registros de asistencia en este período</p>
                    <p className="text-xs mt-1">Asegúrate de que los colaboradores hayan checado entrada y salida</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Colaborador</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Días</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Hrs Reg.</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Hrs Extra</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sal./Día</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Descanso</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Bruto</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">IMSS</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">ISR</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Neto</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Banco</th>
                          <th className="py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.employeeId} className="border-b hover:bg-muted/30">
                            <td className="py-3 px-3">
                              <div className="font-medium">{row.fullName}</div>
                              {row.employeeNumber && <div className="text-xs text-muted-foreground">#{row.employeeNumber}</div>}
                              <div className="text-xs text-muted-foreground">{row.position}</div>
                            </td>
                            <td className="text-center py-3 px-3">{row.daysWorked}</td>
                            <td className="text-center py-3 px-3">{(row.regularHours ?? row.totalHours).toFixed(1)}</td>
                            <td className="text-center py-3 px-3">
                              {row.overtimeEnabled && row.overtimeHours > 0 ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">{row.overtimeHours.toFixed(1)} hrs</Badge>
                              ) : "—"}
                            </td>
                            <td className="text-right py-3 px-3">
                              {(row.dailyRate ?? 0) > 0 ? `$${(row.dailyRate ?? 0).toFixed(2)}` : <span className="text-muted-foreground text-xs">Sin asignar</span>}
                            </td>
                            <td className="text-center py-3 px-3 text-xs text-muted-foreground">
                              {DAYS_ES[row.restDay ?? "sunday"] ?? "Domingo"}
                            </td>
                            <td className="text-right py-3 px-3 font-medium">${row.grossPay.toFixed(2)}</td>
                            <td className="text-right py-3 px-3 text-red-500 text-xs">-${row.imss.toFixed(2)}</td>
                            <td className="text-right py-3 px-3 text-red-500 text-xs">-${row.isr.toFixed(2)}</td>
                            <td className="text-right py-3 px-3 font-bold text-green-600">${row.netPay.toFixed(2)}</td>
                            <td className="text-center py-3 px-3">
                              <div className="text-xs">{row.bankName || "—"}</div>
                              {row.clabe && <div className="text-xs text-muted-foreground">****{row.clabe.slice(-4)}</div>}
                            </td>
                            <td className="py-3 px-3">
                              <Button size="sm" variant="ghost" onClick={() => setEditEmp({
                                id: row.employeeId, name: row.fullName,
                                dailyRate: String(row.dailyRate ?? ""),
                                dailyHours: String(row.dailyHours ?? "8"),
                                restDay: row.restDay ?? "sunday",
                                overtimeEnabled: row.overtimeEnabled ?? false,
                                overtimeRate: String(row.overtimeRate ?? ""),
                                paymentCycle: row.paymentCycle ?? "biweekly",
                                bankName: row.bankName ?? "",
                                clabe: row.clabe ?? "",
                                bankAccountHolder: row.bankAccountHolder ?? "",
                              })}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!queryDates && (
          <div className="text-center py-16 text-muted-foreground">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Selecciona el período y haz clic en Calcular Nómina</p>
            <p className="text-sm mt-1">Se calculará el pago de cada colaborador según sus días trabajados en el Reloj Checador</p>
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {editEmp && (
        <Dialog open onOpenChange={() => setEditEmp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Datos de Nómina — {editEmp.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Salario diario (MXN)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00"
                    value={editEmp.dailyRate}
                    onChange={(e) => setEditEmp({ ...editEmp, dailyRate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Horas de trabajo al día</Label>
                  <Input type="number" min="1" max="24" step="0.5" placeholder="8"
                    value={editEmp.dailyHours}
                    onChange={(e) => setEditEmp({ ...editEmp, dailyHours: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Día de descanso</Label>
                  <Select value={editEmp.restDay} onValueChange={(v) => setEditEmp({ ...editEmp, restDay: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DAYS_ES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ciclo de pago</Label>
                  <Select value={editEmp.paymentCycle} onValueChange={(v) => setEditEmp({ ...editEmp, paymentCycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Horas extras */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pago de horas extras (opcional)</p>
                    <p className="text-xs text-muted-foreground">Activa si este colaborador cobra horas extras</p>
                  </div>
                  <Switch checked={editEmp.overtimeEnabled} onCheckedChange={(v) => setEditEmp({ ...editEmp, overtimeEnabled: v })} />
                </div>
                {editEmp.overtimeEnabled && (
                  <div className="space-y-1">
                    <Label>Tarifa por hora extra (MXN) <span className="text-muted-foreground text-xs">— vacío = 1.5× salario/hora</span></Label>
                    <Input type="number" min="0" step="0.01" placeholder="Automático (1.5×)"
                      value={editEmp.overtimeRate}
                      onChange={(e) => setEditEmp({ ...editEmp, overtimeRate: e.target.value })} />
                  </div>
                )}
              </div>
              {/* Banco */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Datos bancarios</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Banco</Label>
                    <Input placeholder="BBVA, Santander..."
                      value={editEmp.bankName}
                      onChange={(e) => setEditEmp({ ...editEmp, bankName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>CLABE (18 dígitos)</Label>
                    <Input maxLength={18} placeholder="000000000000000000"
                      value={editEmp.clabe}
                      onChange={(e) => setEditEmp({ ...editEmp, clabe: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Titular de la cuenta</Label>
                  <Input placeholder="Nombre completo del titular"
                    value={editEmp.bankAccountHolder}
                    onChange={(e) => setEditEmp({ ...editEmp, bankAccountHolder: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditEmp(null)}>Cancelar</Button>
                <Button className="flex-1" disabled={updatePayroll.isPending}
                  onClick={() => updatePayroll.mutate({
                    employeeId: editEmp.id,
                    dailyRate: editEmp.dailyRate || undefined,
                    dailyHours: editEmp.dailyHours || undefined,
                    restDay: editEmp.restDay,
                    overtimeEnabled: editEmp.overtimeEnabled,
                    overtimeRate: editEmp.overtimeRate || undefined,
                    paymentCycle: editEmp.paymentCycle as "weekly" | "biweekly" | "monthly",
                    bankName: editEmp.bankName || undefined,
                    clabe: editEmp.clabe || undefined,
                    bankAccountHolder: editEmp.bankAccountHolder || undefined,
                  })}>
                  {updatePayroll.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
