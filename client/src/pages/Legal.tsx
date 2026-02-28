import { useState } from "react";
import { Link } from "wouter";
import { Shield, FileText, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

const KOBRAPAY_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/BlaEgmymroahADGF.png";

const LAST_UPDATED = "28 de febrero de 2026";
const COMPANY = "KobraPay";
const EMAIL = "legal@kobrapay.mx";
const WEBSITE = "kobrapay.mx";

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="border border-gray-200 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 py-5 text-sm text-gray-600 leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Legal() {
  const [tab, setTab] = useState<"terms" | "privacy">("terms");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-7 object-contain" />
          </div>
          <span className="text-xs text-gray-400">Actualizado: {LAST_UPDATED}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl border border-gray-200 p-1.5 w-fit">
          <button
            onClick={() => setTab("terms")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "terms"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            Términos de Uso
          </button>
          <button
            onClick={() => setTab("privacy")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "privacy"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Shield className="w-4 h-4" />
            Aviso de Privacidad
          </button>
        </div>

        {/* ─── TÉRMINOS DE USO ─── */}
        {tab === "terms" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Términos y Condiciones de Uso</h1>
              <p className="text-gray-500 text-sm mt-1">
                Al utilizar {COMPANY} aceptas los siguientes términos. Léelos con atención.
              </p>
            </div>

            <Section title="1. Aceptación de los Términos">
              <p>
                Al registrarte, acceder o utilizar los servicios de <strong>{COMPANY}</strong> ("la Plataforma"), aceptas
                quedar vinculado por estos Términos y Condiciones de Uso ("Términos"). Si no estás de acuerdo con alguno
                de estos Términos, no debes utilizar la Plataforma.
              </p>
              <p>
                {COMPANY} se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en
                vigor al momento de su publicación en la Plataforma. El uso continuado de la Plataforma después de la
                publicación de cambios constituye tu aceptación de los mismos.
              </p>
            </Section>

            <Section title="2. Descripción del Servicio">
              <p>
                {COMPANY} es una plataforma de procesamiento de pagos en línea que permite a los usuarios ("Comercios")
                generar enlaces de cobro, procesar pagos con tarjeta de crédito y débito, gestionar transacciones y
                emitir comprobantes de pago a sus clientes ("Pagadores").
              </p>
              <p>El procesamiento de pagos es realizado por <strong>Stripe, Inc.</strong>, proveedor externo certificado
                PCI-DSS. {COMPANY} actúa como facilitador tecnológico y no es una institución financiera ni banco.
              </p>
            </Section>

            <Section title="3. Elegibilidad y Registro">
              <p>Para utilizar {COMPANY} debes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ser mayor de 18 años o contar con la representación legal de una persona moral.</li>
                <li>Proporcionar información veraz, completa y actualizada durante el registro.</li>
                <li>Contar con una cuenta bancaria o tarjeta válida para recibir fondos.</li>
                <li>No tener antecedentes de fraude, lavado de dinero o actividades ilícitas.</li>
              </ul>
              <p>
                {COMPANY} se reserva el derecho de rechazar, suspender o cancelar cualquier cuenta sin previo aviso si
                detecta actividad sospechosa, información falsa o incumplimiento de estos Términos.
              </p>
            </Section>

            <Section title="4. Uso Aceptable de la Plataforma">
              <p>Está <strong>prohibido</strong> utilizar {COMPANY} para:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Venta de productos o servicios ilegales bajo la legislación mexicana o internacional.</li>
                <li>Actividades de lavado de dinero, financiamiento al terrorismo o evasión fiscal.</li>
                <li>Fraude, suplantación de identidad o engaño a pagadores.</li>
                <li>Venta de medicamentos controlados, armas, material para adultos no autorizado o cualquier bien
                  prohibido por ley.</li>
                <li>Actividades de juegos de azar no regulados.</li>
                <li>Cualquier actividad que viole derechos de terceros o la normativa aplicable.</li>
              </ul>
              <p>
                El incumplimiento de estas restricciones puede resultar en la suspensión inmediata de la cuenta, retención
                de fondos y reporte a las autoridades competentes.
              </p>
            </Section>

            <Section title="5. Comisiones y Tarifas">
              <p>
                {COMPANY} cobra una comisión por cada transacción procesada exitosamente. La tasa de comisión es
                acordada individualmente con cada Comercio al momento de la activación de su cuenta y puede variar según
                el volumen de transacciones.
              </p>
              <p>
                Las comisiones son deducidas automáticamente del monto de cada transacción antes de la liquidación.
                {COMPANY} no reembolsa comisiones por transacciones que hayan sido procesadas exitosamente.
              </p>
              <p>
                Stripe, Inc. puede aplicar tarifas adicionales por procesamiento internacional, conversión de divisas
                o disputas (contracargos), las cuales serán trasladadas al Comercio.
              </p>
            </Section>

            <Section title="6. Contracargos y Disputas">
              <p>
                Un contracargo ocurre cuando un Pagador disputa un cargo ante su banco. En caso de contracargo:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>El monto disputado será retenido de tu saldo hasta que se resuelva la disputa.</li>
                <li>Deberás proporcionar evidencia dentro del plazo establecido por Stripe (generalmente 7 días).</li>
                <li>Las herramientas de protección de {COMPANY} (OTP, selfie, firma digital) constituyen evidencia válida.</li>
                <li>Si el contracargo se resuelve a favor del Pagador, el monto será debitado de tu cuenta.</li>
              </ul>
              <p>
                {COMPANY} no garantiza el resultado de ninguna disputa. La responsabilidad final recae en el Comercio.
              </p>
            </Section>

            <Section title="7. Liquidaciones y Pagos">
              <p>
                Los fondos de transacciones exitosas son liquidados según el calendario de Stripe, generalmente en un
                plazo de 2 a 7 días hábiles después de cada transacción, dependiendo del país y tipo de cuenta.
              </p>
              <p>
                {COMPANY} no es responsable por retrasos en la liquidación causados por Stripe, bancos intermediarios,
                días festivos o causas de fuerza mayor.
              </p>
            </Section>

            <Section title="8. Limitación de Responsabilidad">
              <p>
                {COMPANY} no será responsable por daños directos, indirectos, incidentales, especiales o consecuentes
                derivados del uso o imposibilidad de uso de la Plataforma, incluyendo pérdida de ingresos, datos o
                negocios.
              </p>
              <p>
                La responsabilidad máxima de {COMPANY} ante cualquier reclamación no excederá el monto de las comisiones
                pagadas por el Comercio en los 30 días previos al evento que originó la reclamación.
              </p>
            </Section>

            <Section title="9. Propiedad Intelectual">
              <p>
                Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo marca, diseño, código fuente,
                logotipos y contenido, son propiedad exclusiva de {COMPANY}. Queda prohibida su reproducción, distribución
                o uso sin autorización escrita previa.
              </p>
            </Section>

            <Section title="10. Ley Aplicable y Jurisdicción">
              <p>
                Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia,
                las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México,
                renunciando a cualquier otro fuero que pudiera corresponderles.
              </p>
            </Section>

            <Section title="11. Contacto">
              <p>
                Para cualquier duda sobre estos Términos, contáctanos en:
              </p>
              <p>
                <strong>{COMPANY}</strong><br />
                Correo: <a href={`mailto:${EMAIL}`} className="text-emerald-600 hover:underline">{EMAIL}</a><br />
                Sitio web: <a href={`https://${WEBSITE}`} className="text-emerald-600 hover:underline">{WEBSITE}</a>
              </p>
            </Section>
          </div>
        )}

        {/* ─── AVISO DE PRIVACIDAD ─── */}
        {tab === "privacy" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Aviso de Privacidad</h1>
              <p className="text-gray-500 text-sm mt-1">
                Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
              </p>
            </div>

            <Section title="1. Identidad y Domicilio del Responsable">
              <p>
                <strong>{COMPANY}</strong> ("el Responsable") con domicilio en México, es responsable del tratamiento
                de tus datos personales conforme a lo establecido en la Ley Federal de Protección de Datos Personales
                en Posesión de los Particulares (LFPDPPP) y su Reglamento.
              </p>
              <p>
                Contacto del área de privacidad: <a href={`mailto:${EMAIL}`} className="text-emerald-600 hover:underline">{EMAIL}</a>
              </p>
            </Section>

            <Section title="2. Datos Personales que Recabamos">
              <p>Recabamos las siguientes categorías de datos personales:</p>
              <p><strong>Datos de identificación:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nombre completo, correo electrónico, número de teléfono.</li>
                <li>RFC, CURP (cuando aplique para facturación).</li>
                <li>Fotografía de identificación oficial (INE/pasaporte) para verificación de identidad.</li>
                <li>Selfie de verificación en transacciones con esta opción habilitada.</li>
              </ul>
              <p><strong>Datos financieros:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>CLABE interbancaria para liquidaciones.</li>
                <li>Historial de transacciones y montos procesados.</li>
                <li>Datos de tarjeta de pago (procesados y almacenados exclusivamente por Stripe, Inc.; {COMPANY} no almacena números de tarjeta).</li>
              </ul>
              <p><strong>Datos de uso:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dirección IP, tipo de dispositivo, navegador y sistema operativo.</li>
                <li>Registros de acceso y actividad en la Plataforma.</li>
                <li>Firma digital capturada en transacciones con esta opción habilitada.</li>
              </ul>
            </Section>

            <Section title="3. Finalidades del Tratamiento">
              <p><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Crear y gestionar tu cuenta en la Plataforma.</li>
                <li>Procesar pagos y liquidar fondos a tu cuenta bancaria.</li>
                <li>Verificar tu identidad y prevenir fraudes.</li>
                <li>Emitir comprobantes de pago y facturas electrónicas (CFDI).</li>
                <li>Atender disputas, contracargos y reclamaciones.</li>
                <li>Cumplir con obligaciones legales y regulatorias (CNBV, SAT, UIF).</li>
              </ul>
              <p><strong>Finalidades secundarias (puedes oponerte):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Enviarte comunicaciones sobre nuevas funciones y actualizaciones de la Plataforma.</li>
                <li>Realizar análisis estadísticos para mejorar el servicio.</li>
                <li>Compartir información agregada y anonimizada con socios comerciales.</li>
              </ul>
              <p>
                Para oponerte al tratamiento de finalidades secundarias, envía un correo a{" "}
                <a href={`mailto:${EMAIL}`} className="text-emerald-600 hover:underline">{EMAIL}</a> con el asunto
                "Oposición a finalidades secundarias".
              </p>
            </Section>

            <Section title="4. Transferencia de Datos">
              <p>
                Tus datos personales pueden ser transferidos a:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Stripe, Inc.</strong> — para el procesamiento de pagos (PCI-DSS certificado).</li>
                <li><strong>Resend, Inc.</strong> — para el envío de correos electrónicos transaccionales.</li>
                <li><strong>Autoridades competentes</strong> — cuando sea requerido por ley (SAT, UIF, CNBV, autoridades judiciales).</li>
              </ul>
              <p>
                No vendemos, rentamos ni comercializamos tus datos personales a terceros con fines de mercadotecnia.
              </p>
            </Section>

            <Section title="5. Derechos ARCO">
              <p>
                Tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> (derechos ARCO) al tratamiento
                de tus datos personales. Para ejercer estos derechos:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Envía una solicitud a <a href={`mailto:${EMAIL}`} className="text-emerald-600 hover:underline">{EMAIL}</a></li>
                <li>Incluye: nombre completo, correo registrado, descripción del derecho que deseas ejercer y copia de identificación oficial.</li>
                <li>Recibirás respuesta en un plazo máximo de 20 días hábiles.</li>
              </ol>
            </Section>

            <Section title="6. Cookies y Tecnologías de Rastreo">
              <p>
                La Plataforma utiliza cookies de sesión estrictamente necesarias para el funcionamiento del servicio
                (autenticación, seguridad). No utilizamos cookies de rastreo publicitario de terceros.
              </p>
              <p>
                Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar el funcionamiento
                de la Plataforma.
              </p>
            </Section>

            <Section title="7. Seguridad de los Datos">
              <p>
                Implementamos medidas técnicas y organizativas para proteger tus datos:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cifrado SSL/TLS en todas las comunicaciones.</li>
                <li>Almacenamiento seguro en servidores con acceso restringido.</li>
                <li>Autenticación de dos factores para acceso al panel.</li>
                <li>Auditorías de seguridad periódicas.</li>
                <li>Los datos de tarjeta son procesados directamente por Stripe (PCI-DSS Level 1).</li>
              </ul>
            </Section>

            <Section title="8. Conservación de Datos">
              <p>
                Conservamos tus datos personales mientras mantengas una cuenta activa en la Plataforma y por el tiempo
                adicional requerido por obligaciones legales (generalmente 5 años para registros financieros conforme
                al Código Fiscal de la Federación).
              </p>
            </Section>

            <Section title="9. Cambios al Aviso de Privacidad">
              <p>
                Este Aviso de Privacidad puede ser modificado. Cualquier cambio será notificado a través de la
                Plataforma y/o por correo electrónico. La fecha de última actualización aparece al inicio de este
                documento.
              </p>
            </Section>

            <Section title="10. Autoridad de Control">
              <p>
                Si consideras que el tratamiento de tus datos no se ajusta a la normativa, puedes presentar una
                queja ante el <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de
                Datos Personales (INAI)</strong>: <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">www.inai.org.mx</a>
              </p>
            </Section>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {COMPANY} · Todos los derechos reservados ·{" "}
            <a href={`mailto:${EMAIL}`} className="hover:text-emerald-600 transition-colors">{EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
