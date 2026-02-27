import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Download,
  Send,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  User,
  Hash,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  folio: string;
  date: string;
  clientName: string;
  clientRfc: string;
  total: number;
  status: "paid" | "pending" | "cancelled";
  concept: string;
}

const MOCK_INVOICES: Invoice[] = [
  {
    id: "1",
    folio: "F-2026-001",
    date: "2026-01-15",
    clientName: "Comercializadora ABC S.A. de C.V.",
    clientRfc: "CAB200101ABC",
    total: 15800,
    status: "paid",
    concept: "Servicios de consultoría enero 2026",
  },
  {
    id: "2",
    folio: "F-2026-002",
    date: "2026-02-01",
    clientName: "Juan Pérez Hernández",
    clientRfc: "PEHJ850312XYZ",
    total: 4640,
    status: "pending",
    concept: "Diseño de logotipo y branding",
  },
  {
    id: "3",
    folio: "F-2026-003",
    date: "2026-02-10",
    clientName: "Distribuidora Norte S.A.",
    clientRfc: "DNO150601DEF",
    total: 29000,
    status: "paid",
    concept: "Venta de mercancía febrero 2026",
  },
];

const STATUS_CONFIG = {
  paid: { label: "Pagada", color: "text-green-600 bg-green-50 border-green-200" },
  pending: { label: "Pendiente", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  cancelled: { label: "Cancelada", color: "text-gray-500 bg-gray-50 border-gray-200" },
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
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    clientName: "",
    clientRfc: "",
    clientEmail: "",
    concept: "",
    quantity: "1",
    unitPrice: "",
    usoCfdi: "G03",
  });

  const filtered = MOCK_INVOICES.filter(inv =>
    inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
    inv.folio.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = parseFloat(form.unitPrice || "0") * parseFloat(form.quantity || "1");
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const handleCreate = () => {
    if (!form.clientName || !form.clientRfc || !form.concept || !form.unitPrice) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    toast.success(`Factura generada: ${formatMXN(total)} para ${form.clientName}`);
    setShowForm(false);
    setForm({ clientName: "", clientRfc: "", clientEmail: "", concept: "", quantity: "1", unitPrice: "", usoCfdi: "G03" });
  };

  return (
    <DashboardLayout title="Mis Facturas">
      <div className="p-6 space-y-6">
        {/* Header */}
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
            { label: "Total facturas", value: MOCK_INVOICES.length, color: "text-gray-700" },
            { label: "Pagadas", value: MOCK_INVOICES.filter(i => i.status === "paid").length, color: "text-green-600" },
            { label: "Monto total", value: formatMXN(MOCK_INVOICES.reduce((s, i) => s + i.total, 0)), color: "text-emerald-600" },
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Folio</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Concepto</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estatus</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Total</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-mono font-medium text-gray-800">{inv.folio}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{inv.clientName}</p>
                          <p className="text-xs text-gray-400 font-mono">{inv.clientRfc}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate">{inv.concept}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{formatDate(inv.date)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[inv.status].color}`}>
                          {STATUS_CONFIG[inv.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{formatMXN(inv.total)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-gray-500 hover:text-emerald-600"
                            onClick={() => toast.success("Descargando PDF de " + inv.folio)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-gray-500 hover:text-blue-600"
                            onClick={() => toast.success("Factura enviada por email")}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Invoice Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Nueva Factura</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">Para emitir CFDI válidos ante el SAT, necesitas configurar tu RFC y certificados en <strong>Configuración → Datos Fiscales</strong>.</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos del Cliente</Label>
                  <Input placeholder="Nombre o razón social *" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="RFC del cliente *" value={form.clientRfc} onChange={e => setForm(f => ({ ...f, clientRfc: e.target.value }))} />
                  <Input placeholder="Email (para envío)" type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Concepto</Label>
                  <Input placeholder="Descripción del servicio o producto *" value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Cantidad</Label>
                    <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Precio unitario (MXN)</Label>
                    <Input type="number" placeholder="0.00" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Uso del CFDI</Label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={form.usoCfdi}
                    onChange={e => setForm(f => ({ ...f, usoCfdi: e.target.value }))}
                  >
                    <option value="G01">G01 - Adquisición de mercancias</option>
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="P01">P01 - Por definir</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                  </select>
                </div>

                {/* Totals */}
                {subtotal > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span><span>{formatMXN(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>IVA 16%</span><span>{formatMXN(iva)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                      <span>Total</span><span className="text-emerald-600">{formatMXN(total)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white" onClick={handleCreate}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Factura
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
