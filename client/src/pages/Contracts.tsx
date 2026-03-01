import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Send, Eye, Copy, CheckCircle, Archive, Edit, Download, Search, X, ExternalLink, MessageCircle, Mail } from "lucide-react";
import jsPDF from "jspdf";

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

type ContractData = {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  clientRfc?: string | null;
  clientCurp?: string | null;
  clientAddress?: string | null;
  businessName?: string | null;
  clientIneNumber?: string | null;
  commissionRate: string;
  contractDurationMonths: number;
  includeExclusivityClause: boolean | number;
  customTerms?: string | null;
  internalNotes?: string | null;
  status: string;
  signToken?: string | null;
  signedAt?: Date | string | null;
  signedFromIp?: string | null;
  signatureUrl?: string | null;
  ineUrl?: string | null;
  passportUrl?: string | null;
  addressProofUrl?: string | null;
  rfcDocUrl?: string | null;
  curpDocUrl?: string | null;
  createdAt?: Date | string | null;
};

function formatDuration(months: number): string {
  if (months === 0) return "Sin plazo fijo";
  if (months === 1) return "1 mes";
  if (months < 12) return `${months} meses`;
  if (months === 12) return "1 año (12 meses)";
  if (months === 24) return "2 años (24 meses)";
  return `${months} meses`;
}

async function generateContractPDF(contract: ContractData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const addText = (text: string, x: number, yPos: number, opts: { size?: number; bold?: boolean; color?: [number,number,number]; maxWidth?: number } = {}) => {
    doc.setFontSize(opts.size || 10);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    if (opts.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(30, 30, 30);
    if (opts.maxWidth) {
      const lines = doc.splitTextToSize(text, opts.maxWidth);
      doc.text(lines, x, yPos);
      return (lines.length - 1) * (opts.size || 10) * 0.35;
    }
    doc.text(text, x, yPos);
    return 0;
  };

  // Header
  doc.setFillColor(14, 116, 144);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CONTRATO DE SERVICIOS", margin, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("KobraPay — Plataforma de Procesamiento de Pagos Digitales", margin, 21);
  y = 38;

  // Contract number
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(margin, y - 5, contentW, 10, 2, 2, "F");
  addText(`Contrato No. KP-${String(contract.id).padStart(5, "0")}`, margin + 3, y + 1, { size: 9, bold: true, color: [14, 116, 144] });
  const dateStr = contract.createdAt ? new Date(contract.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  addText(`Fecha: ${dateStr}`, pageW - margin - 60, y + 1, { size: 9, color: [80, 80, 80] });
  y += 14;

  // Parties
  addText("COMPARECIENTES", margin, y, { size: 11, bold: true, color: [14, 116, 144] });
  y += 6;
  doc.setDrawColor(14, 116, 144);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentW, y);
  y += 5;

  addText("EL PRESTADOR DE SERVICIOS:", margin, y, { size: 10, bold: true });
  y += 5;
  addText("KobraPay, plataforma de procesamiento de pagos digitales, con domicilio en Ciudad de México.", margin, y, { size: 9, maxWidth: contentW });
  y += 8;

  addText("EL CLIENTE:", margin, y, { size: 10, bold: true });
  y += 5;
  const clientInfo = [
    `Nombre: ${contract.clientName}`,
    contract.businessName ? `Negocio: ${contract.businessName}` : null,
    contract.clientRfc ? `RFC: ${contract.clientRfc}` : null,
    contract.clientCurp ? `CURP: ${contract.clientCurp}` : null,
    contract.clientIneNumber ? `INE/Pasaporte: ${contract.clientIneNumber}` : null,
    `Email: ${contract.clientEmail}`,
    contract.clientPhone ? `Teléfono: ${contract.clientPhone}` : null,
    contract.clientAddress ? `Domicilio: ${contract.clientAddress}` : null,
  ].filter(Boolean) as string[];

  for (const line of clientInfo) {
    addText(line, margin, y, { size: 9 });
    y += 5;
  }
  y += 4;

  // Clauses
  addText("CLÁUSULAS DEL CONTRATO", margin, y, { size: 11, bold: true, color: [14, 116, 144] });
  y += 6;
  doc.line(margin, y, margin + contentW, y);
  y += 5;

  const clauses = [
    { title: "PRIMERA. OBJETO", text: "KobraPay prestará al Cliente servicios de procesamiento de pagos en línea mediante enlaces de cobro, punto de venta digital, y herramientas de gestión financiera." },
    { title: "SEGUNDA. COMISIÓN", text: `El Cliente acepta una comisión del ${contract.commissionRate}% sobre cada transacción procesada a través de la plataforma. Esta comisión incluye el procesamiento del pago, la gestión de disputas y el soporte técnico.` },
    ...(Number(contract.contractDurationMonths) > 0 ? [{ title: "TERCERA. VIGENCIA", text: `El presente contrato tendrá una duración de ${formatDuration(contract.contractDurationMonths)} a partir de la fecha de firma. La terminación anticipada generará una penalización equivalente a 2 meses de comisiones promedio.` }] : []),
    ...(contract.includeExclusivityClause ? [{ title: "CLÁUSULA DE EXCLUSIVIDAD", text: "Durante la vigencia del contrato, el Cliente se compromete a utilizar únicamente KobraPay como plataforma de procesamiento de pagos digitales para su negocio, absteniéndose de contratar servicios similares con terceros." }] : []),
    { title: "PROTECCIÓN DE DATOS", text: "KobraPay se compromete a proteger los datos personales del Cliente conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento." },
    { title: "CONFIDENCIALIDAD", text: "Ambas partes se obligan a mantener la confidencialidad de la información intercambiada durante la prestación de los servicios." },
    { title: "RESPONSABILIDAD", text: "KobraPay no será responsable por interrupciones del servicio causadas por terceros (procesadores de pago, proveedores de internet) o por fuerza mayor." },
    { title: "JURISDICCIÓN", text: "Para la interpretación y cumplimiento del presente contrato, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México." },
  ];

  for (const clause of clauses) {
    if (y > 250) { doc.addPage(); y = 20; }
    addText(clause.title, margin, y, { size: 9, bold: true, color: [14, 116, 144] });
    y += 5;
    const extra = addText(clause.text, margin, y, { size: 9, maxWidth: contentW });
    y += 5 + extra;
  }

  if (contract.customTerms) {
    if (y > 250) { doc.addPage(); y = 20; }
    addText("TÉRMINOS ADICIONALES", margin, y, { size: 9, bold: true, color: [180, 100, 0] });
    y += 5;
    const extra = addText(contract.customTerms, margin, y, { size: 9, maxWidth: contentW });
    y += 5 + extra;
  }

  // Signature section
  if (y > 220) { doc.addPage(); y = 20; }
  y += 5;
  addText("FIRMAS", margin, y, { size: 11, bold: true, color: [14, 116, 144] });
  y += 6;
  doc.line(margin, y, margin + contentW, y);
  y += 10;

  if (contract.status === "signed" && contract.signedAt) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y - 4, contentW, 12, 2, 2, "F");
    addText(`✓ Contrato firmado digitalmente el ${new Date(contract.signedAt).toLocaleString("es-MX")}`, margin + 3, y + 3, { size: 9, bold: true, color: [22, 163, 74] });
    if (contract.signedFromIp) addText(`IP de firma: ${contract.signedFromIp}`, pageW - margin - 60, y + 3, { size: 8, color: [100, 100, 100] });
    y += 16;

    if (contract.signatureUrl) {
      try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(contract.signatureUrl)}`);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.text("Firma digital del cliente:", margin, y);
        y += 5;
        doc.addImage(base64, "PNG", margin, y, 60, 25);
        y += 30;
      } catch {
        addText("Firma digital: (imagen no disponible)", margin, y, { size: 9, color: [150, 150, 150] });
        y += 8;
      }
    }
  } else {
    const halfW = contentW / 2 - 10;
    doc.line(margin, y + 15, margin + halfW, y + 15);
    addText("KobraPay", margin + halfW / 2 - 10, y + 20, { size: 8, color: [100, 100, 100] });
    doc.line(margin + halfW + 20, y + 15, margin + contentW, y + 15);
    addText(contract.clientName, margin + halfW + 20 + halfW / 2 - 15, y + 20, { size: 8, color: [100, 100, 100] });
    y += 28;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 287, pageW, 10, "F");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("KobraPay — kobrapay.mx | Documento generado electrónicamente", margin, 293);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin - 20, 293);
  }

  const fileName = `Contrato_KP-${String(contract.id).padStart(5, "0")}_${contract.clientName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

// ─── Contract Preview Modal ───────────────────────────────────────────────────
function ContractPreviewModal({ contract, onClose }: { contract: ContractData; onClose: () => void }) {
  const dateStr = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-700" />
            Vista previa del contrato
          </DialogTitle>
        </DialogHeader>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-sm font-serif" style={{ fontFamily: "Georgia, serif" }}>
          {/* Header */}
          <div className="bg-cyan-700 text-white p-4 rounded-t-lg -mx-8 -mt-8 mb-6 text-center">
            <h1 className="text-xl font-bold tracking-wide">CONTRATO DE SERVICIOS</h1>
            <p className="text-cyan-200 text-xs mt-1">KobraPay — Plataforma de Procesamiento de Pagos Digitales</p>
          </div>
          <div className="flex justify-between items-center mb-6 bg-cyan-50 rounded p-3 text-xs">
            <span className="font-bold text-cyan-800">Contrato No. KP-{String(contract.id).padStart(5, "0")}</span>
            <span className="text-gray-600">Fecha: {dateStr}</span>
          </div>

          {/* Parties */}
          <h2 className="text-cyan-700 font-bold text-sm uppercase border-b border-cyan-200 pb-1 mb-3">Comparecientes</h2>
          <p className="mb-2"><strong>EL PRESTADOR DE SERVICIOS:</strong> KobraPay, plataforma de procesamiento de pagos digitales, con domicilio en Ciudad de México.</p>
          <p className="mb-1"><strong>EL CLIENTE:</strong></p>
          <ul className="ml-4 mb-4 space-y-0.5 text-gray-700">
            <li>Nombre: {contract.clientName}</li>
            {contract.businessName && <li>Negocio: {contract.businessName}</li>}
            {contract.clientRfc && <li>RFC: {contract.clientRfc}</li>}
            {contract.clientCurp && <li>CURP: {contract.clientCurp}</li>}
            {contract.clientIneNumber && <li>INE/Pasaporte: {contract.clientIneNumber}</li>}
            <li>Email: {contract.clientEmail}</li>
            {contract.clientPhone && <li>Teléfono: {contract.clientPhone}</li>}
            {contract.clientAddress && <li>Domicilio: {contract.clientAddress}</li>}
          </ul>

          {/* Clauses */}
          <h2 className="text-cyan-700 font-bold text-sm uppercase border-b border-cyan-200 pb-1 mb-3">Cláusulas del Contrato</h2>
          <div className="space-y-3 text-gray-800">
            <div>
              <p className="font-bold text-cyan-700 text-xs">PRIMERA. OBJETO</p>
              <p>KobraPay prestará al Cliente servicios de procesamiento de pagos en línea mediante enlaces de cobro, punto de venta digital, y herramientas de gestión financiera.</p>
            </div>
            <div>
              <p className="font-bold text-cyan-700 text-xs">SEGUNDA. COMISIÓN</p>
              <p>El Cliente acepta una comisión del <strong>{contract.commissionRate}%</strong> sobre cada transacción procesada a través de la plataforma. Esta comisión incluye el procesamiento del pago, la gestión de disputas y el soporte técnico.</p>
            </div>
            {Number(contract.contractDurationMonths) > 0 && (
              <div>
                <p className="font-bold text-cyan-700 text-xs">TERCERA. VIGENCIA</p>
                <p>El presente contrato tendrá una duración de <strong>{formatDuration(contract.contractDurationMonths)}</strong> a partir de la fecha de firma. La terminación anticipada generará una penalización equivalente a 2 meses de comisiones promedio.</p>
              </div>
            )}
            {contract.includeExclusivityClause && (
              <div>
                <p className="font-bold text-cyan-700 text-xs">CLÁUSULA DE EXCLUSIVIDAD</p>
                <p>Durante la vigencia del contrato, el Cliente se compromete a utilizar únicamente KobraPay como plataforma de procesamiento de pagos digitales para su negocio, absteniéndose de contratar servicios similares con terceros.</p>
              </div>
            )}
            <div>
              <p className="font-bold text-cyan-700 text-xs">PROTECCIÓN DE DATOS</p>
              <p>KobraPay se compromete a proteger los datos personales del Cliente conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.</p>
            </div>
            <div>
              <p className="font-bold text-cyan-700 text-xs">CONFIDENCIALIDAD</p>
              <p>Ambas partes se obligan a mantener la confidencialidad de la información intercambiada durante la prestación de los servicios.</p>
            </div>
            <div>
              <p className="font-bold text-cyan-700 text-xs">RESPONSABILIDAD</p>
              <p>KobraPay no será responsable por interrupciones del servicio causadas por terceros (procesadores de pago, proveedores de internet) o por fuerza mayor.</p>
            </div>
            <div>
              <p className="font-bold text-cyan-700 text-xs">JURISDICCIÓN</p>
              <p>Para la interpretación y cumplimiento del presente contrato, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México.</p>
            </div>
            {contract.customTerms && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="font-bold text-amber-700 text-xs">TÉRMINOS ADICIONALES</p>
                <p className="text-gray-700 whitespace-pre-wrap">{contract.customTerms}</p>
              </div>
            )}
          </div>

          {/* Signatures */}
          <h2 className="text-cyan-700 font-bold text-sm uppercase border-b border-cyan-200 pb-1 mb-3 mt-6">Firmas</h2>
          {contract.status === "signed" && contract.signedAt ? (
            <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-green-700 text-xs font-medium">
                Firmado digitalmente el {new Date(contract.signedAt).toLocaleString("es-MX")}
                {contract.signedFromIp && ` · IP: ${contract.signedFromIp}`}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div className="text-center">
                <div className="border-b border-gray-400 mb-1 h-8"></div>
                <p className="text-xs text-gray-500">KobraPay</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 mb-1 h-8"></div>
                <p className="text-xs text-gray-500">{contract.clientName}</p>
              </div>
            </div>
          )}
          <p className="text-center text-xs text-gray-400 mt-6">KobraPay — kobrapay.mx | Documento generado electrónicamente</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareContractModal({ contract, signUrl, onClose }: { contract: ContractData; signUrl: string; onClose: () => void }) {
  const whatsappMsg = encodeURIComponent(
    `Hola ${contract.clientName}, te enviamos el contrato de servicios KobraPay para tu revisión y firma digital.\n\nAccede aquí: ${signUrl}\n\nEste enlace expira en 7 días.`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`;
  const emailSubject = encodeURIComponent(`Contrato de servicios KobraPay — ${contract.clientName}`);
  const emailBody = encodeURIComponent(
    `Hola ${contract.clientName},\n\nTe enviamos el contrato de servicios de KobraPay para tu revisión y firma digital.\n\nAccede aquí: ${signUrl}\n\nEste enlace expira en 7 días.\n\nSaludos,\nKobraPay`
  );
  const mailtoUrl = `mailto:${contract.clientEmail}?subject=${emailSubject}&body=${emailBody}`;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Enlace de firma</Label>
            <div className="flex gap-2">
              <Input value={signUrl} readOnly className="text-xs font-mono bg-gray-50" />
              <Button
                size="sm" variant="outline"
                onClick={() => { navigator.clipboard.writeText(signUrl); toast.success("Enlace copiado"); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </a>
            <a href={mailtoUrl}>
              <Button variant="outline" className="w-full gap-2">
                <Mail className="w-4 h-4" /> Email
              </Button>
            </a>
          </div>
          <p className="text-xs text-gray-500 text-center">
            El cliente podrá revisar, subir su identificación y firmar digitalmente el contrato desde este enlace.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Contracts() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContractStatus | "all">("all");
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);
  const [previewContract, setPreviewContract] = useState<ContractData | null>(null);
  const [shareContract, setShareContract] = useState<{ contract: ContractData; signUrl: string } | null>(null);

  const { data: contracts = [], refetch } = trpc.contracts.list.useQuery();
  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("Contrato creado como borrador.");
      setShowCreate(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.contracts.sendToClient.useMutation({
    onSuccess: (data) => {
      const signUrl = `${window.location.origin}/sign-contract/${data.signToken}`;
      navigator.clipboard.writeText(signUrl).catch(() => {});
      toast.success("Contrato enviado al cliente. Enlace copiado al portapapeles.");
      setSendingId(null);
      refetch();
    },
    onError: (e) => { toast.error(e.message); setSendingId(null); },
  });
  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => { toast.success("Contrato actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const defaultForm = {
    clientName: "", clientEmail: "", clientPhone: "", clientRfc: "", clientCurp: "",
    clientAddress: "", businessName: "", clientIneNumber: "",
    commissionRate: 6, contractDurationMonths: 0, includeExclusivityClause: false,
    customTerms: "", internalNotes: "",
  };
  const [form, setForm] = useState(defaultForm);
  const resetForm = () => setForm(defaultForm);

  const handleCreate = () => {
    createMutation.mutate(form);
  };

  const handleSend = (id: number) => {
    setSendingId(id);
    sendMutation.mutate({ id, expiresInDays: 7 });
  };

  const handleShare = (contract: ContractData) => {
    if (!contract.signToken) {
      toast.error("Primero envía el contrato al cliente para generar el enlace de firma.");
      return;
    }
    const signUrl = `${window.location.origin}/sign-contract/${contract.signToken}`;
    setShareContract({ contract, signUrl });
  };

  const handleDownloadPDF = async (contract: ContractData) => {
    setGeneratingPdf(contract.id);
    try {
      await generateContractPDF(contract);
      toast.success("PDF descargado correctamente");
    } catch (e) {
      toast.error("Error al generar el PDF");
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Filtered contracts
  const filtered = contracts.filter(c => {
    const matchSearch = !search ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientEmail.toLowerCase().includes(search.toLowerCase()) ||
      (c.businessName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const selectedContractData = contracts.find(c => c.id === selectedContract) as ContractData | undefined;

  const stats = {
    draft: contracts.filter(c => c.status === "draft").length,
    sent: contracts.filter(c => c.status === "sent").length,
    signed: contracts.filter(c => c.status === "signed").length,
    archived: contracts.filter(c => c.status === "archived").length,
  };

  return (
    <DashboardLayout>
    <div className="p-6 max-w-6xl mx-auto">
      {/* Modals */}
      {previewContract && (
        <ContractPreviewModal contract={previewContract} onClose={() => setPreviewContract(null)} />
      )}
      {shareContract && (
        <ShareContractModal
          contract={shareContract.contract}
          signUrl={shareContract.signUrl}
          onClose={() => setShareContract(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos Digitales</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona contratos con tus clientes — solo visible para ti</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) resetForm(); }}>
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
                    <SelectItem value="1">1 mes</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses (1 año)</SelectItem>
                    <SelectItem value="24">24 meses (2 años)</SelectItem>
                    <SelectItem value="36">36 meses (3 años)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Switch checked={form.includeExclusivityClause} onCheckedChange={v => setForm(f => ({ ...f, includeExclusivityClause: v }))} />
                <div>
                  <p className="font-medium text-sm">Cláusula de exclusividad</p>
                  <p className="text-xs text-gray-500">El cliente se compromete a usar únicamente KobraPay durante la vigencia del contrato</p>
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
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="flex-1">Cancelar</Button>
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
          const count = stats[status];
          const { label, color } = STATUS_LABELS[status];
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={`bg-white rounded-xl border p-4 text-left transition-all ${filterStatus === status ? "border-cyan-500 shadow-md" : "border-gray-200 hover:border-gray-300"}`}
            >
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color} mb-2`}>
                {STATUS_ICONS[status]} {label}
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search & filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o negocio..."
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {filterStatus !== "all" && (
          <Button variant="outline" onClick={() => setFilterStatus("all")} className="gap-1 text-sm">
            <X className="w-3 h-3" /> Limpiar filtro
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">{contracts.length === 0 ? "No hay contratos aún" : "Sin resultados"}</p>
            <p className="text-sm">{contracts.length === 0 ? "Crea tu primer contrato para un cliente" : "Intenta con otro término de búsqueda"}</p>
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
              {filtered.map(contract => {
                const status = contract.status as ContractStatus;
                const { label, color } = STATUS_LABELS[status];
                const isSelected = contract.id === selectedContract;
                return (
                  <tr key={contract.id} className={`hover:bg-gray-50 ${isSelected ? "bg-cyan-50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{contract.clientName}</p>
                      <p className="text-xs text-gray-500">{contract.clientEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contract.businessName || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-cyan-700">{contract.commissionRate}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDuration(contract.contractDurationMonths)}
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
                        {/* Vista previa */}
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setPreviewContract(contract as ContractData)}
                          title="Vista previa del contrato"
                          className="text-cyan-600 hover:text-cyan-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {/* Ver detalle */}
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setSelectedContract(isSelected ? null : contract.id)}
                          title="Ver detalles"
                          className={isSelected ? "text-cyan-700" : ""}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        {/* Descargar PDF */}
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleDownloadPDF(contract as ContractData)}
                          disabled={generatingPdf === contract.id}
                          title="Descargar PDF"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {generatingPdf === contract.id
                            ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            : <Download className="w-4 h-4" />}
                        </Button>
                        {/* Enviar al cliente */}
                        {status === "draft" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleSend(contract.id)}
                            disabled={sendingId === contract.id}
                            className="text-blue-600 hover:text-blue-700"
                            title="Enviar al cliente"
                          >
                            {sendingId === contract.id
                              ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              : <Send className="w-4 h-4" />}
                          </Button>
                        )}
                        {/* Compartir (WhatsApp / Email) */}
                        {(status === "sent" || status === "signed") && contract.signToken && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleShare(contract as ContractData)}
                            className="text-green-600 hover:text-green-700"
                            title="Compartir enlace (WhatsApp / Email)"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {/* Archivar */}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-700" />
              Detalle — {selectedContractData.clientName}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm" variant="outline"
                onClick={() => setPreviewContract(selectedContractData)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" /> Vista previa
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => handleDownloadPDF(selectedContractData)}
                disabled={generatingPdf === selectedContractData.id}
                className="gap-2 text-cyan-700 border-cyan-200 hover:bg-cyan-50"
              >
                {generatingPdf === selectedContractData.id
                  ? <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                  : <Download className="w-4 h-4" />}
                PDF
              </Button>
              {selectedContractData.signToken && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => handleShare(selectedContractData)}
                  className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
                >
                  <MessageCircle className="w-4 h-4" /> Compartir
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedContractData.clientEmail}</span></div>
            <div><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{selectedContractData.clientPhone || "—"}</span></div>
            <div><span className="text-gray-500">RFC:</span> <span className="font-medium">{selectedContractData.clientRfc || "—"}</span></div>
            <div><span className="text-gray-500">CURP:</span> <span className="font-medium">{selectedContractData.clientCurp || "—"}</span></div>
            <div><span className="text-gray-500">INE/Pasaporte:</span> <span className="font-medium">{selectedContractData.clientIneNumber || "—"}</span></div>
            <div><span className="text-gray-500">Domicilio:</span> <span className="font-medium">{selectedContractData.clientAddress || "—"}</span></div>
            <div><span className="text-gray-500">Comisión:</span> <span className="font-medium text-cyan-700">{selectedContractData.commissionRate}%</span></div>
            <div><span className="text-gray-500">Duración:</span> <span className="font-medium">{formatDuration(selectedContractData.contractDurationMonths)}</span></div>
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
                {selectedContractData.ineUrl && <a href={selectedContractData.ineUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> INE / Credencial</a>}
                {selectedContractData.passportUrl && <a href={selectedContractData.passportUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Pasaporte</a>}
                {selectedContractData.addressProofUrl && <a href={selectedContractData.addressProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Comprobante de domicilio</a>}
                {selectedContractData.rfcDocUrl && <a href={selectedContractData.rfcDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> RFC</a>}
                {selectedContractData.curpDocUrl && <a href={selectedContractData.curpDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full hover:bg-cyan-100 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> CURP</a>}
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
              <p className="text-xs font-semibold text-yellow-700 mb-1">Notas internas (privadas):</p>
              <p className="text-sm text-yellow-800">{selectedContractData.internalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
