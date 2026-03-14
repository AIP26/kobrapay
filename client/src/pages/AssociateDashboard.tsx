import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen, UserPlus, DollarSign, CheckCircle, Clock, XCircle,
  Download, Zap, TrendingUp, Crown, Rocket, ChevronRight,
  Phone, Mail, Building2, User, FileText, Star, AlertCircle,
  Handshake, ArrowRight, Calculator, CreditCard, Smartphone,
  ChevronDown, ChevronUp, ShieldCheck, HelpCircle, Store,
  Award, Edit2, Save, X, Plus, Trash2
} from "lucide-react";
import { useState as useStateLocal } from "react";

// ─── Componente: Tabla de tiers de comisión escalonada ───────────────────────
function CommissionTiersTable({ activeClients }: { activeClients: number }) {
  const { data: tiers, isLoading, refetch } = trpc.associate.listCommissionTiers.useQuery();
  const updateTier = trpc.associate.updateCommissionTier.useMutation({ onSuccess: () => refetch() });
  const createTier = trpc.associate.createCommissionTier.useMutation({ onSuccess: () => refetch() });
  const deleteTier = trpc.associate.deleteCommissionTier.useMutation({ onSuccess: () => refetch() });
  const { user } = useAuth();
  const isSuperAdmin = Boolean((user as { isSuperAdmin?: boolean })?.isSuperAdmin) || user?.role === 'superadmin';

  const [editingId, setEditingId] = useStateLocal<number | null>(null);
  const [editForm, setEditForm] = useStateLocal<{ minClients: string; maxClients: string; commissionPct: string; label: string; description: string }>({ minClients: "", maxClients: "", commissionPct: "", label: "", description: "" });
  const [showCreate, setShowCreate] = useStateLocal(false);
  const [createForm, setCreateForm] = useStateLocal({ minClients: "", maxClients: "", commissionPct: "", label: "", description: "" });

  const TIER_COLORS = [
    { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-100 text-foreground", bar: "bg-slate-400" },
    { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", bar: "bg-blue-400" },
    { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
    { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", bar: "bg-violet-500" },
    { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  ];

  const currentTier = tiers?.find(t => {
    const min = t.minClients;
    const max = t.maxClients;
    return activeClients >= min && (max === null || activeClients <= max);
  });

  type TierItem = NonNullable<typeof tiers>[number];
  const startEdit = (tier: TierItem) => {
    setEditingId(tier.id);
    setEditForm({
      minClients: String(tier.minClients),
      maxClients: tier.maxClients !== null ? String(tier.maxClients) : "",
      commissionPct: String(tier.commissionPct),
      label: tier.label,
      description: tier.description || "",
    });
  };

  const saveEdit = async (tier: TierItem) => {
    await updateTier.mutateAsync({
      id: tier.id,
      minClients: parseInt(editForm.minClients) || tier.minClients,
      maxClients: editForm.maxClients ? parseInt(editForm.maxClients) : null,
      commissionPct: parseFloat(editForm.commissionPct) || parseFloat(String(tier.commissionPct)),
      label: editForm.label || tier.label,
      description: editForm.description,
    });
    setEditingId(null);
    toast.success("Tier actualizado");
  };

  const handleCreate = async () => {
    if (!createForm.label || !createForm.commissionPct || !createForm.minClients) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    await createTier.mutateAsync({
      minClients: parseInt(createForm.minClients),
      maxClients: createForm.maxClients ? parseInt(createForm.maxClients) : null,
      commissionPct: parseFloat(createForm.commissionPct),
      label: createForm.label,
      description: createForm.description,
    });
    setShowCreate(false);
    setCreateForm({ minClients: "", maxClients: "", commissionPct: "", label: "", description: "" });
    toast.success("Tier creado");
  };

  if (isLoading) return <div className="h-24 bg-gray-50 rounded-2xl animate-pulse" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Niveles de comisión escalonada</h3>
        </div>
        {isSuperAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nuevo nivel
          </Button>
        )}
      </div>

      {/* Banner nivel actual */}
      {currentTier && (
        <div className="mx-6 mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-foreground flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-100 font-medium">Tu nivel actual</p>
            <p className="text-xl font-bold">{currentTier.label}</p>
            <p className="text-xs text-emerald-100 mt-0.5">{activeClients} clientes activos</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{parseFloat(String(currentTier.commissionPct)).toFixed(2)}%</p>
            <p className="text-xs text-emerald-100">comisión sobre volumen</p>
          </div>
        </div>
      )}

      {/* Formulario crear nuevo tier (solo superadmin) */}
      {isSuperAdmin && showCreate && (
        <div className="mx-6 mt-4 p-4 border border-dashed border-emerald-300 rounded-xl bg-emerald-50 space-y-3">
          <p className="text-sm font-semibold text-emerald-800">Nuevo nivel de comisión</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Etiqueta *</label>
              <Input value={createForm.label} onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: Diamond" className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Comisión % *</label>
              <Input type="number" step="0.1" value={createForm.commissionPct} onChange={e => setCreateForm(f => ({ ...f, commissionPct: e.target.value }))} placeholder="0.5" className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mín. clientes *</label>
              <Input type="number" value={createForm.minClients} onChange={e => setCreateForm(f => ({ ...f, minClients: e.target.value }))} placeholder="1" className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Máx. clientes (vacío = sin límite)</label>
              <Input type="number" value={createForm.maxClients} onChange={e => setCreateForm(f => ({ ...f, maxClients: e.target.value }))} placeholder="50" className="mt-1" />
            </div>
          </div>
          <Input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del nivel" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-1.5">
              <Save className="w-3.5 h-3.5" /> Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>
              <X className="w-3.5 h-3.5" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de tiers */}
      <div className="p-6 space-y-3 pt-4">
        {(tiers ?? []).map((tier, idx) => {
          const colors = TIER_COLORS[idx % TIER_COLORS.length];
          const isCurrentTier = currentTier?.id === tier.id;
          const isEditing = editingId === tier.id;
          const pct = parseFloat(String(tier.commissionPct));
          const barWidth = Math.min((pct / 5) * 100, 100);

          return (
            <div key={tier.id} className={`rounded-xl border-2 p-4 ${isCurrentTier ? "border-emerald-400 shadow-md" : colors.border} ${colors.bg}`}>
              {isEditing && isSuperAdmin ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Etiqueta</label>
                      <Input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Comisión %</label>
                      <Input type="number" step="0.1" value={editForm.commissionPct} onChange={e => setEditForm(f => ({ ...f, commissionPct: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Mín. clientes</label>
                      <Input type="number" value={editForm.minClients} onChange={e => setEditForm(f => ({ ...f, minClients: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Máx. clientes</label>
                      <Input type="number" value={editForm.maxClients} onChange={e => setEditForm(f => ({ ...f, maxClients: e.target.value }))} placeholder="Sin límite" className="mt-1" />
                    </div>
                  </div>
                  <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(tier)} className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 ml-auto gap-1.5" onClick={async () => { await deleteTier.mutateAsync({ id: tier.id }); toast.success("Tier eliminado"); }}>
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{tier.label}</span>
                      {isCurrentTier && <span className="text-xs bg-emerald-500 text-foreground px-2 py-0.5 rounded-full font-bold">Tu nivel actual</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {tier.minClients}{tier.maxClients ? `–${tier.maxClients}` : "+"} clientes activos
                      {tier.description ? ` · ${tier.description}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-sm font-bold text-foreground w-12 text-right">{pct.toFixed(2)}%</span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={() => startEdit(tier)} className="p-2 rounded-lg hover:bg-white/80 text-muted-foreground hover:text-muted-foreground">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-6 pb-5">
        <p className="text-xs text-muted-foreground text-center">
          Los niveles se calculan automáticamente según tus clientes activos. A mayor cartera, mayor comisión.
        </p>
      </div>
    </div>
  );
}

// --- Planes disponibles -------------------------------------------------------
const PLANS = [
  {
    id: "express",
    name: "Express",
    icon: Zap,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    headerBg: "from-emerald-500 to-teal-600",
    commission: 3.5,
    price: "Sin costo fijo",
    description: "La solución perfecta para negocios que quieren empezar a cobrar con tarjeta hoy mismo, sin complicaciones.",
    pitch: "¿Tu cliente todavía cobra solo en efectivo? Con KobraPay Express puede recibir pagos con tarjeta desde el primer día, sin contratos complicados ni equipos costosos.",
    features: [
      "Links de pago por WhatsApp o correo",
      "Cobros con tarjeta de crédito/débito",
      "Historial completo de ventas",
      "Panel de control en línea",
      "Soporte por chat",
    ],
    bestFor: "Tiendas, restaurantes, servicios locales, vendedores independientes",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/restaurante_6d945278.webp",
    photoAlt: "Restaurante cobrando con tarjeta",
    argument: "Ideal para el dueño del restaurante o tienda que pierde ventas porque el cliente no trae efectivo.",
  },
  {
    id: "connect",
    name: "Connect",
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    headerBg: "from-blue-500 to-indigo-600",
    commission: 3.1,
    price: "Sin costo fijo",
    description: "Para negocios en crecimiento que necesitan cobros recurrentes, contratos digitales y su propia cuenta bancaria de cobros.",
    pitch: "¿Tu cliente tiene clientes que pagan mensualidades? Con Connect puede automatizar los cobros recurrentes y firmar contratos digitales sin papel.",
    features: [
      "Todo lo del plan Express",
      "Cuenta bancaria propia (CLABE) para recibir pagos",
      "Cobros recurrentes automáticos",
      "Contratos digitales con firma electrónica",
      "Agenda de citas para clínicas y servicios",
      "Facturas digitales",
    ],
    bestFor: "Clínicas, escuelas, gimnasios, salones de belleza, e-commerce",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/gimnasio_eefc674a.jpg",
    photoAlt: "Gimnasio con membresías",
    argument: "Perfecto para el gimnasio o clínica que quiere cobrar mensualidades automáticamente sin perseguir a sus clientes.",
  },
  {
    id: "custom",
    name: "Custom",
    icon: Crown,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    headerBg: "from-purple-500 to-violet-600",
    commission: 2.7,
    price: "Cotización personalizada",
    description: "Para empresas medianas que necesitan módulos a la medida, agenda médica completa y gestión de personal.",
    pitch: "¿Tu cliente tiene un consultorio o empresa con varios empleados? Custom les da una plataforma completa con expedientes, agenda y cobros todo en uno.",
    features: [
      "Todo lo del plan Connect",
      "Módulos personalizados a su negocio",
      "Agenda médica con expedientes de pacientes",
      "Gestión de personal (RH básico)",
      "Reportes avanzados",
      "Soporte prioritario con gestor asignado",
    ],
    bestFor: "Consultorios médicos, hospitales pequeños, empresas con 10+ empleados",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/consultorio_dc4d0003.webp",
    photoAlt: "Consultorio médico",
    argument: "El médico o empresario que quiere tener todo en un solo lugar: cobros, agenda, expedientes y personal.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Rocket,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    headerBg: "from-amber-500 to-orange-600",
    commission: 2.5,
    price: "Negociable por volumen",
    description: "Para corporativos y cadenas con alto volumen de transacciones que necesitan integración API y SLA garantizado.",
    pitch: "¿Tu cliente es una cadena o corporativo? Enterprise les da integración directa con sus sistemas actuales y un gestor de cuenta dedicado.",
    features: [
      "Todo lo del plan Custom",
      "Integración API completa con sus sistemas",
      "Comisión 4.6% + $3.50 MXN + IVA (plan único de lanzamiento)",
      "Gestor de cuenta dedicado",
      "SLA garantizado (99.9% uptime)",
      "Soporte 24/7 por teléfono",
    ],
    bestFor: "Cadenas de tiendas, franquicias, corporativos, hospitales grandes",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/tienda_7bbc47df.jpg",
    photoAlt: "Cadena de tiendas",
    argument: "Para el cliente grande que necesita un proveedor de pagos confiable con soporte dedicado y precios por volumen.",
  },
];

// --- Simulador de Cotización (para el asociado, con % editables) ---------------------------------
function AssociateQuoteSimulator() {
  const [mode, setMode] = useState<"online" | "terminal">("online");
  const [amount, setAmount] = useState("10000");
  const [kobrapayRate, setKobrapayRate] = useState("4.6");
  const [ivaRate, setIvaRate] = useState("16");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [aiPreview, setAiPreview] = useState("");

  const logQuoteMutation = trpc.quote.logQuote.useMutation();
  const sendQuoteMutation = trpc.quote.sendByEmail.useMutation({
    onSuccess: (data) => {
      setEmailSent(true);
      if (data.aiExplanation) setAiPreview(data.aiExplanation);
      toast.success(`Cotización enviada a ${prospectEmail}`);
      // Registrar en historial de cotizaciones
      const m = parseFloat(amount) || 0;
      const kR = parseFloat(kobrapayRate) / 100 || 0;
      const iR = parseFloat(ivaRate) / 100 || 0;
      const sR = 0.036;
      const sF = 3.0;
      const sFee = m * sR + sF;
      const kFee = m * kR;
      const kIva = kFee * iR;
      const total = sFee + kFee + kIva;
      const net = m - total;
      const eff = m > 0 ? (total / m) * 100 : 0;
      logQuoteMutation.mutate({
        prospectEmail,
        prospectName,
        monthlyVolume: parseFloat(monthlyVolume) || 0,
        singleAmount: m,
        kpRate: parseFloat(kobrapayRate) || 0,
        mode,
        netAmount: net,
        totalFee: total,
        effectiveRate: eff,
      });
    },
    onError: () => toast.error("Error al enviar la cotización. Verifica el email."),
  });

  const monto = parseFloat(amount) || 0;
  const kpRate = parseFloat(kobrapayRate) / 100 || 0;
  const iva = parseFloat(ivaRate) / 100 || 0;
  // Stripe México: 3.6% + $3 MXN (tarifa real verificada)
  const stripeRate = 0.036;
  const stripeFixed = 3.0;
  const stripeFee = monto * stripeRate + stripeFixed;
  const kpFee = monto * kpRate;
  const kpIva = kpFee * iva;
  const totalDeducted = stripeFee + kpFee + kpIva;
  const netForBusiness = monto - totalDeducted;
  const effectiveRate = monto > 0 ? (totalDeducted / monto) * 100 : 0;

  const monthly = parseFloat(monthlyVolume) || 0;
  const monthlyStripe = monthly > 0 ? monthly * stripeRate + stripeFixed * (monthly / Math.max(monto, 1)) : 0;
  const monthlyKp = monthly * kpRate;
  const monthlyIva = monthlyKp * iva;
  const monthlyNet = monthly > 0 ? monthly - monthlyStripe - monthlyKp - monthlyIva : 0;

  const competitors = mode === "online" ? [
    { name: "Mercado Pago", rate: 3.29, fixed: 0 },
    { name: "PayPal", rate: 3.5, fixed: 0 },
    { name: "Clip (online)", rate: 3.6, fixed: 0 },
    { name: "Conekta", rate: 2.9, fixed: 0.30 },
  ] : [
    { name: "Clip (presencial)", rate: 3.6, fixed: 0 },
    { name: "Mercado Pago Point", rate: 3.29, fixed: 0 },
    { name: "BBVA Terminal", rate: 3.2, fixed: 0 },
    { name: "Stripe solo", rate: 2.7, fixed: 0.05 },
  ];

  const handleSendEmail = () => {
    if (!prospectEmail || !prospectName) { toast.error("Ingresa nombre y email del prospecto"); return; }
    sendQuoteMutation.mutate({
      prospectEmail,
      prospectName,
      mode,
      amount: monto,
      kobrapayRate: parseFloat(kobrapayRate) || 4.6,
      ivaRate: parseFloat(ivaRate) || 16,
      monthlyVolume: monthly > 0 ? monthly : undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">Simulador de Cotización</h3>
              <p className="text-indigo-100 text-sm">Muéstrale a tu cliente exactamente cuánto paga y cuánto recibe</p>
            </div>
          </div>
          {monto > 0 && (
            <button
              onClick={() => { setShowEmailModal(true); setEmailSent(false); }}
              className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50"
            >
              <Mail className="w-4 h-4" /> Enviar cotización
            </button>
          )}
        </div>
      </div>
      <div className="p-6 space-y-5">
        {/* Modo */}
        <div className="flex gap-2">
          <button onClick={() => setMode("online")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${mode === "online" ? "bg-indigo-600 text-foreground border-indigo-600" : "bg-gray-50 text-muted-foreground border-gray-200 hover:border-indigo-300"}`}>
            <Smartphone className="w-4 h-4" /> Cobro Online
          </button>
          <button onClick={() => setMode("terminal")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${mode === "terminal" ? "bg-violet-600 text-foreground border-violet-600" : "bg-gray-50 text-muted-foreground border-gray-200 hover:border-violet-300"}`}>
            <CreditCard className="w-4 h-4" /> Terminal Física (Stripe)
          </button>
        </div>
        {mode === "terminal" && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800">
            <p className="font-semibold mb-1">📟 Stripe Terminal Reader</p>
            <p>Lector físico que se conecta directamente a KobraPay. Cobros presenciales y online en un solo panel. Precio del lector: ~$299 USD (pago único).</p>
          </div>
        )}
        {/* Campos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Monto por cobro (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="10000" min="0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Volumen mensual (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input type="number" value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="500000" min="0" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opcional: proyección mensual</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">% Comisión KobraPay</label>
            <div className="relative">
              <input type="number" value={kobrapayRate} onChange={e => setKobrapayRate(e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="1.5" step="0.1" min="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Plan único Beta: 4.6% + $3.50 MXN + IVA por transacción</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">% IVA sobre comisión</label>
            <div className="relative">
              <input type="number" value={ivaRate} onChange={e => setIvaRate(e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="16" step="1" min="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
        </div>
        {monto > 0 && (
          <div className="space-y-3">
            {/* Desglose por transacción */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Desglose por cobro</p>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto bruto</span><span className="font-semibold">${monto.toLocaleString("es-MX", {minimumFractionDigits:2})} MXN</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Comisión Stripe (3.6% + $3 MXN)</span><span className="text-red-500">-${stripeFee.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Comisión KobraPay ({kobrapayRate}%)</span><span className="text-red-500">-${kpFee.toFixed(2)}</span></div>
              {iva > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA sobre comisión ({ivaRate}%)</span><span className="text-orange-500">-${kpIva.toFixed(2)}</span></div>}
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground font-medium">Total deducido</span><span className="font-semibold text-red-600">-${totalDeducted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-bold text-foreground">Neto para el negocio</span><span className="font-black text-emerald-600 text-lg">${netForBusiness.toLocaleString("es-MX", {minimumFractionDigits:2})}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tasa efectiva total</span><span className="text-muted-foreground">{effectiveRate.toFixed(2)}%</span></div>
              </div>
            </div>
            {/* Proyección mensual */}
            {monthly > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase mb-3">📊 Proyección Mensual — ${monthly.toLocaleString("es-MX")} MXN/mes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Volumen bruto</p>
                    <p className="font-bold text-foreground">${monthly.toLocaleString("es-MX", {minimumFractionDigits:0})} MXN</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total comisiones</p>
                    <p className="font-bold text-red-600">-${(monthly - monthlyNet).toLocaleString("es-MX", {minimumFractionDigits:0})} MXN</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Neto mensual</p>
                    <p className="font-black text-emerald-700 text-lg">${monthlyNet.toLocaleString("es-MX", {minimumFractionDigits:0})} MXN</p>
                  </div>
                </div>
              </div>
            )}
            {/* Comisión del asociado */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Tu ganancia como asociado (ejemplo 10% de la comisión KobraPay)</p>
              <div className="flex items-center justify-between">
                <span className="text-indigo-800 text-sm">Por este cobro:</span>
                <span className="font-bold text-indigo-700 text-base">${(kpFee * 0.10).toFixed(2)} MXN</span>
              </div>
              {monthly > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-indigo-800 text-sm">Ganancia mensual estimada:</span>
                  <span className="font-bold text-indigo-700 text-base">${(monthlyKp * 0.10).toLocaleString("es-MX", {minimumFractionDigits:2})} MXN</span>
                </div>
              )}
            </div>
            {/* Comparativa */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Comparativa vs competencia</p>
              <div className="space-y-1.5">
                {competitors.map(c => {
                  const cFee = monto * (c.rate / 100) + c.fixed;
                  const cNet = monto - cFee;
                  const isBetter = netForBusiness > cNet;
                  const diff = netForBusiness - cNet;
                  return (
                    <div key={c.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-muted-foreground">{c.name} ({c.rate}%{c.fixed > 0 ? ` + $${c.fixed}` : ""})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Neto: ${cNet.toLocaleString("es-MX", {minimumFractionDigits:2})}</span>
                        {isBetter && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">+${diff.toFixed(2)} más</span>}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold text-indigo-800">⭐ KobraPay (tu cotización)</span>
                  <span className="text-sm font-black text-indigo-700">Neto: ${netForBusiness.toLocaleString("es-MX", {minimumFractionDigits:2})}</span>
                </div>
              </div>
            </div>
            {/* Botón enviar cotización */}
            <button
              onClick={() => { setShowEmailModal(true); setEmailSent(false); }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-700 text-foreground font-semibold py-3 rounded-xl hover:opacity-90"
            >
              <Mail className="w-5 h-5" /> Enviar cotización por email al prospecto
            </button>
          </div>
        )}
      </div>
      {/* Modal de email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-lg">Enviar Cotización por Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-muted-foreground hover:text-muted-foreground text-xl">×</button>
            </div>
            {emailSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-foreground mb-2">¡Cotización enviada!</p>
                <p className="text-muted-foreground text-sm mb-4">Se envió a <strong>{prospectEmail}</strong> con el desglose completo y la comparativa vs competencia.</p>
                {aiPreview && (
                  <div className="bg-indigo-50 rounded-xl p-3 text-left mb-4">
                    <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">✨ Explicación IA incluida:</p>
                    <p className="text-sm text-foreground">{aiPreview}</p>
                  </div>
                )}
                <button onClick={() => setShowEmailModal(false)} className="bg-indigo-600 text-foreground px-6 py-2 rounded-xl font-semibold">Cerrar</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800">
                  <p className="font-semibold mb-1">✨ La IA generará una explicación personalizada</p>
                  <p className="text-xs">El email incluirá: desglose de comisiones, proyección mensual (si aplica), comparativa vs competencia y análisis IA.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Nombre del prospecto</label>
                  <input type="text" value={prospectName} onChange={e => setProspectName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Ej: Carlos Martínez" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Email del prospecto</label>
                  <input type="email" value={prospectEmail} onChange={e => setProspectEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="prospecto@email.com" />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Resumen de la cotización:</p>
                  <p>Monto: ${monto.toLocaleString("es-MX")} MXN · Modo: {mode === "online" ? "Online" : "Terminal"} · Neto: ${netForBusiness.toLocaleString("es-MX", {minimumFractionDigits:2})} MXN · Tasa: {effectiveRate.toFixed(2)}%</p>
                  {monthly > 0 && <p className="mt-1">Proyección mensual: ${monthlyNet.toLocaleString("es-MX", {minimumFractionDigits:0})} MXN neto/mes</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowEmailModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendQuoteMutation.isPending}
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 text-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    {sendQuoteMutation.isPending ? "Enviando..." : "Enviar cotización"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- FAQ de Ventas ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: "¿Puedo usar mi terminal física actual con KobraPay?",
    a: "Las terminales de otros proveedores (Clip, bancos, etc.) no se conectan a KobraPay porque operan en redes separadas. Sin embargo, KobraPay ofrece el Stripe Terminal Reader, un lector físico que SÍ se integra directamente con tu panel. Así tienes cobros online y presenciales en un solo lugar, con un solo reporte y una sola comisión.",
    icon: CreditCard,
  },
  {
    q: "¿A qué tipo de negocios le puedo ofrecer KobraPay?",
    a: "KobraPay es ideal para: profesionales independientes (abogados, contadores, coaches, psicólogos) que cobran por links; negocios de servicios con citas (spas, clínicas, gimnasios, salones) que quieren cobrar anticipos y membresías automáticas; pequeños comercios con venta online o a domicilio; escuelas y academias con mensualidades; y sector salud con agenda digital integrada.",
    icon: Store,
  },
  {
    q: "¿Por qué no simplemente recibir transferencias bancarias?",
    a: "Las transferencias son 'gratuitas' en el momento, pero te cuestan tiempo, ventas perdidas y falta de profesionalismo. Con KobraPay tus clientes pagan con tarjeta (más ventas), recibes notificación instantánea, los cobros recurrentes se hacen automáticamente, emites facturas al instante y tienes herramientas de gestión que una transferencia jamás te dará. La comisión se paga sola con el tiempo que ahorras.",
    icon: ShieldCheck,
  },
  {
    q: "¿Cuánto cobra KobraPay? ¿Es más caro que la competencia?",
    a: "KobraPay cobra 4.6% + $3.50 MXN + IVA por transacción (plan único de lanzamiento). Comparado con Mercado Pago (3.29% + IVA), PayPal (3.5% + IVA), Clip (3.6% + IVA) y Conekta (2.9% + IVA), KobraPay ofrece más funcionalidades: contratos digitales, cobros recurrentes, firma digital, OTP y mucho más. Sin mensualidad fija, sin contrato de permanencia y sin hardware para cobros online. Usa el simulador de arriba para ver el desglose exacto.",
    icon: DollarSign,
  },
  {
    q: "¿Es seguro? ¿Qué pasa si hay un fraude?",
    a: "KobraPay usa Stripe como procesador, el mismo que usan Amazon, Google y Shopify. Certificación PCI DSS Level 1 y verificación antifraude en tiempo real. En caso de disputas tienes herramientas para defenderte. Además, KobraPay puede solicitar selfie, firma y documento de identidad del pagador como evidencia adicional.",
    icon: ShieldCheck,
  },
  {
    q: "¿Qué pasa con negocios que ya tienen terminal (restaurantes, bares, spas)?",
    a: "No competimos con su terminal actual, la complementamos. Argumento clave: '¿Qué pasa cuando un cliente quiere pagarte desde casa? ¿O cuando quieres cobrar un anticipo para una reserva grande? Para eso, KobraPay es la solución perfecta: sin hardware adicional, sin mensualidades, y con herramientas de gestión que tu terminal no tiene: agenda, contratos, facturas y expedientes.'",
    icon: HelpCircle,
  },
];

function SalesFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-5 text-foreground">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-bold">Preguntas Frecuentes de Clientes</h3>
            <p className="text-teal-100 text-sm">Respuestas profesionales para las objeciones más comunes</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {FAQ_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isOpen = open === i;
          return (
            <div key={i}>
              <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-sm font-semibold text-foreground">{item.q}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-6 pb-4">
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                    <p className="text-sm text-foreground leading-relaxed">{item.a}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pendiente revisión", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  assistant_approved: { label: "En revisión final", color: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertCircle },
  active: { label: "Activo ✓", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  rejected: { label: "Rechazado", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  inactive: { label: "Inactivo", color: "bg-gray-50 text-muted-foreground border-gray-200", icon: XCircle },
};

type Tab = "manual" | "registro" | "comisiones" | "referidos";

export default function AssociateDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("manual");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Form state
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientBusinessName: "",
    assignedPlan: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const registerMutation = trpc.associate.registerClient.useMutation();
  const utils = trpc.useUtils();
  void utils;

  const { data: myClientsData, isLoading: loadingClients } = trpc.associate.listClients.useQuery(undefined, {
    enabled: activeTab === "comisiones",
  });

  const { data: referralInfo, isLoading: loadingReferral } = trpc.associate.getMyReferralInfo.useQuery(undefined, {
    enabled: activeTab === "referidos",
  });

  const { data: myEarningsData, isLoading: loadingEarnings } = trpc.associate.getMyEarnings.useQuery(
    { limit: 30 },
    { enabled: activeTab === "comisiones" }
  );
  const myEarnings = myEarningsData ?? [];
  const pendingEarnings = myEarnings.filter((e) => e.status === 'pending');
  const paidEarnings = myEarnings.filter((e) => e.status === 'paid');
  const totalPendingAmount = pendingEarnings.reduce((s, e) => s + parseFloat(String(e.commissionAmount || 0)), 0);
  const totalPaidAmount = paidEarnings.reduce((s, e) => s + parseFloat(String(e.commissionAmount || 0)), 0);

  const myClients = myClientsData ?? [];
  const totalEarned = myClients.reduce((s: number, c) => s + parseFloat(String(c.totalCommissionEarned || "0")), 0);
  const activeClients = myClients.filter((c) => c.status === "active").length;
  const pendingClients = myClients.filter((c) => c.status === "pending" || c.status === "assistant_approved").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail || !form.assignedPlan) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      await registerMutation.mutateAsync({
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        clientBusinessName: form.clientBusinessName || undefined,
        assignedPlan: form.assignedPlan as "express" | "connect" | "custom" | "enterprise",
        customCommissionRate: PLANS.find(p => p.id === form.assignedPlan)?.commission ?? 2.5,
        notes: form.notes || undefined,
      });
      toast.success("¡Cliente registrado exitosamente!", {
        description: "Recibirás una notificación cuando sea aprobado.",
      });
      setForm({ clientName: "", clientEmail: "", clientPhone: "", clientBusinessName: "", assignedPlan: "", notes: "" });
      setActiveTab("comisiones");
      utils.associate.listClients.invalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar cliente";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const generateBrochurePDF = async () => {
    setGeneratingPdf(true);
    try {
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Manual de Ventas KobraPay</title>
<style>
  @media print { body { margin: 0; } .page-break { page-break-before: always; } }
  body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; }
  .cover { background: linear-gradient(135deg, #00c853, #1a237e); color: white; padding: 60px 40px; min-height: 200px; }
  .cover h1 { font-size: 42px; margin: 0 0 8px; font-weight: 900; }
  .cover p { font-size: 18px; opacity: 0.9; margin: 0; }
  .cover .subtitle { font-size: 14px; opacity: 0.7; margin-top: 12px; }
  .section { padding: 32px 40px; }
  .plan-card { border: 2px solid #e5e7eb; border-radius: 12px; margin-bottom: 32px; overflow: hidden; }
  .plan-header { padding: 20px 24px; color: white; }
  .plan-header.express { background: linear-gradient(135deg, #10b981, #0d9488); }
  .plan-header.connect { background: linear-gradient(135deg, #3b82f6, #4f46e5); }
  .plan-header.custom { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
  .plan-header.enterprise { background: linear-gradient(135deg, #f59e0b, #ea580c); }
  .plan-header h2 { font-size: 28px; margin: 0 0 4px; font-weight: 900; }
  .plan-header p { font-size: 13px; opacity: 0.9; margin: 0; }
  .plan-body { padding: 20px 24px; display: flex; gap: 24px; }
  .plan-features { flex: 1; }
  .plan-features h3 { font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin: 0 0 8px; }
  .plan-features ul { margin: 0; padding-left: 18px; }
  .plan-features li { font-size: 13px; margin-bottom: 4px; color: #374151; }
  .plan-pitch { flex: 1; background: #f9fafb; border-radius: 8px; padding: 16px; }
  .plan-pitch h3 { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin: 0 0 8px; }
  .plan-pitch p { font-size: 13px; color: #374151; margin: 0 0 8px; line-height: 1.5; }
  .plan-pitch .best-for { font-size: 11px; color: #9ca3af; }
  .commission-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 700; margin-top: 8px; }
  .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  .intro { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0; }
  .intro h2 { font-size: 18px; color: #065f46; margin: 0 0 6px; }
  .intro p { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
  .tips { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .tips h3 { font-size: 14px; font-weight: 700; color: #92400e; margin: 0 0 8px; }
  .tips ul { margin: 0; padding-left: 18px; }
  .tips li { font-size: 13px; color: #78350f; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="cover">
  <h1>KobraPay</h1>
  <p>Manual de Ventas para Asociados</p>
  <div class="subtitle">kobrapay.mx · Versión ${new Date().getFullYear()}</div>
</div>

<div class="section">
  <div class="intro">
    <h2>¿Qué es KobraPay?</h2>
    <p>KobraPay es una plataforma mexicana de procesamiento de pagos que permite a cualquier negocio cobrar con tarjeta de crédito/débito, gestionar clientes, firmar contratos digitales y automatizar cobros recurrentes. Como asociado, tu trabajo es identificar negocios que necesiten estas soluciones y presentarles los planes disponibles.</p>
  </div>

  <div class="tips">
    <h3>💡 Consejos para cerrar ventas</h3>
    <ul>
      <li>Pregunta primero: "¿Cuántas ventas pierdes porque el cliente no trae efectivo?"</li>
      <li>Muestra el plan según el volumen mensual estimado del negocio</li>
      <li>Enfatiza que no hay costo fijo mensual — solo pagan cuando cobran</li>
      <li>Para clínicas y gimnasios, destaca los cobros recurrentes automáticos</li>
      <li>Cierra con: "Te registro hoy y en 24-48 horas ya puedes estar cobrando"</li>
    </ul>
  </div>

  ${PLANS.map(plan => `
  <div class="plan-card">
    <div class="plan-header ${plan.id}">
      <h2>${plan.name}</h2>
      <p>${plan.description}</p>
      <div class="commission-badge">Tu comisión: ${plan.commission}% por transacción</div>
    </div>
    <div class="plan-body">
      <div class="plan-features">
        <h3>Incluye</h3>
        <ul>
          ${plan.features.map(f => `<li>${f}</li>`).join("")}
        </ul>
        <p style="font-size:12px;color:#6b7280;margin-top:12px;"><strong>Ideal para:</strong> ${plan.bestFor}</p>
        <p style="font-size:12px;color:#6b7280;"><strong>Precio:</strong> ${plan.price}</p>
      </div>
      <div class="plan-pitch">
        <h3>Argumento de venta</h3>
        <p>${plan.pitch}</p>
        <p class="best-for">Negocios objetivo: ${plan.bestFor}</p>
      </div>
    </div>
  </div>
  `).join("")}

  <div class="tips" style="background:#eff6ff;border-color:#93c5fd;">
    <h3 style="color:#1e40af;">📋 Proceso de registro</h3>
    <ul style="color:#1e3a8a;">
      <li>1. Registra al cliente desde tu panel de asociado en kobrapay.mx</li>
      <li>2. El equipo de KobraPay revisa la solicitud en 24-48 horas</li>
      <li>3. El cliente recibe un correo con sus credenciales de acceso</li>
      <li>4. Una vez activo, empiezas a ganar comisiones por cada transacción</li>
      <li>5. Tus comisiones se acumulan y se pagan según el ciclo acordado</li>
    </ul>
  </div>
</div>

<div class="footer">
  KobraPay · kobrapay.mx · Para soporte: soporte@kobrapay.mx · Manual generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}
</div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Manual_Ventas_KobraPay_${new Date().getFullYear()}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Manual descargado", { description: "Abre el archivo y usa Ctrl+P para imprimir como PDF." });
    } catch {
      toast.error("Error al generar el manual");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "manual", label: "Manual de Ventas", icon: BookOpen },
    { id: "registro", label: "Registrar Cliente", icon: UserPlus },
    { id: "comisiones", label: "Mis Comisiones", icon: DollarSign },
    { id: "referidos", label: "Programa de Referidos", icon: Handshake },
  ];

  return (
    <DashboardLayout title="Portal del Asociado">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portal del Asociado</h1>
            <p className="text-sm text-muted-foreground mt-1">Bienvenido, {user?.name || "Asociado"}</p>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 px-3 py-1.5" variant="outline">
            <Handshake className="w-4 h-4" />
            Asociado KobraPay
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "comisiones" && pendingClients > 0 && (
                  <span className="bg-amber-500 text-foreground text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {pendingClients}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- TAB: Manual de Ventas --- */}
        {activeTab === "manual" && (
          <div className="space-y-6">
            {/* Intro banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-foreground">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">Tu catálogo de planes KobraPay</h2>
                  <p className="text-emerald-100 text-sm leading-relaxed max-w-xl">
                    Aquí tienes todo lo que necesitas para presentarle KobraPay a tus prospectos. 
                    Cada plan incluye argumentos de venta y los tipos de negocio más adecuados.
                  </p>
                </div>
                <Button
                  onClick={generateBrochurePDF}
                  disabled={generatingPdf}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shrink-0"
                >
                  {generatingPdf ? (
                    <><FileText className="w-4 h-4 mr-2 animate-pulse" />Generando...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Descargar Manual PDF</>
                  )}
                </Button>
              </div>
            </div>

            {/* Tips rapidos */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Consejos para cerrar ventas</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Pregunta: '¿Cuántas ventas pierdes porque el cliente no trae efectivo?'",
                  "No hay costo fijo mensual — el cliente solo paga cuando cobra",
                  "Para clínicas y gimnasios: enfatiza los cobros recurrentes automáticos",
                  "Cierra con: 'En 24-48 horas ya puedes estar cobrando con tarjeta'",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Planes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${
                      isSelected ? `${plan.border} shadow-lg scale-[1.01]` : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                  >
                    {/* Foto del negocio */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={plan.photo}
                        alt={plan.photoAlt}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${plan.headerBg} opacity-70`} />
                      <div className="absolute inset-0 p-4 flex flex-col justify-end">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-foreground" />
                          </div>
                          <span className="text-foreground font-bold text-xl">{plan.name}</span>
                        </div>
                        <p className="text-foreground/90 text-xs">{plan.description}</p>
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 text-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                        Tu comisión: {plan.commission}%
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-4 space-y-3">
                      {/* Argumento de venta */}
                      <div className={`${plan.bg} rounded-lg p-3`}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Argumento de venta</p>
                        <p className="text-sm text-foreground leading-relaxed">{plan.argument}</p>
                      </div>

                      {/* Expandible: caracteristicas */}
                      {isSelected && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Incluye</p>
                          <ul className="space-y-1.5">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-muted-foreground pt-1">
                            <span className="font-semibold">Ideal para:</span> {plan.bestFor}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">{plan.bestFor.split(",")[0]}...</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm(f => ({ ...f, assignedPlan: plan.id }));
                              setActiveTab("registro");
                            }}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r ${plan.headerBg} text-foreground`}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Registrar cliente
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {isSelected ? "▲ Ocultar" : "▼ Ver más"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Proceso de registro */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                ¿Cómo funciona el proceso?
              </h3>
              <div className="flex items-start gap-0 overflow-x-auto">
                {[
                  { step: "1", title: "Tú registras al cliente", desc: "Llenas el formulario con sus datos y el plan que eligió" },
                  { step: "2", title: "Revisión en 24-48 hrs", desc: "El equipo KobraPay verifica la información" },
                  { step: "3", title: "Cliente recibe acceso", desc: "Le llega un correo con sus credenciales para entrar" },
                  { step: "4", title: "Empiezas a ganar", desc: "Cada vez que el cliente cobra, tú ganas tu comisión" },
                ].map((s, i, arr) => (
                  <div key={i} className="flex items-center gap-0 min-w-0">
                    <div className="flex flex-col items-center text-center min-w-[120px]">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center mb-2">
                        {s.step}
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">{s.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mx-2 mt-[-20px]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Catalogo de Terminales Stripe */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-4 text-foreground">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <div>
                    <h3 className="font-bold">Terminales Físicas Stripe</h3>
                    <p className="text-violet-100 text-xs">Hardware certificado que se integra directamente con KobraPay</p>
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Stripe Reader S700 */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-card p-5 flex items-center justify-center" style={{minHeight:"140px"}}>
                    <div className="text-center">
                      <div className="w-16 h-24 bg-muted rounded-xl mx-auto mb-2 flex items-center justify-center border-2 border-border">
                        <div className="w-10 h-6 bg-gray-500 rounded-sm" />
                      </div>
                      <span className="text-foreground text-xs font-bold">Stripe Reader S700</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-foreground">Stripe Reader S700</h4>
                      <span className="text-lg font-black text-violet-600">~$299 USD</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Terminal inteligente con pantalla táctil. Acepta chip, banda magnética y NFC (Apple Pay, Google Pay). Conexión WiFi y Ethernet.</p>
                    <div className="space-y-1.5">
                      {["Pantalla táctil de 5\"","WiFi + Ethernet","Chip + NFC + Banda","Impresora opcional","Batería recargable"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 bg-violet-50 rounded-lg p-2.5 text-xs text-violet-800">
                      <strong>Ideal para:</strong> Restaurantes, tiendas, spas, clínicas con mostrador.
                    </div>
                  </div>
                </div>
                {/* BBPOS WisePOS E */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-muted p-5 flex items-center justify-center" style={{minHeight:"140px"}}>
                    <div className="text-center">
                      <div className="w-12 h-20 bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center border-2 border-gray-500">
                        <div className="w-8 h-5 bg-gray-400 rounded-sm" />
                      </div>
                      <span className="text-foreground text-xs font-bold">BBPOS WisePOS E</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-foreground">BBPOS WisePOS E</h4>
                      <span className="text-lg font-black text-violet-600">~$249 USD</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Terminal compacta y portátil. Perfecta para negocios móviles o con espacio reducido. Batería de larga duración.</p>
                    <div className="space-y-1.5">
                      {["Pantalla táctil de 3.5\"","WiFi + Bluetooth","Chip + NFC","Batería 8+ horas","Diseño compacto"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 bg-violet-50 rounded-lg p-2.5 text-xs text-violet-800">
                      <strong>Ideal para:</strong> Servicios a domicilio, ferias, eventos, food trucks.
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <strong>Argumento de venta:</strong> "Con KobraPay tienes cobros online Y presenciales en un solo panel, un solo reporte y una sola comisión. No necesitas dos sistemas separados."
                </div>
              </div>
            </div>

            {/* Simulador de Cotizacion */}
            <AssociateQuoteSimulator />

            {/* FAQ de Ventas */}
            <SalesFAQ />
          </div>
        )}

        {/* --- TAB: Registrar Cliente --- */}
        {activeTab === "registro" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-foreground">
                <h2 className="text-lg font-bold">Registrar nuevo cliente</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Completa los datos del negocio que quieres inscribir en KobraPay
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Plan */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Plan a contratar <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANS.map(plan => {
                      const Icon = plan.icon;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, assignedPlan: plan.id }))}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            form.assignedPlan === plan.id
                              ? `${plan.border} ${plan.bg}`
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${plan.color} shrink-0`} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                            <p className="text-xs text-muted-foreground">{plan.commission}% comisión</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Datos del cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">
                      <User className="w-3.5 h-3.5 inline mr-1" />
                      Nombre del contacto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Juan García"
                      value={form.clientName}
                      onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">
                      <Building2 className="w-3.5 h-3.5 inline mr-1" />
                      Nombre del negocio
                    </Label>
                    <Input
                      placeholder="Restaurante El Buen Sabor"
                      value={form.clientBusinessName}
                      onChange={e => setForm(f => ({ ...f, clientBusinessName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">
                      <Mail className="w-3.5 h-3.5 inline mr-1" />
                      Correo electrónico <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="juan@negocio.com"
                      value={form.clientEmail}
                      onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Teléfono
                    </Label>
                    <Input
                      placeholder="55 1234 5678"
                      value={form.clientPhone}
                      onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-foreground">Notas adicionales</Label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={3}
                    placeholder="Información relevante del cliente, necesidades específicas, acuerdos previos..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {/* Info del proceso */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">¿Qué pasa después?</p>
                    <p className="text-xs text-blue-600 mt-1">
                      El equipo de KobraPay revisará la solicitud en 24-48 horas. Recibirás una notificación cuando el cliente sea aprobado y empiece a procesar pagos.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !form.clientName || !form.clientEmail || !form.assignedPlan}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground font-semibold py-3"
                >
                  {submitting ? "Registrando..." : "Enviar solicitud de registro"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* --- TAB: Mis Comisiones --- */}
        {activeTab === "comisiones" && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totalEarned)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total comisiones ganadas</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{activeClients}</p>
                <p className="text-xs text-muted-foreground mt-1">Clientes activos</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{pendingClients}</p>
                <p className="text-xs text-muted-foreground mt-1">En proceso de aprobación</p>
              </div>
            </div>

            {/* Tabla de clientes */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Mis clientes registrados</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("registro")}
                  className="gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Nuevo cliente
                </Button>
              </div>

              {loadingClients ? (
                <div className="space-y-0">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                      <div className="flex-1 h-4 bg-gray-100 animate-pulse rounded" />
                      <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : myClients.length === 0 ? (
                <div className="text-center py-16">
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Aún no has registrado clientes</p>
                  <p className="text-sm text-muted-foreground mb-4">Registra tu primer cliente para empezar a ganar comisiones</p>
                  <Button onClick={() => setActiveTab("registro")} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
                    Registrar primer cliente
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Plan</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Comisión %</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ganado</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myClients.map((client) => {
                        const statusCfg = STATUS_CONFIG[String(client.status)] ?? STATUS_CONFIG.pending;
                        const StatusIcon = statusCfg.icon;
                        return (
                          <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-foreground">{client.clientBusinessName || client.clientName}</p>
                              <p className="text-xs text-muted-foreground">{client.clientEmail}</p>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className="text-xs capitalize">
                                {client.assignedPlan || "Sin plan"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-foreground">
                              {client.commissionRate}%
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-emerald-600">
                              {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                                parseFloat(String(client.totalCommissionEarned || "0"))
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Badge variant="outline" className={`gap-1 text-xs ${statusCfg.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusCfg.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tabla de tiers de comisión escalonada */}
            <CommissionTiersTable activeClients={activeClients} />

            {/* Historial de ganancias por pago */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-foreground">Historial de ganancias por pago</h3>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Por cobrar</p>
                      <p className="text-sm font-bold text-amber-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPendingAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Ya cobrado</p>
                      <p className="text-sm font-bold text-emerald-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPaidAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
              {loadingEarnings ? (
                <div className="space-y-0">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                      <div className="flex-1 h-4 bg-gray-100 animate-pulse rounded" />
                      <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : myEarnings.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm font-medium">Sin ganancias registradas aún</p>
                  <p className="text-xs text-muted-foreground mt-1">Cada vez que un cliente tuyo procese un pago, aparecerá aquí automáticamente</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Pago del cliente</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tu comisión</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myEarnings.map((earning) => (
                        <tr key={earning.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3 text-xs text-muted-foreground">
                            {new Date(earning.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-foreground">Cliente #{earning.clientUserId}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-medium text-foreground">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: earning.currency || 'MXN' }).format(parseFloat(String(earning.paymentAmount)))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-emerald-600">
                              +{new Intl.NumberFormat('es-MX', { style: 'currency', currency: earning.currency || 'MXN' }).format(parseFloat(String(earning.commissionAmount)))}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {earning.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Pagado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Por cobrar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Nota informativa */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">¿Cuándo recibes tus comisiones?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Las comisiones se acumulan automáticamente cada vez que un cliente activo procesa un pago.
                  El pago de comisiones se realiza según el ciclo acordado con KobraPay (semanal, quincenal o mensual).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PROGRAMA DE REFERIDOS ─── */}
        {activeTab === "referidos" && (
          <div className="space-y-6">
            {/* Header del programa */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-foreground">
              <div className="flex items-center gap-3 mb-3">
                <Handshake className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">Programa de Referidos KobraPay</h2>
                  <p className="text-emerald-100 text-sm">Gana comisiones recurrentes por cada cliente que actives</p>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-4 mt-4">
                <p className="text-xs text-emerald-100 mb-1">Tu código de referido</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold tracking-widest">
                    {loadingReferral ? "..." : referralInfo?.referralCode || `KP-${String(user?.id || "0000").padStart(4, "0")}`}
                  </span>
                  <button
                    onClick={() => {
                      const code = referralInfo?.referralCode || `KP-${String(user?.id || "0000").padStart(4, "0")}`;
                      navigator.clipboard.writeText(code);
                      toast.success("Código copiado al portapapeles");
                    }}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => {
                      const code = referralInfo?.referralCode || `KP-${String(user?.id || "0000").padStart(4, "0")}`;
                      const msg = `¡Únete a KobraPay y acepta pagos con tarjeta sin hardware! Usa mi código ${code} al registrarte. 👉 https://kobrapay.mx`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="bg-green-500 hover:bg-green-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Smartphone className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Estadísticas de referidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-2xl font-bold text-foreground">{loadingReferral ? "..." : referralInfo?.totalReferrals ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Referidos</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-2xl font-bold text-emerald-600">{loadingReferral ? "..." : referralInfo?.activeReferrals ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Activos</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-2xl font-bold text-amber-600">{loadingReferral ? "..." : referralInfo?.pendingReferrals ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">En Revisión</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {loadingReferral ? "..." : `$${(referralInfo?.totalEarned ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Ganado</p>
              </div>
            </div>

            {/* Cómo funciona */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                ¿Cómo funciona el programa?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Comparte tu código</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Envía tu código a negocios que quieran aceptar pagos con tarjeta</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Registra al cliente</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ve a "Registrar Cliente" y llena sus datos para que KobraPay los active</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Gana comisión mensual</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Recibes tu % de comisión cada mes mientras el cliente siga activo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de clientes referidos */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-foreground">Mis Clientes Referidos</h3>
              </div>
              {loadingReferral ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : !referralInfo?.clients?.length ? (
                <div className="p-8 text-center">
                  <Handshake className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Aún no tienes clientes referidos.</p>
                  <button
                    onClick={() => setActiveTab("registro")}
                    className="mt-3 text-emerald-600 text-sm font-medium hover:underline"
                  >
                    Registrar mi primer cliente →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plan</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Comisión</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Ganado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {referralInfo.clients.map((c) => {
                        const statusMap: Record<string, { label: string; color: string }> = {
                          pending: { label: "Pendiente", color: "bg-amber-50 text-amber-700" },
                          assistant_approved: { label: "Pre-aprobado", color: "bg-blue-50 text-blue-700" },
                          active: { label: "Activo", color: "bg-emerald-50 text-emerald-700" },
                          rejected: { label: "Rechazado", color: "bg-red-50 text-red-700" },
                          inactive: { label: "Inactivo", color: "bg-gray-50 text-muted-foreground" },
                        };
                        const st = statusMap[c.status] || { label: c.status, color: "bg-gray-50 text-muted-foreground" };
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{c.clientName}</p>
                              <p className="text-xs text-muted-foreground">{c.clientEmail}</p>
                              {c.clientBusinessName && <p className="text-xs text-muted-foreground">{c.clientBusinessName}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="capitalize text-muted-foreground">{c.assignedPlan || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{c.commissionRate}%</td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600">
                              ${c.totalCommissionEarned.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
