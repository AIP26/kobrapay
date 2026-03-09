import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2,
  Users,
  DollarSign,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Briefcase,
  ShoppingCart,
  CreditCard,
  Repeat,
  Globe,
  FileText,
  Zap,
  Star,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Tipo de empresa", icon: Building2 },
  { id: 2, title: "Ingresos estimados", icon: DollarSign },
  { id: 3, title: "Número de empleados", icon: Users },
  { id: 4, title: "Servicios que necesitas", icon: Layers },
  { id: 5, title: "Cuentas bancarias", icon: CreditCard },
  { id: 6, title: "Tu industria", icon: Briefcase },
];

const BUSINESS_TYPES = [
  { value: "persona_fisica", label: "Persona Física", desc: "Freelancer, emprendedor individual", icon: "👤" },
  { value: "empresa_pequena", label: "Empresa Pequeña", desc: "1-20 empleados, PyME", icon: "🏪" },
  { value: "empresa_mediana", label: "Empresa Mediana", desc: "21-100 empleados", icon: "🏢" },
  { value: "empresa_grande", label: "Empresa Grande", desc: "Más de 100 empleados", icon: "🏦" },
  { value: "startup", label: "Startup / Tecnología", desc: "Empresa de crecimiento rápido", icon: "🚀" },
  { value: "otro", label: "Otro", desc: "Asociación, ONG, otro tipo", icon: "🔷" },
];

const REVENUE_OPTIONS = [
  { value: "menos_10k", label: "Menos de $10,000", desc: "Inicio de operaciones", color: "bg-gray-100 text-foreground" },
  { value: "10k_50k", label: "$10,000 – $50,000", desc: "Negocio en crecimiento", color: "bg-blue-50 text-blue-700" },
  { value: "50k_200k", label: "$50,000 – $200,000", desc: "Empresa establecida", color: "bg-emerald-50 text-emerald-700" },
  { value: "200k_500k", label: "$200,000 – $500,000", desc: "Empresa mediana-grande", color: "bg-purple-50 text-purple-700" },
  { value: "mas_500k", label: "Más de $500,000", desc: "Gran empresa", color: "bg-amber-50 text-amber-700" },
];

const EMPLOYEE_OPTIONS = [
  { value: "solo_yo", label: "Solo yo", desc: "Trabajo independiente", icon: "👤" },
  { value: "2_5", label: "2 – 5", desc: "Equipo pequeño", icon: "👥" },
  { value: "6_20", label: "6 – 20", desc: "Equipo mediano", icon: "🏪" },
  { value: "21_100", label: "21 – 100", desc: "Empresa mediana", icon: "🏢" },
  { value: "mas_100", label: "Más de 100", desc: "Gran empresa", icon: "🏦" },
];

const SERVICES = [
  { value: "cobros_tarjeta", label: "Cobros con tarjeta", icon: CreditCard, desc: "Links de pago, checkout" },
  { value: "cobros_recurrentes", label: "Cobros recurrentes", icon: Repeat, desc: "Suscripciones, mensualidades" },
  { value: "pos_fisico", label: "Punto de venta físico", icon: ShoppingCart, desc: "Terminal en tienda" },
  { value: "pagos_internacionales", label: "Pagos internacionales", icon: Globe, desc: "USD, EUR, otras monedas" },
  { value: "facturacion", label: "Facturación electrónica", icon: FileText, desc: "CFDI, facturas SAT" },
  { value: "marketplace", label: "Marketplace / Multi-vendedor", icon: Layers, desc: "Plataforma con varios vendedores" },
  { value: "api_personalizada", label: "API personalizada", icon: Zap, desc: "Integración a medida" },
  { value: "retiros_automaticos", label: "Retiros automáticos", icon: ArrowRight, desc: "Payouts programados" },
];

const ACCOUNTS_OPTIONS = [
  { value: "una", label: "Una cuenta", desc: "Todos los cobros a una cuenta bancaria" },
  { value: "dos_cinco", label: "2 – 5 cuentas", desc: "Diferentes cuentas por sucursal o concepto" },
  { value: "seis_mas", label: "6 o más cuentas", desc: "Multi-empresa o marketplace avanzado" },
];

const INDUSTRIES = [
  "Retail / Comercio", "Restaurantes / Alimentos", "Salud / Médico", "Educación / Cursos",
  "Tecnología / Software", "Servicios profesionales", "Construcción / Inmobiliaria",
  "Turismo / Hospedaje", "Entretenimiento / Eventos", "Transporte / Logística",
  "Manufactura / Industria", "ONG / Asociación civil", "E-commerce", "Otro",
];

export default function OnboardingSurvey() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessType: "",
    monthlyRevenue: "",
    employeeCount: "",
    desiredServices: [] as string[],
    accountsNeeded: "una",
    industry: "",
    businessDescription: "",
    referralSource: "",
  });

  const submitMutation = trpc.onboarding.submitSurvey.useMutation({
    onSuccess: () => {
      toast.success("¡Encuesta enviada! Revisaremos tu perfil y te contactaremos pronto.");
      navigate("/dashboard");
    },
    onError: (e: any) => toast.error(e.message || "Error al enviar la encuesta"),
  });

  const toggleService = (val: string) => {
    setForm(f => ({
      ...f,
      desiredServices: f.desiredServices.includes(val)
        ? f.desiredServices.filter(s => s !== val)
        : [...f.desiredServices, val],
    }));
  };

  const canNext = () => {
    if (step === 1) return !!form.businessType;
    if (step === 2) return !!form.monthlyRevenue;
    if (step === 3) return !!form.employeeCount;
    if (step === 4) return form.desiredServices.length > 0;
    if (step === 5) return !!form.accountsNeeded;
    return true;
  };

  const handleSubmit = () => {
    // Mapear los campos nuevos al schema existente del backend
    // Mapear al formato que espera el backend
    const revenueMap: Record<string, string> = {
      menos_10k: '<10k',
      '10k_50k': '10k-50k',
      '50k_200k': '50k-100k',
      '200k_500k': '100k-500k',
      mas_500k: '500k+',
    };
    const sizeMap: Record<string, string> = {
      solo_yo: 'small',
      '2_5': 'small',
      '6_20': 'small',
      '21_100': 'medium',
      mas_100: 'large',
    };
    submitMutation.mutate({
      businessType: form.businessType,
      businessSize: sizeMap[form.employeeCount] || form.employeeCount,
      monthlyRevenueEstimate: revenueMap[form.monthlyRevenue] || form.monthlyRevenue,
      needsCardPayments: form.desiredServices.includes('cobros_tarjeta'),
      needsInternationalCards: form.desiredServices.includes('pagos_internacionales'),
      needsRecurringBilling: form.desiredServices.includes('cobros_recurrentes'),
      needsInvoicing: form.desiredServices.includes('facturacion'),
      needsMultipleBankAccounts: form.accountsNeeded !== 'una',
      interestedModules: form.desiredServices,
      currentPaymentProcessor: form.referralSource || undefined,
      mainChallenge: form.businessDescription || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00C896]/5 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#00C896]/10 text-[#00C896] rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-[#00C896]" />
            Bienvenido a KobraPay
          </div>
          <h1 className="text-3xl font-bold text-foreground">Cuéntanos sobre tu negocio</h1>
          <p className="text-muted-foreground mt-2">Esta información nos ayuda a ofrecerte el plan y servicios ideales para ti</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 transition-all ${
                step > s.id ? "bg-[#00C896] text-foreground" :
                step === s.id ? "bg-[#00C896] text-foreground ring-4 ring-[#00C896]/20" :
                "bg-gray-100 text-muted-foreground"
              }`}>
                {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full transition-all ${step > s.id ? "bg-[#00C896]" : "bg-gray-100"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            {/* Step 1: Tipo de empresa */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">¿Qué tipo de empresa o negocio tienes?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Esto nos ayuda a entender tu estructura y necesidades</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, businessType: opt.value }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:border-[#00C896]/50 ${
                        form.businessType === opt.value ? "border-[#00C896] bg-[#00C896]/5" : "border-gray-200"
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <p className="font-semibold text-foreground mt-2 text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Ingresos */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">¿Cuál es tu ingreso mensual estimado?</h2>
                  <p className="text-muted-foreground text-sm mt-1">En pesos mexicanos (MXN). Esto es confidencial y solo para recomendarte el plan correcto.</p>
                </div>
                <div className="space-y-2">
                  {REVENUE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, monthlyRevenue: opt.value }))}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                        form.monthlyRevenue === opt.value ? "border-[#00C896] bg-[#00C896]/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {form.monthlyRevenue === opt.value && <CheckCircle2 className="w-5 h-5 text-[#00C896]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Empleados */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">¿Cuántas personas trabajan en tu empresa?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Incluyendo tú mismo y colaboradores</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {EMPLOYEE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, employeeCount: opt.value }))}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        form.employeeCount === opt.value ? "border-[#00C896] bg-[#00C896]/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <p className="font-bold text-foreground mt-2">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Servicios */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">¿Qué servicios necesitas?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Selecciona todos los que apliquen (puedes elegir varios)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICES.map(svc => {
                    const selected = form.desiredServices.includes(svc.value);
                    return (
                      <button
                        key={svc.value}
                        onClick={() => toggleService(svc.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                          selected ? "border-[#00C896] bg-[#00C896]/5" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-[#00C896] text-foreground" : "bg-gray-100 text-muted-foreground"}`}>
                          <svc.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{svc.label}</p>
                          <p className="text-xs text-muted-foreground">{svc.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {form.desiredServices.length > 0 && (
                  <p className="text-sm text-[#00C896] font-medium">{form.desiredServices.length} servicio{form.desiredServices.length !== 1 ? "s" : ""} seleccionado{form.desiredServices.length !== 1 ? "s" : ""}</p>
                )}
              </div>
            )}

            {/* Step 5: Cuentas bancarias */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">¿Cuántas cuentas bancarias necesitas?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Para recibir los pagos de tus clientes</p>
                </div>
                <div className="space-y-3">
                  {ACCOUNTS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, accountsNeeded: opt.value }))}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                        form.accountsNeeded === opt.value ? "border-[#00C896] bg-[#00C896]/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {form.accountsNeeded === opt.value && <CheckCircle2 className="w-5 h-5 text-[#00C896]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Industria y detalles */}
            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Cuéntanos un poco más</h2>
                  <p className="text-muted-foreground text-sm mt-1">Información adicional para personalizar tu experiencia</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">¿En qué industria opera tu negocio?</label>
                  <select
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40 bg-white"
                  >
                    <option value="">Seleccionar industria...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Describe brevemente tu negocio <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <textarea
                    value={form.businessDescription}
                    onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
                    placeholder="Ej: Vendo ropa en línea y en tienda física, necesito cobrar con tarjeta y facturar..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40 resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">¿Cómo nos encontraste? <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <select
                    value={form.referralSource}
                    onChange={e => setForm(f => ({ ...f, referralSource: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40 bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="google">Búsqueda en Google</option>
                    <option value="redes_sociales">Redes sociales</option>
                    <option value="recomendacion">Recomendación de alguien</option>
                    <option value="publicidad">Publicidad en línea</option>
                    <option value="evento">Evento o conferencia</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/dashboard")}
                className="gap-2 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 1 ? "Omitir por ahora" : "Anterior"}
              </Button>

              {step < STEPS.length ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="bg-[#00C896] hover:bg-[#00a87e] text-foreground gap-2"
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="bg-[#00C896] hover:bg-[#00a87e] text-foreground gap-2"
                >
                  {submitMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Enviar y continuar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Tu información es confidencial y solo se usa para personalizar tu experiencia en KobraPay
        </p>
      </div>
    </div>
  );
}
