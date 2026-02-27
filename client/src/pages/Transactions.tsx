import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";

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

export default function Transactions() {
  const { data: transactions, isLoading } = trpc.transactions.list.useQuery();

  return (
    <DashboardLayout title="Historial de Transacciones">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {transactions ? `${transactions.length} transacción${transactions.length !== 1 ? "es" : ""} registrada${transactions.length !== 1 ? "s" : ""}` : ""}
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Sin transacciones aún</h3>
              <p className="text-muted-foreground text-sm">Las transacciones aparecerán aquí cuando tus clientes realicen pagos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const cfg = statusConfig[tx.status] ?? statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <Card key={tx.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.status === "succeeded" ? "bg-green-100" : tx.status === "failed" ? "bg-red-100" : "bg-muted"}`}>
                        <CreditCard className={`w-5 h-5 ${tx.status === "succeeded" ? "text-green-600" : tx.status === "failed" ? "text-red-600" : "text-muted-foreground"}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{tx.payerName || "Cliente"}</p>
                            <p className="text-xs text-muted-foreground">{tx.payerEmail || ""}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-foreground">
                              {formatCurrency(tx.amount, tx.currency)}
                            </p>
                            <Badge variant={cfg.variant} className="text-xs mt-0.5">
                              <StatusIcon className="w-2.5 h-2.5 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            {tx.cardBrand && tx.cardLast4 && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {tx.cardBrand} •••• {tx.cardLast4}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                        </div>

                        {tx.errorMessage && (
                          <p className="text-xs text-destructive mt-1">{tx.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
