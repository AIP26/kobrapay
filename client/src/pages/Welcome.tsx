import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Link2,
  BarChart2,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Users,
} from "lucide-react";

const STEPS = [
  {
    icon: CreditCard,
    color: "bg-emerald-100 text-emerald-600",
    title: "Configura tu negocio",
    description: "Agrega el nombre, logo y datos de tu empresa para personalizar tu experiencia.",
    action: "Ir a configuración",
    href: "/dashboard/settings",
    time: "2 min",
  },
  {
    icon: Link2,
    color: "bg-blue-100 text-blue-600",
    title: "Crea tu primer enlace de pago",
    description: "Genera un enlace personalizado y compártelo con tu cliente para recibir tu primer pago.",
    action: "Crear enlace",
    href: "/dashboard/links/new",
    time: "1 min",
  },
  {
    icon: BarChart2,
    color: "bg-purple-100 text-purple-600",
    title: "Revisa tu panel de ventas",
    description: "Aquí verás todas tus transacciones, comisiones y reportes en tiempo real.",
    action: "Ver panel",
    href: "/dashboard",
    time: "30 seg",
  },
];

const FEATURES = [
  { icon: Shield, label: "Pagos seguros con verificación de identidad" },
  { icon: Zap, label: "Cobros en menos de 2 minutos" },
  { icon: Users, label: "Gestión de clientes y pagadores" },
  { icon: CreditCard, label: "Tarjeta, OXXO y SPEI disponibles" },
];

export default function Welcome() {
  const [, navigate] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const markWelcomeShown = trpc.onboarding.markWelcomeShown.useMutation();

  // Si el usuario ya vio el welcome, redirigir al dashboard
  useEffect(() => {
    if (user && (user as Record<string, unknown>).welcomeShown) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleStart = async () => {
    try {
      await markWelcomeShown.mutateAsync();
    } catch { /* no bloquear */ }
    navigate("/dashboard");
  };

  const handleGoTo = async (href: string) => {
    try {
      await markWelcomeShown.mutateAsync();
    } catch { /* no bloquear */ }
    navigate(href);
  };

  const firstName = (user?.name || "").split(" ")[0] || "bienvenido";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Cuenta aprobada</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            ¡Hola, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tu cuenta en <span className="text-emerald-400 font-semibold">KobraPay</span> está lista.
            Sigue estos pasos para empezar a cobrar hoy mismo.
          </p>
        </div>

        {/* Pasos */}
        <div className="grid gap-4 mb-8">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="bg-white/5 border border-border rounded-2xl p-5 flex items-center gap-5 hover:bg-white/8 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.color}`}>
                  <step.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-500 font-medium">Paso {i + 1}</span>
                  <span className="text-xs bg-slate-700 text-muted-foreground rounded-full px-2 py-0.5">{step.time}</span>
                </div>
                <h3 className="text-foreground font-semibold text-base">{step.title}</h3>
                <p className="text-muted-foreground text-sm mt-0.5">{step.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 border-border text-foreground hover:bg-white/10 bg-transparent"
                onClick={() => handleGoTo(step.href)}
              >
                {step.action}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-white/5 border border-border rounded-2xl p-5 mb-8">
          <p className="text-muted-foreground text-sm font-medium mb-4">Lo que tienes disponible desde hoy:</p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-muted-foreground text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Principal */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-600 text-foreground font-semibold px-10 py-3 rounded-xl text-base"
            onClick={handleStart}
            disabled={markWelcomeShown.isPending}
          >
            {markWelcomeShown.isPending ? "Cargando..." : "Ir a mi panel →"}
          </Button>
          <p className="text-slate-500 text-xs mt-3">
            ¿Tienes dudas? Escríbenos a soporte@kobrapay.mx o escríbenos al <a href="https://wa.me/17869216543" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">+1 (786) 921-6543</a>
          </p>
        </div>
      </div>
    </div>
  );
}
