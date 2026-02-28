import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  User,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  PenLine,
  CreditCard,
  Calendar,
  X,
  ZoomIn,
  CheckCircle2,
  Clock,
  XCircle,
  FolderOpen,
  Hash,
  RefreshCw,
} from "lucide-react";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock },
  processing: { label: "Procesando", variant: "secondary" as const, icon: Clock },
  succeeded: { label: "Exitoso", variant: "default" as const, icon: CheckCircle2 },
  failed: { label: "Fallido", variant: "destructive" as const, icon: XCircle },
  refunded: { label: "Reembolsado", variant: "outline" as const, icon: XCircle },
};

// Modal para ver imagen ampliada
function ImageModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-2">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <img src={url} alt={title} className="w-full rounded-lg object-contain max-h-[70vh]" />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente de tarjeta de evidencia
function EvidenceCard({
  title,
  icon: Icon,
  imageUrl,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  imageUrl?: string | null;
  badge?: string;
}) {
  const [zoomed, setZoomed] = useState(false);

  if (!imageUrl) {
    return (
      <div className="border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] bg-muted/30">
        <Icon className="w-8 h-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">{title} no disponible</p>
      </div>
    );
  }

  return (
    <>
      {zoomed && <ImageModal url={imageUrl} title={title} onClose={() => setZoomed(false)} />}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{title}</span>
          </div>
          {badge && (
            <Badge variant="default" className="text-xs bg-green-600 text-white">
              {badge}
            </Badge>
          )}
        </div>
        <div className="relative group cursor-pointer" onClick={() => setZoomed(true)}>
          <img
            src={imageUrl}
            alt={title}
            className="w-full object-contain max-h-[160px] bg-gray-50"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </>
  );
}

// Modal de detalle del expediente
function ExpedienteModal({
  recordId,
  onClose,
}: {
  recordId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.clientRecords.detail.useQuery({ id: recordId });
  const utils = trpc.useUtils();

  // Sincronizar expediente: tomar datos de la última transacción
  const syncMutation = trpc.clientRecords.syncFromTransactions.useMutation({
    onSuccess: () => {
      toast.success("Expediente actualizado con los datos de las transacciones");
      utils.clientRecords.detail.invalidate({ id: recordId });
      utils.clientRecords.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Expediente del Cliente
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data ? (
          <p className="text-muted-foreground text-center py-8">No se encontró el expediente.</p>
        ) : (
          <div className="space-y-5">
            {/* Datos del cliente */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Datos del Cliente
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1 h-7"
                  onClick={() => syncMutation.mutate({ id: recordId })}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  Actualizar evidencia
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground">{data.record.payerName || "Sin nombre"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground break-all">{data.record.payerEmail}</span>
                </div>
                {data.record.payerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{data.record.payerPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Primer pago: {formatDate(data.record.firstSeenAt)}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-foreground">{data.record.totalTransactions}</p>
                  <p className="text-xs text-muted-foreground">Pagos realizados</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(data.record.totalAmountPaid)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total pagado</p>
                </div>
              </div>
            </div>

            {/* Evidencia */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Evidencia de Identidad
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <EvidenceCard
                  title="Foto / Selfie"
                  icon={User}
                  imageUrl={data.record.latestSelfieUrl}
                  badge={data.record.selfieVerified ? `${data.record.latestFaceMatchScore || 0}% match` : undefined}
                />
                <EvidenceCard
                  title="Firma Digital"
                  icon={PenLine}
                  imageUrl={data.record.latestSignatureUrl}
                />
                <EvidenceCard
                  title="Identificación"
                  icon={FileText}
                  imageUrl={data.record.latestIdDocumentUrl}
                />
              </div>
            </div>

            {/* Historial de transacciones */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Historial de Pagos
              </h3>
              {data.transactions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Sin transacciones completadas.</p>
              ) : (
                <div className="space-y-2">
                  {data.transactions.map((tx) => {
                    const cfg = statusConfig[tx.status as keyof typeof statusConfig] ?? statusConfig.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {formatCurrency(tx.amount, tx.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.operationNumber ? `#${tx.operationNumber} · ` : ""}
                              {formatDate(tx.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {tx.cardBrand && tx.cardLast4 && (
                            <span className="text-xs text-muted-foreground hidden sm:block capitalize">
                              {tx.cardBrand} ····{tx.cardLast4}
                            </span>
                          )}
                          <Badge variant={cfg.variant} className="text-xs">
                            <StatusIcon className="w-2.5 h-2.5 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Página principal
export default function Expedientes() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // Debounce de búsqueda
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  // Búsqueda por número de ticket (si el texto parece un número de operación)
  const looksLikeTicket = debouncedSearch.length >= 4 && /^[A-Z0-9\-]+$/i.test(debouncedSearch.trim());

  const { data: records, isLoading } = trpc.clientRecords.list.useQuery(
    debouncedSearch ? { search: debouncedSearch } : undefined
  );

  // Si no hay resultados y parece un ticket, buscar por número de operación
  const noResults = !isLoading && records !== undefined && records.length === 0;
  const { data: ticketRecord, isLoading: ticketLoading } = trpc.clientRecords.searchByTx.useQuery(
    { operationNumber: debouncedSearch.trim() },
    { enabled: noResults && looksLikeTicket && debouncedSearch.length > 0 }
  );

  // Sincronizar todos los expedientes
  const syncAllMutation = trpc.clientRecords.syncAll.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updated} expediente(s) actualizados con evidencia`);
      utils.clientRecords.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const displayRecords = records && records.length > 0
    ? records
    : ticketRecord
    ? [ticketRecord]
    : [];

  return (
    <DashboardLayout title="Expedientes de Clientes">
      {selectedId !== null && (
        <ExpedienteModal recordId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      <div className="space-y-4">
        {/* Buscador + botón sincronizar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email, teléfono o número de ticket..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
            {looksLikeTicket && debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Hash className="w-2.5 h-2.5" /> Ticket
                </Badge>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs whitespace-nowrap"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            title="Actualizar todos los expedientes con la evidencia de sus transacciones"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar todo
          </Button>
        </div>

        {/* Contador */}
        {displayRecords.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {displayRecords.length} expediente{displayRecords.length !== 1 ? "s" : ""} encontrado{displayRecords.length !== 1 ? "s" : ""}
            {ticketRecord && records?.length === 0 && (
              <span className="ml-1 text-primary font-medium">por número de ticket</span>
            )}
          </p>
        )}

        {/* Lista */}
        {isLoading || ticketLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : displayRecords.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {debouncedSearch ? "Sin resultados" : "Sin expedientes aún"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {debouncedSearch
                  ? `No se encontraron clientes con "${debouncedSearch}".`
                  : "Los expedientes se crean automáticamente cuando un cliente completa un pago."}
              </p>
              {debouncedSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1"
                  onClick={() => syncAllMutation.mutate()}
                  disabled={syncAllMutation.isPending}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
                  Sincronizar expedientes
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayRecords.map((rec) => (
              <Card
                key={rec.id}
                className="border-border cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setSelectedId(rec.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {rec.latestSelfieUrl ? (
                        <img
                          src={rec.latestSelfieUrl}
                          alt={rec.payerName || "Cliente"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {rec.payerName || "Cliente sin nombre"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{rec.payerEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-green-600 text-sm">
                            {formatCurrency(rec.totalAmountPaid)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rec.totalTransactions} pago{rec.totalTransactions !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {rec.latestSelfieUrl && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <User className="w-2.5 h-2.5" /> Foto
                          </Badge>
                        )}
                        {rec.latestSignatureUrl && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <PenLine className="w-2.5 h-2.5" /> Firma
                          </Badge>
                        )}
                        {rec.latestIdDocumentUrl && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <FileText className="w-2.5 h-2.5" /> ID
                          </Badge>
                        )}
                        {rec.selfieVerified && (
                          <Badge className="text-xs gap-1 bg-green-600 text-white">
                            <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          Último: {formatDate(rec.lastSeenAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
