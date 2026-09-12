// ================================================================
// lib/push/send-push.ts — Guayabera Manager
// Función interna reutilizable para enviar notificaciones push.
// NO es una ruta HTTP — se importa desde los API Routes del servidor.
// ================================================================
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// VAPID Keys con fallbacks seguros para evitar errores en build
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BBylFNo0hz8Tkk03DcugzOn8NDU-Ci4nW67Pp4C6k6Dy2m4_NnBzRn_usOj2hqJTcLCJE7AHn1gWxDB7jafn1oY";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "RWGqyabV-8TRzFpGpyF3wamMvbN18_jKbnVT4crbph0";

let vapidConfigured = false;
function ensureVapidConfigured() {
  if (!vapidConfigured && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        "mailto:admin@guayaberas.com",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );
      vapidConfigured = true;
    } catch (err) {
      console.warn("[Push] Error al inicializar VAPID:", err);
    }
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: {
    url?: string;
    type?: "sale" | "stock_alert" | "transfer" | "test";
    [key: string]: unknown;
  };
}

/**
 * Envía una notificación push a todos los dispositivos suscritos de un tenant.
 * Elimina automáticamente las suscripciones inválidas (expiradas o rechazadas).
 */
export async function sendPushToTenant(
  tenantId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  ensureVapidConfigured();
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.warn("[Push] Supabase credentials no disponibles.");
    return { sent: 0, failed: 0 };
  }

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("tenant_id", tenantId);

  if (error || !subs || subs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const notification = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
        failed++;
        console.warn(`[Push] Error enviando a ${sub.endpoint}:`, err.statusCode);
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return { sent, failed };
}
