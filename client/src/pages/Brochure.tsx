import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  FileText, Download, Eye, Printer, TrendingUp, Users, Shield, Zap, Globe,
  DollarSign, HeartHandshake, Bot, Package, CreditCard, RefreshCw, BarChart3,
  Lock, Smartphone, Building2, Award, ArrowRight, CheckCircle, Star,
  Stethoscope, Clock, Layers, Percent,
} from "lucide-react";
import { toast } from "sonner";

// ─── Funcionalidades (se actualizan con cada nueva función) ────────────────────
const KOBRAPAY_FEATURES = [
  {
    icon: CreditCard,
    title: "Links de Pago Instantáneos",
    description: "Crea links de cobro personalizados en segundos. Comparte por WhatsApp, email o redes sociales. Sin hardware, sin contratos.",
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
    title: "Facturación Automática (CFDI 4.0)",
    description: "Genera facturas CFDI 4.0 automáticamente con cada pago. Cumple con el SAT sin esfuerzo adicional.",
    color: "purple",
  },
  {
    icon: Package,
    title: "Catálogo de Productos y POS",
    description: "Gestiona inventario, precios y stock. Cobra en persona con tu teléfono o tablet. Compatible con lectores físicos.",
    color: "amber",
  },
  {
    icon: BarChart3,
    title: "Reportes y Analytics",
    description: "Visualiza tus ventas, ingresos y tendencias en tiempo real. Exporta reportes mensuales detallados.",
    color: "teal",
  },
  {
    icon: Users,
    title: "Gestión de Equipo y Nómina",
    description: "Agrega colaboradores con permisos personalizados. Módulo completo de RH, asistencias y nómina integrado.",
    color: "indigo",
  },
  {
    icon: Shield,
    title: "Seguridad Bancaria",
    description: "Cifrado de extremo a extremo. Cumplimiento PCI DSS. Protección antifraude con IA en tiempo real.",
    color: "slate",
  },
  {
    icon: Zap,
    title: "Widget de Pago Embebido",
    description: "Integra KobraPay en tu sitio web con una línea de código. Acepta pagos sin que el cliente salga de tu página.",
    color: "yellow",
  },
  {
    icon: HeartHandshake,
    title: "Contratos Digitales",
    description: "Crea y firma contratos electrónicamente con validez legal en México. Expediente digital completo.",
    color: "pink",
  },
  {
    icon: Bot,
    title: "IA Asistente (Advisor)",
    description: "Advisor con inteligencia artificial para optimizar tus ventas, estrategias de cobro y operaciones del negocio.",
    color: "violet",
  },
  {
    icon: Globe,
    title: "Pagos Internacionales",
    description: "Acepta pagos en múltiples divisas. Clientes de cualquier parte del mundo con conversión automática.",
    color: "cyan",
  },
  {
    icon: Stethoscope,
    title: "Módulo para Sector Salud",
    description: "Herramienta especializada para clínicas, consultorios, dentistas y hospitales: agenda de citas, historial de pacientes y cobros médicos.",
    color: "rose",
  },
];

// ─── Modelo de comisiones por capas (sin mensualidad) ─────────────────────────
// Este es el modelo real: Stripe → KobraPay → Asociado → Cliente Final
const COMMISSION_LAYERS = [
  {
    layer: "Capa 1",
    who: "Stripe",
    rate: "2.7% + $0.05",
    desc: "Tarifa base de procesamiento de la red de tarjetas (Visa/Mastercard). Aplica en terminal física.",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    example: "$270 + $0.05 en $10,000",
  },
  {
    layer: "Capa 2",
    who: "KobraPay",
    rate: "~3.5%",
    desc: "Comisión de la plataforma por el servicio completo: facturación, seguridad, soporte, IA y todas las herramientas incluidas.",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    example: "$350 en $10,000",
  },
  {
    layer: "Capa 3",
    who: "Asociado (opcional)",
    rate: "0.1% – 0.5%",
    desc: "El asociado puede agregar su propio margen al cotizarle al cliente. Él define cuánto cobra y se lo queda íntegro.",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    example: "$10–$50 en $10,000",
  },
];

// ─── Ejemplo de flujo de comisiones ──────────────────────────────────────────
// Un negocio cobra $10,000 MXN con terminal física:
// Stripe: $270.05 | KobraPay: $350 | Asociado: $20 (0.2%)
// El negocio recibe: $10,000 - $270.05 - $350 - $20 = $9,359.95

// ─── Beneficios del Asociado ──────────────────────────────────────────────────
const ASSOCIATE_BENEFITS = [
  "Sin mensualidad ni inversión inicial",
  "Ganas un % de cada cobro que procesen tus clientes",
  "Ingresos recurrentes mientras el cliente esté activo",
  "Panel de control exclusivo con tus clientes y comisiones",
  "Sales Coach IA personalizado para cerrar más ventas",
  "Simulador de comisiones para cotizar en tiempo real",
  "Materiales de venta y capacitación incluidos",
  "Soporte dedicado para asociados",
];

// ─── Sectores que pueden usar KobraPay ───────────────────────────────────────
const SECTORS = [
  { icon: "🏪", name: "Comercio minorista" },
  { icon: "🍽️", name: "Restaurantes y food service" },
  { icon: "🏥", name: "Clínicas y consultorios" },
  { icon: "🦷", name: "Dentistas y odontología" },
  { icon: "💆", name: "Spas y estética" },
  { icon: "🏋️", name: "Gimnasios y fitness" },
  { icon: "🏗️", name: "Construcción y servicios" },
  { icon: "📦", name: "E-commerce y logística" },
  { icon: "🎓", name: "Escuelas y capacitación" },
  { icon: "⚖️", name: "Despachos legales" },
  { icon: "🏠", name: "Inmobiliarias" },
  { icon: "🚗", name: "Agencias automotrices" },
];

// ─── Componente de brochure visual ────────────────────────────────────────────
function BrochureContent({ lastUpdated }: { lastUpdated: string }) {
  const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_navy_27dde1ac.png";

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
    <div id="brochure-content" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

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
            Sin mensualidades. Solo pagas una pequeña comisión cuando cobras.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Sin mensualidades
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              PCI DSS Certificado
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Activación en 24h
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Actualizado: {lastUpdated}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Modelo de negocio: Sin mensualidad ── */}
      <div className="p-8 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Percent className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Modelo 100% por comisión — Sin mensualidades</h3>
            <p className="text-sm text-emerald-700">Solo pagas cuando cobras. Si no cobras, no pagas nada.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {COMMISSION_LAYERS.map((layer) => (
            <div key={layer.layer} className={`rounded-xl border p-4 ${layer.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">{layer.layer}</span>
                <span className="text-lg font-black">{layer.rate}</span>
              </div>
              <p className="font-bold text-sm mb-1">{layer.who}</p>
              <p className="text-xs leading-relaxed opacity-80">{layer.desc}</p>
              <p className="text-xs font-semibold mt-2 opacity-70">Ej: {layer.example}</p>
            </div>
          ))}
        </div>
        {/* Ejemplo numérico */}
        <div className="bg-white rounded-xl border border-emerald-200 p-5">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Ejemplo real: Cobro de $10,000 MXN con terminal física
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monto que cobra el negocio</span>
              <span className="font-bold text-gray-900">$10,000.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">— Stripe (2.7% + $0.05)</span>
              <span className="text-red-500">-$270.05</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">— KobraPay (~3.5%)</span>
              <span className="text-red-500">-$350.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">— Comisión del Asociado (0.2%)</span>
              <span className="text-blue-500">-$20.00</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="font-bold text-gray-900">El negocio recibe</span>
              <span className="font-black text-emerald-600 text-lg">$9,359.95</span>
            </div>
            <p className="text-xs text-gray-400 text-center pt-1">Costo efectivo total: 6.4% — El asociado gana $20 por esa sola transacción</p>
          </div>
        </div>
      </div>

      {/* ── Por qué KobraPay ── */}
      <div className="p-8 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Por qué elegir KobraPay?</h3>
        <p className="text-gray-600 mb-6">
          La única plataforma en México que combina pagos, facturación, gestión de equipo, nómina
          y herramientas especializadas por sector en un solo lugar. Sin mensualidades, sin múltiples proveedores.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "+500", label: "Negocios activos", icon: Building2 },
            { value: "99.9%", label: "Uptime garantizado", icon: Zap },
            { value: "24/7", label: "Soporte con IA", icon: Bot },
            { value: "$0", label: "Mensualidad fija", icon: DollarSign },
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
        <h3 className="text-xl font-bold text-gray-900 mb-2">Funcionalidades incluidas</h3>
        <p className="text-sm text-gray-500 mb-6">Todo incluido sin costo adicional. Activa solo lo que necesitas.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KOBRAPAY_FEATURES.map(feature => {
            const Icon = feature.icon;
            const colorClass = colorMap[feature.color] || colorMap.emerald;
            return (
              <div key={feature.title} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{feature.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        {/* Nota aclaratoria sobre módulo médico */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Nota sobre el Módulo para Sector Salud:</strong> Esta herramienta está diseñada
            para que <em>clínicas, consultorios, dentistas y hospitales</em> gestionen sus cobros,
            citas y pacientes dentro de KobraPay. No incluye servicios médicos — es una plataforma
            de gestión y pagos especializada para negocios del sector salud.
          </div>
        </div>
      </div>

      {/* ── Sectores ── */}
      <div className="p-8 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Para qué tipo de negocio?</h3>
        <p className="text-sm text-gray-500 mb-5">KobraPay funciona para cualquier negocio que cobre a sus clientes.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SECTORS.map(s => (
            <div key={s.name} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2.5">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs font-medium text-gray-700">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Programa de Asociados ── */}
      <div className="p-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Programa de Asociados KobraPay</h3>
            <p className="text-sm text-blue-700">Gana ingresos recurrentes sin inversión inicial</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">¿Cómo gana el Asociado?</h4>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3 text-sm">
              <p className="text-blue-900">
                El asociado registra negocios en KobraPay. Por cada cobro que procese ese negocio,
                el asociado recibe un porcentaje que él mismo define al cotizar al cliente.
              </p>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-gray-900 mb-2">Ejemplo:</p>
                <p className="text-gray-600">Un restaurante procesa $500,000/mes.</p>
                <p className="text-gray-600">El asociado cobra 0.3% de margen.</p>
                <p className="font-bold text-blue-700 mt-1">El asociado gana: $1,500/mes de ese solo cliente.</p>
                <p className="text-xs text-gray-400 mt-1">Con 10 clientes similares: $15,000/mes recurrentes</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800 mb-3">Beneficios del Asociado</h4>
            {ASSOCIATE_BENEFITS.map(b => (
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
            { icon: Award, title: "SAT / CFDI 4.0", desc: "Facturación certificada" },
            { icon: Globe, title: "Datos seguros", desc: "Protección total" },
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
          Sin mensualidades, sin contratos de permanencia, sin costos ocultos.
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
          © {new Date().getFullYear()} KobraPay · Todos los derechos reservados · Actualizado: {lastUpdated}
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
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  );

  // Auto-refresh cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(
        new Date().toLocaleString("es-MX", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      );
      toast.info("Brochure actualizado automáticamente", { duration: 2000 });
    }, 60 * 60 * 1000); // cada hora
    return () => clearInterval(interval);
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    toast.info("Generando PDF...", { duration: 3000 });
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Por favor permite ventanas emergentes para descargar el PDF");
        return;
      }
      const content = document.getElementById("brochure-content");
      if (!content) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>KobraPay - Brochure de Ventas</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print { body { margin: 0; padding: 0; } @page { margin: 0; size: A4; } }
            body { font-family: system-ui, -apple-system, sans-serif; }
          </style>
        </head>
        <body>
          ${content.outerHTML}
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 1000); };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("PDF generado. Usa 'Guardar como PDF' en el diálogo de impresión.");
    } catch {
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
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
              <Eye className="w-4 h-4" />
              {showPreview ? "Ocultar" : "Ver"} Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
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
            <strong>Brochure actualizado automáticamente cada hora.</strong> Refleja siempre las
            funcionalidades actuales de KobraPay. Última actualización: <strong>{lastUpdated}</strong>.
            Descárgalo como PDF para presentarlo a tus clientes o imprimirlo.
          </div>
        </div>

        {/* Preview */}
        {showPreview && <BrochureContent lastUpdated={lastUpdated} />}
      </div>
    </DashboardLayout>
  );
}
