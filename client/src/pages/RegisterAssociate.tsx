import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, ArrowRight, ArrowLeft, User, MapPin, Landmark } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_pro_white_6b7b7c3e.png";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <img src={LOGO_URL} alt="KobraPay" className="h-16 object-contain mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">¡Bienvenido a KobraPay!</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">Tu cuenta de asociado ha sido creada exitosamente. Ya puedes iniciar sesión y comenzar a referir clientes.</p>
          <Button onClick={() => navigate("/login")} className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Panel izquierdo — beneficios */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 bg-gradient-to-br from-emerald-600 to-teal-700">
        <div>
          <div className="mb-12">
            <img src={LOGO_URL} alt="KobraPay" className="h-14 object-contain" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Gana dinero<br />
            <span className="text-emerald-200">refiriendo negocios</span>
          </h2>
          <p className="text-emerald-100 text-lg mb-12">
            Únete a nuestra red de asociados y recibe comisión automática por cada transacción de tus clientes referidos.
          </p>
          <div className="space-y-6">
            {[
              { title: "Comisión por transacción", desc: "Gana automáticamente en cada cobro de tus clientes referidos" },
              { title: "Sin límite de referidos", desc: "Cuantos más clientes registres, más ganas" },
              { title: "Panel de seguimiento", desc: "Ve tus comisiones y clientes en tiempo real" },
              { title: "Pago a tu CLABE", desc: "Liquidación directa a tu cuenta bancaria" },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/20">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">{b.title}</p>
                  <p className="text-emerald-100 text-sm">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-emerald-200 text-sm">© 2026 KobraPay · Cobra fácil, cobra global</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-lg">
          {/* Logo mobile */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={LOGO_URL} alt="KobraPay" className="h-12 object-contain" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Registro de Asociado</h1>
            <p className="text-gray-500">Paso {step} de {STEPS.length} — {STEPS[step - 1].label}</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((s) => (
              <div key={s.id} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{ background: s.id <= step ? "#059669" : "#e5e7eb" }} />
            ))}
          </div>

          {/* Step 1: Datos personales */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Nombre completo *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Juan García López"
                  className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Correo electrónico *</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@ejemplo.com"
                  className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Contraseña *</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                    placeholder="Mínimo 8 caracteres" className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-1">Mínimo 8 caracteres</p>
              </div>
              <Button onClick={handleNext} className="w-full h-12 text-base font-semibold mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                Continuar <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Ubicación y perfil */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Teléfono / WhatsApp *</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} placeholder="5512345678"
                  maxLength={10} className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Ciudad *</Label>
                  <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Monterrey"
                    className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Estado *</Label>
                  <select value={form.state} onChange={e => set("state", e.target.value)}
                    className="w-full h-12 rounded-md px-3 text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-emerald-500">
                    <option value="">Seleccionar...</option>
                    {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Experiencia en ventas <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input value={form.experience} onChange={e => set("experience", e.target.value)} placeholder="Ej: 5 años en ventas B2B, sector restaurantes"
                  className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Descripción profesional <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Cuéntanos sobre tu red de contactos y cómo planeas referir clientes a KobraPay..."
                  rows={3} className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Atrás
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                  Continuar <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Datos bancarios */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl mb-2 bg-emerald-50 border border-emerald-200">
                <p className="text-emerald-700 text-sm font-medium mb-1">💡 Datos bancarios opcionales</p>
                <p className="text-emerald-600 text-xs">Puedes completarlos ahora o más tarde desde tu perfil. Los necesitamos para liquidar tus comisiones.</p>
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Banco</Label>
                <Input value={form.bankName} onChange={e => set("bankName", e.target.value)} placeholder="BBVA, Banorte, HSBC, etc."
                  className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">CLABE interbancaria (18 dígitos)</Label>
                <Input value={form.clabe} onChange={e => set("clabe", e.target.value.replace(/\D/g, ""))} placeholder="012345678901234567"
                  maxLength={18} className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 font-mono tracking-wider" />
                <p className="text-gray-400 text-xs mt-1">{form.clabe.length}/18 dígitos</p>
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Titular de la cuenta</Label>
                <Input value={form.bankAccountHolder} onChange={e => set("bankAccountHolder", e.target.value)} placeholder="Nombre completo como aparece en tu cuenta"
                  className="h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Atrás
                </Button>
                <Button onClick={handleSubmit} disabled={register.isPending} className="flex-1 h-12 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                  {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            ¿Ya tienes cuenta?{" "}
            <button onClick={() => navigate("/login")} className="text-emerald-600 hover:text-emerald-700 font-medium">
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
