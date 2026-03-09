import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, ArrowRight, ArrowLeft, User, MapPin, Landmark } from "lucide-react";

const STEPS = [
  { id: 1, label: "Datos personales", icon: User },
  { id: 2, label: "Ubicación y perfil", icon: MapPin },
  { id: 3, label: "Datos bancarios", icon: Landmark },
];

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
  "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit",
  "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

export default function RegisterAssociate() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "",
    phone: "", city: "", state: "",
    bio: "", experience: "",
    bankName: "", clabe: "", bankAccountHolder: "",
  });

  const register = trpc.associatePublic.register.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (err) => toast.error(err.message || "Error al crear cuenta"),
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || form.name.length < 2) { toast.error("Ingresa tu nombre completo"); return false; }
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) { toast.error("Ingresa un correo válido"); return false; }
      if (!form.password || form.password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return false; }
    }
    if (step === 2) {
      if (!form.phone || form.phone.length < 10) { toast.error("Ingresa tu número de teléfono (10 dígitos)"); return false; }
      if (!form.city.trim()) { toast.error("Ingresa tu ciudad"); return false; }
      if (!form.state) { toast.error("Selecciona tu estado"); return false; }
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) setStep(s => s + 1); };
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    if (!validateStep()) return;
    register.mutate({
      name: form.name, email: form.email, password: form.password,
      phone: form.phone, city: form.city, state: form.state,
      bio: form.bio || undefined, experience: form.experience || undefined,
      bankName: form.bankName || undefined,
      clabe: form.clabe.length === 18 ? form.clabe : undefined,
      bankAccountHolder: form.bankAccountHolder || undefined,
    });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 50%, #0a1628 100%)" }}>
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(16, 185, 129, 0.15)", border: "2px solid #10b981" }}>
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">¡Bienvenido a KobraPay!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">Tu cuenta de asociado ha sido creada exitosamente. Ya puedes iniciar sesión y comenzar a referir clientes.</p>
          <Button onClick={() => navigate("/login")} className="w-full h-12 text-base font-semibold" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 50%, #0a1628 100%)" }}>
      {/* Panel izquierdo — beneficios */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <img src="/kobrapay-logo.png" alt="KobraPay" className="h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="text-2xl font-bold text-foreground">KobraPay</span>
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-4 leading-tight">Gana dinero<br /><span style={{ color: "#10b981" }}>refiriendo negocios</span></h2>
          <p className="text-muted-foreground text-lg mb-12">Únete a nuestra red de asociados y recibe comisión automática por cada transacción de tus clientes referidos.</p>
          <div className="space-y-6">
            {[
              { title: "$1 MXN por transacción", desc: "Comisión automática en cada cobro de tus clientes referidos" },
              { title: "Sin límite de referidos", desc: "Cuantos más clientes registres, más ganas" },
              { title: "Panel de seguimiento", desc: "Ve tus comisiones y clientes en tiempo real" },
              { title: "Pago a tu CLABE", desc: "Liquidación directa a tu cuenta bancaria" },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">{b.title}</p>
                  <p className="text-muted-foreground text-sm">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">© 2026 KobraPay · Cobra fácil, cobra global</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <span className="text-xl font-bold text-foreground">KobraPay</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Registro de Asociado</h1>
            <p className="text-muted-foreground">Paso {step} de {STEPS.length} — {STEPS[step - 1].label}</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((s) => (
              <div key={s.id} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{ background: s.id <= step ? "#10b981" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>

          {/* Step 1: Datos personales */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-muted-foreground mb-2 block">Nombre completo *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Juan García López"
                  className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Correo electrónico *</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@ejemplo.com"
                  className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Contraseña *</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                    placeholder="Mínimo 8 caracteres" className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1">Mínimo 8 caracteres</p>
              </div>
              <Button onClick={handleNext} className="w-full h-12 text-base font-semibold mt-2"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                Continuar <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Ubicación y perfil */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-muted-foreground mb-2 block">Teléfono / WhatsApp *</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} placeholder="5512345678"
                  maxLength={10} className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground mb-2 block">Ciudad *</Label>
                  <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Monterrey"
                    className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
                </div>
                <div>
                  <Label className="text-muted-foreground mb-2 block">Estado *</Label>
                  <select value={form.state} onChange={e => set("state", e.target.value)}
                    className="w-full h-12 rounded-md px-3 text-sm bg-white/5 border border-border text-foreground focus:outline-none focus:border-emerald-500">
                    <option value="" className="bg-card">Seleccionar...</option>
                    {ESTADOS_MX.map(e => <option key={e} value={e} className="bg-card">{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Experiencia en ventas <span className="text-slate-500">(opcional)</span></Label>
                <Input value={form.experience} onChange={e => set("experience", e.target.value)} placeholder="Ej: 5 años en ventas B2B, sector restaurantes"
                  className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Descripción profesional <span className="text-slate-500">(opcional)</span></Label>
                <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Cuéntanos sobre tu red de contactos y cómo planeas referir clientes a KobraPay..."
                  rows={3} className="bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-12 border-border text-muted-foreground hover:bg-white/5">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Atrás
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12 font-semibold"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  Continuar <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Datos bancarios */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl mb-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="text-emerald-400 text-sm font-medium mb-1">💡 Datos bancarios opcionales</p>
                <p className="text-muted-foreground text-xs">Puedes completarlos ahora o más tarde desde tu perfil. Los necesitamos para liquidar tus comisiones.</p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Banco</Label>
                <Input value={form.bankName} onChange={e => set("bankName", e.target.value)} placeholder="BBVA, Banorte, HSBC, etc."
                  className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">CLABE interbancaria (18 dígitos)</Label>
                <Input value={form.clabe} onChange={e => set("clabe", e.target.value.replace(/\D/g, ""))} placeholder="012345678901234567"
                  maxLength={18} className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500 font-mono tracking-wider" />
                <p className="text-slate-500 text-xs mt-1">{form.clabe.length}/18 dígitos</p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Titular de la cuenta</Label>
                <Input value={form.bankAccountHolder} onChange={e => set("bankAccountHolder", e.target.value)} placeholder="Nombre completo como aparece en tu cuenta"
                  className="h-12 bg-white/5 border-border text-foreground placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-12 border-border text-muted-foreground hover:bg-white/5">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Atrás
                </Button>
                <Button onClick={handleSubmit} disabled={register.isPending} className="flex-1 h-12 font-semibold"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-slate-500 text-sm mt-6">
            ¿Ya tienes cuenta?{" "}
            <button onClick={() => navigate("/login")} className="text-emerald-400 hover:text-emerald-300 font-medium">
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
