import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Shield,
  Zap,
  ArrowRight,
  CreditCard,
  BarChart3,
  Users,
  X,
  FileText,
  RefreshCw,
  MonitorSmartphone,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const FEATURES = [
  { id: "links", icon: Link2, title: "Enlace en segundos", shortDesc: "Genera un enlace único y compártelo por WhatsApp o email.", color: "emerald", fullDesc: "Ingresa el nombre del cliente, monto y descripción. Obtén un enlace único listo para compartir por WhatsApp, email o código QR. El cliente paga desde cualquier dispositivo sin necesidad de instalar nada.", bullets: ["Enlace personalizado con nombre del cliente", "Código QR descargable incluido", "Expira automáticamente si no se paga", "Comparte en 1 clic por WhatsApp o email"], mockContent: "links" },
  { id: "card", icon: CreditCard, title: "Pago seguro con tarjeta", shortDesc: "Visa, Mastercard y Amex. Procesado por Stripe con cifrado SSL.", color: "cyan", fullDesc: "Tus clientes pagan con tarjeta de crédito o débito directamente desde su celular o computadora. Procesado por Stripe con cifrado SSL de 256 bits.", bullets: ["Visa, Mastercard y American Express", "Cifrado SSL 256-bit en todo momento", "Confirmación instantánea al vendedor", "Recibo automático al cliente por email"], mockContent: "card" },
  { id: "shield", icon: Shield, title: "Anti-contracargos", shortDesc: "OTP, selfie del pagador y evidencia digital para protegerte.", color: "emerald", fullDesc: "Activa verificación OTP por email, captura de selfie del pagador y firma digital para generar evidencia sólida ante cualquier disputa.", bullets: ["Verificación OTP por email al pagador", "Selfie del cliente como evidencia", "Firma digital en el flujo de pago", "Texto legal de no cancelación visible"], mockContent: "shield" },
  { id: "analytics", icon: BarChart3, title: "Panel de ventas", shortDesc: "Monitorea cobros en tiempo real y exporta reportes CSV.", color: "cyan", fullDesc: "Visualiza todas tus ventas en tiempo real con gráficas de tendencia. Exporta reportes CSV con desglose de comisiones.", bullets: ["Gráfica de ventas de los últimos 7 días", "Exportar CSV con desglose de comisión", "Filtros por fecha, estado y cliente", "KPIs: total cobrado, pendiente, comisión"], mockContent: "analytics" },
  { id: "saas", icon: Users, title: "Multi-negocio (SaaS)", shortDesc: "Crea cuentas para tus clientes y gestiona comisiones.", color: "emerald", fullDesc: "Crea cuentas para tus clientes, configura comisiones individuales y gestiona múltiples negocios desde un solo panel.", bullets: ["Crea cuentas para tus clientes", "Comisión % configurable por cliente", "Aislamiento total de datos por negocio", "Panel de comisiones para el super-admin"], mockContent: "saas" },
  { id: "msi", icon: RefreshCw, title: "Meses sin intereses", shortDesc: "Ofrece 3, 6, 9, 12 o 24 MSI en tus cobros.", color: "cyan", fullDesc: "Activa opciones de meses sin intereses en tus enlaces de pago. El cliente elige su plan antes de ingresar la tarjeta.", bullets: ["3, 6, 9, 12, 18 o 24 meses", "El cliente elige su plan en el checkout", "Compatible con tarjetas mexicanas", "Activa por enlace individualmente"], mockContent: "msi" },
  { id: "widget", icon: Zap, title: "Widget embebible", shortDesc: "Integra el botón de pago en cualquier sitio web.", color: "emerald", fullDesc: "Copia unas pocas líneas de HTML y agrega el botón de pago de KobraPay a tu sitio web, tienda en línea o landing page.", bullets: ["Código HTML listo para copiar y pegar", "Compatible con cualquier sitio web", "Preview en tiempo real en el panel", "Personalizable con tu marca"], mockContent: "widget" },
  { id: "pos", icon: MonitorSmartphone, title: "Punto de Venta", shortDesc: "POS digital para cobrar en mostrador desde tu celular.", color: "cyan", fullDesc: "Usa KobraPay como punto de venta digital. Cobra en mostrador desde tu celular o tablet, agrega productos de tu catálogo y genera el cobro al instante.", bullets: ["Catálogo de productos integrado", "Cobra desde celular o tablet", "Sin hardware adicional necesario", "Historial de ventas en tiempo real"], mockContent: "pos" },
  { id: "contracts", icon: FileText, title: "Contratos digitales", shortDesc: "Envía contratos para firma digital con documentos adjuntos.", color: "emerald", fullDesc: "Crea y envía contratos para firma digital. El cliente firma desde su dispositivo y adjunta documentos (INE, RFC, comprobante de domicilio).", bullets: ["Firma digital desde cualquier dispositivo", "Carga de documentos: INE, RFC, CURP", "Estado: Borrador → Enviado → Firmado", "Descarga del contrato firmado en PDF"], mockContent: "contracts" },
];

function MockPreview({ type }: { type: string }) {
  const items: Record<string, React.ReactNode> = {
    links: (
      <div className="bg-[#0f1420] rounded-xl p-4 text-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-yellow-500/70" /><div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="text-gray-500 ml-2">kobrapay.mx/pay/abc123</span>
        </div>
        <div className="space-y-2">
          {[["Juan García","$1,500","Pendiente","amber"],["María López","$3,200","Pagado ✓","emerald"],["Carlos Ruiz","$850","Expirado","gray"]].map(([n,a,s,c]) => (
            <div key={n} className={`flex items-center justify-between px-3 py-2 rounded-lg ${c==="emerald"?"bg-emerald-500/10 border border-emerald-500/20":"bg-white/5"}`}>
              <span className="text-gray-300">{n}</span><span className={`font-semibold ${c==="emerald"?"text-emerald-400":"text-gray-400"}`}>{a}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c==="emerald"?"bg-emerald-500/20 text-emerald-400":c==="amber"?"bg-amber-500/20 text-amber-400":"bg-gray-500/20 text-gray-400"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    card: (
      <div className="bg-[#0f1420] rounded-xl p-4">
        <div className="bg-white/5 rounded-lg p-3 mb-3"><p className="text-xs text-gray-400 mb-1">Monto a pagar</p><p className="text-2xl font-bold text-white">$2,500.00 <span className="text-sm text-gray-400">MXN</span></p></div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/5 rounded-lg p-2"><p className="text-xs text-gray-500">Tarjeta</p><p className="text-sm text-white font-mono">•••• 4242</p></div>
          <div className="bg-white/5 rounded-lg p-2"><p className="text-xs text-gray-500">Vence</p><p className="text-sm text-white">12/27</p></div>
        </div>
        <div className="bg-emerald-500 rounded-lg py-2 text-center"><span className="text-white text-sm font-semibold">🔒 Pagar de forma segura</span></div>
      </div>
    ),
    shield: (
      <div className="bg-[#0f1420] rounded-xl p-4 space-y-2">
        {["OTP por email","Selfie del pagador","Firma digital","Texto anti-contracargo"].map(l=>(
          <div key={l} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-sm text-gray-300">{l}</span></div>
        ))}
      </div>
    ),
    analytics: (
      <div className="bg-[#0f1420] rounded-xl p-4">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["Total","$48,200","emerald"],["Pendiente","$3,500","amber"],["Comisión","$2,410","cyan"]].map(([l,v,c])=>(
            <div key={l} className="bg-white/5 rounded-lg p-2 text-center"><p className="text-xs text-gray-500">{l}</p><p className={`text-sm font-bold text-${c}-400`}>{v}</p></div>
          ))}
        </div>
        <div className="bg-white/5 rounded-lg p-2 h-16 flex items-end gap-1 px-3">
          {[30,55,40,80,60,90,75].map((h,i)=>(<div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===5?"#10b981":"#10b98140"}} />))}
        </div>
      </div>
    ),
    saas: (
      <div className="bg-[#0f1420] rounded-xl p-4 space-y-2">
        {[["Tienda La Paloma","3.5%","Activo"],["Ferretería Juárez","4.0%","Activo"],["Clínica Norte","2.5%","Pendiente"]].map(([n,c,s])=>(
          <div key={n} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">{(n as string)[0]}</div>
            <span className="text-sm text-gray-300 flex-1 ml-2">{n}</span>
            <span className="text-xs text-cyan-400 mr-2">{c}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s==="Activo"?"bg-emerald-500/20 text-emerald-400":"bg-amber-500/20 text-amber-400"}`}>{s}</span>
          </div>
        ))}
      </div>
    ),
    msi: (
      <div className="bg-[#0f1420] rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3 text-center">Elige tu plan de pago</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["3 MSI","$833/mes",false],["6 MSI","$417/mes",true],["12 MSI","$208/mes",false]].map(([p,pr,a])=>(
            <div key={p as string} className={`rounded-lg p-2 text-center border ${a?"border-emerald-500 bg-emerald-500/10":"border-white/10 bg-white/5"}`}>
              <p className={`text-sm font-bold ${a?"text-emerald-400":"text-white"}`}>{p}</p><p className="text-xs text-gray-500">{pr}</p>
            </div>
          ))}
        </div>
        <div className="bg-emerald-500 rounded-lg py-2 text-center"><span className="text-white text-sm font-semibold">Pagar en 6 meses</span></div>
      </div>
    ),
    widget: (
      <div className="bg-[#0f1420] rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2">Código para tu sitio web:</p>
        <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-emerald-400 mb-3">{`<kobrapay-button token="abc123" amount="500" />`}</div>
        <div className="border border-emerald-500/30 rounded-lg p-3 text-center"><span className="text-sm text-white">💳 Pagar con KobraPay</span></div>
      </div>
    ),
    pos: (
      <div className="bg-[#0f1420] rounded-xl p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[["Café","$45"],["Sandwich","$85"],["Jugo","$55"],["Postre","$65"]].map(([i,p])=>(
            <div key={i} className="bg-white/5 rounded-lg p-2 text-center"><p className="text-xs text-gray-300">{i}</p><p className="text-sm font-bold text-emerald-400">{p}</p></div>
          ))}
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex justify-between">
          <span className="text-sm text-gray-300">Total:</span><span className="text-sm font-bold text-emerald-400">$250 MXN</span>
        </div>
      </div>
    ),
    contracts: (
      <div className="bg-[#0f1420] rounded-xl p-4 space-y-2">
        {[["Ana Torres","Firmado","emerald"],["Pedro Sánchez","Enviado","cyan"],["Laura Vega","Borrador","gray"]].map(([n,s,c])=>(
          <div key={n} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-300">{n}</span></div>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${c}-500/20 text-${c}-400`}>{s}</span>
          </div>
        ))}
      </div>
    ),
  };
  return <>{items[type] ?? null}</>;
}

function FeatureModal({ feature, onClose }: { feature: typeof FEATURES[0]; onClose: () => void }) {
  const Icon = feature.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-[#141c2e] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.color === "emerald" ? "bg-emerald-500/15" : "bg-cyan-500/15"}`}>
              <Icon className={`w-6 h-6 ${feature.color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.shortDesc}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-4 mt-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 border-b border-white/10"><MockPreview type={feature.mockContent} /></div>
        <div className="p-6">
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{feature.fullDesc}</p>
          <ul className="space-y-2">
            {feature.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-gray-400">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${feature.color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />{b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const KOBRAPAY_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/BlaEgmymroahADGF.png";
const KOBRAPAY_ICON = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [activeFeature, setActiveFeature] = useState<typeof FEATURES[0] | null>(null);

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

      {/* Hero split-screen */}
      <section className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2">
        {/* Izquierda: texto de bienvenida */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-16 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-lg">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <Zap className="w-3.5 h-3.5" />
              La plataforma de cobros para negocios mexicanos
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              HOLA,<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">bienvenido</span>
            </h1>
            <p className="text-lg text-gray-300 mb-3 font-medium">
              Bienvenido a tu <strong className="text-white">panel de cobros profesional.</strong>
            </p>
            <p className="text-gray-400 mb-10 leading-relaxed">
              Genera enlaces de cobro personalizados, compártelos por WhatsApp o email, y recibe pagos con tarjeta de forma segura. Sin hardware, sin contratos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-400 text-white text-base px-8 h-12">
                <a href={getLoginUrl("/dashboard")}>Comenzar gratis <ArrowRight className="w-4 h-4 ml-2" /></a>
              </Button>
              {isAuthenticated && (
                <Button size="lg" variant="outline" asChild className="text-base px-8 h-12 border-white/20 text-white hover:bg-white/10">
                  <Link href="/dashboard">Ver mi panel</Link>
                </Button>
              )}
            </div>
            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500">Aceptamos:</span>
              {["VISA", "MC", "AMEX"].map((brand) => (
                <span key={brand} className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded border border-white/10">{brand}</span>
              ))}
              <span className="text-xs text-gray-500 ml-1">· Powered by Stripe</span>
            </div>
          </div>
        </div>

        {/* Derecha: card con tabs Acceso / Registrar */}
        <div className="flex flex-col justify-center items-center px-8 lg:px-16 py-16 bg-[#0a0f1a] border-l border-white/5">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-14 h-14 object-contain mx-auto mb-3" />
              <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-8 object-contain mx-auto opacity-80" />
            </div>
            <div className="bg-[#141c2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Tabs */}
              <div className="grid grid-cols-2 border-b border-white/10">
                <div className="py-4 text-center bg-[#141c2e] border-r border-white/10">
                  <span className="text-sm font-semibold text-gray-300">Acceso</span>
                </div>
                <div className="py-4 text-center bg-emerald-500">
                  <span className="text-sm font-semibold text-white">Registrar</span>
                </div>
              </div>
              {/* Body */}
              <div className="p-8">
                <p className="text-gray-400 text-sm text-center mb-6">
                  Inicia sesión o crea tu cuenta con Manus para acceder a tu panel de cobros.
                </p>
                <a
                  href={getLoginUrl("/dashboard")}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors mb-4 text-sm"
                >
                  <Shield className="w-4 h-4" />
                  Iniciar sesión / Registrarse
                </a>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-gray-500">Acceso seguro con Manus OAuth</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div className="space-y-3">
                  {["Cuenta gratuita, sin costos fijos", "Cobra en menos de 2 minutos", "Pagos procesados por Stripe"].map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-6">
              ¿Tienes dudas?{" "}
              <a href="mailto:soporte@kobrapay.mx" className="text-emerald-400 hover:underline">soporte@kobrapay.mx</a>
            </p>
          </div>
        </div>
      </section>

      {/* Features interactivas */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">Todo lo que necesitas para cobrar</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Haz clic en cualquier función para ver cómo funciona en el panel.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all text-left group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color === "emerald" ? "bg-emerald-500/15 group-hover:bg-emerald-500/25" : "bg-cyan-500/15 group-hover:bg-cyan-500/25"} transition-colors`}>
                    <Icon className={`w-6 h-6 ${feature.color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.shortDesc}</p>
                  <div className={`mt-4 text-xs font-medium flex items-center gap-1 ${feature.color === "emerald" ? "text-emerald-500" : "text-cyan-500"}`}>
                    Ver más <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
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

      {/* Feature Modal */}
      {activeFeature && <FeatureModal feature={activeFeature} onClose={() => setActiveFeature(null)} />}
    </div>
  );
}
