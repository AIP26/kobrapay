import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight, Building2, Globe, Zap, Clock, CheckCircle2,
  DollarSign, Banknote, Send, Bell, Shield,
  TrendingUp, Wallet, AlertCircle, ChevronRight, Star
} from "lucide-react";
import { toast } from "sonner";

const LOGO_NAVY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_v2_52d63331.png";

const TRANSFER_TYPES = [
  {
    id: "spei",
    title: "Transferencia SPEI",
    subtitle: "Transferencias nacionales en México",
    icon: Building2,
    gradient: "from-emerald-500 to-teal-600",
    badgeText: "Próximamente",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    time: "Mismo día hábil",
    cost: "Sin costo adicional",
    limit: "Hasta $999,999 MXN",
    features: [
      "Transferencias a cualquier banco mexicano",
      "CLABE interbancaria de 18 dígitos",
      "Confirmación instantánea",
      "Comprobante descargable",
      "Historial completo en tu panel",
    ],
    highlight: "La forma más rápida de mover dinero dentro de México. Sin comisiones ocultas.",
  },
  {
    id: "wire",
    title: "Wire Transfer Internacional",
    subtitle: "Transferencias a cualquier país del mundo",
    icon: Globe,
    gradient: "from-blue-500 to-indigo-600",
    badgeText: "Roadmap Q3 2026",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    time: "1–3 días hábiles",
    cost: "Comisión según destino",
    limit: "Según regulación FATF",
    features: [
      "Más de 150 países disponibles",
      "Tipos de cambio competitivos",
      "Cumplimiento FATF y SAT",
      "Powered by Wise Business API",
      "Seguimiento en tiempo real",
    ],
    highlight: "Envía dinero al extranjero con los mejores tipos de cambio del mercado.",
  },
  {
    id: "zelle",
    title: "Tipo Zelle (USA ↔ México)",
    subtitle: "Envíos rápidos entre México y Estados Unidos",
    icon: Zap,
    gradient: "from-purple-500 to-violet-600",
    badgeText: "Roadmap Q4 2026",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    time: "Minutos",
    cost: "Tarifa plana competitiva",
    limit: "Hasta $10,000 USD/día",
    features: [
      "Envío con solo número de teléfono o email",
      "Conversión automática MXN–USD",
      "Ideal para pagos a proveedores en USA",
      "Sin cuenta bancaria en USA requerida",
      "Notificaciones instantáneas",
    ],
    highlight: "La solución más práctica para negocios con operaciones en México y USA.",
  },
  {
    id: "crypto",
    title: "Transferencia Cripto",
    subtitle: "USDT, USDC y BTC a nivel global",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-600",
    badgeText: "Roadmap 2027",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    time: "Minutos (blockchain)",
    cost: "Gas fee mínimo",
    limit: "Sin límite",
    features: [
      "USDT, USDC y Bitcoin",
      "Conversión automática a MXN",
      "Ideal para pagos internacionales",
      "Sin intermediarios bancarios",
      "Máxima privacidad y seguridad",
    ],
    highlight: "El futuro de los pagos internacionales. Sin fronteras, sin límites.",
  },
];

const STATS = [
  { icon: Shield, label: "Encriptación", value: "256-bit SSL", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Clock, label: "Disponibilidad", value: "24/7 · 365 días", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: DollarSign, label: "Sin mensualidad", value: "Paga solo al usar", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: CheckCircle2, label: "Regulación", value: "SAT + CNBV", color: "text-amber-600", bg: "bg-amber-50" },
];

export default function Transfers() {
  const handleNotify = () => {
    toast.success("¡Te notificaremos cuando esté disponible!", {
      description: "Recibirás un correo en cuanto activemos las transferencias.",
    });
  };

  return (
    <DashboardLayout title="Transferencias">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Hero banner */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f2744 0%, #0c3b5e 60%, #0a4a3a 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #00c896 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0ea5e9 0%, transparent 40%)" }} />
          <div className="relative px-8 py-10 flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_NAVY} alt="KobraPay" className="w-10 h-10 object-contain" />
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-xs font-semibold">
                  En desarrollo activo
                </Badge>
              </div>
              <h1 className="text-3xl font-black text-white mb-3 leading-tight">
                Transferencias <span style={{ color: "#00c896" }}>KobraPay</span>
              </h1>
              <p className="text-gray-300 text-base leading-relaxed max-w-xl">
                Estamos construyendo el módulo de transferencias más completo de México: SPEI nacional, Wire internacional, tipo Zelle USA-México y cripto. Todo en un solo panel.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <Button
                  onClick={handleNotify}
                  className="gap-2 font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg, #00c896, #0ea5e9)" }}
                >
                  <Bell className="w-4 h-4" />
                  Notificarme cuando esté listo
                </Button>
                <span className="text-gray-400 text-xs">Sin compromiso · Gratis</span>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,200,150,0.15)", border: "1px solid rgba(0,200,150,0.3)" }}>
                <ArrowLeftRight className="w-12 h-12" style={{ color: "#00c896" }} />
              </div>
              <span className="text-xs text-gray-400 text-center">Cobra fácil,<br />cobra global</span>
            </div>
          </div>
        </div>

        {/* Stats de confianza */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 flex items-center gap-3`}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-sm font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tipos de transferencia */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            Tipos de transferencia disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TRANSFER_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className={`bg-gradient-to-r ${type.gradient} px-5 py-4 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <Badge className={`text-xs font-semibold border ${type.badgeClass}`}>
                        {type.badgeText}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg">{type.title}</h3>
                    <p className="text-white/80 text-sm">{type.subtitle}</p>
                  </div>

                  <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600 italic border-l-4 border-gray-200 pl-3">
                      "{type.highlight}"
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Tiempo", value: type.time, icon: Clock },
                        { label: "Costo", value: type.cost, icon: DollarSign },
                        { label: "Límite", value: type.limit, icon: Banknote },
                      ].map((detail) => {
                        const DetailIcon = detail.icon;
                        return (
                          <div key={detail.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                            <DetailIcon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-400">{detail.label}</p>
                            <p className="text-xs font-semibold text-gray-700 leading-tight mt-0.5">{detail.value}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5">
                      {type.features.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleNotify}
                      variant="outline"
                      className="w-full gap-2 text-sm font-semibold border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <Bell className="w-4 h-4" />
                      Notificarme cuando esté disponible
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roadmap visual */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Roadmap de Transferencias KobraPay</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-0 overflow-x-auto">
              {[
                { phase: "Q2 2026", title: "SPEI Nacional", desc: "Transferencias a cualquier banco mexicano", color: "bg-emerald-500" },
                { phase: "Q3 2026", title: "Wire Internacional", desc: "Powered by Wise Business API", color: "bg-blue-500" },
                { phase: "Q4 2026", title: "Tipo Zelle USA-MX", desc: "Envíos rápidos México ↔ USA", color: "bg-purple-500" },
                { phase: "2027", title: "Cripto (USDT/BTC)", desc: "Pagos globales sin fronteras", color: "bg-amber-500" },
              ].map((item, i, arr) => (
                <div key={i} className="flex items-center gap-0 min-w-0 flex-1">
                  <div className="flex flex-col items-center text-center flex-1 px-4 py-3">
                    <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center mb-3 shadow-lg`}>
                      <span className="text-white font-bold text-xs">{i + 1}</span>
                    </div>
                    <Badge className="text-xs mb-2 bg-gray-100 text-gray-600">{item.phase}</Badge>
                    <p className="text-sm font-bold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Banner de mantenimiento */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">Módulo en desarrollo</p>
            <p className="text-sm text-amber-700 mt-1">
              Estamos trabajando para traerte la experiencia de transferencias más completa del mercado mexicano.
              El equipo de KobraPay está construyendo este módulo con los más altos estándares de seguridad y cumplimiento regulatorio.
            </p>
            <Button
              onClick={handleNotify}
              size="sm"
              className="mt-3 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              Quiero acceso anticipado
            </Button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
