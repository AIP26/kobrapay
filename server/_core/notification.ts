import { Resend } from "resend";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Notifica al dueño de la plataforma por email (Resend).
 * Reemplaza al servicio de notificaciones de Manus tras la migración.
 * Devuelve `true` si el correo fue aceptado por Resend, `false` en caso contrario.
 * Si faltan credenciales, registra en logs y devuelve false (los llamadores ya
 * toleran el fallo: las notificaciones nunca deben bloquear un pago).
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL no configurado. Notificación solo en logs:", title);
    return false;
  }
  if (!ENV.resendApiKey) {
    console.warn("[Notification] RESEND_API_KEY no configurada. Notificación solo en logs:", title);
    return false;
  }

  try {
    const resend = new Resend(ENV.resendApiKey);
    const { error } = await resend.emails.send({
      from: `KobraPay <${ENV.fromEmail}>`,
      to: ENV.ownerEmail,
      subject: title,
      text: content,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px;">${escapeHtml(title)}</h2>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(content)}</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
          <p style="margin:0;color:#9ca3af;font-size:11px;">Notificación interna de KobraPay</p>
        </div>
      `,
    });

    if (error) {
      console.warn("[Notification] Resend rechazó el correo al owner:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error enviando email al owner:", error);
    return false;
  }
}
