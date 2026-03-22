import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, CreditCard, AlertCircle, Wifi, Code2, HelpCircle, Zap,
  RefreshCw, TrendingUp, AlertTriangle, Link2, Receipt,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    icon: CreditCard,
    label: "Pago rechazado",
    color: "text-red-400 bg-red-500/10",
    prompt: "El pago de mi cliente fue rechazado. ¿Cuáles son las causas más comunes y cómo lo resuelvo?",
  },
  {
    icon: Wifi,
    label: "Integración API",
    color: "text-blue-400 bg-blue-500/10",
    prompt: "¿Cómo integro KobraPay con mi sistema o tienda en línea usando la API?",
  },
  {
    icon: AlertCircle,
    label: "Contracargo",
    color: "text-orange-400 bg-orange-500/10",
    prompt: "Tengo un contracargo (chargeback) en mi cuenta. ¿Qué debo hacer y cómo lo disputo?",
  },
  {
    icon: Code2,
    label: "Webhook no llega",
    color: "text-violet-400 bg-violet-500/10",
    prompt: "Mi webhook no está recibiendo notificaciones de pago. ¿Cómo lo diagnostico y corrijo?",
  },
  {
    icon: RefreshCw,
    label: "Cobro recurrente",
    color: "text-cyan-400 bg-cyan-500/10",
    prompt: "¿Cómo configuro un cobro recurrente o suscripción mensual para mis clientes?",
  },
  {
    icon: Receipt,
    label: "Facturación CFDI",
    color: "text-emerald-400 bg-emerald-500/10",
    prompt: "¿Cómo genero facturas CFDI para mis clientes? ¿Qué datos necesito?",
  },
  {
    icon: TrendingUp,
    label: "Mis ventas",
    color: "text-amber-400 bg-amber-500/10",
    prompt: "¿Cómo veo un reporte detallado de mis ventas y exporto en CSV?",
  },
  {
    icon: Link2,
    label: "Crear link de pago",
    color: "text-pink-400 bg-pink-500/10",
    prompt: "¿Cómo creo un link de pago personalizado con QR y lo comparto por WhatsApp?",
  },
];

export default function AISupport() {
  const { loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Contexto dinámico del comerciante
  const { data: merchantCtx } = trpc.aiAssistant.merchantSupport.getMerchantContext.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

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
      context: merchantCtx?.businessName
        ? { businessName: merchantCtx.businessName, businessType: merchantCtx.businessType || undefined }
        : undefined,
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
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Soporte IA
                  {merchantCtx?.businessName && (
                    <span className="text-muted-foreground font-normal text-lg ml-2">
                      — {merchantCtx.businessName}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">Asistente inteligente especializado en KobraPay</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
              <Zap className="w-3 h-3" />
              Powered by ContentAI
            </Badge>
            {merchantCtx && merchantCtx.pendingChargebacks > 0 && (
              <Badge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/10 gap-1">
                <AlertTriangle className="w-3 h-3" />
                {merchantCtx.pendingChargebacks} contracargo{merchantCtx.pendingChargebacks > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Contexto del comerciante */}
        {merchantCtx && (merchantCtx.totalLinks > 0 || merchantCtx.totalTx > 0) && messages.length === 0 && (
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Tu cuenta en resumen</p>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-2xl font-bold text-foreground">{merchantCtx.totalLinks}</span>
                <span className="text-muted-foreground ml-1.5">links creados</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">{merchantCtx.totalTx}</span>
                <span className="text-muted-foreground ml-1.5">transacciones</span>
              </div>
              {merchantCtx.businessType && (
                <div className="hidden md:block">
                  <Badge variant="outline" className="text-xs capitalize">{merchantCtx.businessType}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        {messages.length === 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Preguntas frecuentes</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSendMessage(action.prompt)}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-center group"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Escribe tu pregunta sobre pagos, integraciones, rechazos..."
            suggestedPrompts={
              messages.length === 0
                ? [
                    "¿Por qué fue rechazado el pago de mi cliente?",
                    "¿Cómo integro KobraPay con mi tienda en línea?",
                    "¿Cuándo me depositan mis cobros?",
                    "¿Cómo cancelo una suscripción recurrente?",
                  ]
                : []
            }
            emptyStateMessage={
              merchantCtx?.businessName
                ? `Hola, soy KobraBot 🐍 Tu asistente de soporte para ${merchantCtx.businessName}. Pregúntame sobre rechazos, integraciones, SPEI, OXXO, contracargos o cualquier duda técnica.`
                : "Soy KobraBot 🐍, tu asistente de soporte especializado en pagos digitales. Pregúntame sobre rechazos, integraciones, SPEI, OXXO, contracargos o cualquier duda técnica."
            }
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
