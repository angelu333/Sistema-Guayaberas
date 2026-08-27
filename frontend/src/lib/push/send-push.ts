// ================================================================
// lib/push/send-push.ts — Guayabera Manager
// Función interna reutilizable para enviar notificaciones push.
// NO es una ruta HTTP — se importa desde los API Routes del servidor.
// ================================================================
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configurar VAPID una sola vez al cargar el módulo
webpush.setVapidDetails(
  "mailto:admin@guayaberas.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

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
