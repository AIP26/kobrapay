import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Download,
  Send,
  Search,
  Building2,
  Eye,
  Stamp,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

type InvStatus = "draft" | "sent" | "paid" | "cancelled" | "overdue";

const STATUS_LABELS: Record<InvStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "text-muted-foreground bg-gray-50 border-gray-200" },
  sent: { label: "Enviada", color: "text-blue-600 bg-blue-50 border-blue-200" },
  paid: { label: "Pagada", color: "text-green-600 bg-green-50 border-green-200" },
  cancelled: { label: "Cancelada", color: "text-muted-foreground bg-gray-50 border-gray-200" },
  overdue: { label: "Vencida", color: "text-red-600 bg-red-50 border-red-200" },
};



function formatCurrency(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function Invoices() {
  const { data: invoices = [], isLoading, refetch } = trpc.invoices.list.useQuery();
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => { toast.success("Factura creada exitosamente"); refetch(); setShowForm(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const issueMutation = trpc.invoices.issue.useMutation({
    onSuccess: () => { toast.success("Factura emitida correctamente"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.invoices.cancel.useMutation({
    onSuccess: () => { toast.success("Factura cancelada"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const sendEmailMutation = trpc.invoices.sendEmail.useMutation({
    onSuccess: () => toast.success("Factura enviada por email al receptor"),
    onError: (e) => toast.error(e.message),
  });
  const issueCfdiMutation = trpc.vendor.issueCfdi.useMutation({
    onSuccess: (data) => {
      toast.success(`¡CFDI timbrado ante el SAT! UUID: ${data.uuid}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: facturApiStatus } = trpc.vendor.getFacturApiStatus.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [previewInv, setPreviewInv] = useState<typeof invoices[0] | null>(null);

  function downloadInvoicePDF(inv: typeof invoices[0]) {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${inv.folio}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #10b981; }
  .folio { text-align: right; }
  .folio h2 { font-size: 22px; color: #1a1a1a; margin: 0; }
  .folio p { color: #6b7280; font-size: 13px; margin: 4px 0; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .party { background: #f9fafb; border-radius: 8px; padding: 16px; }
  .party h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin: 0 0 8px; }
  .party p { margin: 3px 0; font-size: 14px; }
  .party .rfc { font-family: monospace; font-size: 13px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #10b981; color: white; }
  thead th { padding: 10px 14px; text-align: left; font-size: 13px; }
  tbody tr { border-bottom: 1px solid #e5e7eb; }
  tbody td { padding: 10px 14px; font-size: 14px; }
  .totals { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.grand { border-top: 2px solid #10b981; padding-top: 10px; font-weight: 900; font-size: 18px; color: #10b981; }
  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #065f46; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">KobraPay</div>
  <div class="folio">
    <h2>FACTURA</h2>
    <p><strong>${inv.folio}</strong></p>
    <p>Fecha: ${new Date(inv.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p><span class="badge">${inv.status === 'paid' ? 'PAGADA' : inv.status === 'sent' ? 'ENVIADA' : inv.status === 'cancelled' ? 'CANCELADA' : 'BORRADOR'}</span></p>
  </div>
</div>
<div class="parties">
  <div class="party">
    <h3>Emisor</h3>
    <p><strong>${inv.emisorNombre}</strong></p>
    <p class="rfc">${inv.emisorRfc}</p>
  </div>
  <div class="party">
    <h3>Receptor</h3>
    <p><strong>${inv.receptorNombre}</strong></p>
    <p class="rfc">${inv.receptorRfc}</p>
    ${inv.receptorEmail ? `<p style="color:#6b7280;font-size:13px">${inv.receptorEmail}</p>` : ''}
  </div>
</div>
<table>
  <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio Unit.</th><th>Importe</th></tr></thead>
  <tbody>
    ${(JSON.parse(typeof inv.conceptos === 'string' ? inv.conceptos : JSON.stringify(inv.conceptos)) as Array<{descripcion:string;cantidad:number;valorUnitario:number;importe:number}>).map((c: {descripcion:string;cantidad:number;valorUnitario:number;importe:number}) => `<tr><td>${c.descripcion}</td><td>${c.cantidad}</td><td>$${(c.valorUnitario/100).toLocaleString('es-MX',{minimumFractionDigits:2})}</td><td>$${(c.importe/100).toLocaleString('es-MX',{minimumFractionDigits:2})}</td></tr>`).join('')}
  </tbody>
</table>
<div class="totals">
  <div class="total-row"><span>Subtotal</span><span>$${((inv.subtotal||0)/100).toLocaleString('es-MX',{minimumFractionDigits:2})}</span></div>
  <div class="total-row"><span>IVA (16%)</span><span>$${((inv.iva||0)/100).toLocaleString('es-MX',{minimumFractionDigits:2})}</span></div>
  <div class="total-row grand"><span>TOTAL</span><span>$${((inv.total||0)/100).toLocaleString('es-MX',{minimumFractionDigits:2})} MXN</span></div>
</div>
<div class="footer">Documento generado por KobraPay &bull; kobrapay.mx &bull; Este documento no es un CFDI fiscal</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) { w.onload = () => { w.print(); }; }
  }
  const [form, setForm] = useState({
    emisorRfc: "",
    emisorNombre: "",
    receptorRfc: "",
    receptorNombre: "",
    receptorEmail: "",
    descripcion: "",
    cantidad: "1",
    valorUnitario: "",
  });

  function resetForm() {
    setForm({ emisorRfc: "", emisorNombre: "", receptorRfc: "", receptorNombre: "", receptorEmail: "", descripcion: "", cantidad: "1", valorUnitario: "" });
  }

  const filtered = invoices.filter(inv =>
    (inv.receptorNombre || "").toLowerCase().includes(search.toLowerCase()) ||
    (inv.folio || "").toLowerCase().includes(search.toLowerCase())
  );

  const cantidadNum = parseFloat(form.cantidad || "1");
  const valorUnitarioNum = parseFloat(form.valorUnitario || "0");
  const subtotalNum = cantidadNum * valorUnitarioNum;
  const ivaNum = Math.round(subtotalNum * 0.16);
  const totalNum = subtotalNum + ivaNum;

  const handleCreate = () => {
    if (!form.emisorRfc || !form.emisorNombre || !form.receptorRfc || !form.receptorNombre || !form.descripcion || !form.valorUnitario) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    createMutation.mutate({
      emisorRfc: form.emisorRfc,
      emisorNombre: form.emisorNombre,
      receptorRfc: form.receptorRfc,
      receptorNombre: form.receptorNombre,
      receptorEmail: form.receptorEmail || "",
      conceptos: [{ descripcion: form.descripcion, cantidad: cantidadNum, valorUnitario: valorUnitarioNum, importe: subtotalNum }],
      subtotal: subtotalNum,
      iva: ivaNum,
      total: totalNum,
      currency: "MXN",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mis Facturas</h1>
            <p className="text-muted-foreground text-sm mt-1">Genera y gestiona facturas para tus clientes</p>
          </div>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-foreground"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Factura
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total facturas", value: invoices.length, color: "text-foreground" },
            { label: "Pagadas", value: invoices.filter(i => i.status === "paid").length, color: "text-green-600" },
            { label: "Monto total", value: formatCurrency(invoices.reduce((s, i) => s + (i.total || 0), 0)), color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o folio..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Sin facturas registradas</p>
                <p className="text-muted-foreground text-sm mt-1">Crea tu primera factura para comenzar</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Nueva Factura
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Folio</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Receptor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Emisor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Fecha</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Estatus</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Total</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((inv) => {
                      const st = (inv.status as InvStatus) || "draft";
                      const cfg = STATUS_LABELS[st] || STATUS_LABELS.draft;
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-mono font-medium text-foreground">{inv.folio}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">{inv.receptorNombre}</p>
                              <p className="text-xs text-muted-foreground font-mono">{inv.receptorRfc}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm text-foreground">{inv.emisorNombre}</p>
                              <p className="text-xs text-muted-foreground font-mono">{inv.emisorRfc}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("es-MX")}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-foreground text-right">{formatCurrency(inv.total / 100, inv.currency)}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              {inv.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Marcar como emitida"
                                  onClick={() => issueMutation.mutate({ id: inv.id })}
                                  disabled={issueMutation.isPending}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {inv.status === "draft" && facturApiStatus?.enabled && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                  title="Timbrar CFDI ante el SAT (FacturAPI)"
                                  onClick={() => issueCfdiMutation.mutate({ invoiceId: inv.id })}
                                  disabled={issueCfdiMutation.isPending}
                                >
                                  <Stamp className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {inv.uuid && (
                                <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-mono" title={`UUID SAT: ${inv.uuid}`}>
                                  <Badge variant="outline" className="text-xs border-violet-300 text-violet-600 px-1.5 py-0">CFDI</Badge>
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-muted-foreground hover:text-blue-600"
                                title={inv.receptorEmail ? `Enviar por email a ${inv.receptorEmail}` : "Sin email del receptor"}
                                onClick={() => {
                                  if (!inv.receptorEmail) {
                                    toast.error("Esta factura no tiene email del receptor");
                                    return;
                                  }
                                  sendEmailMutation.mutate({ id: inv.id });
                                }}
                                disabled={sendEmailMutation.isPending || !inv.receptorEmail}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                title="Descargar factura PDF"
                                onClick={() => downloadInvoicePDF(inv)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              {inv.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                  title="Cancelar factura"
                                  onClick={() => {
                                    if (confirm("¿Cancelar esta factura?")) cancelMutation.mutate({ id: inv.id });
                                  }}
                                  disabled={cancelMutation.isPending}
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Modal: Nueva Factura */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {facturApiStatus?.enabled ? (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex gap-2">
                <Stamp className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-violet-700">
                  <strong>FacturAPI activo</strong> — Después de crear la factura, usa el botón <span className="font-mono bg-violet-100 px-1 rounded">✓</span> morado para timbrarla ante el SAT como CFDI 4.0 válido.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Esta factura será un <strong>PDF interno</strong> (no es CFDI fiscal). Para emitir CFDI válidos ante el SAT, activa <strong>Configuración → Facturación SAT</strong>.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Datos del Emisor (Tú)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="RFC emisor *" value={form.emisorRfc} onChange={e => setForm(f => ({ ...f, emisorRfc: e.target.value }))} />
                <Input placeholder="Nombre/Razón social emisor *" value={form.emisorNombre} onChange={e => setForm(f => ({ ...f, emisorNombre: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Datos del Receptor (Cliente)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="RFC receptor *" value={form.receptorRfc} onChange={e => setForm(f => ({ ...f, receptorRfc: e.target.value }))} />
                <Input placeholder="Nombre/Razón social receptor *" value={form.receptorNombre} onChange={e => setForm(f => ({ ...f, receptorNombre: e.target.value }))} />
              </div>
              <Input type="email" placeholder="Email del receptor" value={form.receptorEmail} onChange={e => setForm(f => ({ ...f, receptorEmail: e.target.value }))} />
            </div>
            <div>
              <Label>Descripción del concepto *</Label>
              <Input placeholder="Ej: Servicios de consultoría" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
              </div>
              <div>
                <Label>Valor unitario (MXN) *</Label>
                <Input type="number" placeholder="0.00" value={form.valorUnitario} onChange={e => setForm(f => ({ ...f, valorUnitario: e.target.value }))} />
              </div>
            </div>
            {subtotalNum > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(subtotalNum)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IVA (16%)</span><span>{formatCurrency(ivaNum)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground border-t border-gray-200 pt-2">
                  <span>Total</span><span className="text-emerald-600">{formatCurrency(totalNum)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-foreground"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Guardando..." : "Crear Factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
