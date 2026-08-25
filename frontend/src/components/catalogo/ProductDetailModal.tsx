"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Check,
  Sparkles,
  Shirt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PublicProductView } from "@/services/public-catalog.service";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PublicProductView | null;
  tenantName?: string;
  tenantWhatsapp?: string | null;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  tenantName = "Guayabera Manager",
  tenantWhatsapp,
}: ProductDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  // Reiniciar selección al abrir modal con un nuevo producto
  useEffect(() => {
    if (isOpen && product) {
      setActiveImageIndex(0);
      const firstColor = product.availableColors[0] || "";
      setSelectedColor(firstColor);

      // Calcular tallas para el primer color
      const sizesForFirstColor = product.variants
        .filter((v) => !firstColor || v.colorName === firstColor)
        .map((v) => v.sizeName)
        .filter(Boolean) as string[];
      const uniqueSizes = Array.from(new Set(sizesForFirstColor));
      setSelectedSize(uniqueSizes[0] || "");
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Lista de imágenes para el carrusel (galería o imagen principal)
  const images =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.url)
      : product.imageUrl
      ? [product.imageUrl]
      : [];

  const currentColor = selectedColor || product.availableColors[0] || "";

  // TALLAS DINÁMICAS Y REACTIVAS DEPENDIENTES DEL COLOR SELECCIONADO
  const sizesForCurrentColor = product.variants
    .filter((v) => !currentColor || v.colorName === currentColor)
    .map((v) => v.sizeName)
    .filter(Boolean) as string[];
  const availableSizes = Array.from(new Set(sizesForCurrentColor));

  // Talla activa actual (si la seleccionada no existe en este color, usar la primera disponible)
  const currentSize =
    selectedSize && availableSizes.includes(selectedSize)
      ? selectedSize
      : availableSizes[0] || "";

  // Encontrar variante específica para calcular stock y precio exacto
  const matchingVariant = product.variants.find(
    (v) =>
      (!currentColor || v.colorName === currentColor) &&
      (!currentSize || v.sizeName === currentSize)
  );

  const finalPrice = matchingVariant ? matchingVariant.salePrice : product.minPrice;
  const currentStock = matchingVariant ? matchingVariant.stock : 0;
  const isOutOfStock = matchingVariant ? matchingVariant.stock <= 0 : false;

  // Al cambiar de color, actualizar color y validar talla
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    const validSizes = product.variants
      .filter((v) => v.colorName === newColor)
      .map((v) => v.sizeName)
      .filter(Boolean) as string[];
    const unique = Array.from(new Set(validSizes));
    if (!unique.includes(selectedSize)) {
      setSelectedSize(unique[0] || "");
    }
  };

  // Navegación del carrusel
  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Enviar pedido a WhatsApp
  const handleSendWhatsApp = () => {
    const phone = tenantWhatsapp || "529991234567";
    const totalAmount = (finalPrice * quantity).toFixed(2);
    const message = `¡Hola ${tenantName}! Me interesa adquirir la *${product.name}*:
- Color: *${currentColor || "Estándar"}*
- Talla: *${currentSize || "Estándar"}*
- Cantidad: *${quantity} pieza${quantity > 1 ? "s" : ""}*
- Total estimado: *$${totalAmount} MXN*

¿Tienen disponibilidad para entrega o envío?`;

    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Lado Izquierdo: Carrusel de Fotos Interactivo */}
        <div className="w-full md:w-1/2 bg-[#F8F6F1] flex flex-col justify-between p-4 border-b md:border-b-0 md:border-r border-[#DDD9D0]">
          {/* Contenedor de Foto Grande */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#DDD9D0] shadow-xs group">
            {images.length > 0 ? (
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#8FA393] gap-2">
                <Shirt className="w-16 h-16 stroke-1" />
                <span className="text-xs">Sin fotografía</span>
              </div>
            )}

            {/* Flechas de Navegación del Carrusel */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#26302B] shadow-md flex items-center justify-center transition-all opacity-80 hover:opacity-100"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#26302B] shadow-md flex items-center justify-center transition-all opacity-80 hover:opacity-100"
                  title="Siguiente foto"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Badge de Conteo de Fotos */}
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  {activeImageIndex + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Tira de Miniaturas (Thumbnails) */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIndex === idx
                      ? "border-[#556B5D] ring-2 ring-[#556B5D]/30 scale-105"
                      : "border-[#DDD9D0] opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lado Derecho: Detalles de la Guayabera & Selector de Pedido */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto space-y-4">
          <div>
            {/* Header / Cerrar */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#556B5D] bg-[#EBF0EC] px-2.5 py-0.5 rounded-md">
                  {product.categoryName || "Guayabera Fina"}
                </span>
                <h2 className="text-xl font-extrabold text-[#26302B] font-[Outfit] mt-1 tracking-tight">
                  {product.name}
                </h2>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#F8F6F1] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Precio */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#3F7D58] font-mono">
                ${finalPrice.toFixed(2)} MXN
              </span>
              {product.maxPrice > product.minPrice && (
                <span className="text-xs text-[#8FA393]">
                  (Precios desde ${product.minPrice.toFixed(2)})
                </span>
              )}
            </div>

            {/* Descripción */}
            {product.description && (
              <p className="text-xs text-[#6B7A71] mt-2 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Selector de Color */}
            {product.availableColors.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <label className="block text-xs font-bold text-[#26302B]">
                  Color: <span className="font-normal text-[#6B7A71]">{currentColor}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {product.availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`px-3 py-1 text-xs font-medium rounded-xl border transition-all ${
                        currentColor === color
                          ? "bg-[#556B5D] text-white border-[#556B5D] shadow-xs font-bold"
                          : "bg-[#F8F6F1] text-[#26302B] border-[#DDD9D0] hover:border-[#8FA393]"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector Reactivo de Tallas (Solo tallas que existen en el color actual) */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#26302B]">
                  Talla disponible en {currentColor}:{" "}
                  <span className="font-normal text-[#556B5D] font-bold">{currentSize}</span>
                </label>
              </div>
              {availableSizes.length === 0 ? (
                <p className="text-xs text-[#B85450] bg-[#FAEAEA] p-2 rounded-xl border border-[#B85450]/20">
                  Sin tallas registradas en este color.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[42px] h-9 px-2 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${
                        currentSize === size
                          ? "bg-[#26302B] text-white border-[#26302B] shadow-xs scale-105"
                          : "bg-[#F8F6F1] text-[#26302B] border-[#DDD9D0] hover:border-[#8FA393]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Estado de Stock en Tiempo Real */}
            <div className="mt-4 flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${isOutOfStock ? "text-[#B85450]" : "text-[#3F7D58]"}`} />
              <span className={`text-xs font-bold ${isOutOfStock ? "text-[#B85450]" : "text-[#3F7D58]"}`}>
                {isOutOfStock
                  ? "Agotado en esta combinación"
                  : `Disponible en tienda (${currentStock} piezas en existencia)`}
              </span>
            </div>
          </div>

          {/* Selector de Cantidad y Botón de WhatsApp */}
          <div className="pt-4 border-t border-[#DDD9D0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#26302B]">Cantidad a pedir:</span>
              <div className="flex items-center gap-2 bg-[#F8F6F1] p-1 rounded-xl border border-[#DDD9D0]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-white text-[#26302B] font-bold flex items-center justify-center shadow-xs"
                >
                  -
                </button>
                <span className="font-bold text-xs font-mono px-2 min-w-[24px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-7 h-7 rounded-lg bg-[#556B5D] text-white font-bold flex items-center justify-center shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            <Button
              onClick={handleSendWhatsApp}
              disabled={isOutOfStock || availableSizes.length === 0}
              className="w-full bg-[#3F7D58] hover:bg-[#326446] text-white py-2.5 font-bold shadow-md flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Pedir por WhatsApp — ${(finalPrice * quantity).toFixed(2)} MXN
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
