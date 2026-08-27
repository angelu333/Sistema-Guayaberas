"use client";

import { useEffect } from "react";

/**
 * Componente cliente que registra el Service Worker silenciosamente
 * en cuanto el usuario carga cualquier página de la aplicación.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Verificar si hay una actualización disponible del Service Worker
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[PWA] Nueva versión disponible. Recarga para actualizar.");
              }
            });
          }
        });

        console.log("[PWA] Service Worker registrado correctamente:", registration.scope);
      } catch (err) {
        console.warn("[PWA] Error al registrar Service Worker:", err);
      }
    };

    // Registrar después de que la página cargue completamente
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null; // Componente invisible
}
