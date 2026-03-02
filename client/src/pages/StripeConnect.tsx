import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  Wallet,
  Building2,
  ShieldCheck,
  RefreshCw,
  DollarSign,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

export default function StripeConnect() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // Detectar retorno del onboarding de Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get("connect");
    if (connectStatus === "success") {
      toast.success("¡Proceso completado! Verificando estado de tu cuenta...");
      // Limpiar URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (connectStatus === "refresh") {
      toast.info("El enlace expiró. Inicia el proceso nuevamente.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: connectStatus, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.vendor.connectStatus.useQuery(undefined, { refetchInterval: 10000 });

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } =
    trpc.vendor.connectBalance.useQuery(undefined, {
      enabled: connectStatus?.chargesEnabled === true,
    });

  const onboardMutation = trpc.vendor.connectOnboard.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      setIsOnboarding(false);
    },
    onError: (err) => {
      toast.error(err.message || "Error al iniciar el proceso de verificación");
      setIsOnboarding(false);
    },
  });

  const payoutMutation = trpc.vendor.connectPayout.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Retiro de $${data.amount.toFixed(2)} ${data.currency} solicitado. Llegará el ${new Date(data.arrivalDate).toLocaleDateString("es-MX")}`);
      setShowPayoutForm(false);
      setPayoutAmount("");
      refetchBalance();
    },
    onError: (err) => {
      toast.error(err.message || "Error al solicitar el retiro");
    },
  });

  const handleStartOnboarding = () => {
    setIsOnboarding(true);
    onboardMutation.mutate({ returnUrl: `${window.location.origin}/dashboard/connect` });
  };

  const handlePayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    payoutMutation.mutate({ amount, currency: "mxn" });
  };

  const availableBalance = balance?.available?.[0]?.amount ?? 0;
  const pendingBalance = balance?.pending?.[0]?.amount ?? 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Activa</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white gap-1"><Clock className="w-3 h-3" /> En proceso</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white gap-1"><AlertCircle className="w-3 h-3" /> Sin configurar</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuenta de Cobros</h1>
        <p className="text-gray-500 mt-1">Recibe pagos directamente en tu cuenta bancaria con Stripe Connect</p>
      </div>

      {/* Estado de la cuenta */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#00C896]" />
              Estado de tu cuenta
            </CardTitle>
            <div className="flex items-center gap-2">
              {!statusLoading && connectStatus && getStatusBadge(connectStatus.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchStatus()}
                className="text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verificando estado...
            </div>
          ) : connectStatus?.status === "active" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Cobros</p>
                    <p className="font-semibold text-emerald-700">Habilitados</p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${connectStatus.payoutsEnabled ? "bg-emerald-50" : "bg-amber-50"}`}>
                  {connectStatus.payoutsEnabled
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    : <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  }
                  <div>
                    <p className="text-xs text-gray-500">Retiros</p>
                    <p className={`font-semibold ${connectStatus.payoutsEnabled ? "text-emerald-700" : "text-amber-700"}`}>
                      {connectStatus.payoutsEnabled ? "Habilitados" : "En proceso"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Verificación</p>
                    <p className="font-semibold text-blue-700">Completada</p>
                  </div>
                </div>
              </div>
              {connectStatus.accountId && (
                <p className="text-xs text-gray-400">ID de cuenta: {connectStatus.accountId}</p>
              )}
            </div>
          ) : connectStatus?.status === "pending" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Verificación en proceso</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Stripe está revisando tu información. Esto puede tomar de 1 a 2 días hábiles. 
                    Si necesitas agregar más información, haz clic en el botón de abajo.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleStartOnboarding}
                disabled={isOnboarding || onboardMutation.isPending}
                variant="outline"
                className="gap-2"
              >
                {isOnboarding || onboardMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Continuar verificación en Stripe
              </Button>
            </div>
          ) : (
            // not_started
            <div className="space-y-4">
              <p className="text-gray-600">
                Conecta tu cuenta bancaria para recibir los pagos de tus clientes directamente. 
                El proceso toma aproximadamente <strong>5 minutos</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { icon: ShieldCheck, title: "100% Seguro", desc: "Verificación KYC por Stripe" },
                  { icon: Zap, title: "Rápido", desc: "Retiros en 1-2 días hábiles" },
                  { icon: DollarSign, title: "Sin costo fijo", desc: "Solo pagas por transacción" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <item.icon className="w-5 h-5 text-[#00C896] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleStartOnboarding}
                disabled={isOnboarding || onboardMutation.isPending}
                className="bg-[#00C896] hover:bg-[#00a87e] text-white gap-2"
              >
                {isOnboarding || onboardMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Conectar mi cuenta bancaria
              </Button>
              <p className="text-xs text-gray-400">
                Serás redirigido a Stripe para completar la verificación de identidad y datos bancarios de forma segura.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saldo disponible (solo si la cuenta está activa) */}
      {connectStatus?.chargesEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                Saldo disponible
              </CardTitle>
              <CardDescription>Listo para retirar a tu cuenta bancaria</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="text-gray-400 text-sm">Cargando saldo...</div>
              ) : (
                <div className="space-y-3">
                  <p className="text-3xl font-bold text-emerald-600">
                    ${availableBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </p>
                  {connectStatus.payoutsEnabled && availableBalance > 0 && (
                    <>
                      {!showPayoutForm ? (
                        <Button
                          onClick={() => setShowPayoutForm(true)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 w-full"
                        >
                          <DollarSign className="w-4 h-4" />
                          Retirar a mi cuenta
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={payoutAmount}
                              onChange={(e) => setPayoutAmount(e.target.value)}
                              placeholder={`Máx. $${availableBalance.toFixed(2)}`}
                              max={availableBalance}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                            <Button
                              onClick={handlePayout}
                              disabled={payoutMutation.isPending}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                              size="sm"
                            >
                              {payoutMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Retirar"}
                            </Button>
                            <Button
                              onClick={() => setShowPayoutForm(false)}
                              variant="ghost"
                              size="sm"
                            >
                              Cancelar
                            </Button>
                          </div>
                          <p className="text-xs text-gray-400">El dinero llegará a tu cuenta en 1-2 días hábiles</p>
                        </div>
                      )}
                    </>
                  )}
                  {!connectStatus.payoutsEnabled && (
                    <p className="text-sm text-amber-600">Los retiros estarán disponibles cuando Stripe complete la verificación de tu cuenta bancaria.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Saldo en tránsito
              </CardTitle>
              <CardDescription>Pagos procesados aún no disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="text-gray-400 text-sm">Cargando...</div>
              ) : (
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-blue-600">
                    ${pendingBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </p>
                  <p className="text-xs text-gray-400">
                    Los pagos tardan 2-7 días en estar disponibles para retiro según el tipo de tarjeta.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cómo funciona */}
      <Card className="bg-gray-50 border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Conecta tu cuenta", desc: "Completa la verificación de Stripe (5 min)" },
              { step: "2", title: "Comparte tu enlace", desc: "Tu cliente paga con tarjeta desde el enlace" },
              { step: "3", title: "KobraPay retiene su comisión", desc: "Se descuenta automáticamente antes de transferirte" },
              { step: "4", title: "Retira cuando quieras", desc: "El dinero llega a tu cuenta en 1-2 días hábiles" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#00C896] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nota de modo prueba */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-800 text-sm">Modo de prueba activo</p>
          <p className="text-sm text-blue-600 mt-1">
            Actualmente estás en modo de prueba de Stripe. Para activar cobros reales, reclama tu cuenta en{" "}
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              dashboard.stripe.com
            </a>{" "}
            y completa la verificación KYC de tu empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
