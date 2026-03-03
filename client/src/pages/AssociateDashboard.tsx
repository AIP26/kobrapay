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
  const [customAssociateRate, setCustomAssociateRate] = useState<string>("");
  const plan = PLANS.find(p => p.id === selectedPlan);
  const kobraPayCommission = plan ? (monthlyVolume * (plan.commission / 100)) : 0;
  const associateRate = customAssociateRate ? parseFloat(customAssociateRate) : 0.5;
  const associateEarning = monthlyVolume * (associateRate / 100);
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

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Recomendado: <strong>{recommendedPlan.name}</strong>
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Mi % de comisión acordada</Label>
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={customAssociateRate}
              onChange={(e) => setCustomAssociateRate(e.target.value)}
              className="pr-8"
              placeholder="0.5"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
          <p className="text-xs text-gray-400">Por defecto: 0.5% (deja vacío)</p>
        </div>
      </div>

      {/* Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Tu comisión mensual</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ${associateEarning.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 mt-1">{associateRate}% del volumen procesado</p>
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

// ─── Constructor de plan personalizado ──────────────────────────────────────
function CustomPlanBuilder() {
  const [plan, setPlan] = useState({
    name: "",
    clientType: "",
    monthlyVolume: "",
    commissionRate: "",
    paymentCycle: "monthly",
    features: [] as string[],
    notes: "",
  });
  const [newFeature, setNewFeature] = useState("");
  const [saved, setSaved] = useState(false);

  const BASE_FEATURES = [
    "Links de pago", "Cobros con tarjeta", "Historial de ventas",
    "Stripe Connect (CLABE)", "Facturas digitales", "Contratos digitales",
    "Cobros recurrentes", "Agenda Médica", "Expedientes RH",
    "Soporte prioritario", "Gestor de cuenta dedicado", "API completa",
  ];

  const toggleFeature = (f: string) => {
    setPlan(p => ({
      ...p,
      features: p.features.includes(f) ? p.features.filter(x => x !== f) : [...p.features, f],
    }));
  };

  const addCustomFeature = () => {
    if (newFeature.trim()) {
      setPlan(p => ({ ...p, features: [...p.features, newFeature.trim()] }));
      setNewFeature("");
    }
  };

  const handleSave = () => {
    if (!plan.name) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const volume = parseFloat(plan.monthlyVolume) || 0;
  const rate = parseFloat(plan.commissionRate) || 0;
  const clientPays = volume * (rate / 100);
  const associateEarning = volume * 0.005;
  const CYCLE_LABELS: Record<string, string> = {
    weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual", custom: "Personalizado"
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-purple-600" />
        <h2 className="text-lg font-bold text-gray-900">Crear Plan Personalizado</h2>
        <Badge className="bg-purple-100 text-purple-700 border-purple-200" variant="outline">Para tu cliente</Badge>
      </div>
      <p className="text-sm text-gray-500">Diseña un plan a la medida de tu cliente. Selecciona los módulos, define la comisión y el ciclo de pago.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Columna izquierda: datos del plan */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos del plan</p>
            <div className="space-y-1.5">
              <Label className="text-sm">Nombre del plan</Label>
              <Input value={plan.name} onChange={e => setPlan(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Plan Clínica Premium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de cliente / industria</Label>
              <Input value={plan.clientType} onChange={e => setPlan(p => ({ ...p, clientType: e.target.value }))} placeholder="Ej: Clínica dental, Gimnasio, E-commerce" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Volumen mensual estimado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input type="number" value={plan.monthlyVolume} onChange={e => setPlan(p => ({ ...p, monthlyVolume: e.target.value }))} className="pl-7" placeholder="100000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Comisión acordada (%)</Label>
                <div className="relative">
                  <Input type="number" step="0.1" min="0" max="10" value={plan.commissionRate} onChange={e => setPlan(p => ({ ...p, commissionRate: e.target.value }))} className="pr-8" placeholder="2.5" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Ciclo de pago de comisiones</Label>
              <Select value={plan.paymentCycle} onValueChange={v => setPlan(p => ({ ...p, paymentCycle: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quincenal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Notas / condiciones especiales</Label>
              <Textarea value={plan.notes} onChange={e => setPlan(p => ({ ...p, notes: e.target.value }))} placeholder="Condiciones especiales, descuentos, etc." rows={2} />
            </div>
          </div>

          {/* Proyección financiera */}
          {volume > 0 && rate > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Proyección financiera</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">El cliente paga</p>
                  <p className="text-lg font-bold text-gray-800">${clientPays.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-gray-400">al mes ({rate}%)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tu comisión est.</p>
                  <p className="text-lg font-bold text-emerald-700">${associateEarning.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-gray-400">al mes (0.5%)</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Ciclo de pago: {CYCLE_LABELS[plan.paymentCycle]}</p>
            </div>
          )}
        </div>

        {/* Columna derecha: módulos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Módulos incluidos</p>
          <div className="grid grid-cols-1 gap-2">
            {BASE_FEATURES.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFeature(f)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  plan.features.includes(f)
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200"
                }`}
              >
                <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.features.includes(f) ? "text-emerald-500" : "text-gray-300"}`} />
                <span className="text-xs font-medium">{f}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              value={newFeature}
              onChange={e => setNewFeature(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomFeature())}
              placeholder="Agregar módulo personalizado..."
              className="text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustomFeature}>+</Button>
          </div>
        </div>
      </div>

      {/* Resumen del plan */}
      {plan.name && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">{plan.name}</h3>
            </div>
            {rate > 0 && <Badge className="bg-purple-100 text-purple-700 border-0 font-bold text-base px-3 py-1">{rate}%</Badge>}
          </div>
          {plan.clientType && <p className="text-sm text-gray-500">Para: {plan.clientType}</p>}
          {plan.features.length > 0 && (
            <div className="space-y-1">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}
          {plan.notes && <p className="text-xs text-gray-400 italic">{plan.notes}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSave}
            >
              {saved ? "✓ Plan guardado" : "Guardar plan"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setPlan({ name: "", clientType: "", monthlyVolume: "", commissionRate: "", paymentCycle: "monthly", features: [], notes: "" })}>
              Limpiar
            </Button>
          </div>
        </div>
      )}
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
    customPlanName: "",
    customCommissionRate: "",
    paymentCycle: "monthly" as "weekly" | "biweekly" | "monthly" | "custom",
    notes: "",
  });

  const registerMutation = trpc.associate.registerClient.useMutation({
    onSuccess: () => {
      toast.success("¡Cliente registrado exitosamente! Se notificó al equipo KobraPay.");
      setOpen(false);
      setForm({ clientName: "", clientEmail: "", clientBusinessName: "", clientPhone: "", assignedPlan: "", customPlanName: "", customCommissionRate: "", paymentCycle: "monthly", notes: "" });
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
    const customRate = form.customCommissionRate ? parseFloat(form.customCommissionRate) : undefined;
    registerMutation.mutate({
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientBusinessName: form.clientBusinessName || undefined,
      clientPhone: form.clientPhone || undefined,
      assignedPlan: (form.assignedPlan as "express" | "connect" | "custom" | "enterprise") || undefined,
      customPlanName: form.customPlanName || undefined,
      customCommissionRate: customRate,
      paymentCycle: form.paymentCycle,
      notes: form.notes || undefined,
    });
  };

  const PAYMENT_CYCLES = [
    { value: "weekly", label: "Semanal" },
    { value: "biweekly", label: "Quincenal" },
    { value: "monthly", label: "Mensual" },
    { value: "custom", label: "Personalizado" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <UserPlus className="w-4 h-4" />
          Registrar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Plan personalizado */}
          <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Opciones avanzadas</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre plan personalizado</Label>
                <Input
                  value={form.customPlanName}
                  onChange={e => setForm(f => ({ ...f, customPlanName: e.target.value }))}
                  placeholder="Ej: Plan Clínica VIP"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comisión acordada (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={form.customCommissionRate}
                    onChange={e => setForm(f => ({ ...f, customCommissionRate: e.target.value }))}
                    placeholder="Ej: 2.5"
                    className="text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
                <p className="text-xs text-gray-400">Deja vacío para usar la comisión del plan</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ciclo de pago de comisiones</Label>
              <Select
                value={form.paymentCycle}
                onValueChange={v => setForm(f => ({ ...f, paymentCycle: v as "weekly" | "biweekly" | "monthly" | "custom" }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_CYCLES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas adicionales</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Información relevante del cliente, acuerdos previos, etc."
              rows={2}
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
type TabType = "dashboard" | "clients" | "plans" | "custom_plan" | "simulator" | "ai";

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
    { id: "custom_plan", label: "Crear Plan", icon: Crown },
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
        {/* Tab: Crear Plan Personalizado */}
        {activeTab === "custom_plan" && <CustomPlanBuilder />}
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
