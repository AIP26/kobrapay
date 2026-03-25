import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users,
  Search,
  Mail,
  Phone,
  CreditCard,
  TrendingUp,
  Calendar,
  ChevronRight,
  X,
  CheckCircle2,
  Hash,
  Trash2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(amount));
}

function formatDate(ts: number | string | Date | null) {
  if (!ts) return "—";
  return new Date(Number(ts)).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Payer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  countryCode?: string | null;
  totalPaid: string | number;
  totalTransactions: number;
  lastPaymentAt?: number | null;
}

interface Transaction {
  id: number;
  operationNumber?: string | null;
  amount: string | number;
  currency?: string | null;
  status: string;
  description?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  createdAt?: number | Date | null;
}

function PayerDetail({ payer, onClose }: { payer: Payer; onClose: () => void }) {
  const { data: transactions, isLoading } = trpc.customers.getTransactions.useQuery(
    { email: payer.email },
    { enabled: !!payer.email }
  );

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-foreground text-sm font-bold">
                {payer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-foreground font-bold">{payer.name}</p>
              <p className="text-muted-foreground text-xs font-normal">{payer.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-medium">Total pagado</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(payer.totalPaid)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Transacciones</p>
            <p className="text-lg font-bold text-blue-700">{payer.totalTransactions}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-medium">Último pago</p>
            <p className="text-xs font-semibold text-foreground mt-1">
              {payer.lastPaymentAt
                ? new Date(Number(payer.lastPaymentAt)).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 text-muted-foreground" />
            {payer.email}
          </div>
          {payer.phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {payer.phone}
            </div>
          )}
        </div>

        {/* Transaction history */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            Historial de pagos
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin transacciones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
{((transactions ?? []) as unknown as Transaction[]).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description || "Pago"}</p>
                    {tx.operationNumber && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {tx.operationNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt ?? null)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">{formatCurrency(tx.amount)}</p>
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                      Exitoso
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Payers() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";

  const [search, setSearch] = useState("");
  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payer | null>(null);
  const [deletePin, setDeletePin] = useState(["", "", "", ""]);
  const [isDeleting, setIsDeleting] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const debouncedSearch = useDebounce(search, 400);

  const { data: payers, isLoading, refetch } = trpc.customers.list.useQuery({ search: debouncedSearch });
  const { data: pinStatus } = trpc.vendor.hasDeletePin.useQuery(undefined, { enabled: isSuperAdmin });

  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Pagador eliminado correctamente");
      setDeleteTarget(null);
      setDeletePin(["", "", "", ""]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar");
      setDeletePin(["", "", "", ""]);
      pinRefs[0].current?.focus();
    },
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const pin = deletePin.join("");
    if (pin.length !== 4) { toast.error("Ingresa los 4 dígitos del PIN"); return; }
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ email: deleteTarget.email, pin });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPaid = (payers || []).reduce((sum, p) => sum + Number(p.totalPaid || 0), 0);
  const totalTx = (payers || []).reduce((sum, p) => sum + (p.totalTransactions || 0), 0);

  return (
    <DashboardLayout title="Mis Pagadores">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total pagadores</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{payers?.length ?? 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Transacciones</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{totalTx}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total recaudado</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + List */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Directorio de Pagadores
              </CardTitle>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-gray-100">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 animate-pulse rounded w-40" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-56" />
                    </div>
                    <div className="h-6 bg-gray-100 animate-pulse rounded w-20" />
                  </div>
                ))}
              </div>
            ) : !payers || payers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">
                  {search ? "Sin resultados" : "Sin pagadores aún"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? `No se encontraron pagadores con "${search}"`
                    : "Los pagadores aparecerán aquí cuando alguien complete un pago"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
  {((payers ?? []) as unknown as Payer[]).map((payer) => {
                  const initials = payer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={payer.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedPayer(payer)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedPayer(payer)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors text-left cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-foreground text-sm font-bold">{initials}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{payer.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {payer.email}
                          </span>
                          {payer.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {payer.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total pagado</p>
                          <p className="text-sm font-bold text-green-600">{formatCurrency(payer.totalPaid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Pagos</p>
                          <p className="text-sm font-bold text-foreground">{payer.totalTransactions}</p>
                        </div>
                        {payer.lastPaymentAt && (
                          <div className="text-right hidden lg:block">
                            <p className="text-xs text-muted-foreground">Último pago</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(Number(payer.lastPaymentAt)).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      {/* Botón eliminar solo para superadmin */}
                      {isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(payer); setDeletePin(["","","",""]); }}
                          className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Eliminar pagador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payer Detail Modal */}
      {selectedPayer && (
        <PayerDetail payer={selectedPayer} onClose={() => setSelectedPayer(null)} />
      )}

      {/* Modal eliminar pagador con PIN */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeletePin(["","","",""]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar pagador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!pinStatus?.hasPin ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">No tienes un PIN configurado</p>
                    <p className="text-amber-700 text-xs mt-1">Ve a <strong>Ajustes</strong> para crear tu PIN de 4 dígitos antes de eliminar pagadores.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">
                    ¿Eliminar al pagador <strong>{deleteTarget?.name}</strong>?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{deleteTarget?.email}</p>
                  <p className="text-xs text-red-500 mt-1">Se eliminará de tu directorio. Sus transacciones históricas se conservarán.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Ingresa tu PIN de seguridad
                  </p>
                  <div className="flex gap-3 justify-center">
                    {deletePin.map((digit, i) => (
                      <input
                        key={i}
                        ref={pinRefs[i]}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const p = [...deletePin]; p[i] = val; setDeletePin(p);
                          if (val && i < 3) pinRefs[i+1].current?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !deletePin[i] && i > 0) pinRefs[i-1].current?.focus();
                          if (e.key === "Enter" && deletePin.join("").length === 4) handleDeleteConfirm();
                        }}
                        className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setDeleteTarget(null); setDeletePin(["","","",""]); }} disabled={isDeleting}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-foreground"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || deletePin.join("").length !== 4}
                  >
                    {isDeleting ? "Eliminando..." : "Confirmar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
