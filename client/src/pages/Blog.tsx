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
    slug: "alternativas-mercado-pago-mexico",
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
    content: false,
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
