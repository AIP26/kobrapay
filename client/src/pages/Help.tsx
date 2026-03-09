import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import {
  Link2, CreditCard, BarChart3, Users, Shield, FileText,
  ChevronDown, ChevronRight, HelpCircle, Phone, Mail,
  Package, MonitorSmartphone, Code2, RefreshCw, UserCheck,
  Handshake, TrendingUp, UserCog, AlertTriangle, BookOpen, Download,
} from "lucide-react";

const MANUALS = {
  superadmin: {
    label: "Manual Superadmin",
    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/manual_superadmin_ebf8a3b1.pdf",
    desc: "Gestión completa de la plataforma, métricas, usuarios y configuración avanzada.",
    color: "amber",
  },
  admin: {
    label: "Manual Administrador",
    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/manual_admin_empresa_2d947f70.pdf",
    desc: "Cobros, contratos, clientes, reportes y configuración del negocio.",
    color: "emerald",
  },
  empleado: {
    label: "Manual Empleado",
    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/manual_empleado_c5f67a48.pdf",
    desc: "Guía para asistentes y operadores: cobros, ventas y atención al cliente.",
    color: "cyan",
  },
};

interface FAQItem {
  q: string;
  a: string;
}

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  intro: string;
  steps: { title: string; desc: string }[];
  faqs: FAQItem[];
}

const SECTIONS_NEGOCIO: Section[] = [
  {
    id: "cobros",
    icon: Link2,
    title: "Crear un Cobro",
    color: "emerald",
    intro: "Genera un enlace de pago personalizado para compartir con tu cliente por WhatsApp, email o QR.",
    steps: [
      { title: "Ve a 'Nuevo Cobro'", desc: "En el menú lateral, haz clic en 'Nuevo Cobro' o en el botón '+ Cobro'." },
      { title: "Llena los datos", desc: "Ingresa el nombre del cliente, monto, descripción y opcionalmente el email del cliente." },
      { title: "Activa protecciones", desc: "Puedes activar OTP por SMS, selfie del pagador o firma digital para mayor seguridad." },
      { title: "Genera el enlace", desc: "Haz clic en 'Crear Enlace'. Copia el link y compártelo con tu cliente." },
      { title: "Recibe el pago", desc: "Cuando el cliente pague, recibirás una notificación y el pago aparecerá en 'Mis Ventas'." },
    ],
    faqs: [
      { q: "¿Cuánto tiempo es válido el enlace?", a: "Por defecto no expira, pero puedes configurar una fecha de expiración al crearlo." },
      { q: "¿Puedo cobrar en dólares?", a: "Sí. Al crear el enlace, selecciona USD como moneda e ingresa el tipo de cambio." },
      { q: "¿Qué tarjetas acepta?", a: "Visa, Mastercard y American Express, tanto crédito como débito." },
    ],
  },
  {
    id: "ventas",
    icon: BarChart3,
    title: "Mis Ventas",
    color: "cyan",
    intro: "Consulta el historial completo de tus cobros, filtra por fecha y descarga comprobantes.",
    steps: [
      { title: "Accede a 'Mis Ventas'", desc: "Haz clic en 'Mis Ventas' en el menú lateral." },
      { title: "Busca una transacción", desc: "Usa la barra de búsqueda para encontrar por nombre del cliente, monto u operación." },
      { title: "Ver detalle", desc: "Haz clic en cualquier transacción para ver todos los detalles: fecha, monto, comisión, datos del pagador." },
      { title: "Descargar comprobante", desc: "Desde el detalle, haz clic en 'Descargar Comprobante' para obtener el PDF." },
      { title: "Exportar CSV", desc: "Usa el botón 'Exportar CSV' para descargar todas tus ventas en formato Excel." },
    ],
    faqs: [
      { q: "¿Por qué aparece 'Pendiente' un pago?", a: "El pago está siendo procesado por Stripe. Normalmente se confirma en segundos." },
      { q: "¿Cómo solicito una aclaración?", a: "Ve a 'Aclaraciones' en el menú y crea un nuevo caso con la evidencia del pago." },
    ],
  },
  {
    id: "catalogo",
    icon: Package,
    title: "Catálogo de Productos",
    color: "emerald",
    intro: "Crea tu catálogo de productos o servicios para agilizar la creación de cobros.",
    steps: [
      { title: "Ve a 'Catálogo'", desc: "En el menú lateral, haz clic en 'Catálogo'." },
      { title: "Agrega un producto", desc: "Haz clic en '+ Producto', ingresa nombre, precio y descripción." },
      { title: "Usa en cobros", desc: "Al crear un nuevo cobro, puedes seleccionar productos del catálogo para auto-llenar los datos." },
    ],
    faqs: [
      { q: "¿Puedo tener productos en USD?", a: "Sí, al crear el producto selecciona USD como moneda." },
    ],
  },
  {
    id: "pos",
    icon: MonitorSmartphone,
    title: "Punto de Venta (POS)",
    color: "cyan",
    intro: "Usa el POS para cobrar en persona desde cualquier dispositivo, como una caja registradora virtual.",
    steps: [
      { title: "Ve a 'Punto de Venta'", desc: "Haz clic en 'Punto de Venta' en el menú lateral." },
      { title: "Selecciona productos", desc: "Agrega productos del catálogo al carrito o ingresa un monto manual." },
      { title: "Procesa el pago", desc: "Haz clic en 'Cobrar'. Se genera un enlace de pago que el cliente puede usar en su teléfono." },
    ],
    faqs: [
      { q: "¿Necesito lector de tarjetas?", a: "No. El POS genera un enlace de pago digital. Para cobro con lector físico, visita 'Compra tu Lector'." },
    ],
  },
  {
    id: "widget",
    icon: Code2,
    title: "Widget de Pago",
    color: "emerald",
    intro: "Integra un botón de pago en tu sitio web con unas pocas líneas de código.",
    steps: [
      { title: "Ve a 'Widget de Pago'", desc: "Haz clic en 'Widget de Pago' en el menú lateral." },
      { title: "Copia el código", desc: "Copia el snippet HTML generado." },
      { title: "Pégalo en tu web", desc: "Pega el código en el HTML de tu sitio web donde quieras que aparezca el botón de pago." },
    ],
    faqs: [
      { q: "¿Funciona en cualquier web?", a: "Sí, funciona en cualquier sitio web que permita HTML personalizado: WordPress, Wix, Shopify, etc." },
    ],
  },
];

const SECTIONS_COLABORADOR: Section[] = [
  {
    id: "cobros-col",
    icon: Link2,
    title: "Crear Cobros",
    color: "emerald",
    intro: "Como colaborador, puedes crear enlaces de cobro para los clientes de la empresa.",
    steps: [
      { title: "Ve a 'Nuevo Cobro'", desc: "Haz clic en 'Nuevo Cobro' en el menú lateral." },
      { title: "Llena los datos del cliente", desc: "Ingresa nombre, monto y descripción. Activa las protecciones que correspondan." },
      { title: "Comparte el enlace", desc: "Copia el enlace generado y envíalo al cliente." },
    ],
    faqs: [
      { q: "¿Puedo ver los cobros de otros colaboradores?", a: "No, solo puedes ver los cobros que tú creaste." },
    ],
  },
  {
    id: "ventas-col",
    icon: BarChart3,
    title: "Ver Mis Ventas",
    color: "cyan",
    intro: "Consulta el historial de los cobros que tú has creado.",
    steps: [
      { title: "Ve a 'Mis Ventas'", desc: "Haz clic en 'Mis Ventas' en el menú lateral." },
      { title: "Filtra y busca", desc: "Usa la búsqueda para encontrar cobros específicos." },
      { title: "Descarga comprobantes", desc: "Haz clic en una transacción para ver el detalle y descargar el comprobante PDF." },
    ],
    faqs: [],
  },
];

const SECTIONS_ASISTENTE: Section[] = [
  ...SECTIONS_COLABORADOR,
  {
    id: "contratos",
    icon: Handshake,
    title: "Gestión de Contratos",
    color: "emerald",
    intro: "Como asistente, puedes crear y gestionar contratos digitales con firma electrónica.",
    steps: [
      { title: "Ve a 'Contratos'", desc: "Haz clic en 'Contratos' en el menú lateral (sección Super Admin)." },
      { title: "Crea un contrato", desc: "Haz clic en '+ Nuevo Contrato', selecciona la plantilla y llena los datos del cliente." },
      { title: "Envía para firma", desc: "Haz clic en 'Enviar para Firma'. El cliente recibirá un enlace por email para firmar digitalmente." },
      { title: "Sube documentos", desc: "Puedes solicitar al cliente que suba su INE, comprobante de domicilio, RFC o CURP." },
      { title: "Descarga el PDF firmado", desc: "Una vez firmado, descarga el contrato en PDF con la firma incluida." },
    ],
    faqs: [
      { q: "¿Es válida la firma electrónica?", a: "Sí. La firma digital con evidencia fotográfica tiene validez legal en México bajo la NOM-151." },
      { q: "¿Qué documentos puede subir el cliente?", a: "INE, comprobante de domicilio, RFC, CURP y pasaporte." },
    ],
  },
];

const SECTIONS_CAPACITACIONES: Section[] = [
  {
    id: "capacitaciones",
    icon: BookOpen,
    title: "Academia KobraPay — Capacitaciones",
    color: "emerald",
    intro: "Accede a cursos internos con guías, videos y material completo sin salir de la plataforma.",
    steps: [
      { title: "Ve a 'Expedientes RH'", desc: "En el menú lateral, haz clic en 'Expedientes RH' y selecciona la pestaña 'Capacitaciones'." },
      { title: "Explora los cursos", desc: "Filtra por categoría (Inglés, Microsoft Office, Ventas, Salud, etc.) o busca por nombre." },
      { title: "Abre un curso", desc: "Haz clic en 'Ver curso' para abrir el detalle con módulos, videos y guías." },
      { title: "Completa los módulos", desc: "Expande cada módulo para ver el video de YouTube, la guía interna y marcar como completado." },
      { title: "Marca el curso como completado", desc: "Cuando termines todos los módulos, haz clic en '✓ Marcar como completado'. Aparecerá en tu Perfil Profesional." },
      { title: "Sube tu evidencia", desc: "Opcionalmente, sube un archivo (certificado, foto, PDF) como evidencia de que completaste el curso." },
    ],
    faqs: [
      { q: "¿Dónde aparecen mis cursos completados?", a: "En tu perfil, en la pestaña 'Perfil Profesional'. Muestra el curso, fecha de completado y enlace a la evidencia." },
      { q: "¿Puedo borrar una evidencia subida por error?", a: "Sí. Abre el curso, ve a la sección de evidencia y haz clic en el ícono de borrar (🗑)." },
      { q: "¿Quién puede crear nuevos cursos?", a: "El Superadministrador, los Administradores y el Asistente pueden crear nuevos cursos con el botón '+ Nuevo Curso'." },
      { q: "¿Los videos se ven dentro de la plataforma?", a: "Sí. Los videos de YouTube se reproducen directamente en el modal del módulo, sin salir de KobraPay." },
    ],
  },
];

const SECTIONS_CONTRATOS: Section[] = [
  {
    id: "contratos-firma",
    icon: Handshake,
    title: "Contratos Digitales con Firma",
    color: "cyan",
    intro: "Crea contratos, fírmalos digitalmente y solicita documentos KYC al cliente.",
    steps: [
      { title: "Crea un contrato", desc: "Ve a 'Contratos' y haz clic en '+ Nuevo Contrato'. Llena los datos del cliente y los términos." },
      { title: "Firma como KobraPay", desc: "Haz clic en el ícono de firma (✍) en la tabla. Se abrirá un canvas para dibujar tu firma digital." },
      { title: "Envía al cliente para firma", desc: "Haz clic en el ícono de compartir (✈). El cliente recibirá un email con el enlace para firmar." },
      { title: "El cliente firma y sube documentos", desc: "El cliente dibuja su firma, ingresa su razón social, RFC, nombre del representante legal y sube: INE, situación fiscal y comprobante de domicilio." },
      { title: "Ambas partes reciben copia", desc: "Al completarse las dos firmas, se envía automáticamente un email con el contrato firmado a KobraPay y al cliente." },
      { title: "Revisa el expediente KYC", desc: "En el perfil del cliente (Mis Clientes → Ver detalle), encontrarás todos los documentos subidos organizados." },
    ],
    faqs: [
      { q: "¿Es válida la firma electrónica?", a: "Sí. La firma digital con evidencia fotográfica tiene validez legal en México bajo la NOM-151." },
      { q: "¿Qué documentos puede subir el cliente?", a: "INE/Pasaporte, Situación Fiscal (SAT), Comprobante de Domicilio, y Acta Constitutiva." },
      { q: "¿Puedo ver los documentos del cliente?", a: "Sí. Como Superadmin, en el perfil de cada cliente verás la sección 'Expediente KYC' con todos sus documentos." },
      { q: "¿El contrato se actualiza automáticamente?", a: "El contenido del contrato se actualiza cuando editas la plantilla. Los contratos ya firmados conservan su versión original." },
    ],
  },
];

const SECTIONS_SUPERADMIN: Section[] = [
  {
    id: "registros",
    icon: UserCog,
    title: "Gestión de Registros",
    color: "amber",
    intro: "Aprueba o rechaza las solicitudes de nuevas cuentas de negocios en la plataforma.",
    steps: [
      { title: "Ve a 'Registros'", desc: "En la sección Super Admin del menú, haz clic en 'Registros'." },
      { title: "Revisa las solicitudes", desc: "Verás la lista de cuentas pendientes de aprobación con sus datos." },
      { title: "Aprueba o rechaza", desc: "Haz clic en 'Aprobar' para activar la cuenta, o 'Rechazar' para bloquearla." },
    ],
    faqs: [
      { q: "¿Qué pasa cuando rechazo una cuenta?", a: "El usuario ve una pantalla de 'Cuenta bloqueada' y no puede acceder al panel." },
    ],
  },
  {
    id: "comisiones",
    icon: TrendingUp,
    title: "Panel de Comisiones",
    color: "amber",
    intro: "Monitorea las ganancias de la plataforma por cliente y visualiza el volumen mensual.",
    steps: [
      { title: "Ve a 'Comisiones'", desc: "En la sección Super Admin del menú, haz clic en 'Comisiones'." },
      { title: "Revisa los KPIs", desc: "Verás el total de comisiones, volumen procesado y número de transacciones." },
      { title: "Analiza por cliente", desc: "La tabla muestra el desglose por cliente con su volumen, comisiones y estado." },
      { title: "Gráfica mensual", desc: "La gráfica de barras muestra la evolución de comisiones en los últimos 12 meses." },
    ],
    faqs: [
      { q: "¿Cómo se calcula la comisión?", a: "Se calcula como el porcentaje configurado para cada cliente sobre el monto de cada transacción exitosa." },
    ],
  },
  {
    id: "clientes-admin",
    icon: Users,
    title: "Gestión de Clientes (Negocios)",
    color: "amber",
    intro: "Administra las cuentas de los negocios que usan la plataforma.",
    steps: [
      { title: "Ve a 'Mis Clientes'", desc: "En la sección Administración del menú, haz clic en 'Mis Clientes'." },
      { title: "Crea o edita clientes", desc: "Agrega nuevos negocios clientes o edita sus datos y comisiones." },
      { title: "Configura comisión", desc: "Establece el porcentaje de comisión individual para cada negocio cliente." },
      { title: "Revisa el expediente KYC", desc: "Haz clic en 'Ver detalle' de un cliente para ver sus documentos: INE, situación fiscal, comprobante de domicilio y contratos firmados." },
    ],
    faqs: [
      { q: "¿Cómo veo los documentos de un cliente?", a: "En Mis Clientes, haz clic en el nombre del cliente y ve a la sección 'Expediente KYC' en el panel de detalle." },
    ],
  },
  {
    id: "rh-revista",
    icon: AlertTriangle,
    title: "RH: Capacitaciones y Mi Revista",
    color: "amber",
    intro: "Gestiona el desarrollo profesional del equipo y la revista interna de la empresa.",
    steps: [
      { title: "Ve a 'Expedientes RH'", desc: "En el menú lateral, haz clic en 'Expedientes RH'." },
      { title: "Pestaña Capacitaciones", desc: "Crea y gestiona cursos para tu equipo. Puedes subir guías, videos de YouTube y material interno." },
      { title: "Pestaña Mi Revista", desc: "Si tu empresa tiene una revista informativa, puedes verla aquí. Si no tienes una, usa el generador con IA para crear la primera edición." },
      { title: "Genera tu revista con IA", desc: "Describe el tema, sección o noticias que quieres incluir y la IA generará el contenido de la revista automáticamente." },
    ],
    faqs: [
      { q: "¿Quién puede crear cursos?", a: "El Superadministrador, los Administradores y el Asistente." },
      { q: "¿La revista es pública?", a: "No, la revista es interna. Solo los usuarios de tu empresa pueden verla." },
    ],
  },
  {
    id: "pasarelas",
    icon: CreditCard,
    title: "Pasarelas de Pago",
    color: "amber",
    intro: "Configura y conecta las pasarelas de pago disponibles en la plataforma.",
    steps: [
      { title: "Ve a 'Configuración'", desc: "En el menú lateral, haz clic en 'Configuración' (sección Sistema)." },
      { title: "Sección Pasarelas de Pago", desc: "Verás las pasarelas disponibles: Stripe (activo en modo prueba), Conekta, OpenPay y PayPal (próximamente)." },
      { title: "Activa Stripe en modo real", desc: "Haz clic en 'este enlace' para reclamar tu sandbox de Stripe y activar pagos reales." },
      { title: "Conecta otras pasarelas", desc: "Cuando estén disponibles, ingresa las API Keys de Conekta, OpenPay o PayPal para activarlas." },
    ],
    faqs: [
      { q: "¿Qué tarjeta usar para pruebas?", a: "Usa 4242 4242 4242 4242 con cualquier CVV de 3 dígitos y fecha futura." },
      { q: "¿Cuándo estarán disponibles Conekta y OpenPay?", a: "Están en desarrollo. Contáctanos en soporte@kobrapay.mx para ser notificado cuando estén listos." },
    ],
  },
];

function AccordionItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors"
      >
        {q}
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border bg-white/3">
          {a}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = section.icon;
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };
  const accentMap: Record<string, string> = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
  };
  const dotMap: Record<string, string> = {
    emerald: "bg-emerald-400",
    cyan: "bg-cyan-400",
    amber: "bg-amber-400",
  };

  return (
    <div className="bg-[#1a1f2e] border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${colorMap[section.color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{section.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.intro}</p>
        </div>
        {expanded
          ? <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-5">
          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pasos</p>
            <ol className="space-y-3">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${colorMap[section.color]}`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${accentMap[section.color]}`}>{step.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {/* FAQs */}
          {section.faqs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preguntas frecuentes</p>
              <div className="space-y-2">
                {section.faqs.map((faq, i) => <AccordionItem key={i} {...faq} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const { user } = useAuth();
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  const isAdmin = user?.role === "admin";
  const staffRole = (user as Record<string, unknown>)?.staffRole as string | undefined;
  const isAsistente = staffRole === "asistente";

  // Determine which sections to show based on role
  let sections: Section[] = SECTIONS_NEGOCIO;
  let roleLabel = "Negocio";
  let roleColor = "emerald";

  if (isSuperAdmin) {
    sections = [...SECTIONS_SUPERADMIN, ...SECTIONS_NEGOCIO, ...SECTIONS_CONTRATOS, ...SECTIONS_CAPACITACIONES];
    roleLabel = "Super Admin";
    roleColor = "amber";
  } else if (isAdmin) {
    sections = [...SECTIONS_NEGOCIO, ...SECTIONS_CONTRATOS, ...SECTIONS_CAPACITACIONES];
    roleLabel = "Administrador";
    roleColor = "emerald";
  } else if (isAsistente) {
    sections = [...SECTIONS_ASISTENTE, ...SECTIONS_CAPACITACIONES];
    roleLabel = "Asistente";
    roleColor = "cyan";
  } else if (staffRole === "operador") {
    sections = [...SECTIONS_COLABORADOR, ...SECTIONS_CAPACITACIONES];
    roleLabel = "Operador";
    roleColor = "cyan";
  } else {
    sections = [...SECTIONS_NEGOCIO, ...SECTIONS_CAPACITACIONES];
  }

  return (
    <DashboardLayout title="Ayuda">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Centro de Ayuda</h1>
              <p className="text-sm text-muted-foreground">Manual de uso de KobraPay</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-medium border ${
            roleColor === "amber" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
            roleColor === "cyan" ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" :
            "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
          }`}>
            <HelpCircle className="w-3.5 h-3.5" />
            Manual para: {roleLabel}
          </div>
        </div>

        {/* Descarga de Manuales */}
        <div className="bg-[#1a1f2e] border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-foreground text-sm">Descargar Manual PDF</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Descarga el manual completo de tu rol para consultarlo sin conexión.</p>
          <div className="flex flex-col gap-3">
            {isSuperAdmin && (
              <>
                <a
                  href={MANUALS.superadmin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-amber-300">{MANUALS.superadmin.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{MANUALS.superadmin.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform flex-shrink-0 ml-3" />
                </a>
                <a
                  href={MANUALS.admin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-emerald-300">{MANUALS.admin.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{MANUALS.admin.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0 ml-3" />
                </a>
                <a
                  href={MANUALS.empleado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-between px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-cyan-300">{MANUALS.empleado.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{MANUALS.empleado.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0 ml-3" />
                </a>
              </>
            )}
            {!isSuperAdmin && isAdmin && (
              <>
                <a
                  href={MANUALS.admin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-emerald-300">{MANUALS.admin.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{MANUALS.admin.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0 ml-3" />
                </a>
                <a
                  href={MANUALS.empleado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-between px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-cyan-300">{MANUALS.empleado.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{MANUALS.empleado.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0 ml-3" />
                </a>
              </>
            )}
            {!isSuperAdmin && !isAdmin && (
              <a
                href={MANUALS.empleado.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-between px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-cyan-300">{MANUALS.empleado.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{MANUALS.empleado.desc}</p>
                </div>
                <Download className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0 ml-3" />
              </a>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3 mb-10">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>

        {/* Contact */}
        <div className="bg-[#1a1f2e] border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-foreground mb-1">¿Necesitas más ayuda?</h2>
          <p className="text-sm text-muted-foreground mb-4">Contáctanos y te responderemos a la brevedad.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:soporte@kobrapay.mx"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              <Mail className="w-4 h-4" />
              soporte@kobrapay.mx
            </a>
            <a
              href="https://wa.me/5215551234567"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/20 rounded-xl text-sm text-cyan-400 hover:bg-cyan-500/25 transition-colors"
            >
              <Phone className="w-4 h-4" />
              WhatsApp de soporte
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
