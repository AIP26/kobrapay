import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  FileText,
  DollarSign,
  Info,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ChargebackStatus = "pending" | "in_review" | "won" | "lost";

interface Chargeback {
  id: string;
  transactionId: string;
  date: string;
  amount: number;
  affectation: number;
  status: ChargebackStatus;
  reason: string;
  lastUpdate: string;
  customerName: string;
}

// Mock data para demostración
const MOCK_CHARGEBACKS: Chargeback[] = [
  {
    id: "CB-001",
    transactionId: "TXN-2025-0891",
    date: "2025-12-10",
    amount: 4500,
    affectation: 0,
    status: "won",
    reason: "Servicio no recibido",
    lastUpdate: "2026-01-15",
    customerName: "María García",
  },
  {
    id: "CB-002",
    transactionId: "TXN-2025-1204",
    date: "2025-12-28",
    amount: 12800,
    affectation: -14080,
    status: "lost",
    reason: "Cargo no reconocido",
    lastUpdate: "2026-02-01",
    customerName: "Carlos Mendoza",
  },
  {
    id: "CB-003",
    transactionId: "TXN-2026-0034",
    date: "2026-01-20",
    amount: 3200,
    affectation: -3200,
    status: "in_review",
    reason: "Producto defectuoso",
    lastUpdate: "2026-02-20",
    customerName: "Ana Torres",
  },
  {
    id: "CB-004",
    transactionId: "TXN-2026-0089",
    date: "2026-02-05",
    amount: 7600,
    affectation: -7600,
    status: "pending",
    reason: "Duplicado de cargo",
    lastUpdate: "2026-02-25",
    customerName: "Roberto Sánchez",
  },
];

const STATUS_CONFIG: Record<ChargebackStatus, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  pending: { label: "Pendiente", color: "text-yellow-600", icon: Clock, bg: "bg-yellow-50 border-yellow-200" },
  in_review: { label: "En revisión", color: "text-blue-600", icon: RefreshCw, bg: "bg-blue-50 border-blue-200" },
  won: { label: "Solucionado", color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50 border-green-200" },
  lost: { label: "Definitivo", color: "text-red-600", icon: XCircle, bg: "bg-red-50 border-red-200" },
};

function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function Chargebacks() {
  const [selected, setSelected] = useState<Chargeback | null>(null);
  const [uploading, setUploading] = useState(false);

  const total = MOCK_CHARGEBACKS.length;
  const pending = MOCK_CHARGEBACKS.filter(c => c.status === "pending" || c.status === "in_review").length;
  const won = MOCK_CHARGEBACKS.filter(c => c.status === "won").length;
  const totalAffectation = MOCK_CHARGEBACKS.reduce((sum, c) => sum + c.affectation, 0);

  const handleUploadEvidence = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast.success("Evidencia enviada correctamente. Stripe revisará tu caso en 3-5 días hábiles.");
    }, 1500);
  };

  return (
    <DashboardLayout title="Mis Aclaraciones">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Aclaraciones</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona contracargos y disputas de tus transacciones</p>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">¿Qué es una aclaración?</p>
            <p className="text-sm text-blue-600 mt-0.5">
              Cuando un cliente disputa un cargo con su banco, se genera un contracargo. Tienes <strong>7 días hábiles</strong> para
              enviar evidencia (recibo, selfie del pagador, descripción del servicio) y disputar el caso ante Stripe.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total aclaraciones", value: total, icon: AlertTriangle, color: "text-gray-600", bg: "bg-gray-100" },
            { label: "En proceso", value: pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
            { label: "Ganadas", value: won, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
            { label: "Afectación total", value: formatMXN(totalAffectation), icon: DollarSign, color: "text-red-600", bg: "bg-red-100" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { label: "Garantía líquida", count: 0 },
            { label: "Fondo de seguridad", count: 0 },
            { label: "Contracargos", count: MOCK_CHARGEBACKS.length, active: true },
          ].map(({ label, count, active }) => (
            <button
              key={label}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label} {count > 0 && <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Transacción</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estatus</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Monto</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Afectación</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Últ. Actualización</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MOCK_CHARGEBACKS.map((cb) => {
                    const config = STATUS_CONFIG[cb.status];
                    const StatusIcon = config.icon;
                    const isActive = cb.status === "pending" || cb.status === "in_review";
                    return (
                      <tr
                        key={cb.id}
                        className={`hover:bg-gray-50 transition-colors ${cb.status === "lost" ? "bg-red-50/30" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-mono font-medium text-gray-800">{cb.transactionId}</p>
                            <p className="text-xs text-gray-400">{cb.reason}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{cb.customerName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatDate(cb.date)}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-800 text-right">{formatMXN(cb.amount)}</td>
                        <td className={`px-4 py-4 text-sm font-medium text-right ${cb.affectation < 0 ? "text-red-600" : "text-green-600"}`}>
                          {cb.affectation === 0 ? "—" : formatMXN(cb.affectation)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">{formatDate(cb.lastUpdate)}</td>
                        <td className="px-4 py-4 text-center">
                          {isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => setSelected(cb)}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Disputar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-gray-400"
                              onClick={() => setSelected(cb)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail / Evidence Panel */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Aclaración {selected.id}</h3>
                    <p className="text-sm text-gray-500">{selected.transactionId} · {selected.customerName}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Monto disputado</p><p className="font-semibold text-gray-900">{formatMXN(selected.amount)}</p></div>
                  <div><p className="text-gray-500">Afectación</p><p className={`font-semibold ${selected.affectation < 0 ? "text-red-600" : "text-green-600"}`}>{selected.affectation === 0 ? "Sin afectación" : formatMXN(selected.affectation)}</p></div>
                  <div><p className="text-gray-500">Motivo</p><p className="font-semibold text-gray-900">{selected.reason}</p></div>
                  <div><p className="text-gray-500">Estatus</p><p className={`font-semibold ${STATUS_CONFIG[selected.status].color}`}>{STATUS_CONFIG[selected.status].label}</p></div>
                </div>

                {(selected.status === "pending" || selected.status === "in_review") && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 mb-1">Sube tu evidencia</p>
                    <p className="text-xs text-gray-400 mb-4">Recibo de venta, selfie del cliente, descripción del servicio, comprobante de entrega</p>
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-400 text-white"
                      onClick={handleUploadEvidence}
                      disabled={uploading}
                    >
                      {uploading ? "Enviando..." : "Seleccionar archivos y enviar"}
                    </Button>
                  </div>
                )}

                {selected.status === "won" && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-700">Esta disputa fue resuelta a tu favor. No hubo afectación a tu saldo.</p>
                  </div>
                )}

                {selected.status === "lost" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">Esta disputa fue resuelta a favor del cliente. El monto fue deducido de tu saldo más una comisión por contracargo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
