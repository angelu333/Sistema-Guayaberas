"use client";

import { useState } from "react";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  CheckCircle,
  Shirt,
} from "lucide-react";

export interface PublicCartItem {
  cartItemId: string;
  productId: string;
  variantId: string;
  productName: string;
  colorName: string;
  sizeName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

interface PublicCartDrawerProps {
  items: PublicCartItem[];
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  tenantName?: string;
  tenantWhatsapp?: string | null;
}

export function PublicCartDrawer({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  tenantName = "Guayaberas Ábito & Montejo",
  tenantWhatsapp,
}: PublicCartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalPieces = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  if (items.length === 0) return null;

  const handleSendWhatsAppCart = () => {
    const phone = tenantWhatsapp || "";
    if (!phone) {
      alert("No hay número de WhatsApp registrado en la empresa.");
      return;
    }

    const itemsText = items
      .map(
        (item, index) =>
          `${index + 1}. *${item.productName}*\n` +
          `   • Color: ${item.colorName || "Estándar"}\n` +
          `   • Talla: ${item.sizeName || "Estándar"}\n` +
          `   • Cantidad: ${item.quantity} pza${item.quantity > 1 ? "s" : ""}\n` +
          `   • Subtotal: *$${(item.unitPrice * item.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN*`
      )
      .join("\n\n");

    const message =
      `¡Hola ${tenantName}! Me interesa cotizar/pedir la siguiente lista de guayaberas:\n\n` +
      `${itemsText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Total de prendas:* ${totalPieces}\n` +
      `💵 *Total estimado:* *$${totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN*\n\n` +
      `¿Tienen disponibilidad para entrega o envío?`;

    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRA / BOTÓN FLOTANTE INFERIOR
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between text-white font-[Outfit] transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: "#26302B", border: "1.5px solid #C49A5A" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2 rounded-xl bg-[#C49A5A] text-white shrink-0">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#B85450] text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#26302B]">
                {totalPieces}
              </span>
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-bold truncate">Mi Pedido ({totalPieces} prenda{totalPieces !== 1 ? "s" : ""})</p>
              <p className="text-sm font-extrabold text-[#C49A5A] font-mono">
                ${totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
            Ver Lista →
          </span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DRAWER / MODAL DEL CARRITO DE COTIZACIÓN
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between font-[Outfit] animate-slide-left"
            style={{ borderLeft: "1px solid #E4DDD1" }}
          >
            {/* Header Drawer */}
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ backgroundColor: "#F5EFE3", borderColor: "#E4DDD1" }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#C49A5A]" />
                <h3 className="font-extrabold text-base text-[#26302B]">
                  Mi Lista de Pedido ({totalPieces})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClearCart}
                  className="text-xs text-[#B85450] hover:underline font-semibold"
                  title="Vaciar lista"
                >
                  Vaciar
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-[#8B7D6B] hover:bg-[#EDE7DA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lista de Prendas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="p-3 rounded-2xl border flex items-center gap-3 bg-[#FAF7F2]"
                  style={{ borderColor: "#E4DDD1" }}
                >
                  {/* Foto de la prenda */}
                  <div className="w-14 h-18 rounded-xl overflow-hidden bg-[#F5EFE3] shrink-0 border border-[#E4DDD1]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C49A5A]">
                        <Shirt className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Detalles */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-[#26302B] truncate">{item.productName}</h4>
                    <p className="text-[11px] text-[#8B7D6B] mt-0.5">
                      {item.colorName || "Estándar"} · Talla <span className="font-bold text-[#556B5D]">{item.sizeName || "Estándar"}</span>
                    </p>
                    <p className="text-xs font-extrabold text-[#556B5D] mt-1">
                      ${(item.unitPrice * item.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                    </p>
                  </div>

                  {/* Controles Cantidad & Eliminar */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => onRemoveItem(item.cartItemId)}
                      className="text-[#B85450] p-1 hover:bg-[#FEF5F5] rounded-lg"
                      title="Quitar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 bg-white border border-[#E4DDD1] p-0.5 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                        className="w-5 h-5 flex items-center justify-center font-bold text-xs text-[#26302B]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center font-bold text-xs text-white bg-[#556B5D] rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer con Total y Enviar WhatsApp */}
            <div className="p-4 border-t space-y-3 bg-white" style={{ borderColor: "#E4DDD1" }}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#26302B]">Total Estimado ({totalPieces} pzas):</span>
                <span className="font-extrabold text-lg text-[#C49A5A]">
                  ${totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                </span>
              </div>

              <button
                onClick={handleSendWhatsAppCart}
                className="w-full py-3.5 rounded-xl font-extrabold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-95"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="w-5 h-5" />
                Enviar Pedido por WhatsApp
              </button>

              <p className="text-[10px] text-center text-[#8B7D6B]">
                Se enviará el desglose completo directo al WhatsApp de {tenantName}.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
