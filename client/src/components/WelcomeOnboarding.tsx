import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Link2, CreditCard, BarChart3, ArrowRight, CheckCircle2,
  Sparkles, X, ChevronRight
} from "lucide-react";

const LOGO_NAVY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_v2_52d63331.png";

const STEPS = [
  {
    id: 1,
    icon: Link2,
    emoji: "🔗",
    title: "Crea tu primer enlace de pago",
    description: "En menos de 30 segundos puedes crear un enlace personalizado y compartirlo por WhatsApp, correo o redes sociales. Tu cliente paga con tarjeta desde su celular.",
    action: "Crear mi primer link",
    href: "/dashboard/create",
    color: "from-emerald-500 to-teal-500",
    tip: "Tip: Puedes crear links con monto fijo o dejar que el cliente decida cuánto pagar.",
  },
  {
    id: 2,
    icon: CreditCard,
    emoji: "💳",
    title: "Conecta tu cuenta bancaria",
    description: "Para recibir el dinero de tus cobros en tu cuenta bancaria (CLABE), conecta tu cuenta de Stripe. Es gratis y tarda menos de 5 minutos.",
    action: "Conectar mi cuenta",
    href: "/dashboard/connect",
    color: "from-blue-500 to-indigo-500",
    tip: "Tip: Los depósitos se realizan automáticamente cada 2 días hábiles a tu cuenta.",
  },
  {
    id: 3,
    icon: BarChart3,
    emoji: "📊",
    title: "Revisa tus ventas en tiempo real",
    description: "Desde tu panel puedes ver todas tus transacciones, descargar comprobantes, generar reportes mensuales y conocer el historial de cada cliente.",
    action: "Ver mi panel",
    href: "/dashboard",
    color: "from-purple-500 to-violet-500",
    tip: "Tip: Activa las notificaciones para recibir un aviso cada vez que alguien te pague.",
  },
];

interface WelcomeOnboardingProps {
  userName?: string;
}

export default function WelcomeOnboarding({ userName }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation();
  const utils = trpc.useUtils();

  const handleDismiss = async () => {
    setDismissed(true);
    await completeOnboarding.mutateAsync();
    utils.auth.me.invalidate();
  };

  const handleStepAction = (href: string, stepIndex: number) => {
    setCompletedSteps(prev => { const next = new Set(prev); next.add(stepIndex); return next; });
    navigate(href);
  };

  const handleComplete = async () => {
    await completeOnboarding.mutateAsync();
    utils.auth.me.invalidate();
    setDismissed(true);
  };

  if (dismissed) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const allDone = completedSteps.size >= STEPS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg, #0f2744 0%, #0c3b5e 100%)" }}>
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
          <img src={LOGO_NAVY} alt="KobraPay" className="w-14 h-14 object-contain mx-auto mb-3" />
          <h2 className="text-xl font-black text-white">
            ¡Bienvenido{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Sigue estos 3 pasos para empezar a cobrar hoy mismo
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`transition-all rounded-full ${
                  i === currentStep
                    ? "w-6 h-2.5 bg-emerald-400"
                    : completedSteps.has(i)
                    ? "w-2.5 h-2.5 bg-emerald-500/60"
                    : "w-2.5 h-2.5 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Paso {currentStep + 1} de {STEPS.length}
            </span>
            {completedSteps.has(currentStep) && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Completado
              </span>
            )}
          </div>

          {/* Step card */}
          <div className={`bg-gradient-to-br ${step.color} rounded-2xl p-5 text-white mb-5`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <StepIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{step.title}</h3>
                <p className="text-white/85 text-sm mt-2 leading-relaxed">{step.description}</p>
              </div>
            </div>
            <div className="mt-4 bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-white/80">{step.tip}</p>
            </div>
          </div>

          {/* Steps overview */}
          <div className="flex gap-2 mb-5">
            {STEPS.map((s, i) => {
              const SIcon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                    i === currentStep
                      ? "border-gray-300 bg-gray-50"
                      : completedSteps.has(i)
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-100 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    completedSteps.has(i) ? "bg-emerald-500" : i === currentStep ? "bg-gray-800" : "bg-gray-200"
                  }`}>
                    {completedSteps.has(i)
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <SIcon className={`w-4 h-4 ${i === currentStep ? "text-white" : "text-gray-500"}`} />
                    }
                  </div>
                  <span className="text-xs font-medium text-gray-600 text-center leading-tight">{s.emoji}</span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleStepAction(step.href, currentStep)}
              className="flex-1 gap-2 font-semibold"
              style={{ background: "linear-gradient(135deg, #00c896, #0ea5e9)" }}
            >
              {step.action}
              <ArrowRight className="w-4 h-4" />
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(i => i + 1)}
                className="gap-1 text-gray-500 border-gray-200"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleComplete}
                className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                <Sparkles className="w-4 h-4" />
                ¡Listo!
              </Button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Saltar introducción
          </button>
        </div>
      </div>
    </div>
  );
}
