import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  paid: { label: "Pagado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-600 border-red-200", icon: XCircle },
};
type LinkItem = {
  id: number;
  token: string;
  clientName: string;
  clientEmail?: string | null;
  amount: string | number;
  currency: string;
  description: string;
  status: keyof typeof statusConfig;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  commissionRate?: string | number | null;
  commissionAmount?: string | number | null;
  netAmount?: string | number | null;
  archived?: boolean;
};

export default function Links() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [editLink, setEditLink] = useState<LinkItem | null>(null);
  const [editForm, setEditForm] = useState({ clientName: "", clientEmail: "", amount: "", description: "" });
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: links, isLoading } = trpc.paymentLinks.list.useQuery();

  const cancelLink = trpc.paymentLinks.cancel.useMutation({
    onSuccess: () => { utils.paymentLinks.list.invalidate(); toast.success("Enlace cancelado"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteLink = trpc.paymentLinks.delete.useMutation({
    onSuccess: () => { utils.paymentLinks.list.invalidate(); utils.transactions.stats.invalidate(); toast.success("Enlace eliminado"); },
    onError: (err) => toast.error(err.message),
  });

  const archiveLink = trpc.paymentLinks.archive.useMutation({
    onSuccess: (_, vars) => {
      utils.paymentLinks.list.invalidate();
      toast.success(vars.archived ? "Enlace archivado" : "Enlace restaurado");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkDelete = trpc.paymentLinks.bulkDelete.useMutation({
    onSuccess: () => {
      utils.paymentLinks.list.invalidate();
      utils.transactions.stats.invalidate();
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success("Enlaces eliminados correctamente");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkArchive = trpc.paymentLinks.bulkArchive.useMutation({
    onSuccess: (_, vars) => {
      utils.paymentLinks.list.invalidate();
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success(vars.archived ? "Enlaces archivados" : "Enlaces restaurados");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateLink = trpc.paymentLinks.update.useMutation({
    onSuccess: () => {
      utils.paymentLinks.list.invalidate();
      setEditLink(null);
      toast.success("Enlace actualizado correctamente");
    },
    onError: (err) => toast.error(err.message),
  });

  const getUrl = (token: string) => `${window.location.origin}/pay/${token}`;

  const handleCopy = async (id: number, token: string) => {
    await navigator.clipboard.writeText(getUrl(token));
    setCopiedId(id);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleWhatsApp = (link: LinkItem) => {
    const url = getUrl(link.token);
    const msg = encodeURIComponent(
      `Hola ${link.clientName} 👋\n\nTe comparto tu enlace de pago por *${formatCurrency(link.amount, link.currency)}* para "${link.description}":\n\n🔗 ${url}\n\n¡Gracias!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = (link: LinkItem) => {
    const url = getUrl(link.token);
    const subject = encodeURIComponent(`Enlace de pago: ${formatCurrency(link.amount, link.currency)}`);
    const body = encodeURIComponent(
      `Hola ${link.clientName},\n\nTe comparto tu enlace de pago por ${formatCurrency(link.amount, link.currency)} para "${link.description}":\n\n${url}\n\nGracias.`
    );
    window.open(`mailto:${link.clientEmail || ""}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleOpenEdit = (link: LinkItem) => {
    setEditLink(link);
    setEditForm({
      clientName: link.clientName,
      clientEmail: link.clientEmail || "",
      amount: String(link.amount),
      description: link.description,
    });
  };

  const handleSaveEdit = () => {
    if (!editLink) return;
    updateLink.mutate({
      id: editLink.id,
      clientName: editForm.clientName || undefined,
      clientEmail: editForm.clientEmail || undefined,
      amount: editForm.amount ? parseFloat(editForm.amount) : undefined,
      description: editForm.description || undefined,
    });
  };

  const handleDownloadQR = () => {
    if (!qrRef.current || !qrLink) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement("a");
      a.download = `qr-${qrLink.token}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
    toast.success("QR descargado");
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    const paidCount = filtered.filter((l) => selectedIds.has(l.id) && l.status === "paid").length;
    const msg = paidCount > 0
      ? `¿Eliminar ${ids.length - paidCount} enlace(s)? Los ${paidCount} enlace(s) pagados NO se eliminarán.`
      : `¿Eliminar ${ids.length} enlace(s) permanentemente? Esta acción no se puede deshacer.`;
    if (confirm(msg)) {
      bulkDelete.mutate({ ids });
    }
  };

  const handleBulkArchive = (archived: boolean) => {
    const ids = Array.from(selectedIds);
    bulkArchive.mutate({ ids, archived });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const allLinks = links || [];
  const filtered = allLinks.filter((l) => {
    const isArchived = (l as LinkItem).archived ?? false;
    if (showArchived ? !isArchived : isArchived) return false;
    if (!search) return true;
    return (
      l.clientName.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  const archivedCount = allLinks.filter((l) => (l as LinkItem).archived).length;
  const activeCount = allLinks.filter((l) => !(l as LinkItem).archived).length;

  return (
    <DashboardLayout title="Links de Pago">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente o descripción..."
              className="pl-9 border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!selectMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectMode(true)}
                  className="border-gray-200 text-gray-600 hover:text-gray-800"
                >
                  Seleccionar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`border-gray-200 ${showArchived ? "bg-amber-50 text-amber-700 border-amber-200" : "text-gray-600"}`}
                >
                  <Archive className="w-4 h-4 mr-1.5" />
                  {showArchived ? `Archivados (${archivedCount})` : `Ver archivados${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
                </Button>
                <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-white">
                  <Link href="/dashboard/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo enlace
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={exitSelectMode} className="border-gray-200 text-gray-600">
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="border-gray-200 text-gray-600"
                >
                  {selectedIds.size === filtered.length && filtered.length > 0 ? "Deseleccionar todo" : "Seleccionar todo"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Barra de acciones masivas */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-cyan-50 border border-cyan-200 rounded-xl flex-wrap">
            <span className="text-sm font-medium text-cyan-800">
              {selectedIds.size} enlace{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {!showArchived ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkArchive(true)}
                  disabled={bulkArchive.isPending}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  <Archive className="w-4 h-4 mr-1.5" />
                  Archivar seleccionados
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkArchive(false)}
                  disabled={bulkArchive.isPending}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <ArchiveRestore className="w-4 h-4 mr-1.5" />
                  Restaurar seleccionados
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Eliminar seleccionados
              </Button>
            </div>
          </div>
        )}

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              {showArchived ? (
                <><Archive className="w-4 h-4 text-amber-500" /> Archivados</>
              ) : "Mis enlaces de pago"}
              {allLinks.length > 0 && (
                <span className="text-sm font-normal text-gray-400">
                  ({filtered.length} de {showArchived ? archivedCount : activeCount})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 animate-pulse rounded w-32" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-48" />
                    </div>
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-20" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {showArchived ? <Archive className="w-7 h-7 text-gray-400" /> : <Link2 className="w-7 h-7 text-gray-400" />}
                </div>
                <p className="font-medium text-gray-600 mb-1">
                  {search ? "Sin resultados" : showArchived ? "No hay archivados" : "Sin enlaces aún"}
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  {search ? "Intenta con otra búsqueda" : showArchived ? "Los enlaces archivados aparecerán aquí" : "Crea tu primer enlace de pago para comenzar a cobrar"}
                </p>
                {!search && !showArchived && (
                  <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-white">
                    <Link href="/dashboard/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear enlace
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((link) => {
                  const cfg = statusConfig[link.status as keyof typeof statusConfig] ?? statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const isPending = link.status === "pending";
                  const url = getUrl(link.token);
                  const commRate = parseFloat(String(link.commissionRate || 0));
                  const grossAmt = parseFloat(String(link.amount));
                  const commAmt = grossAmt * commRate / 100;
                  const netAmt = grossAmt - commAmt;
                  const isSelected = selectedIds.has(link.id);
                  const isArchived = (link as LinkItem).archived ?? false;

                  return (
                    <div
                      key={link.id}
                      className={`px-5 py-4 hover:bg-gray-50/50 transition-colors ${isSelected ? "bg-cyan-50/60" : ""}`}
                      onClick={selectMode ? () => toggleSelect(link.id) : undefined}
                      style={selectMode ? { cursor: "pointer" } : undefined}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox en modo selección */}
                        {selectMode && (
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(link.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-cyan-500 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isArchived ? "bg-amber-50" :
                          link.status === "paid" ? "bg-green-100" : link.status === "pending" ? "bg-cyan-100" : "bg-gray-100"
                        }`}>
                          {isArchived
                            ? <Archive className="w-4 h-4 text-amber-500" />
                            : <Link2 className={`w-4 h-4 ${
                                link.status === "paid" ? "text-green-600" : link.status === "pending" ? "text-cyan-600" : "text-gray-400"
                              }`} />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800">{link.clientName}</p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}
                              title={link.status === 'pending' ? 'El cliente aún no ha realizado el pago.' : link.status === 'paid' ? 'Pago recibido exitosamente.' : link.status === 'expired' ? 'El enlace ha expirado.' : 'Este enlace fue cancelado.'}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                            {isArchived && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-600 border-amber-200">
                                <Archive className="w-3 h-3" /> Archivado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{link.description}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">{formatCurrency(link.amount, link.currency)}</span>
                            {commRate > 0 && (
                              <span className="text-xs text-green-600 font-medium">Neto: {formatCurrency(netAmt)}</span>
                            )}
                            <span className="text-xs text-gray-400">{formatDate(link.createdAt)}</span>
                            {link.expiresAt && (
                              <span className="text-xs text-amber-500">Vence: {formatDate(link.expiresAt)}</span>
                            )}
                          </div>
                          {isPending && !isArchived && (
                            <p className="text-xs text-gray-400 font-mono mt-1.5 truncate max-w-xs">{url}</p>
                          )}
                        </div>

                        {/* Actions */}
                        {!selectMode && (
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isArchived ? (
                              // Enlace archivado: solo restaurar y eliminar
                              <>
                                <button
                                  onClick={() => archiveLink.mutate({ id: link.id, archived: false })}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600 transition-all"
                                  title="Restaurar enlace"
                                >
                                  <ArchiveRestore className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { if (confirm("¿Eliminar este enlace permanentemente?")) deleteLink.mutate({ id: link.id }); }}
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
                                  title="Eliminar enlace"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : isPending ? (
                              <>
                                <button
                                  onClick={() => handleCopy(link.id, link.token)}
                                  className={`p-1.5 rounded-lg transition-all ${copiedId === link.id ? "bg-green-100 text-green-600" : "hover:bg-gray-100 text-gray-500 hover:text-cyan-600"}`}
                                  title="Copiar enlace"
                                >
                                  {copiedId === link.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleWhatsApp(link as LinkItem)}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600 transition-all"
                                  title="Enviar por WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEmail(link as LinkItem)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-all"
                                  title="Enviar por Email"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setQrLink(link as LinkItem)}
                                  className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-all"
                                  title="Ver QR"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
                                  title="Ver página de pago"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => handleOpenEdit(link as LinkItem)}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-500 hover:text-amber-600 transition-all"
                                  title="Editar enlace"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => archiveLink.mutate({ id: link.id, archived: true })}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-all"
                                  title="Archivar enlace"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { if (confirm("¿Cancelar este enlace?")) cancelLink.mutate({ id: link.id }); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                  title="Cancelar enlace"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { if (confirm("¿Eliminar este enlace permanentemente? Esta acción no se puede deshacer.")) deleteLink.mutate({ id: link.id }); }}
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
                                  title="Eliminar enlace"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              // Cancelado/expirado/pagado: archivar y eliminar (no pagados)
                              <div className="flex items-center gap-1">
                                {link.status === "paid" && (
                                  <span className="text-xs text-green-600 font-medium flex items-center gap-1 mr-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Cobrado
                                  </span>
                                )}
                                <button
                                  onClick={() => archiveLink.mutate({ id: link.id, archived: true })}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-all"
                                  title="Archivar enlace"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                {link.status !== "paid" && (
                                  <button
                                    onClick={() => { if (confirm("¿Eliminar este enlace permanentemente?")) deleteLink.mutate({ id: link.id }); }}
                                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
                                    title="Eliminar enlace"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal QR */}
      <Dialog open={!!qrLink} onOpenChange={() => setQrLink(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR de pago</DialogTitle>
          </DialogHeader>
          {qrLink && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500">
                <strong>{qrLink.clientName}</strong> · {formatCurrency(qrLink.amount, qrLink.currency)}
              </p>
              <div ref={qrRef} className="flex justify-center">
                <QRCodeSVG
                  value={getUrl(qrLink.token)}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#1e3a5f"
                  level="M"
                  includeMargin
                />
              </div>
              <p className="text-xs text-gray-400 break-all font-mono">{getUrl(qrLink.token)}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleCopy(qrLink.id, qrLink.token)}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar enlace
                </Button>
                <Button className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white" onClick={handleDownloadQR}>
                  <Download className="w-4 h-4 mr-2" /> Descargar QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!editLink} onOpenChange={() => setEditLink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar enlace de pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre del cliente</Label>
              <Input
                value={editForm.clientName}
                onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email del cliente</Label>
              <Input
                type="email"
                value={editForm.clientEmail}
                onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input
                  type="number"
                  min="10"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="pl-7 border-gray-200"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="border-gray-200"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditLink(null)}>Cancelar</Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-400 text-white"
              onClick={handleSaveEdit}
              disabled={updateLink.isPending}
            >
              {updateLink.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
