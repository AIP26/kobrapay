import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, CreditCard, Download, Home, Shield, Calendar, Hash } from "lucide-react";
import { useParams } from "wouter";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}
function formatDate(d?: Date | string | null) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PaySuccess() {
  const { token } = useParams<{ token: string }>();
  const [lang, setLang] = useState<"es" | "en">("es");
  const { data: link } = trpc.paymentLinks.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const T = {
    title:     lang === "es" ? "¡Pago exitoso!" : "Payment successful!",
    subtitle:  lang === "es"
      ? "Tu pago ha sido procesado correctamente. Recibirás un comprobante en tu correo electrónico."
      : "Your payment has been processed successfully. You will receive a receipt at your email address.",
    amount:    lang === "es" ? "Monto pagado" : "Amount paid",
    desc:      lang === "es" ? "Descripción" : "Description",
    client:    lang === "es" ? "Cliente" : "Client",
    business:  lang === "es" ? "Empresa" : "Business",
    date:      lang === "es" ? "Fecha y hora" : "Date & time",
    opNum:     lang === "es" ? "No. de operación" : "Operation No.",
    status:    lang === "es" ? "Estado" : "Status",
    completed: lang === "es" ? "Completado" : "Completed",
    note:      lang === "es" ? "Guarda esta página como comprobante de tu pago." : "Save this page as proof of your payment.",
    save:      lang === "es" ? "Guardar comprobante" : "Save receipt",
    home:      lang === "es" ? "Ir al inicio" : "Go to home",
    powered:   lang === "es" ? "Pago procesado de forma segura por" : "Payment securely processed by",
  };

  const businessName = (link as any)?.vendorSettings?.businessName || "KobraPay";
  const opNumber = (link as any)?.transactions?.[0]?.operationNumber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
      {/* Language toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setLang(l => l === "es" ? "en" : "es")}
          className="bg-white border border-gray-200 shadow-sm rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          🌐 {lang === "es" ? "English" : "Español"}
        </button>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardContent className="pt-10 pb-8 text-center px-8">
            {/* Success Icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">{T.title}</h1>
            <p className="text-muted-foreground text-sm mb-6">{T.subtitle}</p>

            {link && (
              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{T.amount}</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(link.amount, link.currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{T.desc}</span>
                  <span className="text-sm text-foreground text-right max-w-[200px]">{link.description}</span>
                </div>
                {link.clientName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{T.client}</span>
                    <span className="text-sm font-medium text-foreground">{link.clientName}</span>
                  </div>
                )}
                {businessName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{T.business}</span>
                    <span className="text-sm text-foreground">{businessName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{T.date}
                  </span>
                  <span className="text-sm text-foreground">{formatDate(link.paidAt)}</span>
                </div>
                {opNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Hash className="w-3 h-3" />{T.opNum}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">{opNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">{T.status}</span>
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />{T.completed}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{T.note}</p>
              <Button variant="outline" className="w-full" onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2" />{T.save}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => window.location.href = "/"}>
                <Home className="w-4 h-4 mr-2" />{T.home}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-center text-xs text-muted-foreground">
            {T.powered} <strong>Stripe</strong> · SSL 256-bit
          </p>
        </div>
      </div>
    </div>
  );
}
