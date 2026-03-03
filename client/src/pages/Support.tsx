import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, Send, Ticket, MessageSquare, Star, Lightbulb, Bug, Gift,
  CheckCircle, Clock, AlertCircle, XCircle, Plus, ChevronDown, ChevronRight,
  HeartHandshake, Sparkles, RefreshCw, User,
} from "lucide-react";

type Tab = "ai" | "ticket" | "feedback" | "my_tickets";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Chat de soporte IA ───────────────────────────────────────────────────────
function AISupportChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy el asistente de soporte técnico de KobraPay. ¿En qué te puedo ayudar hoy? Puedo ayudarte a resolver problemas con la plataforma, explicar cómo usar los módulos o guiarte paso a paso.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const aiMutation = trpc.support.aiSupport.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await aiMutation.mutateAsync({ messages: history });
      setMessages(prev => [...prev, { role: "assistant", content: res.message }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, hubo un error. Por favor intenta de nuevo o crea un ticket de soporte." }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    "¿Cómo creo un enlace de pago?",
    "¿Cuándo recibo mi dinero?",
    "El cliente no puede pagar, ¿qué hago?",
    "¿Cómo activo las facturas?",
    "¿Cómo agrego a mi equipo?",
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Asistente de Soporte KobraPay</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">En línea · Respuesta inmediata</span>
          </div>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 gap-1" variant="outline">
          <Sparkles className="w-3 h-3" />
          IA
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "assistant" ? "bg-emerald-100" : "bg-gray-100"
            }`}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4 text-emerald-600" /> : <User className="w-4 h-4 text-gray-600" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-emerald-600 text-white rounded-tr-sm"
                : "bg-gray-100 text-gray-800 rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setInput(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Escribe tu pregunta..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario de ticket ─────────────────────────────────────────────────────
function TicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    category: "" as "technical" | "billing" | "feature" | "bug" | "other" | "",
    subject: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const createMutation = trpc.support.createTicket.useMutation({
    onSuccess: () => {
      toast.success("Ticket enviado correctamente. Te responderemos pronto.");
      setForm({ category: "", subject: "", description: "", priority: "medium" });
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.subject || !form.description) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    createMutation.mutate({
      category: form.category as "technical" | "billing" | "feature" | "bug" | "other",
      subject: form.subject,
      description: form.description,
      priority: form.priority,
    });
  };

  const CATEGORIES = [
    { value: "technical", label: "Problema técnico" },
    { value: "billing", label: "Facturación / Pagos" },
    { value: "feature", label: "Solicitud de función" },
    { value: "bug", label: "Reporte de error" },
    { value: "other", label: "Otro" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Ticket className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-gray-900">Crear Ticket de Soporte</h3>
      </div>
      <p className="text-sm text-gray-500">Si el asistente IA no pudo resolver tu problema, crea un ticket y nuestro equipo te atenderá.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoría *</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as typeof form.category }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as typeof form.priority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Asunto *</Label>
          <Input
            value={form.subject}
            onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="Describe brevemente el problema"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descripción detallada *</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Describe el problema con el mayor detalle posible: qué estabas haciendo, qué error apareció, cuándo ocurrió..."
            rows={5}
          />
        </div>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full"
        >
          {createMutation.isPending ? "Enviando..." : "Enviar Ticket"}
        </Button>
      </form>
    </div>
  );
}

// ─── Buzón de sugerencias ─────────────────────────────────────────────────────
function FeedbackForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    type: "" as "suggestion" | "bug" | "feature_request" | "compliment" | "other" | "",
    subject: "",
    message: "",
    rating: 0,
  });

  const sendMutation = trpc.feedback.send.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu mensaje! Lo revisaremos pronto.");
      setForm({ type: "", subject: "", message: "", rating: 0 });
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.subject || !form.message) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    sendMutation.mutate({
      type: form.type as "suggestion" | "bug" | "feature_request" | "compliment" | "other",
      subject: form.subject,
      message: form.message,
      rating: form.rating > 0 ? form.rating : undefined,
    });
  };

  const TYPES = [
    { value: "suggestion", label: "Sugerencia de mejora", icon: Lightbulb },
    { value: "feature_request", label: "Solicitar nueva función", icon: Plus },
    { value: "bug", label: "Reportar error", icon: Bug },
    { value: "compliment", label: "Felicitación / Elogio", icon: Gift },
    { value: "other", label: "Otro", icon: MessageSquare },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-gray-900">Buzón de Sugerencias</h3>
      </div>
      <p className="text-sm text-gray-500">Tu opinión nos ayuda a mejorar KobraPay. Comparte sugerencias, reporta errores o solicita nuevas funciones.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div className="space-y-2">
          <Label>Tipo de mensaje *</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: t.value as typeof form.type }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-sm ${
                    form.type === t.value
                      ? "bg-purple-50 border-purple-300 text-purple-800"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${form.type === t.value ? "text-purple-600" : "text-gray-400"}`} />
                  <span className="font-medium text-xs">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calificación */}
        <div className="space-y-2">
          <Label>¿Cómo calificarías KobraPay? (opcional)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setForm(p => ({ ...p, rating: p.rating === n ? 0 : n }))}
                className={`w-10 h-10 rounded-xl border-2 transition-all font-bold text-sm ${
                  form.rating >= n
                    ? "bg-amber-400 border-amber-400 text-white"
                    : "bg-gray-50 border-gray-200 text-gray-400 hover:border-amber-200"
                }`}
              >
                <Star className={`w-4 h-4 mx-auto ${form.rating >= n ? "fill-white" : ""}`} />
              </button>
            ))}
            {form.rating > 0 && (
              <span className="text-sm text-gray-500 self-center ml-1">{form.rating}/5</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Asunto *</Label>
          <Input
            value={form.subject}
            onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="Ej: Agregar exportación a Excel en ventas"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mensaje *</Label>
          <Textarea
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder="Describe tu sugerencia, problema o comentario con el mayor detalle posible..."
            rows={5}
          />
        </div>
        <Button
          type="submit"
          disabled={sendMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white w-full"
        >
          {sendMutation.isPending ? "Enviando..." : "Enviar mensaje"}
        </Button>
      </form>
    </div>
  );
}

// ─── Mis tickets ──────────────────────────────────────────────────────────────
function MyTickets() {
  const { data: tickets = [], isLoading, refetch } = trpc.support.getMyTickets.useQuery();
  const [expanded, setExpanded] = useState<number | null>(null);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    open: { label: "Abierto", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Clock },
    in_progress: { label: "En proceso", color: "text-amber-600 bg-amber-50 border-amber-200", icon: RefreshCw },
    resolved: { label: "Resuelto", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle },
    closed: { label: "Cerrado", color: "text-gray-500 bg-gray-50 border-gray-200", icon: XCircle },
  };

  const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: "Baja", color: "text-gray-500" },
    medium: { label: "Media", color: "text-amber-600" },
    high: { label: "Alta", color: "text-red-600" },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No tienes tickets de soporte</p>
        <p className="text-sm text-gray-400 mt-1">Cuando crees un ticket, aparecerá aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Mis Tickets ({tickets.length})</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
        </Button>
      </div>
      {tickets.map(ticket => {
        const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
        const StatusIcon = status.icon;
        const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
        const isExpanded = expanded === ticket.id;
        return (
          <div key={ticket.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : ticket.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <StatusIcon className={`w-5 h-5 flex-shrink-0 ${status.color.split(" ")[0]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 text-sm truncate">{ticket.subject}</p>
                  <Badge className={`text-xs border ${status.color}`} variant="outline">{status.label}</Badge>
                  <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(ticket.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tu descripción</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </div>
                {ticket.resolution && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Respuesta del equipo</p>
                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">{ticket.resolution}</p>
                    {ticket.resolvedAt && (
                      <p className="text-xs text-emerald-500 mt-1">
                        Resuelto el {new Date(ticket.resolvedAt).toLocaleDateString("es-MX")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Support() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("ai");

  const TABS = [
    { id: "ai" as Tab, label: "Asistente IA", icon: Bot, color: "emerald" },
    { id: "ticket" as Tab, label: "Crear Ticket", icon: Ticket, color: "blue" },
    { id: "feedback" as Tab, label: "Sugerencias", icon: HeartHandshake, color: "purple" },
    { id: "my_tickets" as Tab, label: "Mis Tickets", icon: MessageSquare, color: "gray" },
  ];

  const TAB_COLORS: Record<string, string> = {
    emerald: "bg-emerald-600 text-white",
    blue: "bg-blue-600 text-white",
    purple: "bg-purple-600 text-white",
    gray: "bg-gray-700 text-white",
  };

  if (!user) return null;

  return (
    <DashboardLayout title="Soporte">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Centro de Soporte</h1>
            <p className="text-sm text-gray-500">Asistente IA, tickets y buzón de sugerencias</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? TAB_COLORS[tab.color]
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "ai" && <AISupportChat />}
        {activeTab === "ticket" && <TicketForm onSuccess={() => setActiveTab("my_tickets")} />}
        {activeTab === "feedback" && <FeedbackForm onSuccess={() => {}} />}
        {activeTab === "my_tickets" && <MyTickets />}

        {/* Info */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-500">
            <strong className="text-gray-700">Horario de atención humana:</strong> Lunes a Viernes 9am–6pm (hora CDMX).
            El asistente IA está disponible las 24 horas. Para urgencias escríbenos a{" "}
            <a href="mailto:soporte@kobrapay.mx" className="text-emerald-600 hover:underline">soporte@kobrapay.mx</a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
