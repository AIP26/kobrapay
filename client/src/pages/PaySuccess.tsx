import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, CreditCard, Download, Home } from "lucide-react";
import { useParams } from "wouter";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

export default function PaySuccess() {
  const { token } = useParams<{ token: string }>();
  const { data: link } = trpc.paymentLinks.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardContent className="pt-10 pb-8 text-center px-8">
            {/* Success Icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-foreground" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">¡Pago exitoso!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Tu pago ha sido procesado correctamente. Recibirás un comprobante en tu correo electrónico.
            </p>

            {link && (
              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monto pagado</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(link.amount, link.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Descripción</span>
                  <span className="text-sm text-foreground text-right max-w-[200px]">{link.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completado
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Guarda esta página como comprobante de tu pago. Se ha enviado un recibo a tu correo electrónico.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.print()}
              >
                <Download className="w-4 h-4 mr-2" />
                Guardar comprobante
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => window.location.href = "/"}
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Pago procesado de forma segura por <strong>Stripe</strong>
        </p>
      </div>
    </div>
  );
}
