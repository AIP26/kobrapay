import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Lock,
  Shield,
  XCircle,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

const STRIPE_ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1a1a2e",
      fontFamily: "system-ui, -apple-system, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

interface PaymentFormProps {
  token: string;
  linkData: {
    clientName: string;
    amount: string | number;
    currency: string;
    description: string;
  };
}

function PaymentForm({ token, linkData }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"info" | "card">("info");
  const [payerInfo, setPayerInfo] = useState({ name: "", email: "", phone: "" });
  const [processing, setProcessing] = useState(false);

  const createIntent = trpc.payments.createIntent.useMutation();
  const confirmPayment = trpc.payments.confirmPayment.useMutation();

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerInfo.name.trim() || !payerInfo.email.trim()) {
      toast.error("Por favor completa tu nombre y email");
      return;
    }
    setStep("card");
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      // Crear PaymentIntent
      const intentData = await createIntent.mutateAsync({
        token,
        payerName: payerInfo.name,
        payerEmail: payerInfo.email,
        payerPhone: payerInfo.phone,
      });

      // Confirmar pago con Stripe
      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) throw new Error("Error al cargar el formulario de pago");

      const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: payerInfo.name,
            email: payerInfo.email,
            phone: payerInfo.phone || undefined,
          },
        },
      });

      if (error) {
        toast.error(error.message || "Error al procesar el pago");
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        await confirmPayment.mutateAsync({
          paymentIntentId: paymentIntent.id,
          token,
        });
        navigate(`/pay/${token}/success`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al procesar el pago");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Pago seguro</h1>
          <p className="text-sm text-muted-foreground mt-1">Procesado con Stripe · SSL cifrado</p>
        </div>

        {/* Order Summary */}
        <Card className="border-border mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Detalle del pago</p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Lock className="w-3 h-3" />
                Seguro
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliente</span>
                <span className="text-sm font-medium text-foreground">{linkData.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Descripción</span>
                <span className="text-sm text-foreground text-right max-w-[200px]">{linkData.description}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold text-foreground">Total a pagar</span>
                <span className="font-bold text-xl text-primary">
                  {formatCurrency(linkData.amount, linkData.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "info" ? "text-primary" : "text-green-600"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${step === "info" ? "bg-primary" : "bg-green-500"}`}>
              {step === "card" ? <CheckCircle2 className="w-3 h-3" /> : "1"}
            </div>
            Tus datos
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "card" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${step === "card" ? "bg-primary" : "bg-muted text-muted-foreground"}`}>
              2
            </div>
            Pago
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === "info" && (
          <Card className="border-border">
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground mb-4">Tus datos de contacto</h2>
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payerName">Nombre completo *</Label>
                  <Input
                    id="payerName"
                    placeholder="Juan García López"
                    value={payerInfo.name}
                    onChange={(e) => setPayerInfo({ ...payerInfo, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payerEmail">Correo electrónico *</Label>
                  <Input
                    id="payerEmail"
                    type="email"
                    placeholder="juan@ejemplo.com"
                    value={payerInfo.email}
                    onChange={(e) => setPayerInfo({ ...payerInfo, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payerPhone">Teléfono (opcional)</Label>
                  <Input
                    id="payerPhone"
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={payerInfo.phone}
                    onChange={(e) => setPayerInfo({ ...payerInfo, phone: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Continuar al pago
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Card Payment */}
        {step === "card" && (
          <Card className="border-border">
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground mb-4">Datos de tu tarjeta</h2>
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Número de tarjeta</Label>
                  <div className="border border-input rounded-lg px-3 py-3 bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
                    <CardNumberElement options={STRIPE_ELEMENT_STYLE} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Fecha de vencimiento</Label>
                    <div className="border border-input rounded-lg px-3 py-3 bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
                      <CardExpiryElement options={STRIPE_ELEMENT_STYLE} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>CVV</Label>
                    <div className="border border-input rounded-lg px-3 py-3 bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
                      <CardCvcElement options={STRIPE_ELEMENT_STYLE} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
                  <span>Tus datos están cifrados con SSL. No almacenamos información de tu tarjeta.</span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={processing || !stripe}
                >
                  {processing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Procesando pago...</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-2" />Pagar {formatCurrency(linkData.amount, linkData.currency)}</>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep("info")}
                  disabled={processing}
                >
                  Volver
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          Pago procesado de forma segura por <strong>Stripe</strong>
        </p>
      </div>
    </div>
  );
}

export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  const { data: link, isLoading, error } = trpc.paymentLinks.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Cargando enlace de pago...</p>
        </div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Enlace no encontrado</h1>
          <p className="text-muted-foreground text-sm">Este enlace de pago no existe o ha sido eliminado.</p>
        </div>
      </div>
    );
  }

  if (link.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Pago ya realizado</h1>
          <p className="text-muted-foreground text-sm">Este enlace de pago ya fue procesado exitosamente.</p>
        </div>
      </div>
    );
  }

  if (link.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Enlace expirado</h1>
          <p className="text-muted-foreground text-sm">Este enlace de pago ha expirado. Contacta al vendedor para obtener uno nuevo.</p>
        </div>
      </div>
    );
  }

  if (link.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Enlace cancelado</h1>
          <p className="text-muted-foreground text-sm">Este enlace de pago ha sido cancelado por el vendedor.</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        token={token || ""}
        linkData={{
          clientName: link.clientName,
          amount: link.amount,
          currency: link.currency,
          description: link.description,
        }}
      />
    </Elements>
  );
}
