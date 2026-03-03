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
  Handshake, ArrowRight
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

        {/* ─── TAB: Manual de Ventas ─── */}
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

            {/* Tips rápidos */}
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

                      {/* Expandible: características */}
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
          </div>
        )}

        {/* ─── TAB: Registrar Cliente ─── */}
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

        {/* ─── TAB: Mis Comisiones ─── */}
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
