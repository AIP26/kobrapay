import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, User, Building2, Phone, Calendar, FileText, Shield, Bot } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

const KOBRAPAY_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png";
const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png";

// Cloudflare Turnstile site key
// Use env var in production; fallback to Cloudflare's always-pass test key for dev
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || "1x00000000000000000000AA";

const BUSINESS_TYPES = [
  "Comercio al por menor",
  "Servicios profesionales",
  "Restaurante / Alimentos",
  "Salud y bienestar",
  "Educación / Cursos",
  "Tecnología / Software",
  "Construcción / Inmobiliaria",
  "Transporte / Logística",
  "Entretenimiento / Eventos",
  "Otro",
];

export default function CompleteProfile() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    fullName: "",
    birthDate: "",
    curp: "",
    rfc: "",
    phone: "",
    businessName: "",
    businessType: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);

  const saveMutation = trpc.profile.save.useMutation({
    onSuccess: () => {
      toast.success("¡Perfil completado! Tu cuenta está en revisión. Te notificaremos cuando sea aprobada.");
      navigate("/pending");
    },
    onError: (err) => {
      toast.error(err.message || "Error al guardar el perfil");
    },
  });

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.length < 2) errs.fullName = "Nombre completo requerido (mínimo 2 caracteres)";
    if (!form.birthDate) errs.birthDate = "Fecha de nacimiento requerida";
    if (!form.phone || form.phone.replace(/\D/g, "").length < 10) errs.phone = "Teléfono de 10 dígitos requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
    if (!form.curp || form.curp.length !== 18 || !curpRegex.test(form.curp.toUpperCase())) {
      errs.curp = "CURP inválida (18 caracteres, formato oficial)";
    }
    if (form.rfc && (form.rfc.length < 12 || form.rfc.length > 13)) {
      errs.rfc = "RFC inválido (12-13 caracteres)";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!form.businessName.trim() || form.businessName.length < 2) errs.businessName = "Nombre del negocio requerido";
    if (!form.businessType) errs.businessType = "Selecciona el tipo de negocio";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) {
      if (!turnstileToken) {
        toast.error("Por favor completa la verificación de seguridad antes de continuar");
        return;
      }
      saveMutation.mutate({
        fullName: form.fullName,
        birthDate: form.birthDate,
        curp: form.curp.toUpperCase(),
        rfc: form.rfc || "",
        phone: form.phone,
        businessName: form.businessName,
        businessType: form.businessType,
      });
    }
  };

  const steps = [
    { label: "Datos personales", icon: User },
    { label: "Identificación", icon: FileText },
    { label: "Tu negocio", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-14 h-14 object-contain mb-3" />
        <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-7 object-contain opacity-80" />
      </div>

      <div className="w-full max-w-lg">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === i + 1;
            const isDone = step > i + 1;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive ? "bg-emerald-500 text-foreground" :
                  isDone ? "bg-emerald-500/20 text-emerald-400" :
                  "bg-white/5 text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </div>
                {i < steps.length - 1 && <div className={`w-6 h-px ${step > i + 1 ? "bg-emerald-500/50" : "bg-white/10"}`} />}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">
              {step === 1 ? "Datos personales" : step === 2 ? "Identificación oficial" : "Tu negocio"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 1 ? "Ingresa tus datos personales para crear tu cuenta." :
               step === 2 ? "Necesitamos tu CURP para verificar tu identidad." :
               "Cuéntanos sobre tu negocio para personalizar tu experiencia."}
            </p>
          </div>

          {/* Step 1: Datos personales */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block">Nombre completo *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Ej. Juan Carlos García López"
                  className="bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
                />
                {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Fecha de nacimiento *
                </Label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                  className="bg-white/5 border-border text-foreground focus:border-emerald-500"
                />
                {errors.birthDate && <p className="text-red-400 text-xs mt-1">{errors.birthDate}</p>}
              </div>
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Teléfono celular *
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/[^\d+\-\s()]/g, ""))}
                  placeholder="55 1234 5678"
                  maxLength={15}
                  className="bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Identificación */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-2">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-300 leading-relaxed">
                    Tu información está protegida con cifrado de extremo a extremo. Solo se usa para verificar tu identidad y cumplir con regulaciones financieras mexicanas.
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block">CURP *</Label>
                <Input
                  value={form.curp}
                  onChange={(e) => set("curp", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="GACJ850101HMCRLR09"
                  maxLength={18}
                  className="bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-mono tracking-wider"
                />
                <p className="text-xs text-muted-foreground mt-1">18 caracteres. Puedes consultarla en <a href="https://www.gob.mx/curp/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">gob.mx/curp</a></p>
                {errors.curp && <p className="text-red-400 text-xs mt-1">{errors.curp}</p>}
              </div>
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block">RFC (opcional)</Label>
                <Input
                  value={form.rfc}
                  onChange={(e) => set("rfc", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="GACJ850101XXX"
                  maxLength={13}
                  className="bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-mono tracking-wider"
                />
                <p className="text-xs text-muted-foreground mt-1">Requerido para emitir facturas. Puedes agregarlo después.</p>
                {errors.rfc && <p className="text-red-400 text-xs mt-1">{errors.rfc}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Negocio + Anti-bot */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Nombre del negocio *
                </Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="Ej. Ferretería García"
                  className="bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
                />
                <p className="text-xs text-muted-foreground mt-1">Aparecerá en los recibos y páginas de pago.</p>
                {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName}</p>}
              </div>
              <div>
                <Label className="text-muted-foreground text-sm mb-1.5 block">Tipo de negocio *</Label>
                <Select value={form.businessType} onValueChange={(v) => set("businessType", v)}>
                  <SelectTrigger className="bg-white/5 border-border text-foreground focus:border-emerald-500">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-foreground hover:bg-white/10 focus:bg-white/10">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.businessType && <p className="text-red-400 text-xs mt-1">{errors.businessType}</p>}
              </div>

              {/* Verificación anti-bot Cloudflare Turnstile */}
              <div className="bg-white/5 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground font-medium">Verificación de seguridad</span>
                  <span className="text-xs text-muted-foreground">— confirma que eres humano</span>
                </div>
                <div className="flex justify-center">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                      setTurnstileError(false);
                    }}
                    onError={() => {
                      setTurnstileToken(null);
                      setTurnstileError(true);
                    }}
                    onExpire={() => setTurnstileToken(null)}
                    options={{ theme: "dark", language: "es" }}
                  />
                </div>
                {turnstileError && (
                  <p className="text-red-400 text-xs mt-2 text-center">
                    Error en la verificación. Recarga la página e intenta de nuevo.
                  </p>
                )}
                {turnstileToken && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Verificación completada</span>
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Al completar tu registro, tu cuenta quedará en <strong className="text-foreground">revisión</strong>. Recibirás una notificación cuando sea aprobada (generalmente en menos de 24 horas).
                </p>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1 border-border text-foreground hover:bg-white/10"
              >
                Atrás
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={saveMutation.isPending || (step === 3 && !turnstileToken)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? "Guardando..." :
               step === 3 ? "Completar registro" : "Continuar"}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ¿Ya tienes cuenta? <a href="/" className="text-emerald-400 hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
