import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Wallet,
  ShieldCheck,
  RefreshCw,
  DollarSign,
  ExternalLink,
  ArrowDownToLine,
  ChevronLeft,
  CreditCard,
  Landmark,
  Zap,
  Building2,
  TrendingUp,
  CircleDollarSign,
  BadgeCheck,
  Info,
} from "lucide-react";

export default function StripeConnect() {
  const [, navigate] = useLocation();
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  // Detectar retorno del onboarding de Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get("connect");
    if (connectStatus === "success") {
      toast.success("¡Proceso completado! Verificando estado de tu cuenta...");
      window.history.replaceState({}, "", window.location.pathname);
      refetchStatus();
    } else if (connectStatus === "refresh") {
      toast.info("El enlace expiró. Inicia el proceso nuevamente.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = trpc.vendor.connectStatus.useQuery(undefined, {
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  const { data: balanceData } = trpc.vendor.connectBalance.useQuery(undefined, {
    enabled: status?.chargesEnabled === true,
    refetchInterval: 60000,
  });

  const { data: payoutHistory } = trpc.vendor.connectPayoutHistory.useQuery(undefined, {
    enabled: status?.chargesEnabled === true,
  });

  const onboardMutation = trpc.vendor.connectOnboard.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e) => toast.error(e.message || "Error al iniciar verificación de Stripe"),
  });

  const payoutMutation = trpc.vendor.connectPayout.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Retiro de $${data.amount.toFixed(2)} ${data.currency} solicitado. Llegará el ${new Date(data.arrivalDate).toLocaleDateString("es-MX")}`);
      setPayoutModal(false);
      setPayoutAmount("");
      refetchStatus();
    },
    onError: (e) => toast.error(e.message || "Error al solicitar retiro"),
  });

  const handleStartOnboarding = () => {
    onboardMutation.mutate({
      returnUrl: `${window.location.origin}/dashboard/stripe-connect`,
    });
  };

  const availableMXN = balanceData?.available?.find(b => b.currency === "MXN")?.amount ?? 0;
  const pendingMXN = balanceData?.pending?.find(b => b.currency === "MXN")?.amount ?? 0;

  const connectState = status?.status ?? "not_started";
  const isActive = connectState === "active" && status?.chargesEnabled;
  const isPending = connectState === "pending" || (status?.detailsSubmitted && !status?.chargesEnabled);
  const isNotStarted = !isActive && !isPending;

  if (statusLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Cargando estado de tu cuenta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Panel
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cuenta de Cobros</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Conecta tu cuenta bancaria para recibir pagos automáticamente
          </p>
        </div>
      </div>

      {/* ─── ESTADO: NO INICIADO ─── */}
      {isNotStarted && (
        <>
          {/* Banner principal de acción */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0d1f3c] to-[#1a3a6b] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00C896]/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#00C896]/20 flex items-center justify-center">
                  <Landmark className="w-6 h-6 text-[#00C896]" />
                </div>
                <div>
                  <p className="text-sm text-blue-200 font-medium">Paso 1 de 1</p>
                  <h2 className="text-xl font-bold">Conecta tu cuenta bancaria</h2>
                </div>
              </div>
              <p className="text-blue-100 mb-6 max-w-lg">
                Conecta tu CLABE bancaria con Stripe para que <strong className="text-white">cada pago que recibas llegue automáticamente a tu banco</strong> en 1-2 días hábiles. El proceso toma ~5 minutos.
              </p>
              <Button
                onClick={handleStartOnboarding}
                disabled={onboardMutation.isPending}
                size="lg"
                className="bg-[#00C896] hover:bg-[#00a87e] text-white font-bold text-base px-8 py-6 rounded-xl gap-3 shadow-lg shadow-[#00C896]/30"
              >
                {onboardMutation.isPending ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Preparando verificación...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Conectar mi cuenta bancaria
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
              <p className="text-xs text-blue-300 mt-3">
                🔒 Verificación segura con Stripe · Sin costo · Datos encriptados
              </p>
            </div>
          </div>

          {/* Qué necesitas */}
          <Card className="border border-amber-200 bg-amber-50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-2">¿Qué necesitas tener a la mano?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "CLABE interbancaria (18 dígitos)",
                      "RFC o CURP",
                      "Nombre completo del titular",
                      "Número de teléfono",
                      "Fecha de nacimiento",
                      "Dirección completa",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-amber-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cómo funciona */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { step: "1", icon: Zap, title: "Verificación", desc: "Completa el KYC de Stripe (~5 min)", color: "bg-blue-100 text-blue-600" },
              { step: "2", icon: CreditCard, title: "Recibe pagos", desc: "Tus clientes pagan con tarjeta", color: "bg-purple-100 text-purple-600" },
              { step: "3", icon: CircleDollarSign, title: "Acumulación", desc: "El dinero se acumula en Stripe", color: "bg-amber-100 text-amber-600" },
              { step: "4", icon: Landmark, title: "A tu banco", desc: "Retiro automático en 1-2 días", color: "bg-emerald-100 text-emerald-600" },
            ].map((item) => (
              <Card key={item.step} className="border border-border">
                <CardContent className="pt-4 pb-4">
                  <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ─── ESTADO: EN PROCESO (pendiente de verificación) ─── */}
      {isPending && !isActive && (
        <>
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-amber-900">Verificación en proceso</h2>
                    <Badge className="bg-amber-200 text-amber-800 border-0">Pendiente</Badge>
                  </div>
                  <p className="text-amber-800 text-sm mb-4">
                    Iniciaste el proceso de verificación con Stripe pero aún no está completo.
                    Haz clic en el botón para continuar donde lo dejaste.
                  </p>
                  <Button
                    onClick={handleStartOnboarding}
                    disabled={onboardMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  >
                    {onboardMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Continuar verificación con Stripe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
            <span>El estado se actualiza automáticamente cada 30 segundos.</span>
            <button onClick={() => refetchStatus()} className="text-blue-600 hover:underline font-medium">
              Actualizar ahora
            </button>
          </div>
        </>
      )}

      {/* ─── ESTADO: ACTIVO ─── */}
      {isActive && (
        <>
          {/* Banner de éxito */}
          <Card className="border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-bold text-emerald-900">Cuenta conectada y activa</h2>
                    <Badge className="bg-emerald-500 text-white border-0 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Activa
                    </Badge>
                  </div>
                  <p className="text-emerald-700 text-sm">
                    Los pagos que recibas se depositarán automáticamente en tu cuenta bancaria en 1-2 días hábiles.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStatus()}
                  className="gap-1 text-muted-foreground border-emerald-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saldo disponible */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border md:col-span-1">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Disponible para retirar</p>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  ${availableMXN.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">MXN</span>
                </p>
                <Button
                  onClick={() => setPayoutModal(true)}
                  disabled={availableMXN <= 0}
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                  size="sm"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Retirar a mi banco
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">En proceso</p>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  ${pendingMXN.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">MXN</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Pagos recientes que aún no están disponibles para retirar (1-2 días)
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Estado de cobros</p>
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cobros</span>
                    {status?.chargesEnabled ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Habilitados
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> No habilitados
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Retiros</span>
                    {status?.payoutsEnabled ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Habilitados
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> En revisión
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ID de cuenta</span>
                    <span className="text-xs font-mono text-muted-foreground">{status?.accountId?.slice(0, 12)}...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historial de retiros */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Historial de retiros
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!payoutHistory?.payouts?.length ? (
                <div className="text-center py-8">
                  <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">Aún no has realizado retiros</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Cuando tengas saldo disponible, usa el botón "Retirar a mi banco"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payoutHistory.payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          p.status === "paid" ? "bg-emerald-100" :
                          p.status === "pending" ? "bg-amber-100" : "bg-gray-100"
                        }`}>
                          {p.status === "paid" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : p.status === "pending" ? (
                            <Clock className="w-4 h-4 text-amber-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Retiro a cuenta bancaria
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.status === "paid"
                              ? `Depositado el ${new Date(p.arrivalDate).toLocaleDateString("es-MX")}`
                              : p.status === "pending"
                              ? `Llegará el ${new Date(p.arrivalDate).toLocaleDateString("es-MX")}`
                              : p.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          ${p.amount.toFixed(2)} {p.currency}
                        </p>
                        <Badge
                          className={`text-xs border-0 ${
                            p.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                            p.status === "pending" ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.status === "paid" ? "Depositado" :
                           p.status === "pending" ? "En camino" : p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nota sobre retiros automáticos */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>¿Cómo funcionan los retiros?</strong> Stripe acumula los pagos que recibes y los transfiere automáticamente a tu cuenta bancaria cada 2 días hábiles. También puedes solicitar un retiro manual en cualquier momento usando el botón "Retirar a mi banco".
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal: Solicitar retiro */}
      <Dialog open={payoutModal} onOpenChange={setPayoutModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
              Retirar a mi banco
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-700">
                <strong>Disponible:</strong> ${availableMXN.toFixed(2)} MXN
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                El dinero llegará a tu cuenta bancaria en 1-2 días hábiles
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Monto a retirar (MXN)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  max={availableMXN}
                  className="w-full border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 bg-background text-foreground"
                />
              </div>
              <button
                onClick={() => setPayoutAmount(String(availableMXN))}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                Retirar todo (${availableMXN.toFixed(2)} MXN)
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutModal(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const amount = parseFloat(payoutAmount);
                if (!amount || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
                if (amount > availableMXN) { toast.error(`El monto máximo es $${availableMXN.toFixed(2)} MXN`); return; }
                payoutMutation.mutate({ amount, currency: "mxn" });
              }}
              disabled={payoutMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              {payoutMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="w-4 h-4" />
              )}
              Confirmar retiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
