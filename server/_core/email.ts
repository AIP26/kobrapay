import { Resend } from "resend";
import { ENV } from "./env";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!ENV.resendApiKey) return null;
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

// ─── OTP Email ────────────────────────────────────────────────────────────────

export async function sendOtpEmail(
  email: string,
  code: string,
  businessName: string
): Promise<boolean> {
  const resend = getResend();

  // Siempre loguear para debugging
  console.log(`[OTP] Código para ${email}: ${code} (negocio: ${businessName})`);

  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada. El código OTP solo aparece en los logs.");
    return false;
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de verificación</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00c853,#00bcd4);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">KobraPay</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Cobra fácil, cobra global</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px;font-weight:600;">Código de verificación</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.5;">
                <strong style="color:#1a1a2e;">${businessName}</strong> solicita que verifiques tu identidad para completar el pago.
                Ingresa el siguiente código:
              </p>
              <!-- Code box -->
              <div style="background:#f0fdf4;border:2px solid #00c853;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Tu código de verificación</p>
                <p style="margin:0;color:#00c853;font-size:42px;font-weight:800;letter-spacing:8px;font-family:monospace;">${code}</p>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                ⏱ Este código expira en <strong>10 minutos</strong>.
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;">
                🔒 Si no solicitaste este código, ignora este mensaje. Nadie te pedirá este código por teléfono.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Este email fue enviado por KobraPay en nombre de ${businessName}.<br>
                © ${new Date().getFullYear()} KobraPay. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: `${businessName} via KobraPay <${ENV.fromEmail}>`,
      to: email,
      subject: `${code} — Tu código de verificación`,
      html,
    });

    if (error) {
      console.error("[Email] Error al enviar OTP:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar OTP:", err);
    return false;
  }
}

// ─── Recibo de Pago ───────────────────────────────────────────────────────────

export async function sendPaymentReceipt(data: {
  payerEmail: string;
  payerName: string;
  businessName: string;
  businessEmail?: string | null;
  amount: string | number;
  currency: string;
  description: string;
  transactionId: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
  paidAt: Date;
}): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada. No se envió recibo.");
    return false;
  }

  const amountFormatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: data.currency || "MXN",
  }).format(parseFloat(String(data.amount)));

  const dateFormatted = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(data.paidAt);

  const cardInfo =
    data.cardBrand && data.cardLast4
      ? `${data.cardBrand.charAt(0).toUpperCase() + data.cardBrand.slice(1)} •••• ${data.cardLast4}`
      : "Tarjeta de crédito/débito";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de pago</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header con logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#00c853,#00bcd4);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/KobraPay_Horizontal_ConTarjeta_Transparente_24bda49f.png" alt="KobraPay" style="max-height:56px;max-width:200px;object-fit:contain;display:block;" />
                  </td>
                  <td align="right">
                    <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;">RECIBO DE PAGO</p>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;">#${data.transactionId.slice(-8).toUpperCase()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Monto destacado -->
          <tr>
            <td style="background:#f0fdf4;padding:28px 40px;text-align:center;border-bottom:2px solid #dcfce7;">
              <p style="margin:0 0 4px;color:#16a34a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Pago confirmado ✓</p>
              <p style="margin:0;color:#14532d;font-size:44px;font-weight:800;">${amountFormatted}</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${data.currency}</p>
            </td>
          </tr>

          <!-- Detalles del pago -->
          <tr>
            <td style="padding:32px 40px;">
              <h3 style="margin:0 0 20px;color:#1a1a2e;font-size:16px;font-weight:600;border-bottom:1px solid #e5e7eb;padding-bottom:12px;">Detalles de la transacción</h3>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px;width:40%;">Descripción</td>
                  <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:500;">${data.description}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-radius:4px 0 0 4px;">Fecha y hora</td>
                  <td style="padding:8px 12px;color:#1a1a2e;font-size:14px;font-weight:500;border-radius:0 4px 4px 0;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px;">Método de pago</td>
                  <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:500;">${cardInfo}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-radius:4px 0 0 4px;">ID de transacción</td>
                  <td style="padding:8px 12px;color:#1a1a2e;font-size:13px;font-family:monospace;border-radius:0 4px 4px 0;">${data.transactionId.slice(-16).toUpperCase()}</td>
                </tr>
              </table>

              <!-- Separador -->
              <div style="border-top:1px solid #e5e7eb;margin:24px 0;"></div>

              <!-- Datos del pagador -->
              <h3 style="margin:0 0 16px;color:#1a1a2e;font-size:16px;font-weight:600;">Pagado por</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;width:40%;">Nombre</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:500;">${data.payerName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Email</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:14px;">${data.payerEmail}</td>
                </tr>
              </table>

              <!-- Separador -->
              <div style="border-top:1px solid #e5e7eb;margin:24px 0;"></div>

              <!-- Negocio -->
              <h3 style="margin:0 0 16px;color:#1a1a2e;font-size:16px;font-weight:600;">Cobrado por</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;width:40%;">Negocio</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;">${data.businessName}</td>
                </tr>
                ${data.businessEmail ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Contacto</td><td style="padding:6px 0;color:#1a1a2e;font-size:14px;">${data.businessEmail}</td></tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#9ca3af;font-size:12px;">
                      Procesado de forma segura por <strong style="color:#00c853;">KobraPay</strong><br>
                      Powered by Stripe · Cifrado SSL/TLS
                    </p>
                  </td>
                  <td align="right">
                    <p style="margin:0;color:#6b7280;font-size:11px;">© ${new Date().getFullYear()} KobraPay</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: `${data.businessName} via KobraPay <${ENV.fromEmail}>`,
      to: data.payerEmail,
      subject: `Recibo de pago — ${amountFormatted} a ${data.businessName}`,
      html,
    });

    if (error) {
      console.error("[Email] Error al enviar recibo:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar recibo:", err);
    return false;
  }
}

// ─── Email de Bienvenida ──────────────────────────────────────────────────────

export async function sendWelcomeEmail(data: {
  to: string;
  name: string;
  businessName: string;
  accountType?: string;
}): Promise<boolean> {
  const resend = getResend();

  console.log(`[Welcome Email] Enviando bienvenida a ${data.to} (${data.businessName})`);

  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada. No se envió email de bienvenida.");
    return false;
  }

  const accountTypeLabel: Record<string, string> = {
    business: "Negocio Cliente",
    admin: "Administrador de Empresa",
    employee: "Empleado / Operador",
    assistant: "Asistente",
  };
  const typeLabel = accountTypeLabel[data.accountType || "business"] || "Negocio Cliente";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px;text-align:center;">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png" alt="KobraPay" width="64" style="margin-bottom:12px;" />
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">¡Bienvenido a KobraPay!</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">Tu cuenta ha sido aprobada</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 4px;color:#16a34a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">✓ Cuenta Activada — ${typeLabel}</p>
                <p style="margin:0;color:#14532d;font-size:22px;font-weight:700;">${data.businessName}</p>
              </div>
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hola <strong>${data.name}</strong>,</p>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;">
                Tu cuenta en KobraPay ha sido <strong style="color:#16a34a;">aprobada y activada</strong> como <strong>${typeLabel}</strong>.
                Ya puedes ingresar a tu panel y comenzar a cobrar con tarjeta de forma segura.
              </p>
              <!-- Guía de inicio rápido 5 pasos -->
              <h3 style="color:#1a1a2e;font-size:17px;margin:24px 0 6px;font-weight:700;">🚀 Guía de inicio rápido — 5 pasos</h3>
              <p style="color:#6b7280;font-size:13px;margin:0 0 18px;">Nadie más te da esto. Sigue estos pasos y cobra en menos de 5 minutos.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr><td style="vertical-align:top;width:34px;"><div style="width:28px;height:28px;background:#00c853;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:800;font-size:13px;">1</div></td><td style="padding-left:12px;padding-bottom:14px;"><p style="margin:0 0 2px;color:#1a1a2e;font-size:14px;font-weight:700;">Completa tu perfil</p><p style="margin:0;color:#6b7280;font-size:13px;">Ve a <strong>Mi Perfil</strong> y agrega tu foto, datos bancarios (CLABE), RFC y nombre de tu negocio. Esto personaliza tus recibos y habilita transferencias.</p></td></tr>
                <tr><td style="vertical-align:top;width:34px;"><div style="width:28px;height:28px;background:#00c853;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:800;font-size:13px;">2</div></td><td style="padding-left:12px;padding-bottom:14px;"><p style="margin:0 0 2px;color:#1a1a2e;font-size:14px;font-weight:700;">Crea tu primer enlace de pago</p><p style="margin:0;color:#6b7280;font-size:13px;">Haz clic en <strong>Nuevo Cobro</strong>, escribe el monto, descripción y el correo de tu cliente. En segundos tendrás un enlace listo para compartir por WhatsApp, email o redes.</p></td></tr>
                <tr><td style="vertical-align:top;width:34px;"><div style="width:28px;height:28px;background:#00c853;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:800;font-size:13px;">3</div></td><td style="padding-left:12px;padding-bottom:14px;"><p style="margin:0 0 2px;color:#1a1a2e;font-size:14px;font-weight:700;">Tu cliente paga con tarjeta</p><p style="margin:0;color:#6b7280;font-size:13px;">Tu cliente abre el enlace, ingresa su tarjeta (Visa, Mastercard, Amex), verifica con OTP por SMS y listo. Acepta pagos en 3, 6, 9 o 12 MSI.</p></td></tr>
                <tr><td style="vertical-align:top;width:34px;"><div style="width:28px;height:28px;background:#00c853;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:800;font-size:13px;">4</div></td><td style="padding-left:12px;padding-bottom:14px;"><p style="margin:0 0 2px;color:#1a1a2e;font-size:14px;font-weight:700;">Monitorea tus cobros en tiempo real</p><p style="margin:0;color:#6b7280;font-size:13px;">En <strong>Mis Ventas</strong> verás cada transacción con su estatus, comprobante descargable y número de operación. Filtra por fecha, monto o cliente.</p></td></tr>
                <tr><td style="vertical-align:top;width:34px;"><div style="width:28px;height:28px;background:#00c853;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:800;font-size:13px;">5</div></td><td style="padding-left:12px;"><p style="margin:0 0 2px;color:#1a1a2e;font-size:14px;font-weight:700;">Descarga tu reporte mensual</p><p style="margin:0;color:#6b7280;font-size:13px;">Cada mes genera un PDF con tu resumen de ventas, comisiones y estadísticas. Perfecto para contabilidad y declaraciones fiscales.</p></td></tr>
              </table>
              <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px;margin:18px 0;">
                <p style="margin:0 0 4px;color:#92400e;font-size:13px;font-weight:700;">🛡️ Tu protección anti-contracargos</p>
                <p style="margin:0;color:#78350f;font-size:12px;line-height:1.6;">KobraPay es el único procesador que incluye <strong>OTP por SMS</strong>, <strong>selfie de verificación</strong> y <strong>firma digital</strong> en cada cobro. Esto te protege legalmente ante cualquier disputa.</p>
              </div>
              <div style="text-align:center;margin-top:24px;">
                <a href="https://kobrapay.mx/dashboard" style="display:inline-block;background:#00c853;color:#ffffff;font-weight:700;font-size:16px;padding:14px 40px;border-radius:10px;text-decoration:none;margin-bottom:10px;">Ir a mi panel →</a><br/>
                <a href="https://kobrapay.mx/dashboard/help" style="display:inline-block;color:#6b7280;font-size:13px;text-decoration:underline;">Ver guía completa de uso</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Procesado de forma segura por <strong style="color:#00c853;">KobraPay</strong><br>
                Powered by Stripe · Cifrado SSL/TLS · © ${new Date().getFullYear()} KobraPay
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: data.to,
      subject: `¡Bienvenido a KobraPay! Tu cuenta ha sido aprobada`,
      html,
    });
    if (error) {
      console.error("[Email] Error al enviar bienvenida:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar bienvenida:", err);
    return false;
  }
}

// ─── Factura por Email ────────────────────────────────────────────────────────

export async function sendInvoiceEmail(data: {
  to: string;
  receptorNombre: string;
  emisorNombre: string;
  folio: string;
  fecha: Date;
  conceptos: Array<{ descripcion: string; cantidad: number; valorUnitario: number; importe: number }>;
  subtotal: number;
  iva: number;
  total: number;
  currency: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] Resend no configurado, no se puede enviar factura");
    return false;
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: data.currency || "MXN" }).format(n);
  const rows = data.conceptos
    .map(
      (c) =>
        `<tr><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f4f6;">${c.descripcion}</td>` +
        `<td style="padding:8px 12px;font-size:13px;text-align:center;border-bottom:1px solid #f3f4f6;">${c.cantidad}</td>` +
        `<td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid #f3f4f6;">${fmt(c.valorUnitario)}</td>` +
        `<td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmt(c.importe)}</td></tr>`
    )
    .join("");
  const dateStr = new Date(data.fecha).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Factura ${data.folio}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#00c896,#00a8e0);padding:32px;text-align:center;">
    <div style="font-size:24px;font-weight:900;color:white;">KobraPay</div>
    <div style="color:rgba(255,255,255,0.85);margin-top:4px;">Factura Electrónica</div>
    <div style="background:rgba(255,255,255,0.2);border-radius:20px;padding:6px 20px;display:inline-block;margin-top:12px;font-size:15px;font-weight:700;color:white;">${data.folio}</div>
  </div>
  <div style="padding:32px;">
    <p>Estimado/a <strong>${data.receptorNombre}</strong>,</p>
    <p style="color:#6b7280;">Factura emitida por <strong>${data.emisorNombre}</strong> con fecha ${dateStr}.</p>
    <table width="100%" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;">Descripción</th>
        <th style="padding:10px;text-align:center;font-size:12px;color:#6b7280;">Cant.</th>
        <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;">P. Unit.</th>
        <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;">Importe</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right;">
      <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Subtotal: <strong style="color:#1f2937;">${fmt(data.subtotal)}</strong></div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">IVA 16%: <strong style="color:#1f2937;">${fmt(data.iva)}</strong></div>
      <div style="font-size:18px;font-weight:800;color:#00c896;border-top:2px solid #e5e7eb;margin-top:8px;padding-top:8px;">Total: ${fmt(data.total)}</div>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Generado por <strong style="color:#00c853;">KobraPay</strong> · kobrapay.mx</p>
  </div>
</div>
</body></html>`;
  try {
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: data.to,
      subject: `Factura ${data.folio} de ${data.emisorNombre}`,
      html,
    });
    if (error) {
      console.error("[Email] Error al enviar factura:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar factura:", err);
    return false;
  }
}

// ─── Email de cobro recurrente exitoso ───────────────────────────────────────
export async function sendRecurringPaymentEmail(data: {
  ownerEmail: string;
  ownerName: string;
  customerEmail: string;
  customerName?: string | null;
  planName: string;
  amount: number; // en centavos
  currency: string;
  interval: string;
  paidAt: Date;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const amountFormatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: data.currency.toUpperCase(),
  }).format(data.amount / 100);

  const dateFormatted = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(data.paidAt);

  const intervalMap: Record<string, string> = {
    day: "diario", week: "semanal", month: "mensual", year: "anual",
  };
  const intervalLabel = intervalMap[data.interval] ?? data.interval;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Cobro recurrente exitoso</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#00c853,#00bcd4);padding:28px 40px;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">💳 Cobro Recurrente Exitoso</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">KobraPay · kobrapay.mx</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="color:#374151;font-size:15px;margin:0 0 20px;">Hola <strong>${data.ownerName}</strong>, se realizó un cobro recurrente exitoso en tu cuenta.</p>
        <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <tr><td style="color:#6b7280;font-size:13px;">Plan</td><td style="color:#111827;font-weight:700;font-size:14px;">${data.planName}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="color:#6b7280;font-size:13px;">Monto cobrado</td><td style="color:#00c853;font-weight:800;font-size:18px;">${amountFormatted}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="color:#6b7280;font-size:13px;">Frecuencia</td><td style="color:#111827;font-size:14px;">${intervalLabel.charAt(0).toUpperCase() + intervalLabel.slice(1)}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="color:#6b7280;font-size:13px;">Cliente</td><td style="color:#111827;font-size:14px;">${data.customerName || ""} &lt;${data.customerEmail}&gt;</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="color:#6b7280;font-size:13px;">Fecha</td><td style="color:#111827;font-size:14px;">${dateFormatted}</td></tr>
        </table>
        <div style="margin-top:24px;text-align:center;">
          <a href="https://kobrapay.mx/dashboard/recurring" style="background:#00c853;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Ver mis suscripciones</a>
        </div>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #f3f4f6;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Generado por <strong style="color:#00c853;">KobraPay</strong> · kobrapay.mx</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: data.ownerEmail,
      subject: `💳 Cobro recurrente exitoso: ${amountFormatted} - ${data.planName}`,
      html,
    });
    if (error) { console.error("[Email] Error al enviar email de cobro recurrente:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar email de cobro recurrente:", err);
    return false;
  }
}


// ─── Notificación de Cita Médica ─────────────────────────────────────────────
export async function sendAppointmentEmail(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  businessName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessLogoUrl?: string;
  doctorSpecialty?: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  notes?: string;
  action: "created" | "updated" | "cancelled";
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada. No se envio notificacion de cita.");
    return false;
  }
  const actionLabels: Record<string, { subject: string; title: string; color: string; icon: string }> = {
    created: { subject: "Cita agendada", title: "Cita Confirmada", color: "#00c853", icon: "✅" },
    updated: { subject: "Cita modificada", title: "Cita Actualizada", color: "#f59e0b", icon: "✏️" },
    cancelled: { subject: "Cita cancelada", title: "Cita Cancelada", color: "#ef4444", icon: "❌" },
  };
  const label = actionLabels[data.action];
  const dateFormatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/Mexico_City",
  }).format(new Date(data.appointmentDate));
  const actionMsg = data.action === "created"
    ? "Tu cita ha sido <strong>confirmada</strong> con los siguientes detalles:"
    : data.action === "updated"
    ? "Los detalles de tu cita han sido <strong>actualizados</strong>:"
    : `Tu cita ha sido <strong>cancelada</strong>. Si tienes dudas, contacta a ${data.businessName}.`;
  const notesRow = data.notes
    ? `<tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;font-size:13px;padding:12px">Notas</td><td style="color:#374151;font-size:13px;padding:12px">${data.notes}</td></tr>`
    : "";
  const specialtyRow = data.doctorSpecialty
    ? `<tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;font-size:13px;padding:12px">Especialidad</td><td style="color:#374151;font-size:13px;padding:12px">${data.doctorSpecialty}</td></tr>`
    : "";
  const reminderBlock = data.action !== "cancelled"
    ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b"><p style="margin:0;color:#92400e;font-size:13px"><strong>Recordatorio:</strong> Por favor llega 10 minutos antes de tu cita. Si necesitas cancelar, contacta a ${data.businessName}${data.businessPhone ? ` al ${data.businessPhone}` : ''}.</p></div>`
    : "";
  // Logo del negocio (si existe)
  const logoSection = data.businessLogoUrl
    ? `<img src="${data.businessLogoUrl}" alt="${data.businessName}" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:8px" /><br>`
    : "";
  // Contacto del negocio en el footer
  const contactInfo = [
    data.businessPhone ? `📞 ${data.businessPhone}` : null,
    data.businessEmail ? `📧 ${data.businessEmail}` : null,
    data.businessAddress ? `📍 ${data.businessAddress}` : null,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");
  const contactBlock = contactInfo
    ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:12px">${contactInfo}</p>`
    : "";
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif"><table width="100%" style="background:#f4f4f5;padding:40px 0"><tr><td align="center"><table width="580" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)"><tr><td style="background:${label.color};padding:28px 40px;text-align:center">${logoSection}<h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">${label.icon} ${label.title}</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:15px;font-weight:600">${data.businessName}</p>${contactBlock}</td></tr><tr><td style="padding:32px 40px"><p style="color:#374151;font-size:15px;margin:0 0 12px">Hola <strong>${data.patientName}</strong>,</p><p style="color:#374151;font-size:15px;margin:0 0 20px">${actionMsg}</p><table width="100%" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb"><tr><td style="color:#6b7280;font-size:13px;padding:12px;width:40%">Médico</td><td style="color:#111827;font-weight:700;font-size:14px;padding:12px">${data.doctorName}</td></tr>${specialtyRow}<tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;font-size:13px;padding:12px">Fecha</td><td style="color:#111827;font-size:14px;padding:12px;text-transform:capitalize">${dateFormatted}</td></tr><tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;font-size:13px;padding:12px">Hora</td><td style="color:${label.color};font-weight:800;font-size:16px;padding:12px">${data.appointmentTime}</td></tr><tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;font-size:13px;padding:12px">Motivo</td><td style="color:#111827;font-size:14px;padding:12px">${data.reason}</td></tr>${notesRow}</table>${reminderBlock}</td></tr><tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #f3f4f6"><p style="margin:0;color:#9ca3af;font-size:12px">Notificacion enviada por <strong style="color:#00c853">KobraPay</strong> · kobrapay.mx</p></td></tr></table></td></tr></table></body></html>`;
  try {
    const { error } = await resend.emails.send({
      from: `${data.businessName} via KobraPay <${ENV.fromEmail}>`,
      to: data.patientEmail,
      subject: `${label.subject} — ${dateFormatted} ${data.appointmentTime}`,
      html,
    });
    if (error) { console.error("[Email] Error al enviar notificacion de cita:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepcion al enviar notificacion de cita:", err);
    return false;
  }
}


// ─── Birthday Email ───────────────────────────────────────────────────────────
export async function sendBirthdayEmail(data: {
  recipientEmail: string;
  recipientName: string;
  businessName: string;
  senderName: string;
  type: "patient" | "employee";
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada.");
    return false;
  }
  const firstName = data.recipientName.split(" ")[0];
  const isEmployee = data.type === "employee";
  const subjectLine = isEmployee
    ? "Feliz Cumpleanios " + firstName + " - " + data.senderName
    : "Feliz Cumpleanios " + firstName + " - " + data.businessName;
  const bodyMsg = isEmployee
    ? "En este dia especial, todo el equipo de " + data.businessName + " y " + data.senderName + " te desean un maravilloso cumpleanios. Tu dedicacion hace la diferencia cada dia."
    : "El equipo de " + data.businessName + " te desea un feliz cumpleanios lleno de salud y bienestar.";
  const html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif\"><table width=\"100%\" style=\"background:#f4f4f5;padding:40px 0\"><tr><td align=\"center\"><table width=\"580\" style=\"background:#fff;border-radius:12px;overflow:hidden\"><tr><td style=\"background:linear-gradient(135deg,#FF6B00,#ff9a3c);padding:36px 40px;text-align:center\"><div style=\"font-size:48px\">&#127874;</div><h1 style=\"margin:0;color:#fff;font-size:26px;font-weight:800\">Feliz Cumpleanios!</h1><p style=\"margin:6px 0 0;color:rgba(255,255,255,0.9)\">" + data.senderName + "</p></td></tr><tr><td style=\"padding:36px 40px\"><p style=\"color:#374151;font-size:16px\">Hola <strong>" + data.recipientName + "</strong>,</p><p style=\"color:#374151;font-size:15px;line-height:1.7\">" + bodyMsg + "</p><div style=\"background:#fff7ed;border-radius:12px;border:2px solid #FF6B00;padding:20px;text-align:center\"><p style=\"margin:0;color:#FF6B00;font-size:24px;font-weight:800\">Que lo disfrutes mucho!</p></div><p style=\"color:#6b7280;font-size:14px;margin-top:20px\">Con carino,<br><strong>" + data.senderName + "</strong></p></td></tr><tr><td style=\"background:#f9fafb;padding:16px 40px;text-align:center\"><p style=\"margin:0;color:#9ca3af;font-size:12px\">Enviado por <strong style=\"color:#FF6B00\">KobraPay</strong></p></td></tr></table></td></tr></table></body></html>";
  try {
    const { error } = await resend.emails.send({
      from: data.senderName + " via KobraPay <" + ENV.fromEmail + ">",
      to: data.recipientEmail,
      subject: subjectLine,
      html,
    });
    if (error) { console.error("[Email] Error cumpleanios:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepcion cumpleanios:", err);
    return false;
  }
}

// ─── Cotización KobraPay por Email ────────────────────────────────────────────

export interface QuoteEmailData {
  prospectEmail: string;
  prospectName: string;
  associateName: string;
  mode: "online" | "terminal";
  amount: number;
  kobrapayRate: number;
  ivaRate: number;
  netForBusiness: number;
  totalDeducted: number;
  effectiveRate: number;
  competitors: Array<{ name: string; rate: number; fixed: number; net: number }>;
  aiExplanation: string;
  monthlyVolume?: number;
  monthlyNet?: number;
}

export async function sendQuoteEmail(data: QuoteEmailData): Promise<boolean> {
  const resend = getResend();
  console.log(`[Quote] Enviando cotización a ${data.prospectEmail} de parte de ${data.associateName}`);

  const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const modeLabel = data.mode === "online" ? "Cobro Online" : "Terminal Física";
  // Stripe México: 3.6% + $3 MXN (tarifa real verificada)
  const stripeLabel = "3.6% + $3 MXN";

  const competitorRows = data.competitors
    .map(c => {
      const isBetter = data.netForBusiness > c.net;
      const diff = data.netForBusiness - c.net;
      return `<tr>
        <td style="padding:10px 16px;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6;">${c.name} (${c.rate}%${c.fixed > 0 ? ` + $${c.fixed}` : ""})</td>
        <td style="padding:10px 16px;text-align:right;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6;">$${fmt(c.net)} MXN</td>
        <td style="padding:10px 16px;text-align:right;font-size:13px;border-bottom:1px solid #f3f4f6;">
          ${isBetter ? `<span style="color:#059669;font-weight:600;">+$${fmt(diff)} más</span>` : `<span style="color:#dc2626;">-$${fmt(Math.abs(diff))}</span>`}
        </td>
      </tr>`;
    })
    .join("");

  const monthlySection = data.monthlyVolume && data.monthlyNet
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
        <h3 style="margin:0 0 12px;color:#065f46;font-size:16px;">📊 Proyección Mensual</h3>
        <p style="margin:0;color:#374151;font-size:14px;">Si procesas <strong>$${fmt(data.monthlyVolume)} MXN/mes</strong>, recibirías:</p>
        <p style="margin:8px 0 0;color:#059669;font-size:28px;font-weight:800;">$${fmt(data.monthlyNet)} MXN/mes</p>
        <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Neto estimado después de todas las comisiones</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Tu Cotización KobraPay</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">KobraPay</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Cobra fácil, cobra global</p>
        <div style="margin-top:16px;background:rgba(255,255,255,0.15);border-radius:8px;padding:10px 20px;display:inline-block;">
          <p style="margin:0;color:#fff;font-size:14px;font-weight:600;">Cotización Personalizada · ${modeLabel}</p>
        </div>
      </td></tr>
      <!-- Greeting -->
      <tr><td style="padding:32px 40px 0;">
        <p style="margin:0;color:#374151;font-size:16px;">Hola <strong>${data.prospectName}</strong>,</p>
        <p style="margin:12px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">
          <strong>${data.associateName}</strong> te envía esta cotización personalizada de KobraPay. 
          A continuación encontrarás el desglose exacto de comisiones para un cobro de <strong>$${fmt(data.amount)} MXN</strong>.
        </p>
      </td></tr>
      <!-- AI Explanation -->
      <tr><td style="padding:20px 40px 0;">
        <div style="background:#eef2ff;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0 0 6px;color:#4338ca;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">✨ Análisis IA</p>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">${data.aiExplanation}</p>
        </div>
      </td></tr>
      <!-- Desglose -->
      <tr><td style="padding:24px 40px 0;">
        <h3 style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">Desglose del Cobro</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:600;">Concepto</td>
            <td style="padding:10px 16px;text-align:right;color:#6b7280;font-size:13px;font-weight:600;">Monto</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#374151;font-size:14px;border-top:1px solid #f3f4f6;">Monto bruto</td>
            <td style="padding:12px 16px;text-align:right;color:#111827;font-size:14px;font-weight:700;border-top:1px solid #f3f4f6;">$${fmt(data.amount)} MXN</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;color:#374151;font-size:14px;border-top:1px solid #f3f4f6;">Comisión Stripe (${stripeLabel})</td>
            <td style="padding:10px 16px;text-align:right;color:#dc2626;font-size:14px;border-top:1px solid #f3f4f6;">-$${fmt(data.amount * 0.036 + 3)} MXN</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;color:#374151;font-size:14px;border-top:1px solid #f3f4f6;">Comisión KobraPay (${data.kobrapayRate}%)</td>
            <td style="padding:10px 16px;text-align:right;color:#dc2626;font-size:14px;border-top:1px solid #f3f4f6;">-$${fmt(data.amount * data.kobrapayRate / 100)} MXN</td>
          </tr>
          ${data.ivaRate > 0 ? `<tr>
            <td style="padding:10px 16px;color:#374151;font-size:14px;border-top:1px solid #f3f4f6;">IVA sobre comisión (${data.ivaRate}%)</td>
            <td style="padding:10px 16px;text-align:right;color:#f59e0b;font-size:14px;border-top:1px solid #f3f4f6;">-$${fmt(data.amount * data.kobrapayRate / 100 * data.ivaRate / 100)} MXN</td>
          </tr>` : ""}
          <tr style="background:#f0fdf4;">
            <td style="padding:14px 16px;color:#065f46;font-size:15px;font-weight:800;border-top:2px solid #bbf7d0;">🎯 Tú recibes</td>
            <td style="padding:14px 16px;text-align:right;color:#059669;font-size:20px;font-weight:900;border-top:2px solid #bbf7d0;">$${fmt(data.netForBusiness)} MXN</td>
          </tr>
        </table>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;text-align:right;">Tasa efectiva total: ${data.effectiveRate.toFixed(2)}%</p>
      </td></tr>
      <!-- Monthly projection -->
      ${monthlySection ? `<tr><td style="padding:0 40px;">${monthlySection}</td></tr>` : ""}
      <!-- Comparativa -->
      <tr><td style="padding:24px 40px 0;">
        <h3 style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">Comparativa vs Competencia</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:600;">Procesador</td>
            <td style="padding:10px 16px;text-align:right;color:#6b7280;font-size:13px;font-weight:600;">Neto que recibes</td>
            <td style="padding:10px 16px;text-align:right;color:#6b7280;font-size:13px;font-weight:600;">Diferencia</td>
          </tr>
          ${competitorRows}
          <tr style="background:#eef2ff;">
            <td style="padding:12px 16px;color:#4338ca;font-size:14px;font-weight:800;border-top:2px solid #c7d2fe;">⭐ KobraPay (tu cotización)</td>
            <td style="padding:12px 16px;text-align:right;color:#4338ca;font-size:16px;font-weight:900;border-top:2px solid #c7d2fe;">$${fmt(data.netForBusiness)} MXN</td>
            <td style="padding:12px 16px;text-align:right;border-top:2px solid #c7d2fe;"></td>
          </tr>
        </table>
      </td></tr>
      <!-- CTA -->
      <tr><td style="padding:32px 40px;">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 8px;color:#fff;font-size:16px;font-weight:700;">¿Listo para empezar a cobrar?</p>
          <p style="margin:0 0 16px;color:rgba(255,255,255,0.85);font-size:13px;">Sin mensualidades · Sin contratos · Solo pagas cuando cobras</p>
          <a href="https://kobrapay.mx" style="display:inline-block;background:#ffffff;color:#4f46e5;font-size:15px;font-weight:800;padding:12px 32px;border-radius:8px;text-decoration:none;">Registrarme gratis →</a>
        </div>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Esta cotización fue generada por <strong style="color:#4f46e5;">KobraPay</strong> · kobrapay.mx</p>
        <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">Cotización enviada por ${data.associateName} · Los porcentajes pueden variar según el plan contratado</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  if (!resend) {
    console.warn("[Quote] RESEND_API_KEY no configurada. Cotización no enviada.");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: `${data.associateName} via KobraPay <${ENV.fromEmail}>`,
      to: data.prospectEmail,
      subject: `Tu cotización KobraPay — $${fmt(data.netForBusiness)} MXN neto por cada $${fmt(data.amount)} MXN cobrado`,
      html,
    });
    if (error) { console.error("[Quote] Error enviando cotización:", error); return false; }
    console.log(`[Quote] Cotización enviada exitosamente a ${data.prospectEmail}`);
    return true;
  } catch (err) {
    console.error("[Quote] Excepción:", err);
    return false;
  }
}

// ─── Email de Notificación de Reembolso ──────────────────────────────────────

export async function sendRefundNotification(data: {
  payerEmail: string;
  payerName: string;
  businessName: string;
  amount: string | number;
  currency: string;
  description?: string | null;
  refundId: string;
  reason: string;
  refundedAt: Date;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada. No se envió notificación de reembolso.");
    return false;
  }

  const amountFormatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: data.currency || "MXN",
  }).format(parseFloat(String(data.amount)));

  const dateFormatted = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(data.refundedAt);

  const reasonLabels: Record<string, string> = {
    requested_by_customer: "Solicitado por el cliente",
    duplicate: "Pago duplicado",
    fraudulent: "Transacción fraudulenta",
  };
  const reasonLabel = reasonLabels[data.reason] || data.reason;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/KobraPay_Horizontal_ConTarjeta_Transparente_24bda49f.png" alt="KobraPay" style="max-height:48px;max-width:180px;object-fit:contain;display:block;" />
                  </td>
                  <td align="right">
                    <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;">REEMBOLSO PROCESADO</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#faf5ff;padding:28px 40px;text-align:center;border-bottom:2px solid #ede9fe;">
              <p style="margin:0 0 6px;color:#7c3aed;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Monto reembolsado</p>
              <p style="margin:0;color:#4c1d95;font-size:42px;font-weight:900;letter-spacing:-1px;">${amountFormatted}</p>
              <p style="margin:8px 0 0;color:#6d28d9;font-size:13px;">${data.currency}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hola <strong>${data.payerName}</strong>,</p>
              <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
                Tu reembolso de <strong>${amountFormatted}</strong> ha sido procesado exitosamente por <strong>${data.businessName}</strong>. 
                El dinero será acreditado a tu cuenta en <strong>5 a 10 días hábiles</strong>, dependiendo de tu banco.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin:0 0 24px;">
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;">Negocio</td>
                        <td align="right" style="color:#111827;font-size:13px;font-weight:600;">${data.businessName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${data.description ? `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="color:#6b7280;font-size:13px;">Concepto</td><td align="right" style="color:#111827;font-size:13px;font-weight:600;">${data.description}</td></tr></table></td></tr>` : ""}
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;">Motivo</td>
                        <td align="right" style="color:#111827;font-size:13px;font-weight:600;">${reasonLabel}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;">Fecha</td>
                        <td align="right" style="color:#111827;font-size:13px;font-weight:600;">${dateFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;">Referencia</td>
                        <td align="right" style="color:#111827;font-size:11px;font-family:monospace;">${data.refundId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Si tienes alguna pregunta sobre este reembolso, contacta directamente a <strong>${data.businessName}</strong>.<br>
                Este correo fue enviado automáticamente por KobraPay.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">KobraPay · kobrapay.mx · soporte@kobrapay.mx</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: `${data.businessName} via KobraPay <${ENV.fromEmail}>`,
      to: data.payerEmail,
      subject: `Reembolso procesado — ${amountFormatted} de ${data.businessName}`,
      html,
    });
    if (error) { console.error("[Email] Error al enviar notificación de reembolso:", error); return false; }
    console.log(`[Email] Notificación de reembolso enviada a ${data.payerEmail}`);
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar notificación de reembolso:", err);
    return false;
  }
}

// ─── Email de invitación de suscripción al cliente ────────────────────────────
export async function sendSubscriptionInviteEmail(data: {
  customerEmail: string;
  customerName?: string | null;
  planName: string;
  amount: number; // en centavos
  currency: string;
  interval: string;
  intervalCount: number;
  checkoutUrl: string;
  businessName: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.log(`[Subscription Invite] URL para ${data.customerEmail}: ${data.checkoutUrl}`);
    return false;
  }

  const amountFormatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: data.currency.toUpperCase(),
  }).format(data.amount / 100);

  const intervalMap: Record<string, string> = {
    day: "diario", week: "semanal", month: "mensual", year: "anual",
  };
  const intervalLabel = intervalMap[data.interval] ?? data.interval;
  const freqLabel = data.intervalCount === 1
    ? intervalLabel
    : `cada ${data.intervalCount} ${intervalLabel === "mensual" ? "meses" : intervalLabel === "semanal" ? "semanas" : "días"}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Suscripción ${data.planName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#0D1B35,#1A3050);padding:28px 40px;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">🔄 ${data.businessName} te invita a suscribirte</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Procesado de forma segura por KobraPay · kobrapay.mx</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="color:#374151;font-size:15px;margin:0 0 20px;">
          Hola${data.customerName ? ` <strong>${data.customerName}</strong>` : ""}, <strong>${data.businessName}</strong> te ha enviado una invitación para suscribirte al plan:
        </p>
        <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;">
          <tr><td style="color:#6b7280;font-size:13px;width:40%;">Plan</td><td style="color:#111827;font-weight:700;font-size:15px;">${data.planName}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="color:#6b7280;font-size:13px;">Monto</td><td style="color:#00A876;font-weight:800;font-size:20px;">${amountFormatted}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="color:#6b7280;font-size:13px;">Frecuencia</td><td style="color:#111827;font-size:14px;">${freqLabel.charAt(0).toUpperCase() + freqLabel.slice(1)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Haz clic en el botón para ingresar tu tarjeta de forma segura y activar tu suscripción:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${data.checkoutUrl}" style="background:#00C896;color:#0D1B35;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block;">
            ✅ Activar mi suscripción
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
          Este enlace es de uso único y expira en 24 horas. Si no solicitaste esta suscripción, puedes ignorar este correo.
        </p>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #f3f4f6;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Procesado de forma segura por <strong style="color:#00A876;">KobraPay</strong> · kobrapay.mx</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: data.customerEmail,
      subject: `🔄 Invitación de suscripción: ${data.planName} — ${amountFormatted} ${freqLabel}`,
      html,
    });
    if (error) { console.error("[Email] Error al enviar invitación de suscripción:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepción al enviar invitación de suscripción:", err);
    return false;
  }
}

// ─── Notificación de pago al vendedor ────────────────────────────────────────
export async function sendVendorPaymentEmail(data: {
  vendorEmail: string;
  vendorName: string;
  payerName: string;
  payerEmail: string;
  amount: string | number;
  currency: string;
  description: string;
  transactionId: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
  paidAt: Date;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const amountFormatted = new Intl.NumberFormat("es-MX", { style: "currency", currency: data.currency || "MXN" }).format(parseFloat(String(data.amount)));
  const dateFormatted = new Intl.DateTimeFormat("es-MX", { dateStyle: "full", timeStyle: "short", timeZone: "America/Mexico_City" }).format(data.paidAt);
  const cardInfo = data.cardBrand && data.cardLast4 ? `${data.cardBrand.charAt(0).toUpperCase() + data.cardBrand.slice(1)} \u2022\u2022\u2022\u2022 ${data.cardLast4}` : "Tarjeta de cr\u00e9dito/d\u00e9bito";
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pago recibido</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#00c853,#00bcd4);padding:28px 40px;">
  <p style="margin:0;color:#fff;font-size:13px;opacity:0.85;">KobraPay</p>
  <h1 style="margin:6px 0 0;color:#fff;font-size:26px;font-weight:800;">\uD83D\uDCB0 Pago recibido</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="color:#374151;font-size:15px;margin:0 0 24px;">Hola <strong>${data.vendorName}</strong>, recibiste un nuevo pago en KobraPay.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:24px;"><tr><td style="text-align:center;padding:20px;">
    <p style="margin:0;color:#15803d;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Monto recibido</p>
    <p style="margin:8px 0 0;color:#15803d;font-size:40px;font-weight:900;">${amountFormatted}</p>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
    <tr><td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;">Detalles del pago</p></td></tr>
    <tr><td style="padding:0 16px;"><table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Pagador</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;font-weight:600;">${data.payerName}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;">${data.payerEmail}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Concepto</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;">${data.description}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">M\u00e9todo</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;">${cardInfo}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Fecha</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;">${dateFormatted}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px;">ID transacci\u00f3n</td><td style="padding:10px 0;text-align:right;color:#9ca3af;font-size:11px;font-family:monospace;">${data.transactionId.slice(0, 24)}...</td></tr>
    </table></td></tr>
  </table>
  <div style="text-align:center;margin-top:24px;">
    <a href="https://kobrapay.mx/dashboard/sales" style="display:inline-block;background:#00c853;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">Ver en mi panel \u2192</a>
  </div>
</td></tr>
<tr><td style="background:#1a1a2e;padding:20px 40px;text-align:center;">
  <p style="margin:0;color:#9ca3af;font-size:12px;">Procesado por <strong style="color:#00c853;">KobraPay</strong> \u00b7 kobrapay.mx</p>
</td></tr>
</table></td></tr></table></body></html>`;
  try {
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: data.vendorEmail,
      subject: `\uD83D\uDCB0 Pago recibido: ${amountFormatted} de ${data.payerName}`,
      html,
    });
    if (error) { console.error("[Email] Error al enviar notificaci\u00f3n al vendedor:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepci\u00f3n al enviar notificaci\u00f3n al vendedor:", err);
    return false;
  }
}

// ─── Email de nuevo registro al superadmin ───────────────────────────────────
export async function sendNewRegistrationEmail(data: {
  ownerEmail: string;
  newUserName: string;
  newUserEmail: string;
  registeredAt: Date;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const dateFormatted = new Intl.DateTimeFormat("es-MX", { dateStyle: "full", timeStyle: "short", timeZone: "America/Mexico_City" }).format(data.registeredAt);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Nuevo registro</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:28px 40px;">
  <p style="margin:0;color:#00c853;font-size:13px;font-weight:700;">KobraPay \u00b7 Admin</p>
  <h1 style="margin:6px 0 0;color:#fff;font-size:24px;font-weight:800;">\uD83D\uDC64 Nuevo registro pendiente</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="color:#374151;font-size:15px;margin:0 0 20px;">Un nuevo usuario se ha registrado en KobraPay y est\u00e1 esperando aprobaci\u00f3n.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
    <tr><td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;">Datos del solicitante</p></td></tr>
    <tr><td style="padding:0 16px;"><table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Nombre</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;font-weight:600;">${data.newUserName}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-size:13px;">${data.newUserEmail}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px;">Fecha</td><td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;">${dateFormatted}</td></tr>
    </table></td></tr>
  </table>
  <div style="text-align:center;margin-top:24px;">
    <a href="https://kobrapay.mx/dashboard/registrations" style="display:inline-block;background:#00c853;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">Revisar solicitud \u2192</a>
  </div>
</td></tr>
<tr><td style="background:#1a1a2e;padding:20px 40px;text-align:center;">
  <p style="margin:0;color:#9ca3af;font-size:12px;">Panel de administraci\u00f3n de <strong style="color:#00c853;">KobraPay</strong> \u00b7 kobrapay.mx</p>
</td></tr>
</table></td></tr></table></body></html>`;
  try {
    const { error } = await resend.emails.send({
      from: `KobraPay Admin <${ENV.fromEmail}>`,
      to: data.ownerEmail,
      subject: `\uD83D\uDC64 Nuevo registro: ${data.newUserName} espera aprobaci\u00f3n`,
      html,
    });
    if (error) { console.error("[Email] Error al enviar notificaci\u00f3n de registro:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepci\u00f3n al enviar notificaci\u00f3n de registro:", err);
    return false;
  }
}


export async function sendRegistrationConfirmationEmail(data: {
  userEmail: string;
  userName: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada. No se envio confirmacion de registro.");
    return false;
  }
  const html = [
    "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><title>Solicitud recibida</title></head>",
    "<body style='margin:0;padding:0;background:#f4f4f5;font-family:Helvetica Neue,Arial,sans-serif;'>",
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f4f5;padding:40px 0;'><tr><td align='center'>",
    "<table width='600' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);'>",
    "<tr><td style='background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:28px 40px;text-align:center;'>",
    "<p style='margin:0;color:#00c853;font-size:13px;font-weight:700;letter-spacing:1px;'>KOBRAPAY</p>",
    "<h1 style='margin:10px 0 0;color:#fff;font-size:26px;font-weight:800;'>Solicitud recibida</h1>",
    "</td></tr>",
    "<tr><td style='padding:36px 40px;'>",
    `<p style='color:#374151;font-size:16px;margin:0 0 16px;'>Hola <strong>${data.userName}</strong>,</p>`,
    "<p style='color:#374151;font-size:15px;margin:0 0 20px;'>Recibimos tu solicitud de registro en <strong>KobraPay</strong>. Nuestro equipo la revisara en las proximas horas y te notificaremos por este correo cuando tu cuenta sea aprobada.</p>",
    "<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin:24px 0;'>",
    "<p style='margin:0 0 8px;color:#166534;font-size:14px;font-weight:700;'>Que sigue?</p>",
    "<ul style='margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;'>",
    "<li>Revisamos tu solicitud (generalmente en menos de 24 horas)</li>",
    "<li>Te enviamos un email de bienvenida con acceso a tu panel</li>",
    "<li>Empiezas a cobrar con tarjeta, OXXO y SPEI desde el primer dia</li>",
    "</ul></div>",
    "<p style='color:#6b7280;font-size:14px;margin:20px 0 0;'>Tienes alguna pregunta? Escribenos a <a href='mailto:hola@kobrapay.mx' style='color:#00c853;text-decoration:none;'>hola@kobrapay.mx</a></p>",
    "</td></tr>",
    "<tr><td style='background:#1a1a2e;padding:20px 40px;text-align:center;'>",
    "<p style='margin:0;color:#9ca3af;font-size:12px;'><strong style='color:#00c853;'>KobraPay</strong> kobrapay.mx</p>",
    "</td></tr>",
    "</table></td></tr></table></body></html>",
  ].join("\n");
  try {
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: data.userEmail,
      subject: "Solicitud recibida - KobraPay",
      html,
    });
    if (error) { console.error("[Email] Error al enviar confirmacion de registro:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Email] Excepcion al enviar confirmacion de registro:", err);
    return false;
  }
}
