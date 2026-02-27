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
                    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">KobraPay</h1>
                    <p style="margin:2px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Cobra fácil, cobra global</p>
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
