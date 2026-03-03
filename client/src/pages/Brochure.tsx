import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import {
  FileText, Download, Eye, Printer, Share2, Star, CheckCircle,
  TrendingUp, Users, Shield, Zap, Globe, DollarSign, HeartHandshake,
  Bot, Package, CreditCard, RefreshCw, BarChart3, Lock, Smartphone,
  Building2, Award, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Datos del brochure (se actualizan con cada nueva función) ─────────────────
const KOBRAPAY_FEATURES = [
  {
    icon: CreditCard,
    title: "Links de Pago Instantáneos",
    description: "Crea links de cobro personalizados en segundos. Comparte por WhatsApp, email o redes sociales.",
    color: "emerald",
  },
  {
    icon: RefreshCw,
    title: "Cobros Recurrentes",
    description: "Automatiza suscripciones y pagos periódicos. El sistema cobra automáticamente sin intervención manual.",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Facturación Automática",
    description: "Genera facturas CFDI 4.0 automáticamente con cada pago. Cumple con el SAT sin esfuerzo.",
    color: "purple",
  },
  {
    icon: Package,
    title: "Catálogo de Productos",
    description: "Gestiona tu inventario, precios y stock. Vende directamente desde tu catálogo digital.",
    color: "amber",
  },
  {
    icon: BarChart3,
    title: "Reportes y Analytics",
    description: "Visualiza tus ventas, ingresos y tendencias en tiempo real. Exporta reportes mensuales.",
    color: "teal",
  },
  {
    icon: Smartphone,
    title: "Punto de Venta (POS)",
    description: "Cobra en persona con tu teléfono o tablet. Compatible con lectores de tarjeta físicos.",
    color: "rose",
  },
  {
    icon: Users,
    title: "Gestión de Equipo",
    description: "Agrega colaboradores con permisos personalizados. Controla quién puede ver qué.",
    color: "indigo",
  },
  {
    icon: Shield,
    title: "Seguridad Bancaria",
    description: "Cifrado de extremo a extremo. Cumplimiento PCI DSS. Protección antifraude en tiempo real.",
    color: "slate",
  },
  {
    icon: Zap,
    title: "Widget de Pago",
    description: "Integra KobraPay en tu sitio web con una línea de código. Acepta pagos sin salir de tu página.",
    color: "yellow",
  },
  {
    icon: HeartHandshake,
    title: "Contratos Digitales",
    description: "Crea y firma contratos electrónicamente. Validez legal en México.",
    color: "pink",
  },
  {
    icon: Bot,
    title: "IA Asistente",
    description: "Advisor con inteligencia artificial para optimizar tus ventas, estrategias y operaciones.",
    color: "violet",
  },
  {
    icon: Globe,
    title: "Pagos Internacionales",
    description: "Acepta pagos en múltiples divisas. Clientes de cualquier parte del mundo.",
    color: "cyan",
  },
  {
    icon: Building2,
    title: "Módulo de Nómina y RH",
    description: "Gestiona empleados, asistencias, vacaciones y nómina desde una sola plataforma.",
    color: "orange",
  },
  {
    icon: HeartHandshake,
    title: "Soporte con IA 24/7",
    description: "Asistente de soporte técnico disponible las 24 horas. Resuelve problemas al instante.",
    color: "emerald",
  },
];

const PLANS = [
  {
    name: "Básico",
    price: "$299",
    period: "/ mes",
    description: "Para emprendedores y freelancers",
    commission: "3.5% + $3.50",
    features: ["Links de pago ilimitados", "Facturación básica", "1 usuario", "Soporte por email"],
    color: "gray",
    popular: false,
  },
  {
    name: "Profesional",
    price: "$799",
    period: "/ mes",
    description: "Para negocios en crecimiento",
    commission: "2.9% + $2.90",
    features: ["Todo lo del Básico", "Cobros recurrentes", "5 usuarios", "POS incluido", "Reportes avanzados", "Soporte prioritario"],
    color: "emerald",
    popular: true,
  },
  {
    name: "Empresarial",
    price: "$1,999",
    period: "/ mes",
    description: "Para empresas y corporativos",
    commission: "2.4% + $2.40",
    features: ["Todo lo del Profesional", "Usuarios ilimitados", "API completa", "Nómina y RH", "Módulo médico", "Gerente de cuenta dedicado"],
    color: "blue",
    popular: false,
  },
];

const ASSOCIATE_COMMISSIONS = [
  { clients: "1-5", rate: "10%", monthly: "$299–$1,495" },
  { clients: "6-15", rate: "12%", monthly: "$1,794–$5,382" },
  { clients: "16-30", rate: "15%", monthly: "$7,182–$13,455" },
  { clients: "31+", rate: "18%", monthly: "$13,455+" },
];

// ─── Componente de brochure visual ────────────────────────────────────────────
function BrochureContent({ forPrint = false }: { forPrint?: boolean }) {
  const KOBRAPAY_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png";

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    amber: "bg-amber-100 text-amber-700",
    teal: "bg-teal-100 text-teal-700",
    rose: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
    slate: "bg-slate-100 text-slate-700",
    yellow: "bg-yellow-100 text-yellow-700",
    pink: "bg-pink-100 text-pink-700",
    violet: "bg-violet-100 text-violet-700",
    cyan: "bg-cyan-100 text-cyan-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <div id="brochure-content" className={`bg-white ${forPrint ? "p-0" : "rounded-2xl border border-gray-200 shadow-sm overflow-hidden"}`}>
      {/* ── Portada ── */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-teal-400 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-8">
            <img src={KOBRAPAY_LOGO} alt="KobraPay" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-4xl font-black tracking-tight">KobraPay</h1>
              <p className="text-emerald-400 font-medium">Cobra fácil, cobra global</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3 leading-tight">
            La plataforma de pagos<br />
            <span className="text-emerald-400">más completa de México</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
            Todo lo que necesitas para cobrar, facturar, gestionar tu equipo y hacer crecer tu negocio.
            Desde links de pago hasta nómina y módulo médico, en una sola plataforma.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Sin mensualidad mínima
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              PCI DSS Certificado
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Activación en 24h
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Por qué KobraPay ── */}
      <div className="p-8 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Por qué elegir KobraPay?</h3>
        <p className="text-gray-600 mb-6">
          Somos la única plataforma en México que combina pagos, facturación, gestión de equipo, nómina
          y módulo médico en un solo lugar. Sin complicaciones, sin múltiples proveedores.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "+500", label: "Empresas activas", icon: Building2 },
            { value: "99.9%", label: "Uptime garantizado", icon: Zap },
            { value: "24/7", label: "Soporte con IA", icon: Bot },
            { value: "2.4%", label: "Comisión mínima", icon: DollarSign },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <Icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Funcionalidades ── */}
      <div className="p-8 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Funcionalidades incluidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KOBRAPAY_FEATURES.map(feature => {
            const Icon = feature.icon;
            const colorClass = colorMap[feature.color] || colorMap.emerald;
            return (
              <div key={feature.title} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{feature.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Planes ── */}
      <div className="p-8 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Planes y Precios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl border-2 p-5 relative ${
                plan.popular ? "border-emerald-400 shadow-lg" : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-white border-0 px-3 py-0.5 text-xs">
                    <Star className="w-3 h-3 mr-1 fill-white" />
                    Más popular
                  </Badge>
                </div>
              )}
              <h4 className="font-bold text-gray-900 text-lg">{plan.name}</h4>
              <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mb-4">Comisión: {plan.commission}</p>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Programa de Asociados ── */}
      <div className="p-8 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Programa de Asociados KobraPay</h3>
        <p className="text-gray-600 mb-6">
          Únete a nuestra red de asociados y gana comisiones recurrentes por cada cliente que registres.
          Sin límite de ingresos, sin inversión inicial.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Tabla de comisiones</h4>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Clientes activos</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Comisión</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Ingreso mensual</th>
                  </tr>
                </thead>
                <tbody>
                  {ASSOCIATE_COMMISSIONS.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.clients}</td>
                      <td className="px-4 py-2.5 text-emerald-600 font-bold">{row.rate}</td>
                      <td className="px-4 py-2.5 text-gray-700">{row.monthly}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Beneficios del Asociado</h4>
            {[
              "Comisiones recurrentes mensuales",
              "Panel de control exclusivo para asociados",
              "Sales Coach IA personalizado",
              "Simulador de comisiones en tiempo real",
              "Catálogo de planes para presentar a clientes",
              "Creación de planes personalizados",
              "Materiales de venta y capacitación",
              "Soporte dedicado para asociados",
            ].map(b => (
              <div key={b} className="flex items-center gap-2 text-sm text-gray-700">
                <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Seguridad ── */}
      <div className="p-8 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Seguridad y Cumplimiento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, title: "PCI DSS", desc: "Nivel 1 certificado" },
            { icon: Lock, title: "TLS 1.3", desc: "Cifrado en tránsito" },
            { icon: Award, title: "SAT", desc: "CFDI 4.0 certificado" },
            { icon: Globe, title: "GDPR", desc: "Protección de datos" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <Icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="p-8 bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-center">
        <h3 className="text-2xl font-bold mb-2">¿Listo para empezar?</h3>
        <p className="text-emerald-100 mb-4">
          Regístrate hoy y empieza a cobrar en menos de 24 horas.
          Sin contratos de permanencia, sin costos ocultos.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium">
            📞 +52 (55) 1234-5678
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium">
            📧 ventas@kobrapay.mx
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium">
            🌐 www.kobrapay.mx
          </div>
        </div>
        <p className="text-emerald-200 text-xs mt-4">
          © {new Date().getFullYear()} KobraPay · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Brochure() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    toast.info("Generando PDF...", { duration: 3000 });
    try {
      // Use browser's built-in print to PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Por favor permite ventanas emergentes para descargar el PDF");
        return;
      }
      const content = document.getElementById('brochure-content');
      if (!content) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>KobraPay - Brochure de Ventas</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 0; size: A4; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; }
          </style>
        </head>
        <body>
          ${content.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("PDF generado. Usa 'Guardar como PDF' en el diálogo de impresión.");
    } catch (err) {
      toast.error("Error al generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout title="Brochure de Ventas">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-emerald-700 flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Brochure de Ventas</h1>
              <p className="text-sm text-gray-500">Presentación completa para mostrar a tus clientes</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1.5"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Ocultar" : "Ver"} Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <Download className="w-4 h-4" />
              {isGenerating ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <strong>Manual de ventas actualizado automáticamente.</strong> Este brochure refleja todas las
            funcionalidades actuales de KobraPay. Cada vez que se agregue una nueva función, este documento
            se actualiza automáticamente. Descárgalo como PDF para presentarlo a tus clientes.
          </div>
        </div>

        {/* Preview */}
        {showPreview && <BrochureContent />}
      </div>
    </DashboardLayout>
  );
}
