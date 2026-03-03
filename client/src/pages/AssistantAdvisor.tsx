import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, ClipboardList, Users, MessageSquare, FileCheck } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "¿Cómo le explico a un cliente nuevo cómo funciona KobraPay?",
  "Un cliente pregunta por qué su pago aparece como pendiente, ¿qué le digo?",
  "¿Cuáles son los documentos que necesita un cliente para activar su cuenta?",
  "Redáctame un email de bienvenida para un cliente que acaba de ser aprobado",
  "¿Qué plan le conviene a un restaurante que cobra $30,000 MXN al mes?",
  "¿Cómo funciona Stripe Connect y qué necesita el cliente para configurarlo?",
];

const QUICK_ACTIONS = [
  {
    icon: Users,
    label: "Gestión de clientes",
    color: "text-violet-600 bg-violet-50",
    prompt: "¿Cómo gestiono eficientemente a los clientes en KobraPay? Dame un flujo de trabajo recomendado para el equipo de asistentes.",
  },
  {
    icon: ClipboardList,
    label: "Revisar encuestas",
    color: "text-emerald-600 bg-emerald-50",
    prompt: "¿Qué criterios debo usar para revisar y pre-aprobar las encuestas de onboarding de nuevos clientes? ¿Qué señales de alerta debo buscar?",
  },
  {
    icon: MessageSquare,
    label: "Redactar comunicados",
    color: "text-blue-600 bg-blue-50",
    prompt: "Redáctame un email de bienvenida profesional para un nuevo cliente que acaba de ser aprobado en KobraPay.",
  },
  {
    icon: FileCheck,
    label: "Asignar planes",
    color: "text-amber-600 bg-amber-50",
    prompt: "¿Cómo decido qué plan de KobraPay asignar a un cliente? Explícame las diferencias entre los planes Express, Connect, Custom y Enterprise.",
  },
];

export default function AssistantAdvisor() {
  const { user, loading: authLoading } = useAuth();
  const userRole = (user as Record<string, unknown>)?.role as string | undefined;
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const isAllowed = isSuperAdmin || userRole === "assistant";

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.assistantAdvisor.chat.useMutation({
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
      <DashboardLayout title="KobraPay Advisor — Asistente">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout title="KobraPay Advisor — Asistente">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Bot className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Esta sección es exclusiva para el equipo de asistentes de KobraPay.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="KobraPay Advisor — Asistente">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">KobraPay Advisor</h1>
                <Badge className="bg-violet-100 text-violet-700 border-violet-200 gap-1" variant="outline">
                  <Sparkles className="w-3 h-3" />
                  Equipo Interno
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Asistente de IA para el equipo de soporte y gestión de clientes</p>
            </div>
          </div>
        </div>

        {/* Capacidades rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ icon: Icon, label, color, prompt }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:bg-gray-50 hover:border-violet-200 hover:shadow-sm transition-all text-left w-full"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
            >
              <div className={`p-1.5 rounded-lg ${color} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
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
            placeholder="Pregúntame sobre clientes, planes, comunicados, procesos..."
            emptyStateMessage="¡Hola! Soy tu asistente de IA para KobraPay. Puedo ayudarte a gestionar clientes, redactar comunicaciones, revisar encuestas de onboarding y asignar planes."
            suggestedPrompts={SUGGESTED_PROMPTS}
          />
        </div>

        <p className="text-xs text-gray-400 text-center">
          🔒 Esta conversación es privada y solo el equipo interno puede acceder a esta sección.
        </p>
      </div>
    </DashboardLayout>
  );
}
