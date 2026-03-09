import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText, Download, Calendar, TrendingUp, CreditCard,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2,
  BarChart3, DollarSign, Percent,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = trpc.transactions.monthlyReport.useQuery({ year, month });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  // Gráfica de barras por día (simple CSS)
  const maxDayTotal = useMemo(() => {
    if (!data?.byDay) return 1;
    return Math.max(...Object.values(data.byDay).map(d => d.total), 1);
  }, [data]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayBars = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const info = data?.byDay?.[String(d)];
      arr.push({ day: d, count: info?.count || 0, total: info?.total || 0 });
    }
    return arr;
  }, [data, daysInMonth]);

  const generatePDF = async () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Cargar logo como base64
    const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_pro_white_fd2cc62e.png";
    let logoBase64: string | null = null;
    try {
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (_) { /* si falla, usar texto */ }

    // Header
    doc.setFillColor(15, 23, 42); // dark navy
    doc.rect(0, 0, pageW, 40, "F");
    doc.setTextColor(255, 255, 255);
    if (logoBase64) {
      // Logo imagen: ancho 48mm, alto proporcional ~12mm
      doc.addImage(logoBase64, "PNG", 12, 8, 48, 12);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Reporte Mensual — ${MONTHS_ES[month - 1]} ${year}`, 14, 34);
    } else {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("KobraPay", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Plataforma de Cobros Profesional", 14, 25);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Reporte Mensual — ${MONTHS_ES[month - 1]} ${year}`, 14, 34);
    }

    // Business info
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Negocio: ${data.businessName}`, pageW - 14, 18, { align: "right" });
    if (data.businessEmail) doc.text(data.businessEmail, pageW - 14, 24, { align: "right" });
    doc.text(`Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`, pageW - 14, 30, { align: "right" });

    // KPIs
    let y = 50;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen del Período", 14, y);
    y += 6;

    const kpis = [
      { label: "Transacciones exitosas", value: String(data.totalTransactions), color: [16, 185, 129] as [number, number, number] },
      { label: "Transacciones fallidas", value: String(data.failedTransactions), color: [239, 68, 68] as [number, number, number] },
      { label: "Monto bruto cobrado", value: `$${fmt(data.totalBruto)} MXN`, color: [59, 130, 246] as [number, number, number] },
      { label: "Comisión plataforma", value: `$${fmt(data.totalComision)} MXN (${data.commissionRate}%)`, color: [245, 158, 11] as [number, number, number] },
      { label: "Monto neto recibido", value: `$${fmt(data.totalNeto)} MXN`, color: [16, 185, 129] as [number, number, number] },
    ];

    const colW = (pageW - 28) / 2;
    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 14 + col * (colW + 4);
      const ky = y + row * 18;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, ky, colW, 14, 2, 2, "F");
      doc.setDrawColor(...kpi.color);
      doc.setLineWidth(0.5);
      doc.line(x, ky, x, ky + 14);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(kpi.label, x + 4, ky + 5);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + 4, ky + 11);
    });

    y += Math.ceil(kpis.length / 2) * 18 + 10;

    // Tabla de transacciones
    if (data.transactions.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Detalle de Transacciones", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["#Op", "Fecha", "Cliente", "Monto", "Comisión", "Neto", "Tarjeta"]],
        body: data.transactions.map((t) => [
          t.operationNumber || `#${t.id}`,
          new Date(t.date).toLocaleDateString("es-MX"),
          t.payerName || "—",
          `$${fmt(t.amount)}`,
          `$${fmt(t.commissionAmount)}`,
          `$${fmt(t.netAmount)}`,
          t.cardBrand ? `${t.cardBrand} ****${t.cardLast4}` : "—",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 22 },
          2: { cellWidth: 45 },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 30 },
        },
        margin: { left: 14, right: 14 },
      });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("No hay transacciones exitosas en este período.", 14, y + 8);
    }

    // Footer
    const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(248, 250, 252);
      doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageW, 12, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("KobraPay — kobrapay.mx — soporte@kobrapay.mx", 14, doc.internal.pageSize.getHeight() - 4);
      doc.text(`Página ${p} de ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 4, { align: "right" });
    }

    doc.save(`KobraPay_Reporte_${MONTHS_ES[month - 1]}_${year}.pdf`);
    toast.success("Reporte PDF descargado correctamente");
  };

  return (
    <DashboardLayout title="Reporte Mensual">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Reporte Mensual</h1>
              <p className="text-sm text-muted-foreground">Resumen de ventas y comisiones por mes</p>
            </div>
          </div>
          {data && (
            <Button
              onClick={generatePDF}
              className="bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
          )}
        </div>

        {/* Month selector */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex items-center justify-between">
                        <button
                          onClick={prevMonth}
                                className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{MONTHS_ES[month - 1]} {year}</p>
            <p className="text-xs text-muted-foreground">Selecciona el período a consultar</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentOrFuture}
            className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Exitosas</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{data.totalTransactions}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Fallidas</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{data.failedTransactions}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Monto Bruto</span>
                </div>
                <p className="text-2xl font-bold text-foreground">${fmt(data.totalBruto)}</p>
                <p className="text-xs text-muted-foreground mt-1">MXN cobrado en el período</p>
              </div>
              <div className="bg-card border border-amber-500/20 rounded-2xl p-4 col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Comisión ({data.commissionRate}%)</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">${fmt(data.totalComision)}</p>
                <p className="text-xs text-muted-foreground mt-1">Comisión de la plataforma</p>
              </div>
              <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Monto Neto</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">${fmt(data.totalNeto)}</p>
                <p className="text-xs text-muted-foreground mt-1">Lo que recibes después de comisión</p>
              </div>
            </div>

            {/* Bar chart by day */}
            {data.totalTransactions > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-foreground">Ventas por día</h2>
                </div>
                <div className="flex items-end gap-0.5 h-24 overflow-x-auto pb-2">
                  {dayBars.map(({ day, total }) => (
                    <div key={day} className="flex flex-col items-center gap-1 flex-1 min-w-[8px]">
                      <div
                        className="w-full rounded-t bg-emerald-500/70 hover:bg-emerald-400 transition-colors cursor-default"
                        style={{ height: `${total > 0 ? Math.max(4, (total / maxDayTotal) * 80) : 2}px` }}
                        title={total > 0 ? `Día ${day}: $${fmt(total)}` : `Día ${day}: sin ventas`}
                      />
                      {daysInMonth <= 31 && (
                        <span className="text-[8px] text-foreground/60">{day}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Transacciones del período ({data.transactions.length})
                </h2>
              </div>
              {data.transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No hay transacciones exitosas en {MONTHS_ES[month - 1]} {year}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">#Op</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Fecha</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Cliente</th>
                        <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Monto</th>
                        <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Comisión</th>
                        <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Neto</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Tarjeta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t) => (
                        <tr key={t.id} className="border-b border-border hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.operationNumber || `#${t.id}`}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.date).toLocaleDateString("es-MX")}</td>
                          <td className="px-4 py-3 text-foreground text-xs">{t.payerName || "—"}</td>
                          <td className="px-4 py-3 text-right text-foreground font-medium text-xs">${fmt(t.amount)}</td>
                          <td className="px-4 py-3 text-right text-amber-400 text-xs">${fmt(t.commissionAmount)}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-semibold text-xs">${fmt(t.netAmount)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {t.cardBrand ? `${t.cardBrand} ****${t.cardLast4}` : "—"}
                            {t.msiMonths ? <span className="ml-1 text-blue-400">{t.msiMonths}MSI</span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/3">
                        <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-muted-foreground">Total</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold text-xs">${fmt(data.totalBruto)}</td>
                        <td className="px-4 py-3 text-right text-amber-400 font-bold text-xs">${fmt(data.totalComision)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-bold text-xs">${fmt(data.totalNeto)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
