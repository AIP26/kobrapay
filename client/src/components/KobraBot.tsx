import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Streamdown } from "streamdown";
import { MessageCircle, X, Send, Loader2, Sparkles, ChevronDown } from "lucide-react";

const LOGO_NAVY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_BY_ROLE: Record<string, string[]> = {
  superadmin: ["¿Cuánto ganaría KobraPay con 100 clientes de $50K/mes?", "¿Cómo configuro una comisión personalizada?", "Dame estrategias para conseguir más clientes"],
  admin: ["¿Cómo apruebo un cliente nuevo?", "¿Cómo veo el reporte mensual?", "¿Cómo configuro los módulos de un usuario?"],
  assistant: ["¿Cómo reviso las solicitudes pendientes?", "¿Qué información necesito para aprobar un prospecto?"],
  associate: ["¿Cómo registro un nuevo cliente?", "¿Cómo funciona mi comisión escalonada?", "¿Cómo presento los planes a un prospecto?"],
  employee: ["¿Cómo creo un enlace de pago?", "¿Cómo hago una transferencia?", "¿Cómo descargo un comprobante?"],
  user: ["¿Cómo creo un enlace de pago?", "¿Cómo hago una transferencia?", "¿Cómo veo mis ventas del mes?"],
};

export default function KobraBot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.help.chat.useMutation();
  const role = (user as { role?: string })?.role || "user";
  const suggested = SUGGESTED_BY_ROLE[role] || SUGGESTED_BY_ROLE["user"];

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const res = await chatMutation.mutateAsync({
        messages: newMessages,
        userRole: role,
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.message }]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, hubo un error. Por favor intenta de nuevo o contacta al soporte." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #00c896 0%, #0ea5e9 100%)" }}
        aria-label="Abrir KobraBot"
      >
        {open ? (
          <X className="w-6 h-6 text-foreground" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-foreground" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-foreground text-xs rounded-full flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Panel del chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] flex flex-col rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 text-foreground" style={{ background: "linear-gradient(135deg, #0f2744 0%, #0c3b5e 100%)" }}>
            <img src={LOGO_NAVY} alt="KobraBot" className="w-9 h-9 object-contain rounded-lg" />
            <div className="flex-1">
              <p className="font-bold text-sm">KobraBot</p>
              <p className="text-xs text-cyan-300">Asistente inteligente · siempre disponible</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
              <ChevronDown className="w-5 h-5 text-foreground/70" />
            </button>
          </div>

          {/* Mensajes */}
          <ScrollArea className="flex-1 px-4 py-3" style={{ maxHeight: "380px" }}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #00c896, #0ea5e9)" }}>
                    <Sparkles className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-foreground max-w-[260px]">
                    ¡Hola! Soy KobraBot 👋 Estoy aquí para ayudarte con cualquier duda sobre KobraPay. ¿En qué puedo ayudarte?
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Sugerencias rápidas:</p>
                  {suggested.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50 text-muted-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #00c896, #0ea5e9)" }}>
                        <Sparkles className="w-4 h-4 text-foreground" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm max-w-[260px] ${
                        msg.role === "user"
                          ? "text-foreground rounded-tr-sm"
                          : "bg-gray-100 text-foreground rounded-tl-sm"
                      }`}
                      style={msg.role === "user" ? { background: "linear-gradient(135deg, #00c896, #0ea5e9)" } : {}}
                    >
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #00c896, #0ea5e9)" }}>
                      <Sparkles className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              className="resize-none text-sm min-h-[40px] max-h-[100px] rounded-xl border-gray-200 focus:border-cyan-400"
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="h-10 w-10 p-0 rounded-xl shrink-0"
              style={{ background: "linear-gradient(135deg, #00c896, #0ea5e9)" }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
