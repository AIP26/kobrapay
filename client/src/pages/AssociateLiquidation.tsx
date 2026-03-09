import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DollarSign, CheckCircle, Clock, Users, TrendingUp,
  CreditCard, AlertCircle, Search, ChevronDown, ChevronUp,
} from "lucide-react";

function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

export default function AssociateLiquidation() {
  const { user } = useAuth();
  const isSuperAdmin = (user as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [reference, setReference] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");

  const { data: liquidations, isLoading, refetch } = trpc.associate.getPendingLiquidations.useQuery(undefined, {
    enabled: !!isSuperAdmin,
  });

  const markPaidMutation = trpc.associate.markEarningsPaid.useMutation({
    onSuccess: () => {
      toast.success("✅ Comisión marcada como pagada. El asociado recibirá una notificación.");
      setPayingId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Error al procesar el pago"),
  });

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-12 h-12 text-red-300" />
          <p className="text-muted-foreground font-medium">Acceso restringido a superadmin</p>
        </div>
      </DashboardLayout>
    );
  }

  const filtered = (liquidations ?? []).filter(l =>
    l.associateName.toLowerCase().includes(search.toLowerCase()) ||
    (l.associateEmail || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = filtered.reduce((s, l) => s + l.pendingTotal, 0);
  const totalPaid = filtered.reduce((s, l) => s + (l.totalEarned - l.pendingTotal), 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Liquidación de Asociados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Panel de control para gestionar y pagar las comisiones acumuladas de cada asociado.
          </p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Por pagar</p>
                <p className="text-xl font-bold text-amber-600">{formatMXN(totalPending)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total pagado histórico</p>
                <p className="text-xl font-bold text-emerald-600">{formatMXN(totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asociados con saldo</p>
                <p className="text-xl font-bold text-foreground">{filtered.filter(l => l.pendingTotal > 0).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar asociado por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de asociados */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin asociados con comisiones pendientes</p>
            <p className="text-sm text-muted-foreground mt-1">Las comisiones aparecerán aquí cuando los clientes de los asociados procesen pagos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((assoc) => (
              <div key={assoc.associateId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Fila principal */}
                <div
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === assoc.associateId ? null : assoc.associateId)}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-foreground font-bold text-sm shrink-0">
                    {(assoc.associateName || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{assoc.associateName}</p>
                    <p className="text-xs text-muted-foreground truncate">{assoc.associateEmail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Por cobrar</p>
                    <p className={`text-lg font-bold ${assoc.pendingTotal > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {formatMXN(assoc.pendingTotal)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden md:block">
                    <p className="text-xs text-muted-foreground">Total histórico</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatMXN(assoc.totalEarned)}</p>
                  </div>
                  <div className="shrink-0">
                    {assoc.pendingTotal > 0 ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        {assoc.pendingCount} pagos pendientes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-muted-foreground border-gray-200 text-xs">
                        Al día
                      </Badge>
                    )}
                  </div>
                  {expandedId === assoc.associateId ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Panel expandido */}
                {expandedId === assoc.associateId && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 space-y-4">
                    {/* Últimas ganancias */}
                    {assoc.recentEarnings.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Últimas ganancias pendientes</p>
                        <div className="space-y-1">
                          {assoc.recentEarnings.map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <span className="text-muted-foreground">
                                {new Date(e.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-muted-foreground">
                                Pago cliente: {formatMXN(e.paymentAmount)}
                              </span>
                              <span className="font-bold text-emerald-600">+{formatMXN(e.commissionAmount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formulario de pago */}
                    {assoc.pendingTotal > 0 && (
                      <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <p className="text-sm font-semibold text-foreground">
                            Liquidar {formatMXN(assoc.pendingTotal)} a {assoc.associateName}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Realiza la transferencia SPEI al asociado y registra la referencia aquí. El asociado recibirá una notificación automática.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Referencia de transferencia SPEI (ej. 123456789)"
                            value={reference[assoc.associateId] || ""}
                            onChange={(e) => setReference(r => ({ ...r, [assoc.associateId]: e.target.value }))}
                            className="flex-1 text-sm"
                          />
                          <Button
                            onClick={() => {
                              const ref = reference[assoc.associateId];
                              if (!ref?.trim()) {
                                toast.error("Ingresa la referencia de la transferencia");
                                return;
                              }
                              setPayingId(assoc.associateId);
                              markPaidMutation.mutate({
                                associateUserId: assoc.associateId,
                                reference: ref.trim(),
                              });
                            }}
                            disabled={markPaidMutation.isPending && payingId === assoc.associateId}
                            className="bg-emerald-600 hover:bg-emerald-700 text-foreground shrink-0"
                          >
                            {markPaidMutation.isPending && payingId === assoc.associateId ? "Procesando..." : "Marcar como pagado"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
