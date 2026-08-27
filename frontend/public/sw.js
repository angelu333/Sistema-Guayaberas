// ================================================================
// SERVICE WORKER — Guayabera Manager PWA
// Maneja notificaciones push en segundo plano y cache offline.
// ================================================================

const CACHE_NAME = "guayabera-manager-v1";

// Archivos esenciales para funcionamiento offline básico
const OFFLINE_ASSETS = ["/", "/dashboard", "/offline.html"];

// ================================================================
// INSTALACIÓN: Pre-cachear archivos clave
// ================================================================
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ================================================================
// ACTIVACIÓN: Limpiar caches viejos
// ================================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activado.");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ================================================================
// FETCH: Estrategia Network-first con fallback a cache
// ================================================================
self.addEventListener("fetch", (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== "GET") return;

  // No interceptar llamadas a Supabase API
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar en cache si la respuesta es válida
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si no hay red, intentar desde cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/offline.html");
        });
      })
  );
});

// ================================================================
// PUSH: Recibir notificaciones push del servidor
// ================================================================
self.addEventListener("push", (event) => {
  console.log("[SW] Notificación push recibida.");

  let data = {
    title: "Guayabera Manager",
    body: "Tienes una nueva actualización.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: "guayabera-general",
    data: { url: "/dashboard" },
  };

  // Parsear el payload que viene del servidor
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-96x96.png",
    tag: data.tag || "guayabera-general",
    data: data.data || { url: "/dashboard" },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    actions: [
      {
        action: "open",
        title: "Ver detalles",
      },
      {
        action: "dismiss",
        title: "Cerrar",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ================================================================
// NOTIFICATIONCLICK: Al tocar la notificación, abrir la URL
// ================================================================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Si no hay ventana, abrir una nueva
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ================================================================
// PUSHSUBSCRIPTIONCHANGE: Renovar suscripción expirada
// ================================================================
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Suscripción push expirada, renovando...");
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.VAPID_PUBLIC_KEY,
      })
      .then((subscription) => {
        // Notificar al servidor sobre la nueva suscripción
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        });
      })
  );
});
