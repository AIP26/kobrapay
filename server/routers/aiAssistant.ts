/**
 * aiAssistant.ts — Router de IA para KobraPay v2.1
 *
 * Arquitectura Hub-Spoke:
 *   - ContentAI (aicontentlab.co) es el Centro de Comando (Super Admin, configuraciones, métricas)
 *   - KobraPay es el Procesador de Pagos (envía webhooks a ContentAI, expone API de métricas)
 *
 * Este router contiene SOLO los módulos de IA para comerciantes:
 *   1. merchantSupport — Asistente de soporte para comerciantes
 *   2. marketing       — Generador de contenido de marketing
 *
 * El panel SuperAdmin vive en ContentAI. KobraPay NO tiene panel maestro propio.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// ─── Contexto base de KobraPay ────────────────────────────────────────────────
const KOBRAPAY_CONTEXT = `
KobraPay es una plataforma de cobros y pagos digitales que opera en México y más de 24 países.
Permite a los negocios aceptar pagos con tarjeta (Visa, Mastercard, Amex), OXXO y transferencias SPEI.

PLAN ACTUAL (Beta de Lanzamiento):
- Tarifa: 4.6% + $3.50 MXN + IVA por transacción
- Sin mensualidad, sin hardware, sin permanencia
- Activación en 24 horas
- Desglose: Stripe cobra 3.6% + $3 MXN, KobraPay cobra 1% + $0.50 MXN

FUNCIONALIDADES PRINCIPALES:
- Links de pago personalizados con QR
- Cobros recurrentes / suscripciones
- Verificación de identidad (OTP + selfie)
- Facturación CFDI digital
- Contratos digitales con firma electrónica
- Widget embebible para sitios web
- KobraScore (puntuación de riesgo de clientes)
- Exportación CSV de ventas
- Meses Sin Intereses (3, 6, 9, 12 MSI)
- Panel multi-usuario con roles

MÉTODOS DE PAGO:
- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- OXXO (efectivo en tiendas OXXO)
- SPEI (transferencia bancaria)

ROLES:
- Superadmin: acceso total a la plataforma
- Admin Empresa: gestiona su cuenta y empleados
- Empleado: crea enlaces, solicita reembolsos
- Asociado: vendedor externo con comisión escalonada
`;

// ─── 1. Sistema prompt del Asistente de Soporte ───────────────────────────────
const MERCHANT_SUPPORT_SYSTEM = `Eres "KobraBot", el asistente de soporte inteligente de KobraPay.
Tu misión es ayudar a los comerciantes a resolver dudas y problemas con la plataforma de forma rápida, amable y precisa.

${KOBRAPAY_CONTEXT}

PROBLEMAS FRECUENTES Y SOLUCIONES:
- "No puedo iniciar sesión": verificar correo/contraseña, usar recuperación de contraseña
- "El pago no aparece": puede tardar 5 min, verificar en Mis Ventas con filtros
- "Error al crear enlace": verificar que todos los campos obligatorios estén completos
- "El cliente no puede pagar": verificar que el enlace no haya expirado, que el método esté habilitado
- "¿Cuándo recibo mi dinero?": el procesador transfiere en 2-7 días hábiles
- "No puedo hacer reembolso": si eres empleado, solo puedes solicitar; el admin debe aprobar
- "¿Cómo elimino una transacción?": en Mis Ventas, seleccionar y usar botón eliminar con PIN
- "Error con OXXO": verificar que OXXO esté habilitado en el enlace y monto sea válido
- "Error con SPEI": verificar que SPEI esté habilitado en el enlace
- "¿Cómo activo MSI?": en la configuración del enlace de pago, sección Meses Sin Intereses
- "¿Cómo genero una factura?": en el menú Mis Facturas, botón Nueva Factura
- "¿Cómo firmo un contrato?": en Contratos, crear contrato y compartir el enlace de firma

REGLAS:
- Responde SIEMPRE en español mexicano, amable y directo
- Si el problema requiere intervención humana, sugiere crear un ticket en Soporte Técnico
- Sé conciso pero completo
- Usa emojis con moderación para hacer la respuesta más amigable
- Si no sabes algo, di "No tengo esa información, te recomiendo contactar a soporte técnico"`;

// ─── 2. Sistema prompt del Generador de Marketing ─────────────────────────────
const MARKETING_SYSTEM = `Eres "KobraContent", el generador de contenido de marketing de KobraPay.
Tu misión es crear contenido de marketing profesional y efectivo para que los comerciantes promuevan sus negocios y acepten pagos con KobraPay.

${KOBRAPAY_CONTEXT}

TIPOS DE CONTENIDO QUE PUEDES GENERAR:
1. instagram_post: Post para Instagram (caption + hashtags)
2. whatsapp_message: Mensaje de WhatsApp para clientes
3. email_campaign: Email de campaña de marketing
4. facebook_post: Post para Facebook
5. business_kit: Kit completo (post + WhatsApp + email)
6. payment_announcement: Anuncio de que el negocio acepta pagos digitales
7. promotion: Promoción especial del negocio

REGLAS:
- Adapta el tono al tipo de negocio (restaurante, tienda, servicio profesional, etc.)
- Incluye siempre un call-to-action claro
- Para Instagram: incluye hashtags relevantes (#KobraPay, #PagoDigital, etc.)
- Para WhatsApp: tono más personal y directo
- Para email: más formal y estructurado
- Responde en español mexicano
- El contenido debe ser auténtico, no genérico`;

// ─── Router Principal ─────────────────────────────────────────────────────────
export const aiAssistantRouter = router({

  // ── 1. Soporte para Comerciantes ──────────────────────────────────────────
  merchantSupport: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(4000),
        })).max(20),
        context: z.object({
          businessName: z.string().optional(),
          businessType: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let systemContent = MERCHANT_SUPPORT_SYSTEM;
        if (input.context?.businessName) {
          systemContent += `\n\nCONTEXTO DEL COMERCIANTE:\n- Negocio: ${input.context.businessName}`;
          if (input.context.businessType) {
            systemContent += `\n- Tipo: ${input.context.businessType}`;
          }
        }
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemContent },
            ...input.messages,
          ],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin respuesta del asistente" });
        return {
          message: typeof content === "string" ? content : JSON.stringify(content),
          userId: ctx.user.id,
        };
      }),

    getSuggestions: protectedProcedure
      .input(z.object({
        context: z.enum(["payment_error", "onboarding", "general", "billing", "refund"]).default("general"),
      }))
      .query(async ({ input }) => {
        const suggestions: Record<string, string[]> = {
          payment_error: [
            "¿Por qué falló el pago de mi cliente?",
            "¿Cómo activo OXXO en mi enlace de pago?",
            "¿Cuánto tiempo tarda en procesarse un pago SPEI?",
            "¿Cómo verifico si un pago fue exitoso?",
          ],
          onboarding: [
            "¿Cómo creo mi primer enlace de pago?",
            "¿Cómo comparto mi enlace por WhatsApp?",
            "¿Cómo configuro mis datos bancarios?",
            "¿Cómo activo la verificación de identidad?",
          ],
          billing: [
            "¿Cuándo recibiré mi dinero?",
            "¿Cómo genero una factura CFDI?",
            "¿Cómo exporto mis ventas en CSV?",
            "¿Cómo calculo mi comisión neta?",
          ],
          refund: [
            "¿Cómo proceso un reembolso?",
            "¿Puedo hacer un reembolso parcial?",
            "¿Cuánto tiempo tarda el reembolso?",
            "¿Qué pasa si el cliente disputa el pago?",
          ],
          general: [
            "¿Cómo creo un enlace de pago con QR?",
            "¿Cómo activo Meses Sin Intereses?",
            "¿Cómo agrego empleados a mi cuenta?",
            "¿Cómo configuro cobros recurrentes?",
          ],
        };
        return suggestions[input.context] ?? suggestions.general;
      }),
  }),

  // ── 2. Generador de Marketing ─────────────────────────────────────────────
  marketing: router({
    generate: protectedProcedure
      .input(z.object({
        type: z.enum([
          "instagram_post",
          "whatsapp_message",
          "email_campaign",
          "facebook_post",
          "business_kit",
          "payment_announcement",
          "promotion",
        ]),
        businessName: z.string().min(1).max(100),
        businessType: z.string().min(1).max(100),
        city: z.string().optional(),
        product: z.string().optional(),
        tone: z.enum(["professional", "friendly", "casual", "luxury"]).default("friendly"),
        extraContext: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        const typeLabels: Record<string, string> = {
          instagram_post: "post de Instagram",
          whatsapp_message: "mensaje de WhatsApp",
          email_campaign: "email de campaña",
          facebook_post: "post de Facebook",
          business_kit: "kit completo de marketing (post Instagram + mensaje WhatsApp + email)",
          payment_announcement: "anuncio de aceptación de pagos digitales",
          promotion: "publicación de promoción especial",
        };
        const toneLabels: Record<string, string> = {
          professional: "profesional y formal",
          friendly: "amigable y cercano",
          casual: "casual y relajado",
          luxury: "exclusivo y premium",
        };
        const userPrompt = `Genera un ${typeLabels[input.type]} para el siguiente negocio:
- Nombre del negocio: ${input.businessName}
- Tipo de negocio: ${input.businessType}
${input.city ? `- Ciudad: ${input.city}` : ""}
${input.product ? `- Producto/servicio principal: ${input.product}` : ""}
- Tono: ${toneLabels[input.tone]}
${input.extraContext ? `- Contexto adicional: ${input.extraContext}` : ""}

El contenido debe mencionar que el negocio acepta pagos digitales con KobraPay (tarjeta, OXXO, transferencia).
${input.type === "business_kit" ? "Genera los 3 formatos separados claramente con encabezados." : ""}
${input.type === "instagram_post" ? "Incluye al menos 10 hashtags relevantes al final." : ""}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: MARKETING_SYSTEM },
            { role: "user", content: userPrompt },
          ],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin respuesta del generador" });
        return {
          content: typeof content === "string" ? content : JSON.stringify(content),
          type: input.type,
          businessName: input.businessName,
        };
      }),

    getIdeas: protectedProcedure
      .input(z.object({
        businessType: z.string().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: MARKETING_SYSTEM },
            {
              role: "user",
              content: `Dame 6 ideas creativas de contenido de marketing para un negocio de tipo "${input.businessType}" que acepta pagos digitales con KobraPay. 
Formato: lista numerada, cada idea en una línea, máximo 15 palabras por idea.`,
            },
          ],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return { ideas: typeof content === "string" ? content : JSON.stringify(content) };
      }),
  }),
});
