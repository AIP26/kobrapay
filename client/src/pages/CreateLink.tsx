import DashboardLayout from "@/components/DashboardLayout";
import { getSortedCountries, getCountryByCode, COUNTRIES } from "@shared/countries";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useRef } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  Shield,
  Camera,
  Fingerprint,
  Download,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Info,
  PenLine,
  CreditCard,
} from "lucide-react";

function formatCurrency(amount: number, currency = "MXN") {
  const country = getSortedCountries().find(c => c.currency === currency);
  try {
    return new Intl.NumberFormat(country?.locale || "es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: (currency === "JPY" || currency === "CLP") ? 0 : 2,
    }).format(amount);
  } catch {
    return `${country?.currencySymbol || "$"}${amount.toFixed(2)}`;
  }
}

export default function CreateLink() {
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    amount: "",
    description: "",
    currency: "MXN",
    countryCode: "MX",
    expiresInDays: "0",
    requireOtp: false,
    requireSelfie: false,
    requireSignature: false,
    requireIdUpload: false,
    usdExchangeRate: "",
    chargebackProtectionText: "",
  });
  const [msiOptions, setMsiOptions] = useState<number[]>([]);
  // Métodos de pago: por defecto solo tarjeta (OXXO/SPEI/MSI se activan manualmente)
  const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<("card" | "oxxo" | "spei" | "meses")[]>(["card"]);
  const [tipEnabled, setTipEnabled] = useState(false);
  const [tipSuggestions, setTipSuggestions] = useState<number[]>([10, 15, 20]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createdLink, setCreatedLink] = useState<{
    token: string;
    url: string;
    clientName: string;
    amount: number;
    currency: string;
    description: string;
    netAmount?: number;
    commissionRate?: number;
    commissionAmount?: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: settings } = trpc.vendor.getSettings.useQuery();

  const createLink = trpc.paymentLinks.create.useMutation({
    onSuccess: (data) => {
      if (data) {
        const url = `${window.location.origin}/pay/${data.token}`;
        setCreatedLink({
          token: data.token,
          url,
          clientName: form.clientName,
          amount: parseFloat(form.amount),
          currency: form.currency,
          description: form.description,
          netAmount: data.netAmount,
          commissionRate: parseFloat(String(data.commissionRate || 0)),
          commissionAmount: parseFloat(String(data.commissionAmount || 0)),
        });
        toast.success("¡Enlace de pago creado exitosamente!");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear el enlace");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 10) {
      toast.error("El monto mínimo es $10");
      return;
    }
    const exchangeRate = form.usdExchangeRate ? parseFloat(form.usdExchangeRate) : 0;
    createLink.mutate({
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim() || undefined,
      clientPhone: form.clientPhone.trim() || undefined,
      amount,
      description: form.description.trim(),
      currency: form.currency,
      countryCode: form.countryCode,
      expiresInDays: (form.expiresInDays && form.expiresInDays !== "0") ? parseInt(form.expiresInDays) : undefined,
      requireOtp: form.requireOtp,
      requireSelfie: form.requireSelfie,
      requireSignature: form.requireSignature,
      requireIdUpload: form.requireIdUpload,
      usdExchangeRate: exchangeRate,
      chargebackProtectionText: form.chargebackProtectionText.trim() || undefined,
      msiOptions: msiOptions.length > 0 ? msiOptions : undefined,
      allowedPaymentMethods: allowedPaymentMethods.length > 0 ? allowedPaymentMethods : undefined,
      tipEnabled,
      tipSuggestions: tipEnabled && tipSuggestions.length > 0 ? tipSuggestions : undefined,
    });
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink.url);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    if (!createdLink) return;
    const msg = encodeURIComponent(
      `Hola ${createdLink.clientName} 👋\n\nTe comparto tu enlace de pago por *${formatCurrency(createdLink.amount, createdLink.currency)}* para "${createdLink.description}":\n\n🔗 ${createdLink.url}\n\nPor favor realiza el pago a la brevedad. ¡Gracias!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = () => {
    if (!createdLink) return;
    const subject = encodeURIComponent(`Enlace de pago: ${formatCurrency(createdLink.amount, createdLink.currency)}`);
    const body = encodeURIComponent(
      `Hola ${createdLink.clientName},\n\nTe comparto tu enlace de pago por ${formatCurrency(createdLink.amount, createdLink.currency)} para "${createdLink.description}":\n\n${createdLink.url}\n\nPor favor realiza el pago a la brevedad posible.\n\nGracias.`
    );
    window.open(`mailto:${createdLink ? form.clientEmail : ""}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement("a");
      a.download = `qr-pago-${createdLink?.token}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
    toast.success("QR descargado");
  };

  const handleReset = () => {
    setCreatedLink(null);
    setCopied(false);
    setMsiOptions([]);
    setAllowedPaymentMethods(["card"]);
    setTipEnabled(false);
    setTipSuggestions([10, 15, 20]);
    setForm({ clientName: "", clientEmail: "", clientPhone: "", amount: "", description: "", currency: "MXN", countryCode: "MX", expiresInDays: "0", requireOtp: false, requireSelfie: false, requireSignature: false, requireIdUpload: false, usdExchangeRate: "", chargebackProtectionText: "" });
  };

  // Inicializar el país y moneda desde la configuración del negocio
  const settingsCountry = (settings as any)?.businessCountry || "MX";
  const settingsCountryConfig = COUNTRIES.find((c) => c.code === settingsCountry);

  // Si settings carga y el form todavía tiene el valor por defecto, actualizar con el país del negocio
  if (settings && form.countryCode === "MX" && settingsCountry !== "MX") {
    setForm((prev) => ({
      ...prev,
      countryCode: settingsCountry,
      currency: settingsCountryConfig?.currency || "MXN",
    }));
  }

  const commissionRate = parseFloat(String(settings?.commissionRate || 0));
  const previewAmount = parseFloat(form.amount) || 0;
  const previewCommission = previewAmount * commissionRate / 100;
  const previewNet = previewAmount - previewCommission;
  const previewUsd = form.usdExchangeRate && parseFloat(form.usdExchangeRate) > 0
    ? (previewAmount / parseFloat(form.usdExchangeRate)).toFixed(2)
    : null;

  // ─── Pantalla de enlace creado ─────────────────────────────────────────────
  if (createdLink) {
    return (
      <DashboardLayout title="Enlace Creado">
        <div className="max-w-xl mx-auto">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">¡Enlace creado!</h2>
              <p className="text-cyan-100 text-sm">
                Cobro de <strong>{formatCurrency(createdLink.amount, createdLink.currency)}</strong> para <strong>{createdLink.clientName}</strong>
              </p>
              {createdLink.commissionRate && createdLink.commissionRate > 0 && (
                <p className="text-cyan-200 text-xs mt-1">
                  Comisión {createdLink.commissionRate.toFixed(1)}% = {formatCurrency(createdLink.commissionAmount || 0)} · Neto: {formatCurrency(createdLink.netAmount || 0)}
                </p>
              )}
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Link Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Enlace de pago</p>
                <p className="text-sm text-foreground break-all font-mono leading-relaxed">{createdLink.url}</p>
              </div>

              {/* QR Code */}
              <div className="border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wide">Código QR</p>
                <div ref={qrRef} className="flex justify-center mb-3">
                  <QRCodeSVG
                    value={createdLink.url}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#1e3a5f"
                    level="M"
                    includeMargin
                  />
                </div>
                <button
                  onClick={handleDownloadQR}
                  className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mx-auto"
                >
                  <Download className="w-3 h-3" /> Descargar QR
                </button>
              </div>

              {/* Share Options */}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Compartir enlace</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      copied
                        ? "border-green-400 bg-green-50 text-green-600"
                        : "border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50 text-muted-foreground hover:text-cyan-600"
                    }`}
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    <span className="text-xs font-medium">{copied ? "Copiado" : "Copiar"}</span>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">WhatsApp</span>
                  </button>

                  <button
                    onClick={handleEmail}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-all"
                  >
                    <Mail className="w-5 h-5" />
                    <span className="text-xs font-medium">Email</span>
                  </button>
                </div>
              </div>

              {/* Payment Details Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-foreground">{createdLink.clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concepto</span>
                  <span className="text-foreground text-right max-w-[200px]">{createdLink.description}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                  <span className="font-semibold text-foreground">Total a cobrar</span>
                  <span className="font-bold text-cyan-600">{formatCurrency(createdLink.amount, createdLink.currency)}</span>
                </div>
                {createdLink.commissionRate && createdLink.commissionRate > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Comisión ({createdLink.commissionRate.toFixed(1)}%)</span>
                      <span>- {formatCurrency(createdLink.commissionAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-green-700 border-t border-gray-200 pt-2">
                      <span>Neto a recibir</span>
                      <span>{formatCurrency(createdLink.netAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full border-gray-200">
                <Plus className="w-4 h-4 mr-2" />
                Crear otro enlace
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Formulario de creación ────────────────────────────────────────────────
  return (
    <DashboardLayout title="Nuevo Cobro">
      <div className="max-w-xl mx-auto">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Crear enlace de pago</CardTitle>
                <CardDescription>Completa los datos para generar el enlace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="text-foreground font-medium">Nombre del cliente *</Label>
                <Input
                  id="clientName"
                  placeholder="Ej. Juan García"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="border-gray-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clientEmail" className="text-foreground font-medium">Email del cliente (opcional)</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={form.clientEmail}
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                  className="border-gray-200"
                />
                <p className="text-xs text-muted-foreground">Se usará para enviar el recibo de pago al cliente</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground font-medium">Teléfono del cliente (opcional)</Label>
                <div className="border border-gray-200 rounded-md px-3 py-2 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <PhoneInput
                    international
                    defaultCountry="MX"
                    value={form.clientPhone}
                    onChange={(val) => setForm({ ...form, clientPhone: val || "" })}
                    className="phone-input-custom"
                    placeholder="+52 55 1234 5678"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Para enviar el link por WhatsApp o SMS</p>
              </div>

              {/* Monto y moneda */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-foreground font-medium">Monto a cobrar *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                    <Input
                      id="amount"
                      type="number"
                      min="10"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7 border-gray-200"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground font-medium">País y Moneda</Label>
                  <Select
                    value={form.countryCode}
                    onValueChange={(code) => {
                      const country = getCountryByCode(code);
                      if (country) {
                        setForm({ ...form, countryCode: code, currency: country.currency });
                      }
                    }}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {getSortedCountries().map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.flag} {c.name} — {c.currency}
                          {!c.stripeSupported && " ⚠️"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.countryCode !== "MX" && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <span>🌍</span> Cobro internacional en {getCountryByCode(form.countryCode)?.currencyName} ({form.currency})
                    </p>
                  )}
                  {getCountryByCode(form.countryCode)?.stripeSupported === false && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <span>⚠️</span> Stripe no opera directamente en este país. El cobro se procesará en USD.
                    </p>
                  )}
                </div>
              </div>

              {/* Preview de comisión */}
              {previewAmount >= 10 && commissionRate > 0 && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-cyan-800">
                    <span className="font-semibold">Desglose:</span>{" "}
                    Cobras {formatCurrency(previewAmount)} · Comisión {commissionRate}% = {formatCurrency(previewCommission)} · <strong>Neto: {formatCurrency(previewNet)}</strong>
                    {previewUsd && <span className="ml-1 text-cyan-600">(≈ USD ${previewUsd})</span>}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-foreground font-medium">Descripción / Referencia *</Label>
                <Textarea
                  id="description"
                  placeholder="Ej. Consulta médica, Diseño de logo, Reparación de laptop..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="border-gray-200 resize-none"
                  required
                />
              </div>

              {/* Vigencia */}
              <div className="space-y-1.5">
                <Label className="text-foreground font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Vigencia del enlace
                </Label>
                <Select
                  value={form.expiresInDays}
                  onValueChange={(v) => setForm({ ...form, expiresInDays: v })}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Sin vencimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin vencimiento</SelectItem>
                    <SelectItem value="1">1 día</SelectItem>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Opciones avanzadas */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-foreground"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    Opciones avanzadas de seguridad
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showAdvanced && (
                  <div className="p-4 space-y-4 border-t border-gray-200">
                    {/* OTP */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Fingerprint className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Verificación OTP</p>
                          <p className="text-xs text-muted-foreground">El cliente debe verificar su email con un código de 6 dígitos</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.requireOtp}
                        onCheckedChange={(v) => setForm({ ...form, requireOtp: v })}
                      />
                    </div>

                    {/* Selfie */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Camera className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Verificación facial (selfie)</p>
                          <p className="text-xs text-muted-foreground">El cliente debe tomar una selfie para verificar su identidad</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.requireSelfie}
                        onCheckedChange={(v) => setForm({ ...form, requireSelfie: v })}
                      />
                    </div>

                    {/* Firma digital */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <PenLine className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Firma digital</p>
                          <p className="text-xs text-muted-foreground">El cliente debe firmar con dedo o mouse antes de pagar</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.requireSignature}
                        onCheckedChange={(v) => setForm({ ...form, requireSignature: v })}
                      />
                    </div>
                    {/* Carga de identificación */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Cargar identificación</p>
                          <p className="text-xs text-muted-foreground">El cliente debe subir foto de su INE, pasaporte o ID</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.requireIdUpload}
                        onCheckedChange={(v) => setForm({ ...form, requireIdUpload: v })}
                      />
                    </div>
                    {/* Tipo de cambio USD */}
                    <div className="space-y-1.5">
                      <Label className="text-foreground font-medium flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        Tipo de cambio USD/MXN (opcional)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej. 18.50"
                        value={form.usdExchangeRate}
                        onChange={(e) => setForm({ ...form, usdExchangeRate: e.target.value })}
                        className="border-gray-200"
                      />
                      <p className="text-xs text-muted-foreground">
                        Si el cliente paga con tarjeta USD, se mostrará el equivalente en dólares en la página de pago.
                      </p>
                    </div>

                    {/* Métodos de pago permitidos */}
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Métodos de pago aceptados
                      </Label>
                      <p className="text-xs text-muted-foreground">Elige qué formas de pago puede usar tu cliente en este enlace. Solo aplica para cobros en MXN.</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { key: "card" as const, label: "Tarjeta", icon: "💳" },
                          { key: "oxxo" as const, label: "OXXO", icon: "🏪" },
                          { key: "spei" as const, label: "SPEI / Transferencia", icon: "🏦" },
                        ]).map(({ key, label, icon }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setAllowedPaymentMethods(prev =>
                              prev.includes(key)
                                ? prev.length > 1 ? prev.filter(m => m !== key) : prev // al menos uno activo
                                : [...prev, key]
                            )}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 ${
                              allowedPaymentMethods.includes(key)
                                ? "bg-cyan-500 text-foreground border-cyan-500"
                                : "bg-white text-muted-foreground border-gray-200 line-through opacity-60 hover:opacity-80"
                            }`}
                          >
                            <span>{icon}</span> {label}
                          </button>
                        ))}
                      </div>
                      {allowedPaymentMethods.length < 3 && (
                        <p className="text-xs text-amber-600">
                          Solo se mostrarán: {allowedPaymentMethods.map(m => m === "card" ? "Tarjeta" : m === "oxxo" ? "OXXO" : m === "spei" ? "SPEI" : "Meses sin intereses").join(", ")}
                        </p>
                      )}
                    </div>

                    {/* MSI - Meses Sin Intereses */}
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Meses sin intereses (MSI)
                      </Label>
                      <p className="text-xs text-muted-foreground">Selecciona las opciones de MSI que quieres ofrecer al cliente. Requiere tarjeta de crédito.</p>
                      <div className="flex flex-wrap gap-2">
                        {[3, 6, 9, 12, 18, 24].map(months => (
                          <button
                            key={months}
                            type="button"
                            onClick={() => setMsiOptions(prev =>
                              prev.includes(months) ? prev.filter(m => m !== months) : [...prev, months].sort((a, b) => a - b)
                            )}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                              msiOptions.includes(months)
                                ? "bg-cyan-500 text-foreground border-cyan-500"
                                : "bg-white text-muted-foreground border-gray-200 hover:border-cyan-300"
                            }`}
                          >
                            {months} meses
                          </button>
                        ))}
                      </div>
                      {msiOptions.length > 0 && (
                        <p className="text-xs text-cyan-600">
                          El cliente podrá elegir entre: contado, {msiOptions.map(m => `${m} meses`).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Propina */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-foreground font-medium flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                            Propina opcional
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">El cliente podrá agregar una propina al monto del pago.</p>
                        </div>
                        <Switch checked={tipEnabled} onCheckedChange={setTipEnabled} />
                      </div>
                      {tipEnabled && (
                        <div className="pl-4 border-l-2 border-cyan-200 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">Porcentajes sugeridos (el cliente también puede ingresar monto manual)</p>
                            <div className="flex flex-wrap gap-2">
                              {[5, 10, 15, 20, 25].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setTipSuggestions(prev =>
                                    prev.includes(pct) ? prev.filter(p => p !== pct) : [...prev, pct].sort((a, b) => a - b)
                                  )}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                    tipSuggestions.includes(pct)
                                      ? "bg-amber-500 text-foreground border-amber-500"
                                      : "bg-white text-muted-foreground border-gray-200 hover:border-amber-300"
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>
                          {tipSuggestions.length > 0 && (
                            <p className="text-xs text-amber-600">
                              Opciones: {tipSuggestions.map(p => `${p}%`).join(", ")} + monto manual
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Texto anti-contracargos */}
                    <div className="space-y-1.5">
                      <Label className="text-foreground font-medium flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        Aviso anti-contracargos (opcional)
                      </Label>
                      <Textarea
                        placeholder="Ej. Al realizar este pago, usted acepta que el cargo es definitivo y no puede ser cancelado ni reembolsado una vez procesado."
                        rows={2}
                        value={form.chargebackProtectionText}
                        onChange={(e) => setForm({ ...form, chargebackProtectionText: e.target.value })}
                        className="border-gray-200 resize-none text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Este texto aparecerá en la página de pago como aviso legal.</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-foreground"
                size="lg"
                disabled={createLink.isPending}
              >
                {createLink.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generando enlace...</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" />Generar enlace de pago</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
