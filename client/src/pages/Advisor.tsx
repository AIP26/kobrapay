import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, TrendingUp, Users, DollarSign, Lightbulb } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Tengo un cliente que procesa $80,000 MXN al mes, ¿qué % le ofrezco y cuánto gano yo?",
  "¿Cómo le explico a un cliente por qué KobraPay es mejor que Clip?",
  "Un cliente me dice que Mercado Pago le cobra menos, ¿cómo negocio?",
  "¿Cuánto ganaría KobraPay si tengo 10 clientes que procesan $50K cada uno?",
  "Redáctame un mensaje de WhatsApp para ofrecerle KobraPay a un restaurante",
  "¿Qué ventajas tiene Stripe Connect para mis clientes?",
];

export default function Advisor() {
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.advisor.chat.useMutation({
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
        { role: "assistant", content: "Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo." },
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
      <DashboardLayout title="KobraPay Advisor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="KobraPay Advisor">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Bot className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Esta sección es exclusiva para el administrador de KobraPay.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="KobraPay Advisor">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">KobraPay Advisor</h1>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1" variant="outline">
                  <Sparkles className="w-3 h-3" />
                  IA Privada
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Tu asesor estratégico personal — solo visible para ti</p>
            </div>
          </div>
        </div>

        {/* Capacidades rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, label: "Calcular comisiones", color: "text-emerald-600 bg-emerald-50" },
            { icon: TrendingUp, label: "Estrategia de precios", color: "text-cyan-600 bg-cyan-50" },
            { icon: Users, label: "Negociar con clientes", color: "text-violet-600 bg-violet-50" },
            { icon: Lightbulb, label: "Ideas de ventas", color: "text-amber-600 bg-amber-50" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-white">
              <div className={`p-1.5 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            height={520}
            placeholder="Pregúntame sobre precios, clientes, estrategias, cálculos..."
            emptyStateMessage="¡Hola! Soy tu asesor estratégico de KobraPay. Puedo ayudarte a negociar con clientes, calcular comisiones, comparar precios con la competencia y mucho más."
            suggestedPrompts={SUGGESTED_PROMPTS}
          />
        </div>

        {/* Nota de privacidad */}
        <p className="text-xs text-gray-400 text-center">
          🔒 Esta conversación es privada y solo tú puedes verla. El Advisor conoce todos los detalles de KobraPay, precios y competencia.
        </p>
      </div>
    </DashboardLayout>
  );
}
