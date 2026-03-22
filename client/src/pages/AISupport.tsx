import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CreditCard, AlertCircle, Wifi, Code2, HelpCircle, Zap } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "¿Por qué fue rechazado el pago de mi cliente?",
  "¿Cómo integro KobraPay con mi tienda en línea?",
  "¿Cuándo me depositan mis cobros?",
  "Un cliente pagó pero no aparece en mi historial, ¿qué hago?",
  "¿Cómo cancelo una suscripción recurrente?",
  "¿Qué métodos de pago acepta KobraPay?",
];

const QUICK_ACTIONS = [
  {
    icon: CreditCard,
    label: "Pago rechazado",
    color: "text-red-600 bg-red-50",
    prompt: "El pago de mi cliente fue rechazado. ¿Cuáles son las causas más comunes y cómo lo resuelvo?",
  },
  {
    icon: Wifi,
    label: "Integración API",
    color: "text-blue-600 bg-blue-50",
    prompt: "¿Cómo integro KobraPay con mi sistema o tienda en línea usando la API?",
  },
  {
    icon: AlertCircle,
    label: "Contracargo",
    color: "text-orange-600 bg-orange-50",
    prompt: "Tengo un contracargo (chargeback) en mi cuenta. ¿Qué debo hacer y cómo lo disputo?",
  },
  {
    icon: Code2,
    label: "Webhook no llega",
    color: "text-violet-600 bg-violet-50",
    prompt: "Mi webhook no está recibiendo notificaciones de pago. ¿Cómo lo diagnostico y corrijo?",
  },
];

export default function AISupport() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.aiAssistant.merchantSupport.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      setIsLoading(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo o contacta a soporte@kobrapay.mx",
        },
      ]);
      setIsLoading(false);
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(newMessages);
    setIsLoading(true);
    chatMutation.mutate({
      messages: newMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Soporte IA</h1>
                <p className="text-sm text-muted-foreground">Asistente inteligente de KobraPay</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <Zap className="w-3 h-3 mr-1" />
              Powered by ContentAI
            </Badge>
            <Badge variant="outline" className="text-xs">
              Respuesta en segundos
            </Badge>
          </div>
        </div>

        {/* Acciones rápidas */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSendMessage(action.prompt)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-center group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chat */}
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Escribe tu pregunta sobre pagos, integraciones, rechazos..."
            suggestedPrompts={messages.length === 0 ? SUGGESTED_PROMPTS : []}
            emptyStateMessage="Soy KobraSupport, tu asistente de soporte especializado en pagos digitales. Pregúntame sobre rechazos, integraciones, SPEI, OXXO, contracargos o cualquier duda técnica."
          />
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Para soporte humano urgente escribe a <strong>soporte@kobrapay.mx</strong> o llama al <strong>800-KOBRAPAY</strong></span>
        </div>
      </div>
    </DashboardLayout>
  );
}
