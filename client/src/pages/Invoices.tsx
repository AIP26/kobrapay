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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type InvStatus = "draft" | "sent" | "paid" | "cancelled" | "overdue";

const STATUS_LABELS: Record<InvStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "text-gray-500 bg-gray-50 border-gray-200" },
  sent: { label: "Enviada", color: "text-blue-600 bg-blue-50 border-blue-200" },
  paid: { label: "Pagada", color: "text-green-600 bg-green-50 border-green-200" },
  cancelled: { label: "Cancelada", color: "text-gray-500 bg-gray-50 border-gray-200" },
  overdue: { label: "Vencida", color: "text-red-600 bg-red-50 border-red-200" },
};



function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
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

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
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
            <h1 className="text-2xl font-bold text-gray-900">Mis Facturas</h1>
            <p className="text-gray-500 text-sm mt-1">Genera y gestiona facturas para tus clientes</p>
          </div>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-white"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Factura
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total facturas", value: invoices.length, color: "text-gray-700" },
            { label: "Pagadas", value: invoices.filter(i => i.status === "paid").length, color: "text-green-600" },
            { label: "Monto total", value: formatMXN(invoices.reduce((s, i) => s + (i.total || 0), 0)), color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              <div className="text-center py-10 text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sin facturas registradas</p>
                <p className="text-gray-400 text-sm mt-1">Crea tu primera factura para comenzar</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Nueva Factura
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Folio</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Receptor</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Emisor</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estatus</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Total</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Acciones</th>
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
                              <span className="text-sm font-mono font-medium text-gray-800">{inv.folio}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{inv.receptorNombre}</p>
                              <p className="text-xs text-gray-400 font-mono">{inv.receptorRfc}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm text-gray-700">{inv.emisorNombre}</p>
                              <p className="text-xs text-gray-400 font-mono">{inv.emisorRfc}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">{new Date(inv.createdAt).toLocaleDateString("es-MX")}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{formatMXN(inv.total / 100)}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-gray-500 hover:text-emerald-600"
                                onClick={() => inv.pdfUrl ? window.open(inv.pdfUrl, '_blank') : toast.info("PDF no disponible aún")}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-gray-500 hover:text-blue-600"
                                onClick={() => toast.info("Envío por email disponible próximamente")}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
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
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2">
              <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">Para emitir CFDI válidos ante el SAT, configura tu RFC y certificados en <strong>Configuración → Datos Fiscales</strong>.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Datos del Emisor (Tú)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="RFC emisor *" value={form.emisorRfc} onChange={e => setForm(f => ({ ...f, emisorRfc: e.target.value }))} />
                <Input placeholder="Nombre/Razón social emisor *" value={form.emisorNombre} onChange={e => setForm(f => ({ ...f, emisorNombre: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Datos del Receptor (Cliente)</Label>
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
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{formatMXN(subtotalNum)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA (16%)</span><span>{formatMXN(ivaNum)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total</span><span className="text-emerald-600">{formatMXN(totalNum)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-white"
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
