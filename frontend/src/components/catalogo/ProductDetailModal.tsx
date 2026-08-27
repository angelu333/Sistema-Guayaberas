"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
  Truck,
  Scissors,
  Ruler,
  Shirt,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle,
} from "lucide-react";
import type { PublicProductView } from "@/services/public-catalog.service";
import type { PublicCartItem } from "@/components/catalogo/PublicCartDrawer";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PublicProductView | null;
  tenantName?: string;
  tenantWhatsapp?: string | null;
  onAddToCart?: (item: PublicCartItem) => void;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  tenantName = "Guayaberas Ábito & Montejo",
  tenantWhatsapp,
  onAddToCart,
}: ProductDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setActiveImageIndex(0);
      const firstColor = product.availableColors[0] || "";
      setSelectedColor(firstColor);
      const sizesForFirstColor = product.variants
        .filter((v) => !firstColor || v.colorName === firstColor)
        .map((v) => v.sizeName)
        .filter(Boolean) as string[];
      const uniqueSizes = Array.from(new Set(sizesForFirstColor));
      setSelectedSize(uniqueSizes[0] || "");
      setQuantity(1);
      setShowSizeGuide(false);
      setAddedSuccess(false);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.url)
      : product.imageUrl
      ? [product.imageUrl]
      : [];

  const currentColor = selectedColor || product.availableColors[0] || "";

  const sizesForCurrentColor = product.variants
    .filter((v) => !currentColor || v.colorName === currentColor)
    .map((v) => v.sizeName)
    .filter(Boolean) as string[];
  const availableSizes = Array.from(new Set(sizesForCurrentColor));

  const currentSize =
    selectedSize && availableSizes.includes(selectedSize)
      ? selectedSize
      : availableSizes[0] || "";

  const matchingVariant = product.variants.find(
    (v) => (!currentColor || v.colorName === currentColor) && (!currentSize || v.sizeName === currentSize)
  );

  const finalPrice = matchingVariant ? matchingVariant.salePrice : product.minPrice;
  const currentStock = matchingVariant ? matchingVariant.stock : 0;
  const isOutOfStock = matchingVariant ? matchingVariant.stock <= 0 : false;

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    const validSizes = product.variants
      .filter((v) => v.colorName === newColor)
      .map((v) => v.sizeName)
      .filter(Boolean) as string[];
    const unique = Array.from(new Set(validSizes));
    if (!unique.includes(selectedSize)) setSelectedSize(unique[0] || "");
  };

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCartClick = () => {
    if (!onAddToCart || isOutOfStock) return;
    const cartItem: PublicCartItem = {
      cartItemId: `${product.productId}-${currentColor}-${currentSize}`,
      productId: product.productId,
      variantId: matchingVariant?.variantId || product.productId,
      productName: product.name,
      colorName: currentColor,
      sizeName: currentSize,
      unitPrice: finalPrice,
      quantity: quantity,
      imageUrl: images[0] || product.imageUrl || null,
    };
    onAddToCart(cartItem);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleSendWhatsApp = () => {
    const phone = tenantWhatsapp || "";
    if (!phone) {
      alert("No hay número de WhatsApp registrado.");
      return;
    }
    const totalAmount = (finalPrice * quantity).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    const message =
      `¡Hola ${tenantName}! Me interesa adquirir lo siguiente:\n\n` +
      `Guayabera: ${product.name}\n` +
      `Color: ${currentColor || "Estándar"}\n` +
      `Talla: ${currentSize || "Estándar"}\n` +
      `Cantidad: ${quantity} pieza${quantity > 1 ? "s" : ""}\n` +
      `Total estimado: ${totalAmount} MXN\n\n` +
      `¿Tienen disponibilidad? ¿Hacen envíos?`;

    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 font-[Outfit]"
      style={{ backgroundColor: "rgba(38,48,43,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] relative bg-white"
        style={{ boxShadow: "0 25px 60px rgba(38,48,43,0.35)" }}
      >
        {/* LADO IZQUIERDO: Galería de Fotos */}
        <div
          className="w-full md:w-[45%] flex flex-col shrink-0"
          style={{ backgroundColor: "#F5EFE3" }}
        >
          {/* Foto principal */}
          <div className="relative flex-1 min-h-[220px] sm:min-h-[320px] overflow-hidden" style={{ aspectRatio: "3/4" }}>
            {images.length > 0 ? (
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-3"
                style={{ color: "#C49A5A" }}
              >
                <Shirt className="w-20 h-20 stroke-1" />
                <span className="text-xs font-medium" style={{ color: "#8B7D6B" }}>Sin fotografía</span>
              </div>
            )}

            {/* Flechas de navegación */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: "rgba(255,255,255,0.92)", color: "#26302B" }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: "rgba(255,255,255,0.92)", color: "#26302B" }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span
                  className="absolute bottom-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(38,48,43,0.6)", color: "white" }}
                >
                  {activeImageIndex + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all"
                  style={{
                    borderColor: activeImageIndex === idx ? "#C49A5A" : "#E4DDD1",
                    opacity: activeImageIndex === idx ? 1 : 0.65,
                  }}
                >
                  <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LADO DERECHO: Detalle y Pedido */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header del modal */}
          <div
            className="flex items-start justify-between p-5 pb-4 border-b sticky top-0 z-10 bg-white"
            style={{ borderColor: "#EDE7DA" }}
          >
            <div>
              {product.categoryName && (
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#EDE7DA", color: "#C49A5A" }}
                >
                  {product.categoryName}
                </span>
              )}
              <h2
                className="text-xl font-extrabold tracking-tight mt-1.5"
                style={{ color: "#26302B" }}
              >
                {product.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl transition-colors shrink-0 ml-2 mt-0.5"
              style={{ color: "#8B7D6B", backgroundColor: "#F5EFE3" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Precio */}
            <div>
              <span className="text-3xl font-extrabold" style={{ color: "#C49A5A" }}>
                ${finalPrice.toFixed(2)}
              </span>
              <span className="text-sm ml-1.5 font-medium" style={{ color: "#8B7D6B" }}>MXN</span>
              {product.maxPrice > product.minPrice && (
                <p className="text-xs mt-0.5" style={{ color: "#8B7D6B" }}>
                  Precios desde ${product.minPrice.toFixed(2)} hasta ${product.maxPrice.toFixed(2)} MXN
                </p>
              )}
            </div>

            {/* Descripción */}
            {product.description && (
              <p className="text-xs leading-relaxed" style={{ color: "#8B7D6B" }}>
                {product.description}
              </p>
            )}

            {/* Selector de Color */}
            {product.availableColors.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2.5" style={{ color: "#26302B" }}>
                  Color:{" "}
                  <span className="font-normal" style={{ color: "#8B7D6B" }}>{currentColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold border-2 transition-all"
                      style={
                        currentColor === color
                          ? { borderColor: "#556B5D", backgroundColor: "#EEF3EE", color: "#26302B" }
                          : { borderColor: "#E4DDD1", backgroundColor: "white", color: "#26302B" }
                      }
                    >
                      {color}
                      {currentColor === color && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: "#556B5D" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de Talla */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold" style={{ color: "#26302B" }}>
                  Talla:{" "}
                  <span className="font-normal" style={{ color: "#8B7D6B" }}>{currentSize}</span>
                </p>
                <button
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-[11px] font-bold underline underline-offset-2"
                  style={{ color: "#C49A5A" }}
                >
                  Guía de Tallas
                </button>
              </div>

              {availableSizes.length === 0 ? (
                <p
                  className="text-xs px-3 py-2 rounded-xl border"
                  style={{ color: "#B85450", backgroundColor: "#FEF5F5", borderColor: "#F5CACA" }}
                >
                  Sin tallas disponibles en este color.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className="min-w-[48px] h-11 px-3 text-sm font-extrabold rounded-xl border-2 transition-all"
                      style={
                        currentSize === size
                          ? { borderColor: "#26302B", backgroundColor: "#26302B", color: "white" }
                          : { borderColor: "#E4DDD1", backgroundColor: "white", color: "#26302B" }
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}

              {/* Guía de Tallas Colapsable */}
              {showSizeGuide && (
                <div
                  className="mt-3 p-3 rounded-xl text-xs leading-relaxed border"
                  style={{ backgroundColor: "#FAF7F2", borderColor: "#E4DDD1", color: "#8B7D6B" }}
                >
                  <p className="font-bold mb-1" style={{ color: "#26302B" }}>Guía de Tallas Guayabera</p>
                  <p>Talla 36 = Pecho 92cm | Talla 38 = Pecho 97cm | Talla 40 = Pecho 102cm</p>
                  <p>Talla 42 = Pecho 107cm | Talla 44 = Pecho 112cm | Talla 46 = Pecho 117cm</p>
                  <p className="mt-1 font-medium" style={{ color: "#C49A5A" }}>
                    ¿Dudas? Contáctanos por WhatsApp para asesoría personalizada.
                  </p>
                </div>
              )}
            </div>

            {/* Disponibilidad */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{
                backgroundColor: isOutOfStock ? "#FEF5F5" : "#F0F7F3",
                borderLeft: `3px solid ${isOutOfStock ? "#B85450" : "#3F7D58"}`,
              }}
            >
              <ShieldCheck
                className="w-4 h-4 shrink-0"
                style={{ color: isOutOfStock ? "#B85450" : "#3F7D58" }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: isOutOfStock ? "#B85450" : "#3F7D58" }}
              >
                {isOutOfStock
                  ? "Agotado en esta combinación"
                  : `Disponible · ${currentStock} pieza${currentStock !== 1 ? "s" : ""} en existencia`}
              </span>
            </div>
          </div>

          {/* Footer del modal: Cantidad + Doble Botón (Agregar al Pedido vs Comprar WhatsApp) */}
          <div
            className="p-5 border-t space-y-3 sticky bottom-0 bg-white"
            style={{ borderColor: "#EDE7DA" }}
          >
            {/* Selector de Cantidad */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: "#26302B" }}>Cantidad:</span>
              <div
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ backgroundColor: "#F5EFE3", border: "1px solid #E4DDD1" }}
              >
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold"
                  style={{ backgroundColor: "white", color: "#26302B" }}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className="w-8 text-center text-sm font-extrabold"
                  style={{ color: "#26302B" }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold"
                  style={{ backgroundColor: "#556B5D", color: "white" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dos Botones de Acción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Botón 1: Agregar a la Lista / Carrito */}
              <button
                onClick={handleAddToCartClick}
                disabled={isOutOfStock || availableSizes.length === 0 || addedSuccess}
                className="py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50 border"
                style={{
                  backgroundColor: addedSuccess ? "#EBF5F0" : "#F5EFE3",
                  color: addedSuccess ? "#3F7D58" : "#26302B",
                  borderColor: addedSuccess ? "#A7D7B9" : "#E4DDD1",
                }}
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#3F7D58]" />
                    ¡Agregado al Pedido!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-[#C49A5A]" />
                    Agregar a mi Lista
                  </>
                )}
              </button>

              {/* Botón 2: Comprar 1 Prenda por WhatsApp */}
              <button
                onClick={handleSendWhatsApp}
                disabled={isOutOfStock || availableSizes.length === 0}
                className="py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-white shadow-sm"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4" />
                Pedir 1 Prenda Directo
              </button>
            </div>

            {/* Íconos de confianza */}
            <div
              className="flex items-center justify-center gap-5 pt-1 text-[11px] font-semibold"
              style={{ color: "#8B7D6B" }}
            >
              <span className="flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-[#C49A5A]" />
                Artesanal
              </span>
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-[#C49A5A]" />
                Talla exacta
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#C49A5A]" />
                Envío MX
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
