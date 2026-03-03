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
  ChevronDown, ChevronUp, ShieldCheck, HelpCircle, Store
} from "lucide-react";

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
    commission: 3.0,
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
    commission: 2.5,
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
    commission: 2.0,
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
    commission: 1.5,
    price: "Negociable por volumen",
    description: "Para corporativos y cadenas con alto volumen de transacciones que necesitan integración API y SLA garantizado.",
    pitch: "¿Tu cliente es una cadena o corporativo? Enterprise les da integración directa con sus sistemas actuales y un gestor de cuenta dedicado.",
    features: [
      "Todo lo del plan Custom",
      "Integración API completa con sus sistemas",
      "Comisión desde 1.5% (negociable por volumen)",
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
  const [kobrapayRate, setKobrapayRate] = useState("1.5");
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
      const sR = mode === "online" ? 0.029 : 0.027;
      const sF = mode === "online" ? 0.30 : 0.05;
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
  const stripeRate = mode === "online" ? 0.029 : 0.027;
  const stripeFixed = mode === "online" ? 0.30 : 0.05;
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
      kobrapayRate: parseFloat(kobrapayRate) || 1.5,
      ivaRate: parseFloat(ivaRate) || 16,
      monthlyVolume: monthly > 0 ? monthly : undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-white">
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
          <button onClick={() => setMode("online")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${mode === "online" ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
            <Smartphone className="w-4 h-4" /> Cobro Online
          </button>
          <button onClick={() => setMode("terminal")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${mode === "terminal" ? "bg-violet-600 text-white border-violet-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-violet-300"}`}>
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
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Monto por cobro (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="10000" min="0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Volumen mensual (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="500000" min="0" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Opcional: proyección mensual</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">% Comisión KobraPay</label>
            <div className="relative">
              <input type="number" value={kobrapayRate} onChange={e => setKobrapayRate(e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="1.5" step="0.1" min="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Sugerido: 1.5% / 0.8% terminal</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">% IVA sobre comisión</label>
            <div className="relative">
              <input type="number" value={ivaRate} onChange={e => setIvaRate(e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="16" step="1" min="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>
        {monto > 0 && (
          <div className="space-y-3">
            {/* Desglose por transacción */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Desglose por cobro</p>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Monto bruto</span><span className="font-semibold">${monto.toLocaleString("es-MX", {minimumFractionDigits:2})} MXN</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Comisión Stripe ({mode === "online" ? "2.9% + $0.30" : "2.7% + $0.05"})</span><span className="text-red-500">-${stripeFee.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Comisión KobraPay ({kobrapayRate}%)</span><span className="text-red-500">-${kpFee.toFixed(2)}</span></div>
              {iva > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">IVA sobre comisión ({ivaRate}%)</span><span className="text-orange-500">-${kpIva.toFixed(2)}</span></div>}
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Total deducido</span><span className="font-semibold text-red-600">-${totalDeducted.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-bold text-gray-900">Neto para el negocio</span><span className="font-black text-emerald-600 text-lg">${netForBusiness.toLocaleString("es-MX", {minimumFractionDigits:2})}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">Tasa efectiva total</span><span className="text-gray-500">{effectiveRate.toFixed(2)}%</span></div>
              </div>
            </div>
            {/* Proyección mensual */}
            {monthly > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase mb-3">📊 Proyección Mensual — ${monthly.toLocaleString("es-MX")} MXN/mes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Volumen bruto</p>
                    <p className="font-bold text-gray-900">${monthly.toLocaleString("es-MX", {minimumFractionDigits:0})} MXN</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Total comisiones</p>
                    <p className="font-bold text-red-600">-${(monthly - monthlyNet).toLocaleString("es-MX", {minimumFractionDigits:0})} MXN</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Neto mensual</p>
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
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Comparativa vs competencia</p>
              <div className="space-y-1.5">
                {competitors.map(c => {
                  const cFee = monto * (c.rate / 100) + c.fixed;
                  const cNet = monto - cFee;
                  const isBetter = netForBusiness > cNet;
                  const diff = netForBusiness - cNet;
                  return (
                    <div key={c.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-600">{c.name} ({c.rate}%{c.fixed > 0 ? ` + $${c.fixed}` : ""})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Neto: ${cNet.toLocaleString("es-MX", {minimumFractionDigits:2})}</span>
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-700 text-white font-semibold py-3 rounded-xl hover:opacity-90"
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
              <h3 className="font-bold text-gray-900 text-lg">Enviar Cotización por Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {emailSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-gray-900 mb-2">¡Cotización enviada!</p>
                <p className="text-gray-500 text-sm mb-4">Se envió a <strong>{prospectEmail}</strong> con el desglose completo y la comparativa vs competencia.</p>
                {aiPreview && (
                  <div className="bg-indigo-50 rounded-xl p-3 text-left mb-4">
                    <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">✨ Explicación IA incluida:</p>
                    <p className="text-sm text-gray-700">{aiPreview}</p>
                  </div>
                )}
                <button onClick={() => setShowEmailModal(false)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold">Cerrar</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800">
                  <p className="font-semibold mb-1">✨ La IA generará una explicación personalizada</p>
                  <p className="text-xs">El email incluirá: desglose de comisiones, proyección mensual (si aplica), comparativa vs competencia y análisis IA.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Nombre del prospecto</label>
                  <input type="text" value={prospectName} onChange={e => setProspectName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Ej: Carlos Martínez" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Email del prospecto</label>
                  <input type="email" value={prospectEmail} onChange={e => setProspectEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="prospecto@email.com" />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                  <p className="font-semibold text-gray-700 mb-1">Resumen de la cotización:</p>
                  <p>Monto: ${monto.toLocaleString("es-MX")} MXN · Modo: {mode === "online" ? "Online" : "Terminal"} · Neto: ${netForBusiness.toLocaleString("es-MX", {minimumFractionDigits:2})} MXN · Tasa: {effectiveRate.toFixed(2)}%</p>
                  {monthly > 0 && <p className="mt-1">Proyección mensual: ${monthlyNet.toLocaleString("es-MX", {minimumFractionDigits:0})} MXN neto/mes</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowEmailModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendQuoteMutation.isPending}
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
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
    a: "KobraPay cobra desde 1.5% por cobro online (más IVA sobre la comisión). Comparado con Mercado Pago (3.29%), PayPal (3.5%), Clip (3.6%) y Conekta (2.9%), KobraPay es más económico. Sin mensualidad fija, sin contrato de permanencia y sin hardware para cobros online. Usa el simulador de arriba para ver el desglose exacto con los números de tu negocio.",
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
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-5 text-white">
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
                  <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-6 pb-4">
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
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
  inactive: { label: "Inactivo", color: "bg-gray-50 text-gray-500 border-gray-200", icon: XCircle },
};

type Tab = "manual" | "registro" | "comisiones";

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
  ];

  return (
    <DashboardLayout title="Portal del Asociado">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portal del Asociado</h1>
            <p className="text-sm text-gray-500 mt-1">Bienvenido, {user?.name || "Asociado"}</p>
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
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "comisiones" && pendingClients > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
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
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
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
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-white font-bold text-xl">{plan.name}</span>
                        </div>
                        <p className="text-white/90 text-xs">{plan.description}</p>
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        Tu comisión: {plan.commission}%
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-4 space-y-3">
                      {/* Argumento de venta */}
                      <div className={`${plan.bg} rounded-lg p-3`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Argumento de venta</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{plan.argument}</p>
                      </div>

                      {/* Expandible: caracteristicas */}
                      {isSelected && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Incluye</p>
                          <ul className="space-y-1.5">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-gray-500 pt-1">
                            <span className="font-semibold">Ideal para:</span> {plan.bestFor}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-400">{plan.bestFor.split(",")[0]}...</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm(f => ({ ...f, assignedPlan: plan.id }));
                              setActiveTab("registro");
                            }}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r ${plan.headerBg} text-white`}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Registrar cliente
                          </button>
                          <span className="text-xs text-gray-400">
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
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
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
                      <p className="text-xs font-semibold text-gray-900 mb-1">{s.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-gray-300 shrink-0 mx-2 mt-[-20px]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Catalogo de Terminales Stripe */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-4 text-white">
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
                  <div className="bg-gray-900 p-5 flex items-center justify-center" style={{minHeight:"140px"}}>
                    <div className="text-center">
                      <div className="w-16 h-24 bg-gray-700 rounded-xl mx-auto mb-2 flex items-center justify-center border-2 border-gray-600">
                        <div className="w-10 h-6 bg-gray-500 rounded-sm" />
                      </div>
                      <span className="text-white text-xs font-bold">Stripe Reader S700</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900">Stripe Reader S700</h4>
                      <span className="text-lg font-black text-violet-600">~$299 USD</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Terminal inteligente con pantalla táctil. Acepta chip, banda magnética y NFC (Apple Pay, Google Pay). Conexión WiFi y Ethernet.</p>
                    <div className="space-y-1.5">
                      {["Pantalla táctil de 5\"","WiFi + Ethernet","Chip + NFC + Banda","Impresora opcional","Batería recargable"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
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
                  <div className="bg-gray-800 p-5 flex items-center justify-center" style={{minHeight:"140px"}}>
                    <div className="text-center">
                      <div className="w-12 h-20 bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center border-2 border-gray-500">
                        <div className="w-8 h-5 bg-gray-400 rounded-sm" />
                      </div>
                      <span className="text-white text-xs font-bold">BBPOS WisePOS E</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900">BBPOS WisePOS E</h4>
                      <span className="text-lg font-black text-violet-600">~$249 USD</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Terminal compacta y portátil. Perfecta para negocios móviles o con espacio reducido. Batería de larga duración.</p>
                    <div className="space-y-1.5">
                      {["Pantalla táctil de 3.5\"","WiFi + Bluetooth","Chip + NFC","Batería 8+ horas","Diseño compacto"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
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
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white">
                <h2 className="text-lg font-bold">Registrar nuevo cliente</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Completa los datos del negocio que quieres inscribir en KobraPay
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Plan */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
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
                            <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                            <p className="text-xs text-gray-500">{plan.commission}% comisión</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Datos del cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">
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
                    <Label className="text-sm font-semibold text-gray-700">
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
                    <Label className="text-sm font-semibold text-gray-700">
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
                    <Label className="text-sm font-semibold text-gray-700">
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
                  <Label className="text-sm font-semibold text-gray-700">Notas adicionales</Label>
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3"
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
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totalEarned)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total comisiones ganadas</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
                <p className="text-xs text-gray-500 mt-1">Clientes activos</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{pendingClients}</p>
                <p className="text-xs text-gray-500 mt-1">En proceso de aprobación</p>
              </div>
            </div>

            {/* Tabla de clientes */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Mis clientes registrados</h3>
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
                  <UserPlus className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aún no has registrado clientes</p>
                  <p className="text-sm text-gray-400 mb-4">Registra tu primer cliente para empezar a ganar comisiones</p>
                  <Button onClick={() => setActiveTab("registro")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Registrar primer cliente
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comisión %</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ganado</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myClients.map((client) => {
                        const statusCfg = STATUS_CONFIG[String(client.status)] ?? STATUS_CONFIG.pending;
                        const StatusIcon = statusCfg.icon;
                        return (
                          <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{client.clientBusinessName || client.clientName}</p>
                              <p className="text-xs text-gray-400">{client.clientEmail}</p>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className="text-xs capitalize">
                                {client.assignedPlan || "Sin plan"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-gray-700">
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

            {/* Nota informativa */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">¿Cuándo recibes tus comisiones?</p>
                <p className="text-xs text-gray-500 mt-1">
                  Las comisiones se acumulan automáticamente cada vez que un cliente activo procesa un pago. 
                  El pago de comisiones se realiza según el ciclo acordado con KobraPay (semanal, quincenal o mensual).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
