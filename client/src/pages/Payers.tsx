import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

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
              <span className="text-white text-sm font-bold">
                {payer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-gray-900 font-bold">{payer.name}</p>
              <p className="text-gray-400 text-xs font-normal">{payer.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-medium">Total pagado</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(payer.totalPaid)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Transacciones</p>
            <p className="text-lg font-bold text-blue-700">{payer.totalTransactions}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 font-medium">Último pago</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">
              {payer.lastPaymentAt
                ? new Date(Number(payer.lastPaymentAt)).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Mail className="w-4 h-4 text-gray-400" />
            {payer.email}
          </div>
          {payer.phone && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Phone className="w-4 h-4 text-gray-400" />
              {payer.phone}
            </div>
          )}
        </div>

        {/* Transaction history */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
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
            <div className="text-center py-8 text-gray-400">
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
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description || "Pago"}</p>
                    {tx.operationNumber && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {tx.operationNumber}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(tx.createdAt ?? null)}</p>
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
  const [search, setSearch] = useState("");
  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data: payers, isLoading } = trpc.customers.list.useQuery({ search: debouncedSearch });

  const totalPaid = (payers || []).reduce((sum, p) => sum + Number(p.totalPaid || 0), 0);
  const totalTx = (payers || []).reduce((sum, p) => sum + (p.totalTransactions || 0), 0);

  return (
    <DashboardLayout title="Mis Pagadores">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total pagadores</p>
                  <p className="text-2xl font-bold text-gray-800 mt-0.5">{payers?.length ?? 0}</p>
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
                  <p className="text-xs text-gray-500 font-medium">Transacciones</p>
                  <p className="text-2xl font-bold text-gray-800 mt-0.5">{totalTx}</p>
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
                  <p className="text-xs text-gray-500 font-medium">Total recaudado</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{formatCurrency(totalPaid)}</p>
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
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Directorio de Pagadores
              </CardTitle>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">
                  {search ? "Sin resultados" : "Sin pagadores aún"}
                </p>
                <p className="text-sm text-gray-400">
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
                    <button
                      key={payer.id}
                      onClick={() => setSelectedPayer(payer)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{initials}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{payer.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {payer.email}
                          </span>
                          {payer.phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {payer.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Total pagado</p>
                          <p className="text-sm font-bold text-green-600">{formatCurrency(payer.totalPaid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Pagos</p>
                          <p className="text-sm font-bold text-gray-700">{payer.totalTransactions}</p>
                        </div>
                        {payer.lastPaymentAt && (
                          <div className="text-right hidden lg:block">
                            <p className="text-xs text-gray-400">Último pago</p>
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(Number(payer.lastPaymentAt)).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
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
    </DashboardLayout>
  );
}
