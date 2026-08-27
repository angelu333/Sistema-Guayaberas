// ================================================================
// push.service.ts — Guayabera Manager
// Gestiona suscripciones Web Push en el cliente (navegador)
// ================================================================

// VAPID Public Key generada con web-push
// Privada está en variables de entorno del servidor (.env.local)
export const VAPID_PUBLIC_KEY =
  "BBylFNo0hz8Tkk03DcugzOn8NDU-Ci4nW67Pp4C6k6Dy2m4_NnBzRn_usOj2hqJTcLCJE7AHn1gWxDB7jafn1oY";

export type PushNotificationStatus =
  | "unsupported"     // El navegador no soporta notificaciones push
  | "denied"          // El usuario bloqueó las notificaciones
  | "granted"         // Las notificaciones están activas y suscritas
  | "default";        // El usuario no ha respondido aún

// ================================================================
// Helpers internos
// ================================================================

/** Convierte una clave pública VAPID de base64url a Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ================================================================
// Funciones públicas del servicio
// ================================================================

/**
 * Verifica si el navegador actual soporta notificaciones Push Web.
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Obtiene el estado actual de permisos de notificación.
 */
export function getNotificationStatus(): PushNotificationStatus {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushNotificationStatus;
}

/**
 * Registra el Service Worker si no está registrado ya.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    console.log("[Push] Service Worker registrado:", registration.scope);
    return registration;
  } catch (err) {
    console.error("[Push] Error al registrar Service Worker:", err);
    return null;
  }
}

/**
 * Solicita permiso al usuario y suscribe el dispositivo a las notificaciones push.
 * Devuelve la suscripción si fue exitosa, null si el usuario denegó.
 */
export async function subscribeToPush(tenantId: string, userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error("Este navegador no soporta notificaciones push.");
  }

  // Solicitar permiso si aún no está concedido
  if (Notification.permission === "denied") {
    throw new Error("Las notificaciones están bloqueadas en este navegador. Ve a Configuración del navegador para habilitarlas.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null; // El usuario rechazó
  }

  // Obtener o crear el Service Worker
  const registration = await registerServiceWorker();
  if (!registration) throw new Error("No se pudo registrar el Service Worker.");

  // Esperar a que el SW esté activo
  await navigator.serviceWorker.ready;

  // Verificar si ya hay una suscripción activa
  const existingSub = await registration.pushManager.getSubscription();
  if (existingSub) {
    // Guardar suscripción en el servidor igual (para el caso de re-suscripción)
    await savePushSubscription(existingSub, tenantId, userId);
    return existingSub;
  }

  // Crear nueva suscripción con la clave VAPID
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
  });

  // Registrar la suscripción en nuestro servidor
  await savePushSubscription(subscription, tenantId, userId);

  console.log("[Push] Suscripción creada:", subscription.endpoint);
  return subscription;
}

/**
 * Cancela la suscripción push de este dispositivo.
 */
export async function unsubscribeFromPush(tenantId: string, userId: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  // Notificar al servidor antes de cancelar
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        tenantId,
        userId,
      }),
    });
  } catch (err) {
    console.warn("[Push] Error al notificar al servidor sobre la cancelación:", err);
  }

  await subscription.unsubscribe();
  console.log("[Push] Suscripción cancelada.");
}

/**
 * Verifica si el dispositivo actual ya está suscrito a notificaciones push.
 */
export async function isCurrentlySubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

/**
 * Envía la suscripción push al servidor para guardarla en Supabase.
 */
async function savePushSubscription(
  subscription: PushSubscription,
  tenantId: string,
  userId: string
): Promise<void> {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      tenantId,
      userId,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Error al guardar la suscripción push en el servidor.");
  }
}

/**
 * Envía una notificación push de prueba desde el servidor.
 */
export async function sendTestNotification(tenantId: string, userId: string): Promise<void> {
  const response = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, userId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Error al enviar notificación de prueba.");
  }
}
