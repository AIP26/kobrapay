import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { notifyOwner } from "./notification";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a brand new user (first login)
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Notify owner of new registration (only for new users, not the owner themselves)
      if (isNewUser && userInfo.openId !== ENV.ownerOpenId) {
        const newUser = await db.getUserByOpenId(userInfo.openId);
        try {
          await notifyOwner({
            title: "🔆 Nuevo registro en KobraPay",
            content: `Un nuevo usuario se ha registrado y está esperando aprobación:\n\n• Nombre: ${userInfo.name || "Sin nombre"}\n• Email: ${userInfo.email || "Sin email"}\n• Método: ${userInfo.loginMethod || userInfo.platform || "OAuth"}\n\nRevisa el panel de Registros para aprobar o rechazar la cuenta.`,
          });
        } catch (notifyErr) {
          console.warn("[OAuth] Error notifying owner of new registration:", notifyErr);
        }
        // Crear notificación en el centro de notificaciones del panel
        try {
          const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
          if (ownerUser) {
            await db.createNotification({
              userId: ownerUser.id,
              type: "new_registration",
              title: `🔆 Nuevo registro pendiente de aprobación`,
              message: `${userInfo.name || "Un usuario"} (${userInfo.email || "sin email"}) se acaba de registrar en KobraPay y está esperando tu aprobación.`,
              isRead: false,
              actionUrl: "/dashboard/registrations",
              metadata: JSON.stringify({
                userId: newUser?.id,
                name: userInfo.name,
                email: userInfo.email,
              }),
            });
          }
        } catch (notifErr) {
          console.warn("[OAuth] Error creating panel notification:", notifErr);
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
