import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link2, Shield, Zap, ArrowRight, CreditCard, BarChart3, Users } from "lucide-react";
import { Link } from "wouter";

const KOBRAPAY_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/BlaEgmymroahADGF.png";
const KOBRAPAY_ICON = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f1420]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f1420]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-bold text-white text-lg leading-none block">KobraPay</span>
              <span className="text-xs text-gray-400 leading-none">Cobra fácil, cobra global</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              isAuthenticated ? (
                <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-white">
                  <Link href="/dashboard">Ir al Panel <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              ) : (
                <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-white">
                  <a href={getLoginUrl("/dashboard")}>Iniciar Sesión</a>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 lg:py-36 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl" />
        </div>
        <div className="container text-center max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            La plataforma de cobros para negocios mexicanos
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Cobra a tus clientes<br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">en segundos</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Genera enlaces de cobro personalizados, compártelos por WhatsApp o email, y recibe pagos con tarjeta de crédito o débito de forma segura. Sin hardware, sin contratos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-400 text-white text-base px-8 h-12">
              <a href={getLoginUrl("/dashboard")}>Comenzar gratis <ArrowRight className="w-4 h-4 ml-2" /></a>
            </Button>
            {isAuthenticated && (
              <Button size="lg" variant="outline" asChild className="text-base px-8 h-12 border-white/20 text-white hover:bg-white/10">
                <Link href="/dashboard">Ver mi panel</Link>
              </Button>
            )}
          </div>
          {/* Logo full */}
          <div className="mt-16 flex justify-center">
            <img src={KOBRAPAY_LOGO} alt="KobraPay - Cobra fácil, cobra global" className="h-16 object-contain opacity-80" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">Todo lo que necesitas para cobrar</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Una plataforma completa para negocios que quieren cobrar de forma profesional y segura.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Link2,
                title: "Enlace en segundos",
                desc: "Ingresa el nombre del cliente, monto y descripción. Obtén un enlace único listo para compartir por WhatsApp, email o QR.",
                color: "emerald",
              },
              {
                icon: CreditCard,
                title: "Pago seguro con tarjeta",
                desc: "Tus clientes pagan con tarjeta de crédito o débito. Procesado por Stripe con cifrado SSL de 256 bits.",
                color: "cyan",
              },
              {
                icon: Shield,
                title: "Protección anti-contracargos",
                desc: "Verificación OTP, selfie del pagador y evidencia digital para protegerte de disputas y fraudes.",
                color: "emerald",
              },
              {
                icon: BarChart3,
                title: "Panel de ventas completo",
                desc: "Monitorea tus cobros en tiempo real, exporta reportes CSV y visualiza tus ingresos con gráficas.",
                color: "cyan",
              },
              {
                icon: Users,
                title: "Multi-negocio (SaaS)",
                desc: "Crea cuentas para tus clientes, configura comisiones individuales y gestiona múltiples negocios desde un solo panel.",
                color: "emerald",
              },
              {
                icon: Zap,
                title: "Widget embebible",
                desc: "Integra el botón de pago en cualquier sitio web con unas pocas líneas de código HTML.",
                color: "cyan",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color === "emerald" ? "bg-emerald-500/15" : "bg-cyan-500/15"}`}>
                  <Icon className={`w-6 h-6 ${color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/5">
        <div className="container text-center max-w-2xl mx-auto">
          <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-16 h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Empieza a cobrar hoy mismo</h2>
          <p className="text-gray-400 mb-8">Crea tu cuenta y genera tu primer enlace de pago en menos de 2 minutos. Sin costos fijos, solo pagas por transacción exitosa.</p>
          <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-400 text-white text-base px-10 h-12">
            <a href={getLoginUrl("/dashboard")}>Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-2" /></a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-6 h-6 object-contain" />
            <span className="font-semibold text-white text-sm">KobraPay</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Shield className="w-3.5 h-3.5" />
            Pagos procesados con Stripe · SSL 256-bit cifrado
          </div>
          <p className="text-sm text-gray-500">© 2025 KobraPay · Cobra fácil, cobra global</p>
        </div>
      </footer>
    </div>
  );
}
