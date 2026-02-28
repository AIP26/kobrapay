import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Send, Eye, Copy, CheckCircle, Clock, Archive, Edit } from "lucide-react";

type ContractStatus = "draft" | "sent" | "signed" | "archived";

const STATUS_LABELS: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  signed: { label: "Firmado", color: "bg-green-100 text-green-700" },
  archived: { label: "Archivado", color: "bg-yellow-100 text-yellow-700" },
};

const STATUS_ICONS: Record<ContractStatus, React.ReactNode> = {
  draft: <Edit className="w-3 h-3" />,
  sent: <Send className="w-3 h-3" />,
  signed: <CheckCircle className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

export default function Contracts() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const { data: contracts = [], refetch } = trpc.contracts.list.useQuery();
  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("Contrato creado como borrador.");
      setShowCreate(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.contracts.sendToClient.useMutation({
    onSuccess: (data) => {
      const signUrl = `${window.location.origin}/sign-contract/${data.signToken}`;
      navigator.clipboard.writeText(signUrl).catch(() => {});
      toast.success("Contrato enviado. Enlace copiado al portapapeles.");
      setSendingId(null);
      refetch();
    },
    onError: (e) => { toast.error(e.message); setSendingId(null); },
  });
  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => { toast.success("Contrato actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    clientName: "", clientEmail: "", clientPhone: "", clientRfc: "", clientCurp: "",
    clientAddress: "", businessName: "", clientIneNumber: "",
    commissionRate: 6, contractDurationMonths: 0, includeExclusivityClause: false,
    customTerms: "", internalNotes: "",
  });

  const handleCreate = () => {
    createMutation.mutate(form);
  };

  const handleSend = (id: number) => {
    setSendingId(id);
    sendMutation.mutate({ id, expiresInDays: 7 });
  };

  const copySignLink = (token: string | null) => {
    if (!token) return;
    const url = `${window.location.origin}/sign-contract/${token}`;
    navigator.clipboard.writeText(url);
      toast.success("Enlace copiado: " + url);
  };

  const selectedContractData = contracts.find(c => c.id === selectedContract);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos Digitales</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona los contratos de tus clientes — solo visible para ti</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-700 hover:bg-cyan-800 text-white gap-2">
              <Plus className="w-4 h-4" /> Nuevo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Contrato</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label>Nombre completo del cliente *</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Juan García López" />
              </div>
              <div>
                <Label>Email del cliente *</Label>
                <Input type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="juan@negocio.com" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="55 1234 5678" />
              </div>
              <div>
                <Label>Nombre del negocio</Label>
                <Input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Ferretería El Clavo" />
              </div>
              <div>
                <Label>RFC</Label>
                <Input value={form.clientRfc} onChange={e => setForm(f => ({ ...f, clientRfc: e.target.value }))} placeholder="GARL850101XXX" />
              </div>
              <div>
                <Label>CURP</Label>
                <Input value={form.clientCurp} onChange={e => setForm(f => ({ ...f, clientCurp: e.target.value }))} placeholder="GARL850101HDFXXX00" />
              </div>
              <div>
                <Label>No. de INE / Pasaporte</Label>
                <Input value={form.clientIneNumber} onChange={e => setForm(f => ({ ...f, clientIneNumber: e.target.value }))} placeholder="0123456789" />
              </div>
              <div className="col-span-2">
                <Label>Domicilio</Label>
                <Input value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))} placeholder="Calle, No., Colonia, Ciudad, CP" />
              </div>
              <div>
                <Label>Comisión (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: parseFloat(e.target.value) || 6 }))} />
              </div>
              <div>
                <Label>Duración del contrato</Label>
                <Select value={String(form.contractDurationMonths)} onValueChange={v => setForm(f => ({ ...f, contractDurationMonths: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin plazo fijo</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Switch checked={form.includeExclusivityClause} onCheckedChange={v => setForm(f => ({ ...f, includeExclusivityClause: v }))} />
                <div>
                  <p className="font-medium text-sm">Cláusula de exclusividad</p>
                  <p className="text-xs text-gray-500">El cliente se compromete a usar únicamente KobraPay como plataforma de cobros durante la vigencia del contrato</p>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Términos adicionales (opcional)</Label>
                <Textarea value={form.customTerms} onChange={e => setForm(f => ({ ...f, customTerms: e.target.value }))} placeholder="Agrega cláusulas o condiciones especiales para este cliente..." rows={3} />
              </div>
              <div className="col-span-2">
                <Label>Notas internas (solo tú las ves)</Label>
                <Textarea value={form.internalNotes} onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))} placeholder="Notas privadas sobre este cliente..." rows={2} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !form.clientName || !form.clientEmail} className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white">
                {createMutation.isPending ? "Guardando..." : "Guardar Borrador"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(["draft", "sent", "signed", "archived"] as ContractStatus[]).map(status => {
          const count = contracts.filter(c => c.status === status).length;
          const { label, color } = STATUS_LABELS[status];
          return (
            <div key={status} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color} mb-2`}>
                {STATUS_ICONS[status]} {label}
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {contracts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay contratos aún</p>
            <p className="text-sm">Crea tu primer contrato para un cliente</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Negocio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comisión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duración</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map(contract => {
                const status = contract.status as ContractStatus;
                const { label, color } = STATUS_LABELS[status];
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{contract.clientName}</p>
                      <p className="text-xs text-gray-500">{contract.clientEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contract.businessName || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-cyan-700">{contract.commissionRate}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contract.contractDurationMonths === 0 ? "Sin plazo" : `${contract.contractDurationMonths} meses`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                        {STATUS_ICONS[status]} {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setSelectedContract(contract.id === selectedContract ? null : contract.id)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {status === "draft" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleSend(contract.id)}
                            disabled={sendingId === contract.id}
                            className="text-blue-600 hover:text-blue-700"
                            title="Enviar al cliente"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {(status === "sent" || status === "signed") && contract.signToken && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => copySignLink(contract.signToken ?? null)}
                            className="text-gray-500"
                            title="Copiar enlace de firma"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        {status !== "archived" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => updateMutation.mutate({ id: contract.id, status: "archived" })}
                            className="text-gray-400 hover:text-gray-600"
                            title="Archivar"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selectedContractData && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-700" />
            Detalle del Contrato — {selectedContractData.clientName}
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedContractData.clientEmail}</span></div>
            <div><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{selectedContractData.clientPhone || "—"}</span></div>
            <div><span className="text-gray-500">RFC:</span> <span className="font-medium">{selectedContractData.clientRfc || "—"}</span></div>
            <div><span className="text-gray-500">CURP:</span> <span className="font-medium">{selectedContractData.clientCurp || "—"}</span></div>
            <div><span className="text-gray-500">INE/Pasaporte:</span> <span className="font-medium">{selectedContractData.clientIneNumber || "—"}</span></div>
            <div><span className="text-gray-500">Domicilio:</span> <span className="font-medium">{selectedContractData.clientAddress || "—"}</span></div>
            <div><span className="text-gray-500">Comisión:</span> <span className="font-medium text-cyan-700">{selectedContractData.commissionRate}%</span></div>
            <div><span className="text-gray-500">Duración:</span> <span className="font-medium">{selectedContractData.contractDurationMonths === 0 ? "Sin plazo fijo" : `${selectedContractData.contractDurationMonths} meses`}</span></div>
            <div><span className="text-gray-500">Exclusividad:</span> <span className="font-medium">{selectedContractData.includeExclusivityClause ? "Sí" : "No"}</span></div>
            {selectedContractData.signedAt && (
              <div className="col-span-3 flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium text-sm">
                  Firmado el {new Date(selectedContractData.signedAt).toLocaleString("es-MX")} desde IP {selectedContractData.signedFromIp || "desconocida"}
                </span>
              </div>
            )}
          </div>
          {/* Documentos subidos */}
          {(selectedContractData.ineUrl || selectedContractData.passportUrl || selectedContractData.addressProofUrl || selectedContractData.rfcDocUrl || selectedContractData.curpDocUrl) && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Documentos recibidos:</p>
              <div className="flex flex-wrap gap-2">
                {selectedContractData.ineUrl && <a href={selectedContractData.ineUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100">INE / Credencial</a>}
                {selectedContractData.passportUrl && <a href={selectedContractData.passportUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100">Pasaporte</a>}
                {selectedContractData.addressProofUrl && <a href={selectedContractData.addressProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100">Comprobante de domicilio</a>}
                {selectedContractData.rfcDocUrl && <a href={selectedContractData.rfcDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100">RFC</a>}
                {selectedContractData.curpDocUrl && <a href={selectedContractData.curpDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100">CURP</a>}
              </div>
            </div>
          )}
          {selectedContractData.signatureUrl && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Firma digital del cliente:</p>
              <img src={selectedContractData.signatureUrl} alt="Firma digital" className="border border-gray-200 rounded-lg max-h-24 bg-white" />
            </div>
          )}
          {selectedContractData.internalNotes && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Notas internas:</p>
              <p className="text-sm text-yellow-800">{selectedContractData.internalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
