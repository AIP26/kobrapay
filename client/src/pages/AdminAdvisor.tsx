import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, TrendingUp, BarChart3, Shield, Lightbulb } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "¿Cómo puedo reducir los contracargos en mi negocio?",
  "¿Qué estrategias me recomiendas para aumentar mis ventas con KobraPay?",
  "¿Cómo puedo mejorar el flujo de caja de mi negocio?",
  "¿Qué módulos de KobraPay me convienen más para un negocio de servicios?",
  "¿Cómo puedo usar las facturas digitales para deducir impuestos?",
  "Dame consejos para fidelizar a mis clientes y que regresen a comprar",
];

const QUICK_ACTIONS = [
  {
    icon: TrendingUp,
    label: "Estrategias de crecimiento",
    color: "text-blue-600 bg-blue-50",
    prompt: "¿Qué estrategias de crecimiento me recomiendas para aumentar mis ventas y volumen de transacciones con KobraPay este mes?",
  },
  {
    icon: BarChart3,
    label: "Análisis financiero",
    color: "text-indigo-600 bg-indigo-50",
    prompt: "Ayúdame a analizar mis finanzas: ¿cómo puedo mejorar el flujo de caja y reducir costos operativos en mi negocio?",
  },
  {
    icon: Shield,
    label: "Reducir contracargos",
    color: "text-emerald-600 bg-emerald-50",
    prompt: "¿Cómo puedo reducir los contracargos en mi negocio? Dame estrategias prácticas y mejores prácticas.",
  },
  {
    icon: Lightbulb,
    label: "Optimizar operaciones",
    color: "text-amber-600 bg-amber-50",
    prompt: "¿Cómo puedo optimizar las operaciones de mi negocio usando los módulos de KobraPay? ¿Qué funcionalidades debería aprovechar más?",
  },
];

export default function AdminAdvisor() {
  const { user, loading: authLoading } = useAuth();
  const userRole = (user as Record<string, unknown>)?.role as string | undefined;
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const isAllowed = isSuperAdmin || userRole === "admin";

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.adminAdvisor.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setIsLoading(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo." },
      ]);
      setIsLoading(false);
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setIsLoading(true);
    chatMutation.mutate({
      messages: newMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Business Advisor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout title="Business Advisor">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Bot className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Esta sección es exclusiva para administradores de KobraPay.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Business Advisor">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Business Advisor</h1>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
                  <Sparkles className="w-3 h-3" />
                  Consultoría IA
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Tu consultor de negocios personal — estrategias, finanzas y crecimiento</p>
            </div>
          </div>
        </div>

        {/* Capacidades rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ icon: Icon, label, color, prompt }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm transition-all text-left w-full"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
            >
              <div className={`p-1.5 rounded-lg ${color} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            height={520}
            placeholder="Pregúntame sobre tu negocio, estrategias, finanzas, módulos de KobraPay..."
            emptyStateMessage="¡Hola! Soy tu consultor de negocios de KobraPay. Puedo ayudarte con estrategias de crecimiento, gestión financiera, reducción de contracargos, y cómo aprovechar al máximo los módulos de la plataforma."
            suggestedPrompts={SUGGESTED_PROMPTS}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          💼 Este consultor de IA está especializado en negocios mexicanos y en el uso óptimo de KobraPay.
        </p>
      </div>
    </DashboardLayout>
  );
}
