import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  FileText,
  Search,
  Eye,
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type CBStatus = "open" | "under_review" | "won" | "lost" | "closed";

const STATUS_CONFIG: Record<CBStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Abierta", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  under_review: { label: "En revisión", color: "bg-blue-100 text-blue-800", icon: <RefreshCw className="w-3 h-3" /> },
  won: { label: "Ganada", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  lost: { label: "Perdida", color: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
  closed: { label: "Cerrada", color: "bg-gray-100 text-foreground", icon: <FileText className="w-3 h-3" /> },
};

function fmt(n: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
}

type ChargebackRow = {
  id: number;
  userId: number;
  transactionId?: number | null;
  stripeDisputeId?: string | null;
  amount: number;
  currency?: string | null;
  status: string;
  reason?: string | null;
  reasonEs?: string | null;
  notes?: string | null;
  dueBy?: Date | string | null;
  resolvedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  // enriched
  vendorName?: string | null;
  vendorEmail?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  operationNumber?: string | null;
  linkDescription?: string | null;
};

export default function AdminChargebacks() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";

  const { data: chargebacks = [], isLoading, refetch } = trpc.chargebacks.listAll.useQuery(undefined, {
    enabled: isSuperAdmin,
  });

  const updateStatusMutation = trpc.chargebacks.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      refetch();
      setDetailCb(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailCb, setDetailCb] = useState<ChargebackRow | null>(null);
  const [newStatus, setNewStatus] = useState<CBStatus>("open");
  const [adminNotes, setAdminNotes] = useState("");

  const filtered = useMemo(() => {
    return (chargebacks as ChargebackRow[]).filter((cb) => {
      const matchesSearch =
        !search ||
        cb.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        cb.vendorEmail?.toLowerCase().includes(search.toLowerCase()) ||
        cb.payerName?.toLowerCase().includes(search.toLowerCase()) ||
        cb.payerEmail?.toLowerCase().includes(search.toLowerCase()) ||
        cb.operationNumber?.toLowerCase().includes(search.toLowerCase()) ||
        cb.stripeDisputeId?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || cb.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [chargebacks, search, statusFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const all = chargebacks as ChargebackRow[];
    const open = all.filter((c) => c.status === "open" || c.status === "under_review").length;
    const won = all.filter((c) => c.status === "won").length;
    const lost = all.filter((c) => c.status === "lost").length;
    const totalAmount = all.reduce((sum, c) => sum + (c.amount || 0), 0);
    return { total: all.length, open, won, lost, totalAmount };
  }, [chargebacks]);

  function openDetail(cb: ChargebackRow) {
    setDetailCb(cb);
    setNewStatus((cb.status as CBStatus) || "open");
    setAdminNotes(cb.notes || "");
  }

  function handleUpdateStatus() {
    if (!detailCb) return;
    updateStatusMutation.mutate({
      id: detailCb.id,
      status: newStatus,
      notes: adminNotes || undefined,
    });
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">Acceso restringido</p>
            <p className="text-muted-foreground text-sm mt-1">Solo el superadministrador puede ver esta sección.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Contracargos — Vista Global
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Todos los contracargos de todos los vendedores registrados en la plataforma.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Ganados</p>
              <p className="text-2xl font-bold text-green-600">{stats.won}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Monto total en disputa</p>
              <p className="text-lg font-bold text-red-600">{fmt(stats.totalAmount)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Buscar por vendedor, cliente, operación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="open">Abierta</SelectItem>
              <SelectItem value="under_review">En revisión</SelectItem>
              <SelectItem value="won">Ganada</SelectItem>
              <SelectItem value="lost">Perdida</SelectItem>
              <SelectItem value="closed">Cerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {filtered.length} contracargo{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-green-300 mb-2" />
                <p className="text-sm font-medium">Sin contracargos</p>
                <p className="text-xs mt-0.5">No hay resultados para los filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Vendedor</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Cliente que disputó</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Monto</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Motivo</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Estado</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cb) => {
                      const st = (cb.status as CBStatus) || "open";
                      const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.open;
                      return (
                        <tr key={cb.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3 font-mono text-xs text-muted-foreground">#{cb.id}</td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                            {new Date(cb.createdAt).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground text-xs">
                                {cb.vendorName || "—"}
                              </span>
                              <span className="text-muted-foreground text-xs">{cb.vendorEmail || ""}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground text-xs">
                                {cb.payerName || "—"}
                              </span>
                              <span className="text-muted-foreground text-xs">{cb.payerEmail || ""}</span>
                              {cb.payerPhone && (
                                <span className="text-muted-foreground text-xs">{cb.payerPhone}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">
                            {fmt(cb.amount, cb.currency || "MXN")}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground max-w-[160px] truncate">
                            {cb.reasonEs || cb.reason || "Sin motivo"}
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={cfg.color + " border-0 flex items-center gap-1 w-fit text-xs"}>
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-blue-600 hover:bg-blue-50 h-7 px-2"
                              onClick={() => openDetail(cb)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                            </Button>
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
      </div>

      {/* Modal: Detalle del contracargo */}
      <Dialog open={!!detailCb} onOpenChange={(o) => !o && setDetailCb(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Detalle del Contracargo #{detailCb?.id}
            </DialogTitle>
          </DialogHeader>
          {detailCb && (
            <div className="space-y-4 py-1">
              {/* Vendedor */}
              <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Vendedor</p>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium">{detailCb.vendorName || "—"}</span>
                </div>
                {detailCb.vendorEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{detailCb.vendorEmail}</span>
                  </div>
                )}
              </div>

              {/* Cliente que disputó */}
              <div className="bg-red-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Cliente que hizo el contracargo</p>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-medium">{detailCb.payerName || "—"}</span>
                </div>
                {detailCb.payerEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{detailCb.payerEmail}</span>
                  </div>
                )}
                {detailCb.payerPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{detailCb.payerPhone}</span>
                  </div>
                )}
              </div>

              {/* Detalles del cobro */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Monto en disputa</p>
                  <p className="font-semibold text-red-600">
                    {fmt(detailCb.amount, detailCb.currency || "MXN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {new Date(detailCb.createdAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                {detailCb.operationNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">N° Operación</p>
                    <p className="font-mono text-xs">{detailCb.operationNumber}</p>
                  </div>
                )}
                {detailCb.stripeDisputeId && (
                  <div>
                    <p className="text-xs text-muted-foreground">ID Disputa Stripe</p>
                    <p className="font-mono text-xs truncate">{detailCb.stripeDisputeId}</p>
                  </div>
                )}
                {detailCb.dueBy && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha límite respuesta</p>
                    <p className="font-medium text-orange-600">
                      {new Date(detailCb.dueBy).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                )}
                {detailCb.linkDescription && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Descripción del cobro</p>
                    <p className="text-sm">{detailCb.linkDescription}</p>
                  </div>
                )}
              </div>

              {/* Motivo */}
              {(detailCb.reasonEs || detailCb.reason) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Motivo del contracargo</p>
                  <p className="text-sm bg-muted/40 rounded p-2">
                    {detailCb.reasonEs || detailCb.reason}
                  </p>
                </div>
              )}

              {/* Actualizar estado (solo superadmin) */}
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Actualizar estado
                </p>
                <div>
                  <Label className="text-xs">Nuevo estado</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as CBStatus)}>
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierta</SelectItem>
                      <SelectItem value="under_review">En revisión</SelectItem>
                      <SelectItem value="won">Ganada</SelectItem>
                      <SelectItem value="lost">Perdida</SelectItem>
                      <SelectItem value="closed">Cerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notas internas</Label>
                  <Textarea
                    className="mt-1 text-sm"
                    rows={3}
                    placeholder="Observaciones, resolución, evidencia presentada..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailCb(null)}>
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {updateStatusMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
