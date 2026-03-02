import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Bot, Sparkles, Users, DollarSign, TrendingUp, UserPlus,
  CheckCircle, Clock, XCircle, Calculator, ChevronRight, Star,
  Building2, Zap, Crown, Rocket
} from "lucide-react";

// ─── Planes disponibles ───────────────────────────────────────────────────────
const PLANS = [
  {
    id: "express",
    name: "Express",
    icon: Zap,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    commission: 3.0,
    description: "Para negocios pequeños que empiezan a cobrar con tarjeta",
    features: ["Links de pago", "Cobros con tarjeta", "Historial de ventas", "Soporte básico"],
    bestFor: "Tiendas, restaurantes, servicios locales",
    minVolume: 0,
    maxVolume: 50000,
  },
  {
    id: "connect",
    name: "Connect",
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    commission: 2.5,
    description: "Para negocios en crecimiento que necesitan Stripe Connect",
    features: ["Todo Express", "Stripe Connect (CLABE)", "Facturas digitales", "Contratos digitales", "Cobros recurrentes"],
    bestFor: "Clínicas, escuelas, gimnasios, e-commerce",
    minVolume: 50000,
    maxVolume: 200000,
  },
  {
    id: "custom",
    name: "Custom",
    icon: Crown,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    commission: 2.0,
    description: "Para empresas medianas con necesidades específicas",
    features: ["Todo Connect", "Comisión negociable", "Módulos a la medida", "Agenda Médica", "Expedientes RH", "Soporte prioritario"],
    bestFor: "Empresas medianas, hospitales, cadenas",
    minVolume: 200000,
    maxVolume: 1000000,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Rocket,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    commission: 1.5,
    description: "Para corporativos con alto volumen de transacciones",
    features: ["Todo Custom", "Integración API completa", "Comisión desde 1.5%", "Gestor de cuenta dedicado", "SLA garantizado"],
    bestFor: "Corporativos, cadenas nacionales, franquicias",
    minVolume: 1000000,
    maxVolume: Infinity,
  },
];

// ─── Simulador de comisiones ──────────────────────────────────────────────────
function CommissionSimulator() {
  const [monthlyVolume, setMonthlyVolume] = useState<number>(50000);
  const [selectedPlan, setSelectedPlan] = useState<string>("connect");

  const plan = PLANS.find(p => p.id === selectedPlan);
  const kobraPayCommission = plan ? (monthlyVolume * (plan.commission / 100)) : 0;
  const associateEarning = monthlyVolume * 0.005; // 0.5% para el asociado
  const clientPays = kobraPayCommission;
  const stripeCommission = monthlyVolume * 0.015;
  const totalClientPays = kobraPayCommission + stripeCommission;

  const recommendedPlan = PLANS.find(p =>
    monthlyVolume >= p.minVolume && monthlyVolume < (p.maxVolume === Infinity ? Infinity : p.maxVolume + 1)
  ) || PLANS[PLANS.length - 1];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-gray-900">Simulador de Comisiones</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Volumen mensual estimado del cliente</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <Input
              type="number"
              value={monthlyVolume}
              onChange={(e) => setMonthlyVolume(Number(e.target.value))}
              className="pl-8"
              placeholder="50000"
            />
          </div>
          <p className="text-xs text-gray-400">MXN por mes</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Plan a ofrecer</Label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANS.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {p.commission}% comisión
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {recommendedPlan.id !== selectedPlan && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Star className="w-3 h-3" />
              Recomendado para este volumen: <strong>{recommendedPlan.name}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Tu comisión mensual</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ${associateEarning.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 mt-1">0.5% del volumen procesado</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">El cliente paga</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            ${totalClientPays.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-600 mt-1">{plan?.commission}% KobraPay + 1.5% Stripe</p>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Ganancias anuales</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            ${(associateEarning * 12).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-purple-600 mt-1">Si el cliente mantiene el volumen</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        * Las comisiones del asociado se pagan mensualmente por KobraPay. El porcentaje puede variar según acuerdo.
      </p>
    </div>
  );
}

// ─── Catálogo de planes ───────────────────────────────────────────────────────
function PlansCatalog() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-gray-600" />
        Catálogo de Planes KobraPay
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div key={plan.id} className={`rounded-2xl border-2 ${plan.border} bg-white p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${plan.bg}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>
                <Badge className={`${plan.bg} ${plan.color} border-0 font-bold text-base px-3 py-1`}>
                  {plan.commission}%
                </Badge>
              </div>

              <div className="space-y-1">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className={`text-xs ${plan.color} font-medium flex items-center gap-1`}>
                <Star className="w-3 h-3" />
                Ideal para: {plan.bestFor}
              </div>

              <div className="text-xs text-gray-400">
                Volumen sugerido: {plan.minVolume === 0 ? "Desde $0" : `$${plan.minVolume.toLocaleString("es-MX")}`}
                {plan.maxVolume !== Infinity ? ` — $${plan.maxVolume.toLocaleString("es-MX")} MXN/mes` : "+ MXN/mes"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Formulario de registro de cliente ───────────────────────────────────────
function RegisterClientModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientBusinessName: "",
    clientPhone: "",
    assignedPlan: "" as "express" | "connect" | "custom" | "enterprise" | "",
    notes: "",
  });

  const registerMutation = trpc.associate.registerClient.useMutation({
    onSuccess: () => {
      toast.success("¡Cliente registrado exitosamente! Se notificó al equipo KobraPay.");
      setOpen(false);
      setForm({ clientName: "", clientEmail: "", clientBusinessName: "", clientPhone: "", assignedPlan: "", notes: "" });
      onSuccess();
    },
    onError: (err) => {
      toast.error("Error al registrar cliente: " + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail) {
      toast.error("Nombre y email son obligatorios");
      return;
    }
    registerMutation.mutate({
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientBusinessName: form.clientBusinessName || undefined,
      clientPhone: form.clientPhone || undefined,
      assignedPlan: (form.assignedPlan as "express" | "connect" | "custom" | "enterprise") || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <UserPlus className="w-4 h-4" />
          Registrar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Registrar Nuevo Cliente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre del contacto *</Label>
              <Input
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                placeholder="Juan García"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.clientEmail}
                onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                placeholder="juan@empresa.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre del negocio</Label>
              <Input
                value={form.clientBusinessName}
                onChange={e => setForm(f => ({ ...f, clientBusinessName: e.target.value }))}
                placeholder="Restaurante El Buen Sabor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.clientPhone}
                onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Plan sugerido</Label>
            <Select
              value={form.assignedPlan}
              onValueChange={v => setForm(f => ({ ...f, assignedPlan: v as "express" | "connect" | "custom" | "enterprise" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan..." />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.commission}% comisión
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notas adicionales</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Información relevante del cliente, acuerdos previos, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Registrando..." : "Registrar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
type TabType = "dashboard" | "clients" | "plans" | "simulator" | "ai";

export default function AssociateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const userRole = (user as Record<string, unknown>)?.role as string | undefined;
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const isAllowed = isSuperAdmin || userRole === "associate";

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: summary, refetch: refetchSummary } = trpc.associate.getCommissionSummary.useQuery(undefined, {
    enabled: isAllowed,
  });
  const { data: rawClients = [], refetch: refetchClients } = trpc.associate.listClients.useQuery(undefined, {
    enabled: isAllowed,
  });
  // Normalizar campos de associateCommissions al formato que usa el componente
  const clients = rawClients.map((c: Record<string, unknown>) => ({
    id: c.id as number,
    clientName: (c.clientName as string) || '',
    clientEmail: (c.clientEmail as string) || '',
    clientBusinessName: c.clientBusinessName as string | undefined,
    clientPhone: c.clientPhone as string | undefined,
    assignedPlan: c.assignedPlan as string | undefined,
    status: (c.status as string) || 'pending',
    notes: c.notes as string | undefined,
    createdAt: c.createdAt as number,
  }));

  const aiMutation = trpc.associate.chat.useMutation({
    onSuccess: (data) => {
      setAiMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      setAiLoading(false);
    },
    onError: () => {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Error al procesar la consulta. Intenta de nuevo." }]);
      setAiLoading(false);
    },
  });

  const handleAiMessage = (content: string) => {
    const newMessages: Message[] = [...aiMessages, { role: "user", content }];
    setAiMessages(newMessages);
    setAiLoading(true);
    aiMutation.mutate({ messages: newMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })) });
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Cuenta de Asociado">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout title="Cuenta de Asociado">
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700">Acceso Restringido</h2>
          <p className="text-gray-500 max-w-sm">Esta sección es exclusiva para Asociados de KobraPay. Contacta al equipo para obtener acceso.</p>
        </div>
      </DashboardLayout>
    );
  }

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Pendiente", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock },
    active: { label: "Activo", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle },
    rejected: { label: "Rechazado", color: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
    inactive: { label: "Inactivo", color: "text-gray-500 bg-gray-50 border-gray-200", icon: XCircle },
  };

  const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Mi Panel", icon: TrendingUp },
    { id: "clients", label: "Mis Clientes", icon: Users },
    { id: "plans", label: "Catálogo de Planes", icon: Building2 },
    { id: "simulator", label: "Simulador", icon: Calculator },
    { id: "ai", label: "Sales Coach IA", icon: Bot },
  ];

  return (
    <DashboardLayout title="Cuenta de Asociado">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Cuenta de Asociado</h1>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1" variant="outline">
                  <Star className="w-3 h-3" />
                  Asociado KobraPay
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Registra clientes, simula comisiones y usa el Sales Coach IA</p>
            </div>
          </div>
          <RegisterClientModal onSuccess={() => { refetchClients(); refetchSummary(); }} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            {/* Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Clientes", value: summary?.totalClients ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
                { label: "Clientes Activos", value: summary?.activeClients ?? 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
                { label: "Pendientes", value: summary?.pendingClients ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
                {
                  label: "Comisiones Ganadas",
                  value: `$${(summary?.totalEarned ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                  icon: DollarSign,
                  color: "text-purple-600 bg-purple-50",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
                  <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Cómo funciona */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-600" />
                ¿Cómo funciona tu Cuenta de Asociado?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Prospecta", desc: "Identifica negocios que necesiten cobrar con tarjeta", icon: Users },
                  { step: "2", title: "Presenta", desc: "Usa el Simulador y el Catálogo para mostrar los beneficios", icon: Building2 },
                  { step: "3", title: "Registra", desc: "Registra al cliente desde tu panel con sus datos", icon: UserPlus },
                  { step: "4", title: "Gana", desc: "Recibe 0.5% de cada transacción que procese tu cliente", icon: DollarSign },
                ].map(({ step, title, desc, icon: Icon }) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {step}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Últimos clientes */}
            {clients.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Últimos Clientes Registrados</h3>
                  <button
                    onClick={() => setActiveTab("clients")}
                    className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Ver todos <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {clients.slice(0, 3).map(client => {
                    const cfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{client.clientName}</p>
                          <p className="text-xs text-gray-500">{client.clientBusinessName || client.clientEmail}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Clientes */}
        {activeTab === "clients" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                Mis Clientes Registrados
              </h2>
              <RegisterClientModal onSuccess={() => { refetchClients(); refetchSummary(); }} />
            </div>
            {clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <Users className="w-12 h-12 text-gray-200" />
                <p className="text-gray-500 font-medium">Aún no has registrado clientes</p>
                <p className="text-gray-400 text-sm max-w-xs">
                  Usa el botón "Registrar Cliente" para agregar tus primeros prospectos y empezar a ganar comisiones.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {clients.map(client => {
                  const cfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const plan = PLANS.find(p => p.id === client.assignedPlan);
                  return (
                    <div key={client.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">{client.clientName}</p>
                            {plan && (
                              <Badge variant="outline" className={`text-xs ${plan.bg} ${plan.color} border-0`}>
                                {plan.name}
                              </Badge>
                            )}
                          </div>
                          {client.clientBusinessName && (
                            <p className="text-sm text-gray-600">{client.clientBusinessName}</p>
                          )}
                          <p className="text-xs text-gray-400">{client.clientEmail}</p>
                          {client.notes && (
                            <p className="text-xs text-gray-400 italic">"{client.notes}"</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                          <p className="text-xs text-gray-400">
                            {new Date(client.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Planes */}
        {activeTab === "plans" && <PlansCatalog />}

        {/* Tab: Simulador */}
        {activeTab === "simulator" && <CommissionSimulator />}

        {/* Tab: IA Sales Coach */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">Sales Coach IA</h2>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1" variant="outline">
                    <Sparkles className="w-3 h-3" />
                    Exclusivo Asociados
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">Tu coach de ventas personal para cerrar más clientes</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <AIChatBox
                messages={aiMessages}
                onSendMessage={handleAiMessage}
                isLoading={aiLoading}
                height={500}
                placeholder="Pregúntame cómo vender KobraPay, manejar objeciones, calcular comisiones..."
                emptyStateMessage="¡Hola! Soy tu Sales Coach de KobraPay. Puedo ayudarte a prospectar clientes, manejar objeciones, calcular cuánto ganarás y redactar mensajes de venta efectivos."
                suggestedPrompts={[
                  "¿Cómo le presento KobraPay a un dueño de restaurante?",
                  "Un cliente me dice que ya usa Clip, ¿cómo lo convenzo?",
                  "¿Cuánto ganaría si tengo 5 clientes que procesan $50K cada uno?",
                  "Redáctame un mensaje de WhatsApp para prospectar una clínica",
                  "¿Qué plan le recomiendo a una escuela de idiomas?",
                  "¿Cómo manejo la objeción de que KobraPay es muy caro?",
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
