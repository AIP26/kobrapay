import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { trpc } from "@/lib/trpc";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from "@stripe/react-stripe-js";
import type { PaymentRequest } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Shield,
  CreditCard,
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  XCircle,
  PenLine,
  Trash2,
  Upload,
} from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

type Step = "info" | "customer" | "otp" | "selfie" | "signature" | "id_upload" | "payment" | "success";

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const STRIPE_STYLE = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1f2937",
      fontFamily: "system-ui, -apple-system, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

function formatMXN(amount: number | string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(amount));
}

// ─── Formulario de pago interno ──────────────────────────────────────────────
function PaymentForm({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("info");
  const [customer, setCustomer] = useState<CustomerData>({ firstName: "", lastName: "", email: "", phone: "" });
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState("");
  const [faceMatchScore, setFaceMatchScore] = useState(0);
  // Firma digital
  const [signatureUrl, setSignatureUrl] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  // Carga de ID
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [idDocumentConfirmed, setIdDocumentConfirmed] = useState(false);
  const [idFileName, setIdFileName] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: string; currency: string; description: string; email: string; businessName: string }>({
    amount: "", currency: "MXN", description: "", email: "", businessName: "",
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [paymentError, setPaymentError] = useState<{ title: string; description: string; action: string } | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [walletAvailable, setWalletAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stripe = useStripe();
  const elements = useElements();

  const { data: linkData, isLoading, error } = trpc.paymentLinks.getByToken.useQuery({ token });
  const sendOtp = trpc.otp.send.useMutation();
  const verifyOtp = trpc.otp.verify.useMutation();
  const uploadSelfie = trpc.identity.uploadSelfie.useMutation();
  const uploadSignature = trpc.identity.uploadSignature.useMutation();
  const uploadIdDocument = trpc.identity.uploadIdDocument.useMutation();
  const createIntent = trpc.payments.createIntent.useMutation();
  const confirmPayment = trpc.payments.confirmPayment.useMutation();

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ─── Apple Pay / Google Pay ───────────────────────────────────────────────
  useEffect(() => {
    if (!stripe || !linkData) return;
    const amountCents = Math.round(parseFloat(String(linkData.amount)) * 100);
    const pr = stripe.paymentRequest({
      country: "MX",
      currency: "mxn",
      total: { label: linkData.description || "Pago KobraPay", amount: amountCents },
      requestPayerName: false,
      requestPayerEmail: false,
    });
    pr.canMakePayment().then((result) => {
      if (result) { setPaymentRequest(pr); setWalletAvailable(true); }
    });
    pr.on("paymentmethod", async (ev) => {
      try {
        let secret = clientSecret;
        let intentId = paymentIntentId;
        if (!secret) {
          const res = await createIntent.mutateAsync({
            token,
            payerName: `${customer.firstName} ${customer.lastName}`.trim() || "Cliente",
            payerEmail: customer.email || "",
            payerPhone: customer.phone || "",
            otpVerified,
            selfieVerified,
            selfieUrl,
            faceMatchScore,
            signatureUrl,
            idDocumentUrl,
            userAgent: navigator.userAgent,
          });
          secret = res.clientSecret;
          intentId = res.paymentIntentId;
          setClientSecret(secret);
          setPaymentIntentId(intentId);
        }
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          secret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );
        if (confirmError) { ev.complete("fail"); toast.error(confirmError.message || "Pago rechazado"); return; }
        ev.complete("success");
        if (paymentIntent?.status === "requires_action") {
          const { error } = await stripe.confirmCardPayment(secret);
          if (error) { toast.error(error.message || "Error al autenticar"); return; }
        }
        const confirmed = await confirmPayment.mutateAsync({ paymentIntentId: intentId, token });
        const bName = (linkData as Record<string, unknown>).vendorSettings
          ? (((linkData as Record<string, unknown>).vendorSettings as Record<string, string>)?.businessName ?? "")
          : "";
        setSuccessData({ amount: confirmed.amount ?? "", currency: confirmed.currency ?? "MXN", description: confirmed.description ?? "", email: customer.email, businessName: bName });
        setStep("success");
      } catch (e: unknown) {
        ev.complete("fail");
        toast.error((e as { message?: string })?.message || "Error al procesar el pago");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, linkData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando información del pago...</p>
        </div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <StatusPage icon={<AlertCircle className="w-12 h-12 text-red-400" />} title="Enlace no encontrado"
        message="Este enlace de pago no existe o ha sido eliminado." color="red" />
    );
  }

  if (linkData.status === "paid") {
    return (
      <StatusPage icon={<CheckCircle2 className="w-12 h-12 text-green-500" />} title="Pago ya realizado"
        message="Este enlace ya fue pagado anteriormente." color="green" />
    );
  }

  if (linkData.status === "expired") {
    return (
      <StatusPage icon={<XCircle className="w-12 h-12 text-amber-500" />} title="Enlace expirado"
        message="Este enlace de pago ha expirado. Contacta al vendedor." color="amber" />
    );
  }

  if (linkData.status === "cancelled") {
    return (
      <StatusPage icon={<XCircle className="w-12 h-12 text-gray-400" />} title="Enlace cancelado"
        message="Este enlace de pago fue cancelado por el vendedor." color="gray" />
    );
  }

  const amount = parseFloat(String(linkData.amount));
  const currency = linkData.currency || "MXN";
  const exchangeRate = parseFloat(String(linkData.usdExchangeRate || 0));
  const usdEquivalent = exchangeRate > 0 ? (amount / exchangeRate).toFixed(2) : null;
  const businessName = (linkData as Record<string, unknown>).vendorSettings
    ? ((linkData as Record<string, unknown>).vendorSettings as Record<string, string>)?.businessName || "Comercio"
    : "Comercio";
  const requireOtp = Boolean((linkData as Record<string, unknown>).requireOtp);
  const requireSelfie = Boolean((linkData as Record<string, unknown>).requireSelfie);
  const requireSignature = Boolean((linkData as Record<string, unknown>).requireSignature);
  const requireIdUpload = Boolean((linkData as Record<string, unknown>).requireIdUpload);
  const chargebackText = (linkData as Record<string, unknown>).chargebackProtectionText as string | undefined;

  const getNextStep = (current: Step): Step => {
    if (current === "info") return "customer";
    if (current === "customer") {
      if (requireOtp) return "otp";
      if (requireSelfie) return "selfie";
      if (requireSignature) return "signature";
      if (requireIdUpload) return "id_upload";
      return "payment";
    }
    if (current === "otp") {
      if (requireSelfie) return "selfie";
      if (requireSignature) return "signature";
      if (requireIdUpload) return "id_upload";
      return "payment";
    }
    if (current === "selfie") {
      if (requireSignature) return "signature";
      if (requireIdUpload) return "id_upload";
      return "payment";
    }
    if (current === "signature") {
      if (requireIdUpload) return "id_upload";
      return "payment";
    }
    if (current === "id_upload") return "payment";
    return "success";
  };

  // ─── Firma digital: helpers de canvas ────────────────────────────────────
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a5f";
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };
  const stopDraw = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureConfirmed(false);
    setSignatureUrl("");
  };
  const confirmSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !hasDrawn) return;
    const imageBase64 = canvas.toDataURL("image/png");
    try {
      const result = await uploadSignature.mutateAsync({ token, imageBase64 });
      setSignatureUrl(result.signatureUrl);
      setSignatureConfirmed(true);
      toast.success("¡Firma registrada!");
      setTimeout(() => setStep(getNextStep("signature")), 800);
    } catch {
      toast.error("Error al guardar la firma. Intenta de nuevo.");
    }
  };

  const handleSendOtp = async () => {
    try {
      await sendOtp.mutateAsync({ token, email: customer.email });
      setOtpSent(true);
      toast.success("Código enviado a tu correo");
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Error al enviar código");
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    try {
      await verifyOtp.mutateAsync({ token, code: otpCode });
      setOtpVerified(true);
      toast.success("¡Identidad verificada!");
      setTimeout(() => setStep(getNextStep("otp")), 800);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Código incorrecto");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const takeSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); setCameraActive(false); }
    try {
      const result = await uploadSelfie.mutateAsync({ token, imageBase64, mimeType: "image/jpeg" });
      setSelfieUrl(result.selfieUrl);
      setFaceMatchScore(result.faceMatchScore);
      setSelfieVerified(result.verified);
      if (result.verified) {
        toast.success(`Identidad verificada (${result.faceMatchScore.toFixed(0)}%)`);
        setTimeout(() => setStep("payment"), 800);
      } else {
        toast.error("No se pudo verificar. Intenta con mejor iluminación.");
      }
    } catch {
      toast.error("Error al procesar la selfie. Intenta de nuevo.");
    }
  };

  const handleCreateIntent = async () => {
    setProcessing(true);
    try {
      const result = await createIntent.mutateAsync({
        token,
        payerName: `${customer.firstName} ${customer.lastName}`.trim(),
        payerEmail: customer.email,
        payerPhone: customer.phone,
        otpVerified,
        selfieVerified,
        selfieUrl,
        faceMatchScore,
        signatureUrl,
        idDocumentUrl,
        userAgent: navigator.userAgent,
      });
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Error al preparar el pago");
    } finally {
      setProcessing(false);
    }
  };

  const getStripeErrorDetails = (code?: string, message?: string) => {
    const c = (code || message || "").toLowerCase();
    if (c.includes("insufficient_funds")) return { title: lang === "es" ? "Fondos insuficientes" : "Insufficient funds", description: lang === "es" ? "La tarjeta no tiene saldo suficiente." : "The card has insufficient balance.", action: lang === "es" ? "Usa otra tarjeta con saldo disponible." : "Use another card with available balance." };
    if (c.includes("do_not_honor") || c.includes("do not honor")) return { title: lang === "es" ? "Banco no autorizó" : "Bank declined", description: lang === "es" ? "Tu banco rechazó el pago sin especificar el motivo." : "Your bank declined the payment without specifying the reason.", action: lang === "es" ? "Llama a tu banco para autorizar compras en línea o usa otra tarjeta." : "Call your bank to authorize online purchases or use another card." };
    if (c.includes("fraud") || c.includes("radar") || c.includes("suspicious")) return { title: lang === "es" ? "Pago sospechoso" : "Suspicious payment", description: lang === "es" ? "El sistema de seguridad detectó actividad inusual." : "The security system detected unusual activity.", action: lang === "es" ? "Paga con el dispositivo y tarjeta que usas normalmente para compras online." : "Pay with the device and card you normally use for online purchases." };
    if (c.includes("expired_card") || c.includes("expired card")) return { title: lang === "es" ? "Tarjeta vencida" : "Expired card", description: lang === "es" ? "La fecha de vencimiento de tu tarjeta expiró." : "Your card's expiration date has passed.", action: lang === "es" ? "Usa una tarjeta vigente." : "Use a valid card." };
    if (c.includes("incorrect_cvc") || c.includes("cvc") || c.includes("cvv")) return { title: lang === "es" ? "CVV incorrecto" : "Incorrect CVV", description: lang === "es" ? "El código de seguridad no coincide." : "The security code does not match.", action: lang === "es" ? "Verifica el CVV en el reverso de tu tarjeta." : "Check the CVV on the back of your card." };
    if (c.includes("authentication_required") || c.includes("3d")) return { title: lang === "es" ? "Requiere autenticación" : "Authentication required", description: lang === "es" ? "Tu banco requiere verificación adicional (3D Secure)." : "Your bank requires additional verification (3D Secure).", action: lang === "es" ? "Autoriza el pago desde la app de tu banco e intenta de nuevo." : "Authorize the payment from your bank's app and try again." };
    if (c.includes("card_declined") || c.includes("declined")) return { title: lang === "es" ? "Tarjeta rechazada" : "Card declined", description: lang === "es" ? "El banco emisor rechazó el pago." : "The issuing bank declined the payment.", action: lang === "es" ? "Llama a tu banco o usa otra tarjeta." : "Call your bank or use another card." };
    return { title: lang === "es" ? "Pago no completado" : "Payment failed", description: lang === "es" ? "No se pudo procesar el pago." : "The payment could not be processed.", action: lang === "es" ? "Intenta de nuevo o usa otra tarjeta." : "Try again or use another card." };
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setPaymentError(null);
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) { setProcessing(false); return; }
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            phone: customer.phone || undefined,
          },
        },
      });
      if (stripeError) {
        const details = getStripeErrorDetails(stripeError.code, stripeError.message);
        setPaymentError(details);
        setProcessing(false);
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        const result = await confirmPayment.mutateAsync({ paymentIntentId, token });
        if (result.success) {
          setSuccessData({
            amount: String(result.amount || amount),
            currency: result.currency || currency,
            description: result.description || linkData.description,
            email: result.payerEmail || customer.email,
            businessName: result.businessName || businessName,
          });
          setStep("success");
        }
      }
    } catch { toast.error(lang === "es" ? "Error al confirmar el pago" : "Error confirming payment"); }
    finally { setProcessing(false); }
  };

  // ─── Pantalla de éxito ────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PageHeader businessName={successData.businessName} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">¡Pago exitoso!</h2>
            <p className="text-gray-500 text-sm mb-6">Tu pago fue procesado correctamente.</p>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Negocio</span>
                <span className="font-semibold">{successData.businessName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Concepto</span>
                <span className="font-semibold text-right max-w-[200px]">{successData.description}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-700 font-medium">Total pagado</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatMXN(successData.amount)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">Recibo enviado a <strong>{successData.email}</strong></p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  // ─── Layout principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PageHeader businessName={businessName} lang={lang} onToggleLang={() => setLang(l => l === "es" ? "en" : "es")} />
      <StepProgress step={step} requireOtp={requireOtp} requireSelfie={requireSelfie} requireSignature={requireSignature} requireIdUpload={requireIdUpload} />

      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Banner del pago */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {businessName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-blue-200 text-sm">{businessName}</p>
                  <p className="text-4xl font-bold">{formatMXN(amount)}</p>
                  {usdEquivalent && (
                    <p className="text-blue-200 text-sm mt-0.5">≈ USD ${usdEquivalent} (TC: ${exchangeRate})</p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-blue-100 text-sm">{linkData.description}</p>
            </div>

            <div className="p-6">
              {/* PASO 1: Información */}
              {step === "info" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del pago</h3>
                  <div className="space-y-2 mb-5">
                    <InfoRow label="Para" value={linkData.clientName} />
                    <InfoRow label="Concepto" value={linkData.description} />
                    <InfoRow label="Monto" value={`${formatMXN(amount)} ${currency}`} />
                    {usdEquivalent && <InfoRow label="Equiv. USD" value={`$${usdEquivalent} (TC: $${exchangeRate})`} />}
                  </div>
                  {chargebackText && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
                      <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-800 text-sm">{chargebackText}</p>
                    </div>
                  )}
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold rounded-xl"
                    onClick={() => setStep("customer")}
                  >
                    Continuar <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              )}

              {/* PASO 2: Datos del cliente */}
              {step === "customer" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{lang === "en" ? "Your information" : "Tus datos"}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-gray-600 text-sm mb-1 block">Nombre(s)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input className="pl-9" placeholder={lang === "en" ? "John" : "Juan"} value={customer.firstName}
                          onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-sm mb-1 block">Apellidos</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input className="pl-9" placeholder={lang === "en" ? "Smith" : "García López"} value={customer.lastName}
                          onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label className="text-gray-600 text-sm mb-1 block">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input className="pl-9" type="email" placeholder={lang === "en" ? "email@example.com" : "correo@ejemplo.com"} value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-6">
                    <Label className="text-gray-600 text-sm mb-1 block">{lang === "en" ? "Phone" : "Teléfono"}</Label>
                    <div className="border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <PhoneInput
                        international
                        defaultCountry="MX"
                        value={customer.phone}
                        onChange={(val) => setCustomer({ ...customer, phone: val || "" })}
                        className="phone-input-custom"
                        placeholder={lang === "en" ? "+1 555 000 0000" : "+52 55 1234 5678"}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("info")} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
                    </Button>
                    <Button
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold rounded-xl"
                      disabled={!customer.firstName || !customer.email}
                      onClick={() => setStep(getNextStep("customer"))}
                    >
                      {lang === "en" ? "Continue" : "Continuar"} <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: OTP */}
              {step === "otp" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Verificación de identidad</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Enviaremos un código a <strong>{customer.email}</strong>
                  </p>
                  {!otpSent ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-blue-600" />
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl"
                        onClick={handleSendOtp} disabled={sendOtp.isPending}>
                        {sendOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                        Enviar código
                      </Button>
                    </div>
                  ) : otpVerified ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-semibold">¡Identidad verificada!</p>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-gray-600 text-sm mb-2 block">Código de 6 dígitos</Label>
                      <Input className="text-center text-2xl tracking-widest font-mono mb-4" maxLength={6}
                        placeholder="000000" value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} />
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl mb-3"
                        onClick={handleVerifyOtp} disabled={otpCode.length !== 6 || verifyOtp.isPending}>
                        {verifyOtp.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Verificar código
                      </Button>
                      <button className="w-full text-blue-600 text-sm flex items-center justify-center gap-1"
                        onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                        <RefreshCw className="w-3 h-3" /> Reenviar código
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 4: Selfie */}
              {step === "selfie" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Verificación facial</h3>
                  <p className="text-gray-500 text-sm mb-4">Toma una selfie con buena iluminación para verificar tu identidad.</p>
                  {selfieVerified ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-semibold">¡Identidad verificada!</p>
                      <p className="text-gray-400 text-sm">Coincidencia: {faceMatchScore.toFixed(0)}%</p>
                    </div>
                  ) : !cameraActive ? (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-10 h-10 text-blue-600" />
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl" onClick={startCamera}>
                        <Camera className="w-4 h-4 mr-2" /> Activar cámara
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="relative inline-block rounded-xl overflow-hidden mb-4 border-4 border-blue-400">
                        <video ref={videoRef} autoPlay playsInline className="w-64 h-64 object-cover" />
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => {
                          if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
                          setCameraActive(false);
                        }}>Cancelar</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl"
                          onClick={takeSelfie} disabled={uploadSelfie.isPending}>
                          {uploadSelfie.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                          Tomar foto
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 5: Firma digital */}
              {step === "signature" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Firma digital</h3>
                  <p className="text-gray-500 text-sm mb-4">Firma con tu dedo (celular) o mouse (computadora) en el recuadro de abajo.</p>
                  {signatureConfirmed ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-semibold">¡Firma registrada!</p>
                    </div>
                  ) : (
                    <div>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden mb-3 bg-gray-50 touch-none" style={{ height: 180 }}>
                        <canvas
                          ref={signatureCanvasRef}
                          width={600}
                          height={180}
                          className="w-full h-full cursor-crosshair"
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={stopDraw}
                          onMouseLeave={stopDraw}
                          onTouchStart={startDraw}
                          onTouchMove={draw}
                          onTouchEnd={stopDraw}
                        />
                      </div>
                      {!hasDrawn && (
                        <p className="text-gray-400 text-xs text-center mb-3">Dibuja tu firma aquí</p>
                      )}
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p className="text-red-700 text-xs font-semibold">⚠️ POLÍTICA: No se aceptan cancelaciones ni devoluciones. Una vez completada la compra, el pedido no puede ser modificado.</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={clearSignature} className="flex-1">
                          <Trash2 className="w-4 h-4 mr-1" /> Limpiar
                        </Button>
                        <Button
                          className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold"
                          disabled={!hasDrawn || uploadSignature.isPending}
                          onClick={confirmSignature}
                        >
                          {uploadSignature.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Confirmar firma
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 6: Carga de identificación */}
              {step === "id_upload" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Cargar identificación</h3>
                  <p className="text-gray-500 text-sm mb-4">Sube una foto de tu INE, pasaporte o identificación oficial (JPG, PNG o PDF).</p>
                  {idDocumentConfirmed ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-semibold">¡Identificación cargada!</p>
                      <p className="text-gray-400 text-sm">{idFileName}</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mb-4">
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium mb-1">{idFileName || "Haz clic para cargar tu ID"}</p>
                        <p className="text-gray-400 text-xs">(JPG, PNG, PDF — máx. 10 MB)</p>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no debe superar 10 MB"); return; }
                            setIdFileName(file.name);
                            const reader = new FileReader();
                            reader.onload = async (ev) => {
                              const fileBase64 = ev.target?.result as string;
                              try {
                                const result = await uploadIdDocument.mutateAsync({ token, fileBase64, mimeType: file.type, fileName: file.name });
                                setIdDocumentUrl(result.idDocumentUrl);
                                setIdDocumentConfirmed(true);
                                toast.success("¡Identificación cargada!");
                                setTimeout(() => setStep(getNextStep("id_upload")), 800);
                              } catch {
                                toast.error("Error al cargar el archivo. Intenta de nuevo.");
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {uploadIdDocument.isPending && (
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Subiendo identificación...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PASO 7: Pago con tarjeta */}
              {step === "payment" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Método de pago</h3>
                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <p className="text-gray-400 text-xs mb-1">Total a pagar</p>
                    <p className="text-3xl font-bold text-gray-900">{formatMXN(amount)} <span className="text-lg text-gray-400">{currency}</span></p>
                    {usdEquivalent && <p className="text-gray-400 text-xs mt-1">≈ USD ${usdEquivalent}</p>}
                  </div>

                  {/* Apple Pay / Google Pay */}
                  {walletAvailable && paymentRequest && (
                    <div className="mb-4">
                      <PaymentRequestButtonElement
                        options={{
                          paymentRequest,
                          style: {
                            paymentRequestButton: {
                              type: "buy",
                              theme: "dark",
                              height: "48px",
                            },
                          },
                        }}
                      />
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-gray-400 text-xs font-medium">O paga con tarjeta</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    </div>
                  )}

                  {!clientSecret ? (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl mb-4 font-semibold"
                      onClick={handleCreateIntent} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      Ingresar datos de tarjeta
                    </Button>
                  ) : (
                    <form onSubmit={handlePayment}>
                      {/* Selector de método */}
                      <div className="flex gap-2 mb-5">
                        <button type="button" className="flex-1 border-2 border-blue-500 bg-blue-50 rounded-lg py-2 px-3 text-sm font-semibold text-blue-700 flex items-center justify-center gap-2">
                          <CreditCard className="w-4 h-4" /> Tarjeta de débito o crédito
                        </button>
                      </div>

                      <div className="space-y-4 mb-5">
                        <div>
                          <Label className="text-gray-600 text-sm mb-1.5 block">Número de tarjeta</Label>
                          <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <CardNumberElement options={STRIPE_STYLE} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-600 text-sm mb-1.5 block">Vigencia</Label>
                            <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                              <CardExpiryElement options={STRIPE_STYLE} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-gray-600 text-sm mb-1.5 block">Código CVV</Label>
                            <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                              <CardCvcElement options={STRIPE_STYLE} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {chargebackText && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2">
                          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-amber-800 text-xs">{chargebackText}</p>
                        </div>
                      )}

                      {paymentError && (
                        <div className="border-l-4 border-red-500 bg-red-50 rounded-r-xl p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-red-800 text-sm mb-1">{paymentError.title}</p>
                              <p className="text-red-700 text-sm mb-1">{paymentError.description}</p>
                              <p className="text-red-600 text-xs font-medium">{paymentError.action}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <Button type="submit"
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold text-base"
                        disabled={processing || !stripe}>
                        {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Lock className="w-5 h-5 mr-2" />}
                        {lang === "en" ? "PAY NOW" : "REALIZAR PAGO"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}

// ─── Componentes de apoyo ─────────────────────────────────────────────────────

function StatusPage({ icon, title, message, color }: { icon: React.ReactNode; title: string; message: string; color: string }) {
  const bg: Record<string, string> = { red: "bg-red-50", green: "bg-green-50", amber: "bg-amber-50", gray: "bg-gray-50" };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className={`w-20 h-20 ${bg[color] || "bg-gray-50"} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
}

function PageHeader({ businessName, lang, onToggleLang }: { businessName: string; lang?: "es" | "en"; onToggleLang?: () => void }) {
  return (
    <div className="bg-white border-b border-gray-100 py-3 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2.5">
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png"
          alt="KobraPay"
          className="w-8 h-8 object-contain"
        />
        <div>
          <p className="font-bold text-gray-800 text-sm leading-tight">KobraPay</p>
          <p className="text-gray-400 text-xs">Cobra fácil, cobra global</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onToggleLang && (
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="text-base">{lang === "es" ? "🇲🇽" : "🇺🇸"}</span>
            {lang === "es" ? "ES" : "EN"}
          </button>
        )}
        <div className="text-right">
          <p className="text-xs text-gray-400">{lang === "en" ? "Payment from" : "Cobro de"}</p>
          <p className="text-sm font-semibold text-gray-700 truncate max-w-[160px]">{businessName}</p>
        </div>
      </div>
    </div>
  );
}

function PageFooter() {
  return (
    <div className="py-6 px-4 text-center">
      <p className="text-gray-400 text-xs mb-3">Pago procesado de manera segura con:</p>
      <div className="flex items-center justify-center gap-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-6 bg-blue-700 rounded text-white text-xs font-bold flex items-center justify-center">VISA</div>
          <span className="text-gray-400 text-xs">Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-6 bg-red-600 rounded text-white text-xs font-bold flex items-center justify-center">MC</div>
          <span className="text-gray-400 text-xs">SecureCode</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-6 bg-blue-500 rounded text-white text-xs font-bold flex items-center justify-center">AMEX</div>
          <span className="text-gray-400 text-xs">SafeKey</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-green-500" />
          <span className="text-gray-400 text-xs">SSL 256-bit</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-800 font-medium text-sm text-right max-w-[200px]">{value}</span>
    </div>
  );
}

function StepProgress({ step, requireOtp, requireSelfie, requireSignature, requireIdUpload }: { step: Step; requireOtp: boolean; requireSelfie: boolean; requireSignature: boolean; requireIdUpload: boolean }) {
  const steps = [
    { id: "info", label: "Pago" },
    { id: "customer", label: "Datos" },
    ...(requireOtp ? [{ id: "otp", label: "Verificar" }] : []),
    ...(requireSelfie ? [{ id: "selfie", label: "Selfie" }] : []),
    ...(requireSignature ? [{ id: "signature", label: "Firma" }] : []),
    ...(requireIdUpload ? [{ id: "id_upload", label: "ID" }] : []),
    { id: "payment", label: "Pagar" },
  ];
  const currentIndex = steps.findIndex((s) => s.id === step);
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center justify-center gap-1 max-w-sm mx-auto">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 ${i <= currentIndex ? "text-blue-600" : "text-gray-300"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i < currentIndex ? "bg-blue-600 border-blue-600 text-white" :
                i === currentIndex ? "border-blue-600 text-blue-600 bg-white" :
                "border-gray-200 text-gray-300 bg-white"
              }`}>
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-5 h-0.5 ${i < currentIndex ? "bg-blue-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Wrapper con Stripe Elements ──────────────────────────────────────────────
export default function PayPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Token de pago inválido</p>
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm token={token} />
    </Elements>
  );
}
