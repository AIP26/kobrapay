import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag, Share2, CheckCircle2, Zap, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png";

const ARTICLES = [
  {
    slug: "cobrar-con-tarjeta-sin-terminal-mexico-2026",
    title: "Cómo cobrar con tarjeta sin terminal en México 2026",
    excerpt: "Guía completa para emprendedores y negocios que quieren aceptar pagos con tarjeta sin necesidad de hardware, contratos ni mensualidades.",
    category: "Guías",
    readTime: "8 min",
    date: "21 Mar 2026",
    featured: true,
    content: true,
  },
  {
    slug: "alternativas-mercado-pago-mexico-2026",
    title: "Las mejores alternativas a Mercado Pago en México",
    excerpt: "Comparativa honesta de comisiones, funciones y velocidad de pago entre KobraPay, Clip, Conekta y Mercado Pago.",
    category: "Comparativas",
    readTime: "6 min",
    date: "18 Mar 2026",
    featured: false,
    content: false,
  },
  {
    slug: "links-de-pago-para-freelancers",
    title: "Links de pago para freelancers: cobra sin complicaciones",
    excerpt: "Si eres diseñador, fotógrafo, coach o consultor, aprende a cobrar por WhatsApp en 2 minutos con un link de pago.",
    category: "Freelancers",
    readTime: "5 min",
    date: "15 Mar 2026",
    featured: false,
    content: true,
  },
];

function ArticleContent() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-gray-800 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-gray-800 transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Cobrar sin terminal</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-4">Guías</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          Cómo cobrar con tarjeta sin terminal en México 2026
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Guía completa para emprendedores y negocios que quieren aceptar pagos con tarjeta sin necesidad de hardware, contratos ni mensualidades.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-y border-gray-100 py-4">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> 21 de marzo de 2026</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 8 min de lectura</span>
          <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Pagos digitales, México</span>
        </div>
      </header>

      {/* Intro */}
      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          En 2026, más del <strong>70% de los mexicanos</strong> prefieren pagar con tarjeta o billetera digital. Si tu negocio todavía solo acepta efectivo, estás perdiendo ventas todos los días.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          La buena noticia: ya no necesitas comprar una terminal física, firmar contratos ni pagar mensualidades. Con un <strong>link de pago</strong>, puedes cobrar con tarjeta desde tu teléfono en menos de 2 minutos.
        </p>

        {/* Highlight box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800 mb-1">¿Qué es un link de pago?</p>
              <p className="text-emerald-700 text-sm leading-relaxed">
                Un link de pago es una URL única que puedes compartir por WhatsApp, email o redes sociales. Tu cliente hace clic, ingresa su tarjeta y listo — tú recibes el dinero directamente en tu cuenta bancaria.
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">¿Por qué no necesitas terminal física?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Las terminales físicas (como las de Clip, iZettle o Bancomer) tienen varios problemas para negocios pequeños:
        </p>
        <ul className="space-y-2 mb-6">
          {[
            "Mensualidad de $199–$499 MXN aunque no vendas nada",
            "Costo del hardware: $1,500–$4,000 MXN",
            "Solo funcionan en persona — no sirven para ventas por WhatsApp",
            "Proceso de aprobación de 3–7 días hábiles",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✕</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-gray-700 leading-relaxed mb-8">
          Con un link de pago digital como KobraPay, ninguno de esos problemas existe.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Paso a paso: cómo cobrar con tarjeta sin terminal</h2>
        
        {[
          { step: "1", title: "Crea tu cuenta gratis", desc: "Regístrate en kobrapay.mx con tu email. Sin documentos, sin contratos. Aprobación en 24 horas." },
          { step: "2", title: "Crea un link de pago", desc: "Ingresa el monto, el concepto y el nombre del cliente. El sistema genera un link único en segundos." },
          { step: "3", title: "Comparte por WhatsApp o email", desc: "Envía el link a tu cliente. Él hace clic, ingresa su tarjeta (Visa, Mastercard, AMEX) y paga." },
          { step: "4", title: "Recibe el dinero", desc: "El pago llega a tu cuenta bancaria en 1–3 días hábiles. Sin intermediarios, sin retenciones." },
        ].map((item) => (
          <div key={item.step} className="flex gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {item.step}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Comparativa de comisiones 2026</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 border border-gray-200 font-semibold text-gray-700">Plataforma</th>
                <th className="text-center p-3 border border-gray-200 font-semibold text-gray-700">Comisión</th>
                <th className="text-center p-3 border border-gray-200 font-semibold text-gray-700">Mensualidad</th>
                <th className="text-center p-3 border border-gray-200 font-semibold text-gray-700">Sin terminal</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "KobraPay", commission: "3.6% + IVA", monthly: "Sin mensualidad", noTerminal: true, highlight: true },
                { name: "Mercado Pago", commission: "3.49% – 5.99%", monthly: "Sin mensualidad", noTerminal: true, highlight: false },
                { name: "Clip", commission: "2.9% + $2.50", monthly: "$199 MXN/mes", noTerminal: false, highlight: false },
                { name: "Conekta", commission: "3.6% + $3.00", monthly: "Desde $500 MXN", noTerminal: true, highlight: false },
              ].map((row) => (
                <tr key={row.name} className={row.highlight ? "bg-emerald-50" : ""}>
                  <td className="p-3 border border-gray-200 font-medium text-gray-800">
                    {row.name} {row.highlight && <Badge className="ml-2 bg-emerald-500 text-white text-xs">Recomendado</Badge>}
                  </td>
                  <td className="p-3 border border-gray-200 text-center text-gray-700">{row.commission}</td>
                  <td className="p-3 border border-gray-200 text-center text-gray-700">{row.monthly}</td>
                  <td className="p-3 border border-gray-200 text-center">
                    {row.noTerminal ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-red-400">✕</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">¿Es seguro cobrar con links de pago?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Sí. KobraPay procesa todos los pagos a través de <strong>Stripe</strong>, la misma infraestructura que usan Amazon, Shopify y Uber. Esto significa:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, title: "Cifrado SSL 256-bit", desc: "Todos los datos de tarjeta viajan encriptados" },
            { icon: CreditCard, title: "PCI DSS Nivel 1", desc: "El más alto estándar de seguridad en pagos" },
            { icon: CheckCircle2, title: "3D Secure", desc: "Verificación adicional para prevenir fraudes" },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-4">
              <item.icon className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="font-semibold text-gray-800 text-sm mb-1">{item.title}</p>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">¿Para quién es ideal cobrar sin terminal?</h2>
        <ul className="space-y-2 mb-8">
          {[
            "Freelancers: diseñadores, fotógrafos, programadores, consultores",
            "Coaches y terapeutas que cobran por sesión",
            "Agentes inmobiliarios y de seguros",
            "Restaurantes y food trucks que venden por WhatsApp",
            "Tiendas en línea o Instagram sin pasarela integrada",
            "Médicos y dentistas con consulta privada",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-center text-white mt-10">
          <h3 className="text-2xl font-bold mb-2">¿Listo para cobrar con tarjeta hoy?</h3>
          <p className="text-emerald-100 mb-6">Crea tu cuenta gratis en 2 minutos. Sin mensualidad. Sin terminal. Solo pagas cuando cobras.</p>
          <Link href="/">
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-xl">
              Crear cuenta gratis →
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function AlternativasContent() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-gray-800 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-gray-800 transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Alternativas a Mercado Pago</span>
      </nav>
      <header className="mb-10">
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4">Comparativas</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          Las mejores alternativas a Mercado Pago en México 2026
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Comparativa honesta de comisiones, velocidad de pago y funciones entre KobraPay, Clip, Conekta, Stripe y Mercado Pago. Elige la mejor opción para tu negocio.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-y border-gray-100 py-4">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> 18 de marzo de 2026</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 7 min de lectura</span>
          <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Comparativas, México</span>
        </div>
      </header>

      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          Mercado Pago cobra <strong>3.95% + IVA</strong> por transacción y retiene tu dinero entre 2 y 14 días hábiles. Para muchos negocios mexicanos, eso es demasiado. En 2026 hay mejores opciones.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          Analizamos las 6 principales alternativas con datos reales de comisiones, tiempos de depósito y facilidad de uso para que puedas tomar la mejor decisión para tu negocio.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <h3 className="text-blue-800 font-bold text-lg mb-2">¿Por qué buscar alternativas a Mercado Pago?</h3>
          <ul className="space-y-2 text-blue-700 text-sm">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" /> Retención de fondos de 2 a 14 días hábiles</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" /> Comisión de 3.95% + IVA (una de las más altas del mercado)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" /> Cuentas bloqueadas sin previo aviso por disputas</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" /> Soporte al cliente lento y difícil de contactar</li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Comparativa de comisiones 2026</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 border border-gray-200 font-semibold">Plataforma</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Comisión</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Mensualidad</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Depósito</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Terminal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-50 border-2 border-emerald-300">
                <td className="p-3 border border-gray-200 font-bold text-emerald-700">KobraPay ⭐</td>
                <td className="p-3 border border-gray-200 text-center font-semibold text-emerald-700">4.6% + IVA</td>
                <td className="p-3 border border-gray-200 text-center text-emerald-700">$0</td>
                <td className="p-3 border border-gray-200 text-center text-emerald-700">2-3 días</td>
                <td className="p-3 border border-gray-200 text-center text-emerald-700">No necesaria</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">Mercado Pago</td>
                <td className="p-3 border border-gray-200 text-center">3.95% + IVA</td>
                <td className="p-3 border border-gray-200 text-center">$0</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">2–14 días</td>
                <td className="p-3 border border-gray-200 text-center">Opcional</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-200 font-medium">Clip</td>
                <td className="p-3 border border-gray-200 text-center">3.6% + IVA</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">$199/mes</td>
                <td className="p-3 border border-gray-200 text-center">1-2 días</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">Requerida</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">Conekta</td>
                <td className="p-3 border border-gray-200 text-center">2.9% + IVA</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">Desde $500/mes</td>
                <td className="p-3 border border-gray-200 text-center">2-3 días</td>
                <td className="p-3 border border-gray-200 text-center">No</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-200 font-medium">Stripe (directo)</td>
                <td className="p-3 border border-gray-200 text-center">3.6% + IVA</td>
                <td className="p-3 border border-gray-200 text-center">$0</td>
                <td className="p-3 border border-gray-200 text-center">7 días</td>
                <td className="p-3 border border-gray-200 text-center">No</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">PayPal</td>
                <td className="p-3 border border-gray-200 text-center">5.4% + IVA</td>
                <td className="p-3 border border-gray-200 text-center">$0</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">3-5 días</td>
                <td className="p-3 border border-gray-200 text-center">No</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Cuál es la mejor opción para tu negocio?</h2>

        <div className="space-y-4 mb-8">
          <div className="border border-emerald-200 rounded-xl p-5 bg-emerald-50">
            <h3 className="font-bold text-emerald-800 mb-1">🏆 KobraPay — Mejor para negocios sin terminal</h3>
            <p className="text-sm text-emerald-700">Si vendes servicios, eres freelancer o tienes un negocio online, KobraPay es la opción más rápida. Genera un link de pago en 2 minutos, compártelo por WhatsApp y recibe el dinero en 2-3 días. Sin mensualidad, sin hardware, sin complicaciones.</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-800 mb-1">🏪 Clip — Mejor para tiendas físicas</h3>
            <p className="text-sm text-gray-600">Si tienes una tienda física con alto volumen de ventas (más de $50,000/mes), la terminal de Clip puede valer la pena por su menor comisión. Pero requiere hardware y mensualidad.</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-800 mb-1">💻 Conekta — Mejor para e-commerce avanzado</h3>
            <p className="text-sm text-gray-600">Si tienes una tienda online con desarrollo propio y más de $100,000/mes en ventas, Conekta ofrece la mejor comisión. Pero requiere integración técnica y mensualidad fija.</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-800 mb-1">🌎 Stripe directo — Mejor para ventas internacionales</h3>
            <p className="text-sm text-gray-600">Si vendes a clientes fuera de México o necesitas integración con plataformas internacionales, Stripe directo es la opción. KobraPay usa Stripe como procesador, así que obtienes la misma confiabilidad con una interfaz más simple.</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Conclusión: ¿Vale la pena cambiar de Mercado Pago?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Si tu negocio genera menos de $50,000 MXN al mes en cobros con tarjeta, <strong>KobraPay es la mejor alternativa</strong>. No pagas mensualidad, no necesitas hardware y tu dinero llega en 2-3 días hábiles — no en 14.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          Si generas más de $100,000 MXN al mes, considera Conekta o Clip dependiendo de si vendes en línea o en físico. En cualquier caso, Mercado Pago rara vez es la mejor opción para negocios mexicanos en 2026.
        </p>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-center text-white mt-10">
          <h3 className="text-2xl font-bold mb-2">Prueba KobraPay gratis hoy</h3>
          <p className="text-emerald-100 mb-6">Sin mensualidad. Sin terminal. Sin contratos. Solo pagas cuando cobras.</p>
          <Link href="/">
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-xl">
              Crear cuenta gratis →
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function FreelancersContent() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-gray-800 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-gray-800 transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Links de pago para freelancers</span>
      </nav>
      <header className="mb-10">
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-4">Freelancers</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          Links de pago para freelancers en México: cobra sin complicaciones en 2026
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Si eres diseñador, fotógrafo, coach, consultor o desarrollador freelance en México, esta guía te explica cómo cobrar con tarjeta sin terminal, sin mensualidad y sin perder tiempo en bancos.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-y border-gray-100 py-4">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> 15 de marzo de 2026</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 5 min de lectura</span>
          <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Freelancers, Cobros, México</span>
        </div>
      </header>

      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          El mayor problema de los freelancers en México no es conseguir clientes — es <strong>cobrarles</strong>. Transferencias que no llegan, clientes que piden factura, pagos en efectivo que generan desconfianza. En 2026 hay una solución simple: <strong>links de pago</strong>.
        </p>

        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-8">
          <h3 className="text-purple-800 font-bold text-lg mb-3">¿Qué es un link de pago?</h3>
          <p className="text-purple-700 text-sm mb-3">Un link de pago es una URL única que puedes enviar por WhatsApp, email o Instagram. Tu cliente hace clic, ingresa su tarjeta y listo — el dinero llega a tu cuenta en 2–3 días hábiles.</p>
          <p className="text-purple-700 text-sm font-semibold">No necesitas terminal física, no necesitas cuenta empresarial, no necesitas saber programar.</p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Por qué los freelancers necesitan links de pago?</h2>
        <div className="space-y-3 mb-8">
          {[
            { title: "Cobras con tarjeta sin terminal física", desc: "No necesitas comprar hardware ni pagar mensualidad. Solo generas el link y lo compartes." },
            { title: "Transmites profesionalismo", desc: "Enviar un link de pago con tu logo genera más confianza que pedir transferencia a cuenta personal." },
            { title: "Reduces el riesgo de no pago", desc: "Con un link puedes pedir anticipo antes de empezar el proyecto. El cliente paga en segundos desde su celular." },
            { title: "Historial de cobros organizado", desc: "Cada pago queda registrado con nombre del cliente, monto y fecha. Perfecto para llevar tu contabilidad." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cómo crear tu primer link de pago en 3 pasos</h2>
        <div className="space-y-4 mb-8">
          {[
            { step: 1, title: "Crea tu cuenta en KobraPay", desc: "Regístrate gratis en kobrapay.mx. Solo necesitas tu correo y nombre. Sin RFC, sin documentos, sin esperas. Tu cuenta queda activa en minutos." },
            { step: 2, title: "Genera tu link de pago", desc: 'En el panel, haz clic en "Nuevo Cobro". Escribe el monto, una descripción (ej. "Diseño de logo — 50% anticipo") y genera el link. Todo en menos de 2 minutos.' },
            { step: 3, title: "Comparte y cobra", desc: "Copia el link y envíalo por WhatsApp, email o Instagram. Tu cliente paga con cualquier tarjeta de crédito o débito. El dinero llega a tu cuenta en 2–3 días hábiles." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shrink-0 text-lg">{s.step}</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Cuánto cuesta? Comparativa para freelancers</h2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 border border-gray-200 font-semibold">Plataforma</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Comisión</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Mensualidad</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Sin terminal</th>
                <th className="text-center p-3 border border-gray-200 font-semibold">Depósito</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-50 border-2 border-emerald-300">
                <td className="p-3 border border-gray-200 font-bold text-emerald-700">KobraPay ⭐</td>
                <td className="p-3 border border-gray-200 text-center font-semibold text-emerald-700">4.6% + IVA</td>
                <td className="p-3 border border-gray-200 text-center text-emerald-700">$0</td>
                <td className="p-3 border border-gray-200 text-center text-emerald-700">✅ Sí</td>
                <td className="p-3 border border-gray-200 text-center text-emerald-700">2–3 días</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">Mercado Pago</td>
                <td className="p-3 border border-gray-200 text-center">3.95% + IVA</td>
                <td className="p-3 border border-gray-200 text-center">$0</td>
                <td className="p-3 border border-gray-200 text-center">✅ Sí</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">2–14 días</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-200 font-medium">PayPal</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">5.4% + IVA</td>
                <td className="p-3 border border-gray-200 text-center">$0</td>
                <td className="p-3 border border-gray-200 text-center">✅ Sí</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">3–5 días</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">Clip</td>
                <td className="p-3 border border-gray-200 text-center">3.6% + IVA</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">$199/mes</td>
                <td className="p-3 border border-gray-200 text-center text-red-600">❌ Terminal</td>
                <td className="p-3 border border-gray-200 text-center">1–2 días</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mb-8">*Comisiones verificadas en marzo 2026. IVA (16%) se aplica sobre la comisión.</p>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ejemplo real: cuánto pagas por cobrar $5,000 MXN</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="border-2 border-emerald-300 bg-emerald-50 rounded-2xl p-5">
            <h3 className="font-bold text-emerald-800 mb-3">Con KobraPay</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Cobro al cliente</span><span className="font-semibold">$5,000</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Comisión (4.6%)</span><span className="text-red-500">-$230</span></div>
              <div className="flex justify-between"><span className="text-gray-600">IVA sobre comisión</span><span className="text-red-500">-$36.80</span></div>
              <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2"><span className="font-bold text-emerald-800">Recibes</span><span className="font-bold text-emerald-700 text-lg">$4,733.20</span></div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-800 mb-3">Con Mercado Pago</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Cobro al cliente</span><span className="font-semibold">$5,000</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Comisión (3.95%)</span><span className="text-red-500">-$197.50</span></div>
              <div className="flex justify-between"><span className="text-gray-600">IVA sobre comisión</span><span className="text-red-500">-$31.60</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="font-bold">Recibes</span><span className="font-bold text-lg">$4,770.90</span></div>
              <p className="text-xs text-red-500 mt-1">⚠️ Pero esperas hasta 14 días para recibir tu dinero</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <h3 className="text-amber-800 font-bold text-lg mb-2">💡 Tip: transfiere la comisión al cliente</h3>
          <p className="text-amber-700 text-sm">Muchos freelancers agregan el 4.6% al precio final cuando el cliente paga con tarjeta. Si tu servicio vale $5,000, cobras $5,230 con tarjeta. Así no absorbes la comisión y el cliente elige cómo pagar.</p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Para qué tipo de freelancer funciona mejor?</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            { emoji: "🎨", title: "Diseñadores gráficos", desc: "Cobra anticipos y pagos finales por proyecto" },
            { emoji: "📸", title: "Fotógrafos y videógrafos", desc: "Genera links por sesión y cobra antes del evento" },
            { emoji: "💻", title: "Desarrolladores web", desc: "Cobra por horas o por proyecto con historial completo" },
            { emoji: "🧘", title: "Coaches y consultores", desc: "Vende sesiones individuales o paquetes con link único" },
            { emoji: "✍️", title: "Redactores y copywriters", desc: "Cobra por artículo, por palabra o por proyecto" },
            { emoji: "🏠", title: "Agentes inmobiliarios", desc: "Cobra honorarios y comisiones de forma profesional" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl">
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4 mb-8">
          {[
            { q: "¿Necesito RFC para usar KobraPay?", a: "No. Puedes registrarte y cobrar sin RFC. Si necesitas emitir facturas, puedes hacerlo por separado con tu contador." },
            { q: "¿Mis clientes necesitan crear una cuenta?", a: "No. Tu cliente solo recibe el link, hace clic, ingresa su tarjeta y paga. Sin registros, sin apps." },
            { q: "¿Puedo cobrar en dólares?", a: "Sí. KobraPay soporta cobros en USD para clientes internacionales. El tipo de cambio se aplica automáticamente." },
            { q: "¿Qué pasa si el cliente hace un contracargo?", a: "KobraPay tiene un proceso de disputa con Stripe. Recibirás notificación y podrás presentar evidencia del servicio entregado." },
            { q: "¿Puedo personalizar el link con mi marca?", a: "Sí. Puedes agregar tu logo, nombre de negocio y descripción personalizada en cada link de pago." },
          ].map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-800 mb-2 text-sm">❓ {faq.q}</h3>
              <p className="text-gray-600 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-center text-white mt-10">
          <h3 className="text-2xl font-bold mb-2">Empieza a cobrar como profesional hoy</h3>
          <p className="text-emerald-100 mb-2">Sin mensualidad. Sin terminal. Sin contratos.</p>
          <p className="text-emerald-200 text-sm mb-6">Tu primer link de pago en menos de 2 minutos.</p>
          <Link href="/">
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-xl">
              Crear cuenta gratis →
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  const path = window.location.pathname;
  const isArticle = path.includes("/blog/");
  const slug = path.split("/blog/")[1];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "KobraPay Blog", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado al portapapeles");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <img src={LOGO} alt="KobraPay" className="h-8 object-contain" />
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/blog" className="hover:text-gray-900 font-medium transition-colors">Blog</Link>
            <Link href="/#comisiones" className="hover:text-gray-900 transition-colors">Comisiones</Link>
          </nav>
          <Link href="/">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl">
              Ir al Panel →
            </Button>
          </Link>
        </div>
      </header>

      {isArticle && slug === "cobrar-con-tarjeta-sin-terminal-mexico-2026" ? (
        <div>
          <div className="max-w-3xl mx-auto px-4 pt-6 flex items-center justify-between">
            <Link href="/blog">
              <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver al blog
              </button>
            </Link>
            <button onClick={handleShare} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </div>
          <ArticleContent />
        </div>
      ) : isArticle && slug === "alternativas-mercado-pago-mexico-2026" ? (
        <div>
          <div className="max-w-3xl mx-auto px-4 pt-6 flex items-center justify-between">
            <Link href="/blog">
              <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver al blog
              </button>
            </Link>
            <button onClick={handleShare} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </div>
          <AlternativasContent />
        </div>
      ) : isArticle && slug === "links-de-pago-para-freelancers" ? (
        <div>
          <div className="max-w-3xl mx-auto px-4 pt-6 flex items-center justify-between">
            <Link href="/blog">
              <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver al blog
              </button>
            </Link>
            <button onClick={handleShare} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </div>
          <FreelancersContent />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Blog header */}
          <div className="text-center mb-12">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-4">Blog KobraPay</Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Recursos para cobrar mejor</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Guías, comparativas y consejos para emprendedores y negocios que quieren cobrar con tarjeta de forma simple y segura.
            </p>
          </div>

          {/* Featured article */}
          <div className="mb-12">
            <Link href="/blog/cobrar-con-tarjeta-sin-terminal-mexico-2026">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 sm:p-12 text-white cursor-pointer hover:shadow-xl transition-shadow">
                <Badge className="bg-white/20 text-white border-white/30 mb-4">Artículo destacado</Badge>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                  Cómo cobrar con tarjeta sin terminal en México 2026
                </h2>
                <p className="text-emerald-100 mb-6 max-w-2xl">
                  Guía completa para emprendedores y negocios que quieren aceptar pagos con tarjeta sin hardware, contratos ni mensualidades.
                </p>
                <div className="flex items-center gap-4 text-sm text-emerald-200 mb-6">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> 21 Mar 2026</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 8 min</span>
                </div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  Leer artículo <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* More articles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ARTICLES.filter(a => !a.featured).map((article) => (
              <div
                key={article.slug}
                className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (article.content) {
                    window.location.href = `/blog/${article.slug}`;
                  } else {
                    toast.info("Artículo próximamente disponible");
                  }
                }}
              >
                <Badge className="bg-gray-100 text-gray-600 border-gray-200 mb-3 text-xs">{article.category}</Badge>
                <h3 className="font-bold text-gray-900 mb-2 leading-snug">{article.title}</h3>
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{article.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {article.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SEO footer */}
          <div className="mt-16 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              KobraPay — Procesador de pagos mexicano. Cobra con tarjeta sin terminal. Sin mensualidad. Procesado por Stripe.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
