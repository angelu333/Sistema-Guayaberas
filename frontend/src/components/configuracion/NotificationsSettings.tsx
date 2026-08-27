"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Smartphone,
  TestTube,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  isPushSupported,
  getNotificationStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isCurrentlySubscribed,
  sendTestNotification,
  type PushNotificationStatus,
} from "@/services/push.service";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

export function NotificationsSettings() {
  const { session } = useAuthStore();
  const { tenant } = useTenantStore();
  const tenantId = tenant?.id || session?.tenantId || "";
  const userId = session?.userId || "";

  const [status, setStatus] = useState<PushNotificationStatus>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supported = isPushSupported();

  useEffect(() => {
    async function checkStatus() {
      if (!supported) {
        setLoading(false);
        return;
      }
      setStatus(getNotificationStatus());
      const subscribed = await isCurrentlySubscribed();
      setIsSubscribed(subscribed);
      setLoading(false);
    }
    checkStatus();
  }, [supported]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubscribe = async () => {
    if (!tenantId || !userId) return;
    setActionLoading(true);
    try {
      const sub = await subscribeToPush(tenantId, userId);
      if (sub) {
        setIsSubscribed(true);
        setStatus("granted");
        showMessage("success", "¡Notificaciones activadas en este dispositivo! Recibirás alertas de ventas y stock bajo.");
      } else {
        showMessage("error", "No se activaron las notificaciones. Es posible que hayas rechazado el permiso.");
      }
    } catch (err: any) {
      showMessage("error", err.message || "Error al activar notificaciones.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!tenantId || !userId) return;
    setActionLoading(true);
    try {
      await unsubscribeFromPush(tenantId, userId);
      setIsSubscribed(false);
      setStatus(Notification.permission as PushNotificationStatus);
      showMessage("success", "Notificaciones desactivadas en este dispositivo.");
    } catch (err: any) {
      showMessage("error", err.message || "Error al desactivar notificaciones.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTest = async () => {
    if (!tenantId || !userId) return;
    setTestLoading(true);
    try {
      await sendTestNotification(tenantId, userId);
      showMessage("success", "¡Notificación de prueba enviada! Revisa las notificaciones de tu dispositivo.");
    } catch (err: any) {
      showMessage("error", err.message || "Error al enviar notificación de prueba.");
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-3 text-[#6B7A71] text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-[#556B5D]" />
        Verificando soporte de notificaciones...
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header de la sección */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${isSubscribed ? "bg-[#EBF5F0] text-[#3F7D58]" : "bg-[#F0EDE6] text-[#6B7A71]"}`}>
            {isSubscribed ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#26302B] font-[Outfit]">
              Notificaciones Push en este Dispositivo
            </h3>
            <p className="text-xs text-[#6B7A71] mt-1 leading-relaxed">
              Recibe alertas instantáneas en tu celular, tablet o computadora cuando se registre una nueva venta o cuando un producto tenga stock bajo. Las notificaciones funcionan incluso si el navegador está minimizado.
            </p>

            {/* Estado del dispositivo */}
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-[#3F7D58]" : "bg-[#D89B2B]"}`} />
              <span className="text-xs font-semibold text-[#6B7A71]">
                Este dispositivo:{" "}
                <span className={isSubscribed ? "text-[#3F7D58]" : "text-[#D89B2B]"}>
                  {isSubscribed ? "✓ Suscrito y activo" : "Sin suscripción"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Mensajes de estado */}
        {message && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
            message.type === "success"
              ? "bg-[#EBF5F0] border border-[#A7D7B9] text-[#3F7D58]"
              : "bg-[#FAEAEA] border border-[#B85450]/30 text-[#B85450]"
          }`}>
            {message.type === "success"
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            }
            <span>{message.text}</span>
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!supported ? (
            <div className="p-3 bg-[#FDF5E4] border border-[#D89B2B]/30 rounded-xl text-xs text-[#8B6914] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Tu navegador no soporta notificaciones push. Usa Chrome, Edge o Firefox actualizados.
            </div>
          ) : status === "denied" ? (
            <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Las notificaciones están bloqueadas. Ve a Configuración del navegador → Privacidad y Seguridad → Notificaciones para habilitarlas.
            </div>
          ) : isSubscribed ? (
            <>
              <Button
                onClick={handleTest}
                disabled={testLoading}
                variant="outline"
              >
                {testLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                {testLoading ? "Enviando..." : "Enviar notificación de prueba"}
              </Button>

              <Button
                onClick={handleUnsubscribe}
                disabled={actionLoading}
                variant="outline"
                className="text-[#B85450] border-[#B85450]/30 hover:bg-[#FAEAEA]"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                {actionLoading ? "Procesando..." : "Desactivar en este dispositivo"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              {actionLoading ? "Activando..." : "Activar notificaciones en este dispositivo"}
            </Button>
          )}
        </div>
      </Card>

      {/* Qué tipo de notificaciones recibirás */}
      <Card className="p-5">
        <h3 className="font-bold text-[#26302B] font-[Outfit] text-sm mb-4 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#556B5D]" />
          ¿Qué notificaciones recibirás?
        </h3>
        <div className="space-y-3">
          {[
            {
              emoji: "🛍️",
              title: "Nueva venta registrada",
              desc: "Cada vez que un vendedor registre una venta en el POS, te llegará el ticket con total y vendedor.",
            },
            {
              emoji: "⚠️",
              title: "Producto con stock bajo",
              desc: "Cuando una variante baje del mínimo configurado, recibirás una alerta con el SKU y cantidad restante.",
            },
            {
              emoji: "📦",
              title: "Traspaso entre sucursales completado",
              desc: "Al completar una transferencia de inventario entre tiendas, se enviará la confirmación.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 bg-[#F8F6F1] rounded-xl">
              <span className="text-xl">{item.emoji}</span>
              <div>
                <p className="text-xs font-bold text-[#26302B]">{item.title}</p>
                <p className="text-xs text-[#6B7A71] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-[#EBF0EC] rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-[#556B5D] shrink-0 mt-0.5" />
          <p className="text-xs text-[#556B5D]">
            <strong>Nota:</strong> Cada dispositivo (celular, tablet, computadora) se suscribe por separado. Puedes activar las notificaciones en todos tus dispositivos abriendo Configuración desde cada uno.
          </p>
        </div>
      </Card>
    </div>
  );
}
