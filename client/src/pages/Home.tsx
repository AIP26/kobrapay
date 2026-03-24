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
  Mail,
  Phone,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getSortedCountries, getCountryByCode } from "@shared/countries";

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
      <div className="bg-card rounded-xl p-4 text-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-yellow-500/70" /><div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="text-muted-foreground ml-2">kobrapay.mx/pay/abc123</span>
        </div>
        <div className="space-y-2">
          {[["Juan García","$1,500","Pendiente","amber"],["María López","$3,200","Pagado ✓","emerald"],["Carlos Ruiz","$850","Expirado","gray"]].map(([n,a,s,c]) => (
            <div key={n} className={`flex items-center justify-between px-3 py-2 rounded-lg ${c==="emerald"?"bg-emerald-500/10 border border-emerald-500/20":"bg-white/5"}`}>
              <span className="text-muted-foreground">{n}</span><span className={`font-semibold ${c==="emerald"?"text-emerald-400":"text-muted-foreground"}`}>{a}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c==="emerald"?"bg-emerald-500/20 text-emerald-400":c==="amber"?"bg-amber-500/20 text-amber-400":"bg-gray-500/20 text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    card: (
      <div className="bg-card rounded-xl p-4">
        <div className="bg-white/5 rounded-lg p-3 mb-3"><p className="text-xs text-muted-foreground mb-1">Monto a pagar</p><p className="text-2xl font-bold text-foreground">$2,500.00 <span className="text-sm text-muted-foreground">MXN</span></p></div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/5 rounded-lg p-2"><p className="text-xs text-muted-foreground">Tarjeta</p><p className="text-sm text-foreground font-mono">•••• 4242</p></div>
          <div className="bg-white/5 rounded-lg p-2"><p className="text-xs text-muted-foreground">Vence</p><p className="text-sm text-foreground">12/27</p></div>
        </div>
        <div className="bg-emerald-500 rounded-lg py-2 text-center"><span className="text-foreground text-sm font-semibold">🔒 Pagar de forma segura</span></div>
      </div>
    ),
    shield: (
      <div className="bg-card rounded-xl p-4 space-y-2">
        {["OTP por email","Selfie del pagador","Firma digital","Texto anti-contracargo"].map(l=>(
          <div key={l} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-sm text-muted-foreground">{l}</span></div>
        ))}
      </div>
    ),
    analytics: (
      <div className="bg-card rounded-xl p-4">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["Total","$48,200","emerald"],["Pendiente","$3,500","amber"],["Comisión","$2,410","cyan"]].map(([l,v,c])=>(
            <div key={l} className="bg-white/5 rounded-lg p-2 text-center"><p className="text-xs text-muted-foreground">{l}</p><p className={`text-sm font-bold text-${c}-400`}>{v}</p></div>
          ))}
        </div>
        <div className="bg-white/5 rounded-lg p-2 h-16 flex items-end gap-1 px-3">
          {[30,55,40,80,60,90,75].map((h,i)=>(<div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===5?"#10b981":"#10b98140"}} />))}
        </div>
      </div>
    ),
    saas: (
      <div className="bg-card rounded-xl p-4 space-y-2">
        {[["Tienda La Paloma","3.5%","Activo"],["Ferretería Juárez","4.0%","Activo"],["Clínica Norte","2.5%","Pendiente"]].map(([n,c,s])=>(
          <div key={n} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">{(n as string)[0]}</div>
            <span className="text-sm text-muted-foreground flex-1 ml-2">{n}</span>
            <span className="text-xs text-cyan-400 mr-2">{c}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s==="Activo"?"bg-emerald-500/20 text-emerald-400":"bg-amber-500/20 text-amber-400"}`}>{s}</span>
          </div>
        ))}
      </div>
    ),
    msi: (
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3 text-center">Elige tu plan de pago</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["3 MSI","$833/mes",false],["6 MSI","$417/mes",true],["12 MSI","$208/mes",false]].map(([p,pr,a])=>(
            <div key={p as string} className={`rounded-lg p-2 text-center border ${a?"border-emerald-500 bg-emerald-500/10":"border-border bg-white/5"}`}>
              <p className={`text-sm font-bold ${a?"text-emerald-400":"text-foreground"}`}>{p}</p><p className="text-xs text-muted-foreground">{pr}</p>
            </div>
          ))}
        </div>
        <div className="bg-emerald-500 rounded-lg py-2 text-center"><span className="text-foreground text-sm font-semibold">Pagar en 6 meses</span></div>
      </div>
    ),
    widget: (
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-2">Código para tu sitio web:</p>
        <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-emerald-400 mb-3">{`<kobrapay-button token="abc123" amount="500" />`}</div>
        <div className="border border-emerald-500/30 rounded-lg p-3 text-center"><span className="text-sm text-foreground">💳 Pagar con KobraPay</span></div>
      </div>
    ),
    pos: (
      <div className="bg-card rounded-xl p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[["Café","$45"],["Sandwich","$85"],["Jugo","$55"],["Postre","$65"]].map(([i,p])=>(
            <div key={i} className="bg-white/5 rounded-lg p-2 text-center"><p className="text-xs text-muted-foreground">{i}</p><p className="text-sm font-bold text-emerald-400">{p}</p></div>
          ))}
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex justify-between">
          <span className="text-sm text-muted-foreground">Total:</span><span className="text-sm font-bold text-emerald-400">$250 MXN</span>
        </div>
      </div>
    ),
    contracts: (
      <div className="bg-card rounded-xl p-4 space-y-2">
        {[["Ana Torres","Firmado","emerald"],["Pedro Sánchez","Enviado","cyan"],["Laura Vega","Borrador","gray"]].map(([n,s,c])=>(
          <div key={n} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">{n}</span></div>
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
      <div className="relative bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.color === "emerald" ? "bg-emerald-500/15" : "bg-cyan-500/15"}`}>
              <Icon className={`w-6 h-6 ${feature.color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.shortDesc}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 mt-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 border-b border-border"><MockPreview type={feature.mockContent} /></div>
        <div className="p-6">
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.fullDesc}</p>
          <ul className="space-y-2">
            {feature.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${feature.color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />{b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png";
const KOBRAPAY_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png";

// Planes KobraPay — DESGLOSE TRANSPARENTE
// Stripe: 3.6% + $3 MXN | KobraPay: 1.0% + $0.50 MXN
// Plan único Beta de lanzamiento
const VOLUME_TIERS = [
  { 
    label: "Beta", 
    min: 0, 
    max: 9999999, 
    totalRate: 4.6,
    fixedFee: 3.50,
    stripeRate: 3.6,
    stripeFixed: 3.0,
    kobrapayRate: 1.0,
    kobrapayFixed: 0.50,
    color: "emerald" 
  },
];

const FAQ_ITEMS = [
  {
    q: "¿Qué es KobraPay y para qué tipo de negocios está diseñado?",
    a: "KobraPay es una plataforma de cobros digitales diseñada para negocios en México y Latinoamérica: restaurantes, hospitales, clínicas, escuelas, spas, consultorios médicos y dentales, comercios y cualquier empresa que necesite cobrar de forma profesional. No importa si eres un negocio pequeño o una empresa con múltiples sucursales — KobraPay escala contigo."
  },
  {
    q: "¿Cómo funciona? ¿Necesito instalar algo?",
    a: "No necesitas instalar nada. Creas tu cuenta, generas un enlace de pago en menos de 2 minutos y lo compartes por WhatsApp, email o código QR. Tu cliente paga desde su celular o computadora con tarjeta de crédito o débito. El dinero llega a tu cuenta y tú ves todo en tu panel en tiempo real."
  },
  {
    q: "¿Es seguro? ¿Cómo protegen mis datos y los de mis clientes?",
    a: "Sí. Los pagos son procesados por Stripe, la plataforma de pagos más confiable del mundo, con cifrado SSL de 256 bits. KobraPay nunca almacena datos de tarjetas. Además, incluimos verificación OTP, captura de selfie del pagador y firma digital para protegerte contra contracargos fraudulentos."
  },
  {
    q: "\u00bfCu\u00e1nto cuesta? \u00bfHay mensualidad o costo fijo?",
    a: "No hay mensualidad ni costo fijo. Solo pagas 4.6% + $3.50 MXN + IVA por cada transacci\u00f3n exitosa. Este es nuestro precio de lanzamiento para los primeros 50 clientes. Puedes simular exactamente cu\u00e1nto pagar\u00e1s con nuestro calculador de comisiones en esta misma p\u00e1gina."
  },
  {
    q: "¿Puedo ofrecer meses sin intereses a mis clientes?",
    a: "Sí. Puedes activar opciones de 3, 6, 9, 12 o 24 meses sin intereses en tus enlaces de pago. El cliente elige su plan antes de ingresar su tarjeta. Compatible con tarjetas de crédito mexicanas."
  },
  {
    q: "\u00bfEl precio incluye IVA?",
    a: "No, el IVA (16%) se cobra adicional seg\u00fan la ley mexicana. El costo total efectivo es aproximadamente 5.34%. Por ejemplo, por cada $1,000 cobrados: Stripe se lleva $39 MXN (3.6%+$3) y KobraPay cobra $10.50 MXN (1%+$0.50) + IVA $1.68 = $12.18. Total descuentos: $51.18. T\u00fa recibes: $948.82."
  },
  {
    q: "\u00bfPuedo cancelar cuando quiera?",
    a: "S\u00ed, sin penalizaci\u00f3n. No hay contratos de permanencia. Si decides dejar KobraPay, simplemente dejas de usar la plataforma. No hay cobros por cancelaci\u00f3n ni periodos de aviso."
  },
  {
    q: "\u00bfQu\u00e9 diferencia a KobraPay de otras plataformas como Clip o Mercado Pago?",
    a: "KobraPay está diseñado para negocios que necesitan más que un simple cobro: contratos digitales con firma, cobros recurrentes automatizados, transferencias internacionales (SPEI, Zelle, Wire), panel multi-negocio para gestionar varios clientes, y un sistema de asociados con comisión escalonada. Es una plataforma completa, no solo un lector de tarjetas."
  },
  {
    q: "¿Cómo me registro? ¿Cuánto tiempo tarda la aprobación?",
    a: "El registro toma menos de 5 minutos. Necesitas tu nombre, datos de tu negocio y RFC. La aprobación es en menos de 24 horas hábiles. Una vez aprobado, puedes generar tu primer enlace de pago de inmediato."
  },
  {
    q: "¿Puedo integrar KobraPay en mi sitio web o tienda en línea?",
    a: "Sí. Tenemos un widget embebible que puedes agregar a cualquier sitio web con unas pocas líneas de código HTML. También puedes usar nuestro Punto de Venta digital para cobrar en mostrador desde tu celular o tablet, sin hardware adicional.",
  },
  {
    q: "¿Puedo cobrar en dólares, euros u otras monedas internacionales?",
    a: "Sí. KobraPay soporta más de 20 monedas: MXN, USD, CAD, EUR, GBP, BRL, COP, CLP, PEN, ARS, AUD, JPY, INR y más. Al crear un enlace de pago seleccionas el país y la moneda. Ideal para freelancers, exportadores y negocios de e-commerce que venden a clientes en el extranjero.",
  },
  {
    q: "¿Puedo cobrarle a clientes en Estados Unidos, Canadá o Europa?",
    a: "Sí. Gracias a nuestra integración con Stripe, puedes generar enlaces de pago en USD, CAD o EUR y compartirlos con clientes en cualquier parte del mundo. El cliente paga con su tarjeta local y el dinero llega a tu cuenta. No necesitas abrir una cuenta bancaria en el extranjero.",
  },
  {
    q: "¿Qué pasa si un cliente disputa un pago (contracargo)?",
    a: "KobraPay te protege con evidencias automáticas: selfie del pagador, firma digital del contrato, verificación OTP y registro de IP y dispositivo. Toda esta información se envía automáticamente a Stripe como evidencia en caso de disputa, aumentando significativamente tus probabilidades de ganar el contracargo.",
  },
  {
    q: "¿En qué países está disponible KobraPay?",
    a: "KobraPay está disponible para negocios en México, Estados Unidos, Canadá, España, Colombia, Brasil, Chile, Perú, Ecuador, Venezuela, Panamá, Costa Rica, República Dominicana, Uruguay, Paraguay, Bolivia, Reino Unido, Alemania, Francia, India, Australia y Japón. Estamos en constante expansión.",
  },
  {
    q: "¿Los contratos digitales tienen validez legal en otros países?",
    a: "Sí. Los contratos firmados en KobraPay tienen validez legal en todos los países donde operamos. En México están respaldados por el Código de Comercio Arts. 89-114 y la LFEA. En EE.UU. por el ESIGN Act. En la UE por el Reglamento eIDAS 910/2014. Cada contrato incluye automáticamente la legislación aplicable del país correspondiente.",
  },
  {
    q: "¿Puedo usar KobraPay para cobros recurrentes o suscripciones?",
    a: "Sí. Puedes configurar cobros recurrentes semanales, quincenales o mensuales. El sistema cobra automáticamente a la tarjeta del cliente en la fecha programada y te notifica cuando el pago se procesa. Ideal para gimnasios, escuelas, servicios de suscripción y cualquier negocio con clientes fijos.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white/5 hover:bg-white/8 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-foreground">{item.q}</span>
            <span className={`text-emerald-400 text-lg font-bold flex-shrink-0 transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
          </button>
          {open === i && (
            <div className="px-5 py-4 bg-white/3 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type TierType = {
  label: string; min: number; max: number; totalRate: number; fixedFee: number;
  stripeRate: number; stripeFixed: number; kobrapayRate: number; kobrapayFixed: number; color: string;
};
function PublicQuoteCalculator({ tiers: propTiers }: { tiers?: TierType[] }) {
  const activeTiers = propTiers && propTiers.length > 0 ? propTiers : VOLUME_TIERS;
  const [monthlyVolume, setMonthlyVolume] = useState(50000);
  const [singleAmount, setSingleAmount] = useState(5000);
  const [simCountry, setSimCountry] = useState("MX");
  const { isAuthenticated: _isAuthForVendor } = useAuth();
  const { data: vendorSettings } = trpc.vendor.getSettings.useQuery(undefined, {
    retry: false,
    enabled: _isAuthForVendor,
    onSuccess: (s: any) => {
      if (s?.businessCountry && s.businessCountry !== "MX") {
        setSimCountry(s.businessCountry);
      }
    },
  } as any);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [quoteSent, setQuoteSent] = useState(false);
  const sendPublicQuote = trpc.quote.sendPublicQuote.useMutation({
    onSuccess: () => { setQuoteSent(true); },
    onError: () => alert("Error al enviar. Verifica el email."),
  });
  const tier = VOLUME_TIERS.find(t => monthlyVolume >= t.min && monthlyVolume <= t.max) || VOLUME_TIERS[0];
  const nextTier = VOLUME_TIERS[VOLUME_TIERS.indexOf(tier) + 1];
  // Datos del país seleccionado
  const countryData = getCountryByCode(simCountry);
  const simCurrency = countryData?.currency || "MXN";
  const simSymbol = countryData?.currencySymbol || "$";
  const simVatRate = countryData?.taxRate ?? 0.16; // IVA del país
  const vatLabel = countryData?.taxName || "IVA";
  // KobraPay: tasa del plan + cargo fijo + IVA encima (igual que Clip, Conekta, Mercado Pago)
  const kpBaseRate = tier.totalRate; // tasa base del plan (sin IVA)
  const kpFixedFee = (tier as any).fixedFee ?? 0; // cargo fijo en MXN
  const kpCommission = singleAmount * (kpBaseRate / 100) + kpFixedFee; // comisión base + fijo
  const kpVatAmount = kpCommission * simVatRate; // IVA sobre la comisión
  const kpNote = kpFixedFee > 0 ? `${kpBaseRate.toFixed(1)}% + $${kpFixedFee} + ${vatLabel}` : `${kpBaseRate.toFixed(1)}% + ${vatLabel}`;
  const totalFees = kpCommission + kpVatAmount; // comisión + IVA
  const netReceived = singleAmount - totalFees;
  // Formatear moneda del país
  const fmtAmt = (n: number) => `${simSymbol}${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${simCurrency}`;

  // Competencia: tasa base + cargo fijo + IVA (calculado correctamente)
  // El IVA se aplica sobre (tasa% * monto + cargo fijo)
  const competitors = [
    { name: "Mercado Pago",   baseRate: 3.29, fixedBase: 0,   note: "3.29% + IVA" },
    { name: "Clip",           baseRate: 3.60, fixedBase: 0,   note: "3.6% + IVA" },
    { name: "SumUp",          baseRate: 3.60, fixedBase: 0,   note: "3.6% + IVA" },
    { name: "PayPal MX",      baseRate: 3.50, fixedBase: 4,   note: "3.5% + $4 + IVA" },
    { name: "Conekta",        baseRate: 2.90, fixedBase: 3,   note: "2.9% + $3 + IVA" },
    { name: "Stripe directo", baseRate: 3.60, fixedBase: 3,   note: "3.6% + $3 + IVA" },
  ];

  return (
    <div className="bg-white/5 border border-border rounded-3xl p-8">
      <div className="grid lg:grid-cols-2 gap-10">
        {/* Izquierda: controles */}
        <div className="space-y-6">
          {/* Slider volumen mensual */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-foreground">Volumen mensual estimado</label>
              <span className="text-emerald-400 font-bold text-sm">{simSymbol}{monthlyVolume.toLocaleString("es-MX")} {simCurrency}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={1000000}
              step={5000}
              value={monthlyVolume}
              onChange={e => setMonthlyVolume(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>$5,000</span><span>$1,000,000</span>
            </div>
          </div>

          {/* Plan actual */}
          <div className={`rounded-2xl p-4 border ${
            tier.color === "emerald" ? "bg-emerald-500/10 border-emerald-500/30" :
            tier.color === "cyan" ? "bg-cyan-500/10 border-cyan-500/30" :
            tier.color === "violet" ? "bg-violet-500/10 border-violet-500/30" :
            "bg-amber-500/10 border-amber-500/30"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                tier.color === "emerald" ? "text-emerald-400" :
                tier.color === "cyan" ? "text-cyan-400" :
                tier.color === "violet" ? "text-violet-400" : "text-amber-400"
              }`}>Plan {tier.label}</span>
              <span className="text-foreground font-black text-2xl">{tier.totalRate}%{(tier as any).fixedFee > 0 ? ` + $${(tier as any).fixedFee}` : ''}</span>
            </div>
            <p className="text-muted-foreground text-xs">Comisión KobraPay para este volumen mensual</p>
            {nextTier && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 Procesando <span className="text-foreground font-semibold">{simSymbol}{nextTier.min.toLocaleString("es-MX")} {simCurrency}/mes</span> o más, tu tasa baja a{" "}
                  <span className={`font-bold ${
                    tier.color === "cyan" ? "text-violet-400" : "text-amber-400"
                  }`}>{nextTier.totalRate}%</span> — Plan {nextTier.label}
                </p>
              </div>
            )}
          </div>

          {/* Monto de cobro individual + selector de país/moneda */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground block">Simula un cobro de</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{getCountryByCode(simCountry)?.currencySymbol || "$"}</span>
              <input
                type="number"
                value={singleAmount}
                onChange={e => setSingleAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white/5 border border-border rounded-xl pl-7 pr-16 py-2.5 text-foreground text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">{getCountryByCode(simCountry)?.currency || "MXN"}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">País / Moneda</label>
              <select
                value={simCountry}
                onChange={e => setSimCountry(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-emerald-500"
              >
                {getSortedCountries().map(c => (
                  <option key={c.code} value={c.code} className="bg-card text-foreground">
                    {c.flag} {c.name} — {c.currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Derecha: resultados */}
        <div className="space-y-4">
          {/* Desglose */}
          <div className="bg-black/30 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-foreground mb-3">Desglose del cobro</h4>
            {/* Tasa base sin IVA */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Monto cobrado al cliente</span>
              <span className="text-sm font-semibold text-foreground">{fmtAmt(singleAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Comisión KobraPay ({kpBaseRate.toFixed(1)}%)</span>
              <span className="text-sm font-semibold text-red-400">- {fmtAmt(kpCommission)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{vatLabel} ({(simVatRate * 100).toFixed(0)}%) sobre comisión</span>
              <span className="text-sm font-semibold text-red-400">- {fmtAmt(kpVatAmount)}</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Tú recibes</span>
              <span className="text-xl font-black text-emerald-400">{fmtAmt(netReceived)}</span>
            </div>
            <p className="text-xs text-emerald-400/70 text-center font-medium">*{kpNote} — sin costos ocultos, sin sorpresas</p>
            <p className="text-xs text-muted-foreground text-center mt-1">*Incluye comisión de procesamiento de pagos + IVA</p>
          </div>

          {/* Cobro Internacional - solo si no es México */}
          {simCountry !== "MX" && (
            <div className="bg-black/30 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-foreground mb-3">🌍 Cobro Internacional</h4>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Con KobraPay puedes cobrar en{" "}
                  <span className="text-emerald-400 font-semibold">{countryData?.currencyName || "moneda local"} ({simCurrency})</span>{" "}
                  a clientes en {countryData?.name || "cualquier país"}.
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Tú recibes en este cobro:</p>
                  <p className="text-2xl font-black text-emerald-400">{fmtAmt(netReceived)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Comisión KobraPay: {kpNote} — sin cargos fijos</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  El pago se procesa vía Stripe con cifrado SSL. El cliente puede pagar con Visa, Mastercard o Amex de cualquier banco del mundo.
                </p>
              </div>
            </div>
          )}

          {/* Botón enviar cotización */}
          <div className="mt-6 pt-6 border-t border-border">
            {!showEmailForm && !quoteSent && (
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-foreground font-semibold py-3 rounded-2xl"
              >
                ✉️ Recibir esta cotización por email
              </button>
            )}
            {showEmailForm && !quoteSent && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-semibold">Ingresa tus datos y te enviamos la cotización con análisis IA:</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={prospectName}
                    onChange={e => setProspectName(e.target.value)}
                    placeholder="Tu nombre"
                    className="bg-white/5 border border-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="email"
                    value={prospectEmail}
                    onChange={e => setProspectEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="bg-white/5 border border-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEmailForm(false)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!prospectName || !prospectEmail) { alert("Ingresa tu nombre y email"); return; }
                      sendPublicQuote.mutate({ prospectEmail, prospectName, monthlyVolume, singleAmount, kpRate: tier.totalRate });
                    }}
                    disabled={sendPublicQuote.isPending}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-foreground rounded-xl text-sm font-semibold disabled:opacity-60"
                  >
                    {sendPublicQuote.isPending ? "Enviando..." : "Enviar cotización"}
                  </button>
                </div>
              </div>
            )}
            {quoteSent && (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-foreground font-semibold">¡Cotización enviada!</p>
                <p className="text-muted-foreground text-sm mt-1">Revisa tu bandeja de entrada. Incluye desglose completo, comparativa vs competencia y análisis IA.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [activeFeature, setActiveFeature] = useState<typeof FEATURES[0] | null>(null);
  const [activeTab, setActiveTab] = useState<"acceso" | "registrar">("acceso");
  const { data: dbPlans } = trpc.pricing.getAll.useQuery();
  // Usar planes de la BD si están disponibles, sino usar los hardcodeados como fallback
  const activeTiers = (dbPlans && dbPlans.length > 0)
    ? dbPlans.map(p => ({
        label: p.name,
        min: p.minVolume,
        max: p.maxVolume,
        totalRate: p.totalRate,
        fixedFee: p.fixedFee,
        stripeRate: p.stripeRate,
        stripeFixed: p.stripeFixed,
        kobrapayRate: p.kobrapayRate,
        kobrapayFixed: p.kobrapayFixed,
        color: p.color,
      }))
    : VOLUME_TIERS;
  const expressRate = activeTiers[0]?.totalRate ?? 3.9;
  // Contador de espacios: total 50 - usuarios registrados
  const { data: registeredCount } = trpc.system.getRegisteredCount.useQuery();
  const spotsLeft = Math.max(0, 50 - (registeredCount ?? 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de contacto superior */}
      <div className="bg-emerald-700 text-white text-xs py-1.5 hidden md:block">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-5">
            <a href="mailto:soporte@kobrapay.mx" className="flex items-center gap-1.5 hover:text-emerald-100 transition-colors">
              <Mail className="w-3 h-3" />
              soporte@kobrapay.mx
            </a>
            <a href="tel:+17869216543" className="flex items-center gap-1.5 hover:text-emerald-100 transition-colors">
              <Phone className="w-3 h-3" />
              +1 (786) 921-6543
            </a>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-100">
            <Shield className="w-3 h-3" />
            Pagos seguros con SSL 256-bit · PCI DSS Nivel 1
          </div>
        </div>
      </div>
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center">
            <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-11 w-auto object-contain" />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#simulador" className="hover:text-foreground transition-colors">Comisiones</a>
            <a href="#caracteristicas" className="hover:text-foreground transition-colors">Características</a>
            <Link href="/legal" className="hover:text-foreground transition-colors">Legal</Link>
          </nav>
          <div className="flex items-center gap-3">
            {!loading && (
              isAuthenticated ? (
                <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-foreground">
                  <Link href="/dashboard">Ir al Panel <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground text-sm">
                    <Link href="/login">Iniciar sesión</Link>
                  </Button>
                  <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-foreground text-sm">
                    <Link href="/register">Crear cuenta</Link>
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero split-screen */}
      <section className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2">
        {/* Izquierda: texto de bienvenida */}
        <div className="flex flex-col justify-center items-center px-8 lg:px-14 py-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-md w-full">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-1 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Lanzamiento oficial 2026
              </span>
              <span className="inline-flex items-center gap-1 bg-white/5 text-muted-foreground border border-border rounded-full px-3 py-1 text-xs">
                <Zap className="w-3 h-3 text-yellow-400" />
                Procesado por Stripe
              </span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-extrabold text-foreground mb-4 leading-tight">
              Cobra con tarjeta<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">en 2 minutos</span>
            </h1>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Genera un enlace de pago, compártelo por WhatsApp y recibe el dinero. Sin hardware, sin contratos, sin mensualidad. Solo pagas cuando cobras.
            </p>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-xl font-black text-foreground">{expressRate}% + IVA*</p>
                <p className="text-xs text-muted-foreground">Plan Beta — sin mensualidad</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl font-black text-emerald-600">2 min</p>
                <p className="text-xs text-muted-foreground">Para tu primer cobro</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl font-black text-cyan-600">24h</p>
                <p className="text-xs text-muted-foreground">Aprobación de cuenta</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button size="sm" asChild className="bg-emerald-500 hover:bg-emerald-400 text-foreground px-6 h-11 text-sm font-bold shadow-lg shadow-emerald-500/20">
                <a href="/register">Crear cuenta gratis <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></a>
              </Button>
              <Button size="sm" variant="outline" asChild className="px-6 h-11 text-sm">
                <a href="#simulador">Ver mis comisiones</a>
              </Button>
            </div>
            <div className="mt-8 space-y-2.5">
              <p className="text-xs text-muted-foreground font-medium">Aceptamos todos los métodos de pago:</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-100 border border-blue-200 text-blue-700 text-xs font-black px-2.5 py-1 rounded-lg">VISA</span>
                <span className="bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black px-2.5 py-1 rounded-lg">Mastercard</span>
                <span className="bg-blue-50 border border-blue-200 text-blue-600 text-xs font-black px-2.5 py-1 rounded-lg">AMEX</span>
                <span className="bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-2.5 py-1 rounded-lg">🏦 OXXO</span>
                <span className="bg-green-100 border border-green-200 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">🏦 SPEI</span>
                <span className="bg-gray-100 border border-gray-200 text-foreground text-xs font-bold px-2.5 py-1 rounded-lg"> Apple Pay</span>
                <span className="bg-gray-100 border border-gray-200 text-foreground text-xs font-bold px-2.5 py-1 rounded-lg">G Pay</span>
              </div>
              <p className="text-xs text-muted-foreground">Procesado por Stripe · SSL 256-bit · PCI DSS</p>
            </div>
          </div>
        </div>

        {/* Derecha: card con tabs Acceso / Registrar */}
        <div className="flex flex-col justify-center items-center px-8 lg:px-12 py-12 bg-muted/40 border-l border-border">
          <div className="w-full max-w-sm">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
              {/* Tabs funcionales */}
              <div className="grid grid-cols-2 border-b border-border">
                <button
                  onClick={() => setActiveTab("acceso")}
                  className={`py-3 text-center border-r border-border transition-all text-xs font-semibold ${
                    activeTab === "acceso"
                      ? "bg-emerald-500 text-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  Acceso
                </button>
                <button
                  onClick={() => setActiveTab("registrar")}
                  className={`py-3 text-center transition-all text-xs font-semibold ${
                    activeTab === "registrar"
                      ? "bg-emerald-500 text-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  Registrar
                </button>
              </div>

              {/* Tab: Acceso */}
              {activeTab === "acceso" && (
                <div className="p-5">
                  <p className="text-muted-foreground text-xs text-center mb-4">
                    Ingresa a tu panel con tu cuenta existente.
                  </p>
                  <a
                    href="/login"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-foreground font-semibold py-2.5 px-5 rounded-lg transition-colors mb-3 text-sm"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Iniciar sesión
                  </a>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">Acceso seguro</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {["Acceso inmediato a tu panel", "Historial de cobros completo", "Seguridad con cifrado SSL"].map((benefit) => (
                      <div key={benefit} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    ¿No tienes cuenta?{" "}
                    <button onClick={() => setActiveTab("registrar")} className="text-emerald-600 hover:underline">Regístrate aquí</button>
                  </p>
                </div>
              )}

              {/* Tab: Registrar */}
              {activeTab === "registrar" && (
                <div className="p-5">
                  <p className="text-muted-foreground text-xs text-center mb-4">
                    Crea tu cuenta y empieza a cobrar en minutos.
                  </p>
                  <a
                    href="/register"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-foreground font-semibold py-2.5 px-5 rounded-lg transition-colors mb-3 text-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Crear cuenta gratis
                  </a>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">Sin costos fijos</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {["Nombre completo y CURP", "Datos de tu negocio", "Aprobación en menos de 24h"].map((step) => (
                      <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {step}
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    ¿Ya tienes cuenta?{" "}
                    <button onClick={() => setActiveTab("acceso")} className="text-emerald-600 hover:underline">Inicia sesión</button>
                  </p>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              ¿Tienes dudas?{" "}
              <a href="mailto:soporte@kobrapay.mx" className="text-emerald-600 hover:underline">soporte@kobrapay.mx</a>
            </p>
          </div>
        </div>
      </section>

      {/* Cómo Funciona */}
      <section className="py-20 border-t border-border">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Simple y rápido</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-2 mb-3">Empieza a cobrar en 3 pasos</h2>
            <p className="text-muted-foreground text-sm">Sin hardware, sin contratos, sin mensualidad.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Crea tu cuenta", desc: "Regístrate en menos de 5 minutos con tu nombre, datos de tu negocio y RFC. Aprobación en menos de 24 horas.", icon: "👤", color: "emerald" },
              { step: "02", title: "Genera tu enlace", desc: "Escribe el monto, descripción y el correo de tu cliente. En segundos tienes un enlace listo para compartir por WhatsApp.", icon: "🔗", color: "cyan" },
              { step: "03", title: "Recibe el pago", desc: "Tu cliente paga con tarjeta desde su celular. Tú ves el pago en tiempo real en tu panel y recibes el comprobante automáticamente.", icon: "💰", color: "emerald" },
            ].map((item) => (
              <div key={item.step} className="relative bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-3xl font-black ${item.color === 'emerald' ? 'text-emerald-500/30' : 'text-cyan-500/30'}`}>{item.step}</span>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/register" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-foreground font-bold py-3 px-8 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20">
              Empezar ahora — es gratis <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Features interactivas */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">Todo lo que necesitas para cobrar</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Haz clic en cualquier función para ver cómo funciona en el panel.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature)}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-sm transition-all text-left group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color === "emerald" ? "bg-emerald-500/15 group-hover:bg-emerald-500/25" : "bg-cyan-500/15 group-hover:bg-cyan-500/25"} transition-colors`}>
                    <Icon className={`w-6 h-6 ${feature.color === "emerald" ? "text-emerald-400" : "text-cyan-400"}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-emerald-600 transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.shortDesc}</p>
                  <div className={`mt-4 text-xs font-medium flex items-center gap-1 ${feature.color === "emerald" ? "text-emerald-500" : "text-cyan-500"}`}>
                    Ver más <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Simulador de Comisiones */}
      <section id="simulador" className="py-20 border-t border-border">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">Simula cuanto te cobraremos</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Mueve el slider para ver exactamente cuanto recibiras despues de comisiones. A mayor volumen, menor porcentaje.</p>
          </div>
          <PublicQuoteCalculator tiers={activeTiers} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-border">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Preguntas Frecuentes</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-2 mb-3">Todo lo que necesitas saber</h2>
            <p className="text-muted-foreground text-sm">Resolvemos las dudas más comunes antes de que las tengas.</p>
          </div>
          <FAQSection />
            <p className="text-center text-sm text-muted-foreground mt-8">
            ¿Tienes más preguntas?{" "}
              <a href="mailto:soporte@kobrapay.mx" className="text-emerald-600 hover:underline">soporte@kobrapay.mx</a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/8 rounded-full blur-3xl" />
        </div>
        <div className="container text-center max-w-2xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sin costo de registro — solo pagas cuando cobras
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-4">Tu negocio merece cobrar<br /><span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">como los grandes</span></h2>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Crea tu cuenta en 5 minutos y genera tu primer enlace de pago hoy mismo.<br />Sin hardware, sin contratos, sin mensualidad.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-400 text-foreground text-base px-10 h-12 font-bold shadow-xl shadow-emerald-500/25">
              <a href="/register">Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-2" /></a>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8">
              <a href="mailto:soporte@kobrapay.mx">Hablar con ventas</a>
            </Button>
{/* Programa de Asociados — en standby hasta definir precio
            <Button size="lg" variant="outline" asChild className="h-12 px-8 border-cyan-500/40 text-cyan-600 hover:bg-cyan-50">
              <a href="/register-associate">Ser Asociado</a>
            </Button>
            */}
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sin mensualidad</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Aprobación en 24h</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Soporte en español</span>
          </div>
        </div>
      </section>

      {/* Blog / Recursos SEO */}
      <section className="py-20 border-t border-border bg-muted/30">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-emerald-500/10 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">Recursos gratuitos</span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-3">Aprende a cobrar mejor</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">Guías prácticas para emprendedores y negocios que quieren cobrar con tarjeta sin complicaciones.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/blog/cobrar-con-tarjeta-sin-terminal-mexico-2026" className="group block bg-background border border-border rounded-xl p-6 hover:border-emerald-500/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Guía</span>
                <span>5 min de lectura</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-emerald-600 transition-colors">Cómo cobrar con tarjeta sin terminal en México 2026</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Descubre las mejores opciones para aceptar pagos con tarjeta sin necesidad de una terminal física. Comparativa completa de comisiones.</p>
              <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium mt-4">Leer artículo →</span>
            </a>
            <a href="/blog/alternativas-mercado-pago-mexico-2026" className="group block bg-background border border-border rounded-xl p-6 hover:border-emerald-500/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-medium">Comparativa</span>
                <span>7 min de lectura</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-emerald-600 transition-colors">Las mejores alternativas a Mercado Pago en México 2026</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">¿Cansado de las comisiones de Mercado Pago? Analizamos las 6 mejores alternativas para negocios mexicanos con pros, contras y costos reales.</p>
              <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium mt-4">Leer artículo →</span>
            </a>
          </div>
          <div className="text-center mt-8">
            <a href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-600 transition-colors font-medium">
              Ver todos los artículos →
            </a>
          </div>
        </div>
      </section>

      {/* Footer mejorado */}
      <footer className="border-t border-border bg-background">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-7 h-7 object-contain" />
                <span className="font-bold text-foreground text-lg">KobraPay</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-xs">
                La plataforma de cobros digitales más completa de México. Genera enlaces de pago, cobra con tarjeta, OXXO y SPEI desde cualquier dispositivo.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  SSL 256-bit
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  PCI DSS
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  Stripe Certified
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">Plataforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground transition-colors">Crear cuenta gratis</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link></li>
                <li><a href="#simulador" className="hover:text-foreground transition-colors">Calculador de comisiones</a></li>
                <li><a href="#caracteristicas" className="hover:text-foreground transition-colors">Características</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">Contacto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:soporte@kobrapay.mx" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    soporte@kobrapay.mx
                  </a>
                </li>
                <li>
                  <a href="mailto:ventas@kobrapay.mx" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    ventas@kobrapay.mx
                  </a>
                </li>
                <li>
                  <a href="tel:+17869216543" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    +1 (786) 921-6543
                  </a>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Términos y Privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 KobraPay. Todos los derechos reservados. Ciudad de México, México.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/terminos" className="hover:text-foreground transition-colors">Términos de Uso</Link>
              <Link href="/privacidad" className="hover:text-foreground transition-colors">Aviso de Privacidad</Link>
              <Link href="/legal" className="hover:text-foreground transition-colors">Legal</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Feature Modal */}
      {activeFeature && <FeatureModal feature={activeFeature} onClose={() => setActiveFeature(null)} />}
    </div>
  );
}
