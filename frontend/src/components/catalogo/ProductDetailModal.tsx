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
  ZoomIn,
} from "lucide-react";
import type { PublicProductView } from "@/services/public-catalog.service";
import type { PublicCartItem } from "@/components/catalogo/PublicCartDrawer";
import { formatWhatsAppPhone } from "@/lib/utils/formatters";
import { ImageZoomModal } from "@/components/catalogo/ImageZoomModal";

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
  const [selectedSleeve, setSelectedSleeve] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setActiveImageIndex(0);
      const firstColor = product.availableColors[0] || "";
      setSelectedColor(firstColor);

      // Mangas disponibles para el primer color
      const sleeves = product.variants
        .filter((v) => !firstColor || v.colorName === firstColor)
        .map((v) => v.sleeveTypeName)
        .filter(Boolean) as string[];
      const uniqueSleeves = Array.from(new Set(sleeves));
      const firstSleeve = uniqueSleeves[0] || "";
      setSelectedSleeve(firstSleeve);

      // Tallas disponibles para primer color y primer tipo de manga
      const sizes = product.variants
        .filter(
          (v) =>
            (!firstColor || v.colorName === firstColor) &&
            (!firstSleeve || v.sleeveTypeName === firstSleeve)
        )
        .map((v) => v.sizeName)
        .filter(Boolean) as string[];
      const uniqueSizes = Array.from(new Set(sizes));
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

  // Mangas reactivas para el color seleccionado
  const sleevesForColor = product.variants
    .filter((v) => !currentColor || v.colorName === currentColor)
    .map((v) => v.sleeveTypeName)
    .filter(Boolean) as string[];
  const availableSleeves = Array.from(new Set(sleevesForColor));
  const currentSleeve =
    selectedSleeve && availableSleeves.includes(selectedSleeve)
      ? selectedSleeve
      : availableSleeves[0] || "";

  // Tallas reactivas para Color + Tipo de Manga
  const sizesForColorAndSleeve = product.variants
    .filter(
      (v) =>
        (!currentColor || v.colorName === currentColor) &&
        (!currentSleeve || v.sleeveTypeName === currentSleeve)
    )
    .map((v) => v.sizeName)
    .filter(Boolean) as string[];
  const availableSizes = Array.from(new Set(sizesForColorAndSleeve));

  const currentSize =
    selectedSize && availableSizes.includes(selectedSize)
      ? selectedSize
      : availableSizes[0] || "";

  // Variante exacta
  const matchingVariant = product.variants.find(
    (v) =>
      (!currentColor || v.colorName === currentColor) &&
      (!currentSleeve || v.sleeveTypeName === currentSleeve) &&
      (!currentSize || v.sizeName === currentSize)
  );

  const finalPrice = matchingVariant ? matchingVariant.salePrice : product.minPrice;
  const currentStock = matchingVariant ? matchingVariant.stock : 0;
  const isOutOfStock = matchingVariant ? matchingVariant.stock <= 0 : false;
  const isLowStock = currentStock > 0 && currentStock <= 3;

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    
    // Recalcular mangas disponibles
    const sleeves = product.variants
      .filter((v) => v.colorName === newColor)
      .map((v) => v.sleeveTypeName)
      .filter(Boolean) as string[];
    const uniqueSleeves = Array.from(new Set(sleeves));
    const newSleeve = uniqueSleeves.includes(selectedSleeve) ? selectedSleeve : uniqueSleeves[0] || "";
    setSelectedSleeve(newSleeve);

    // Recalcular tallas
    const validSizes = product.variants
      .filter((v) => v.colorName === newColor && (!newSleeve || v.sleeveTypeName === newSleeve))
      .map((v) => v.sizeName)
      .filter(Boolean) as string[];
    const unique = Array.from(new Set(validSizes));
    if (!unique.includes(selectedSize)) setSelectedSize(unique[0] || "");
  };

  const handleSleeveChange = (newSleeve: string) => {
    setSelectedSleeve(newSleeve);
    const validSizes = product.variants
      .filter((v) => (!currentColor || v.colorName === currentColor) && v.sleeveTypeName === newSleeve)
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
    if (!onAddToCart || !matchingVariant || isOutOfStock) return;

    onAddToCart({
      cartItemId: `${product.productId}-${currentColor}-${currentSleeve}-${currentSize}`,
      productId: product.productId,
      variantId: matchingVariant.variantId,
      productName: `${product.name}${currentSleeve ? ` (${currentSleeve})` : ""}`,
      colorName: currentColor,
      sizeName: currentSize,
      unitPrice: finalPrice,
      quantity,
      imageUrl: images[0] || product.imageUrl || null,
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleSendWhatsApp = () => {
    const rawPhone = tenantWhatsapp || "";
    const phone = formatWhatsAppPhone(rawPhone);
    if (!phone) {
      alert("No hay número de WhatsApp registrado.");
      return;
    }
    const totalAmount = (finalPrice * quantity).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    const message =
      `¡Hola ${tenantName}! Me interesa adquirir lo siguiente:\n\n` +
      `Guayabera: ${product.name}\n` +
      `Color: ${currentColor || "Estándar"}\n` +
      `Manga: ${currentSleeve || "Estándar"}\n` +
      `Talla: ${currentSize || "Estándar"}\n` +
      `Cantidad: ${quantity} pieza${quantity > 1 ? "s" : ""}\n` +
      `Total estimado: ${totalAmount} MXN\n\n` +
      `¿Tienen disponibilidad? ¿Hacen envíos?`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
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
        className="w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl bg-white animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            PANEL IZQUIERDO: CARRUSEL DE IMÁGENES + ZOOM
            ============================================================ */}
        <div
          className="relative w-full md:w-1/2 flex flex-col justify-between shrink-0"
          style={{ backgroundColor: "#F5EFE3", minHeight: "320px" }}
        >
          {/* Imagen Principal */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden aspect-3/4 md:aspect-auto">
            {images.length > 0 ? (
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-all duration-300 cursor-zoom-in"
                onClick={() => setIsZoomOpen(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#C49A5A] gap-2 p-8">
                <Shirt className="w-16 h-16 stroke-1" />
                <span className="text-xs text-[#8B7D6B]">Sin fotografía</span>
              </div>
            )}

            {/* Botón Lupa / Zoom */}
            {images.length > 0 && (
              <button
                onClick={() => setIsZoomOpen(true)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-white/80 backdrop-blur-xs text-[#26302B] hover:bg-white transition-colors shadow-xs cursor-pointer"
                title="Ampliar imagen"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            )}

            {/* Flechas Carrusel */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-xs text-[#26302B] hover:bg-white transition-colors shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-xs text-[#26302B] hover:bg-white transition-colors shadow-xs cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {images.length > 1 && (
            <div className="p-3 flex items-center justify-center gap-2 overflow-x-auto bg-black/5">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer"
                  style={{
                    borderColor: activeImageIndex === idx ? "#556B5D" : "transparent",
                    opacity: activeImageIndex === idx ? 1 : 0.6,
                  }}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            PANEL DERECHO: DETALLES, SELECCIÓN Y COMPRA
            ============================================================ */}
        <div className="w-full md:w-1/2 flex flex-col overflow-y-auto max-h-[92vh] bg-white">
          {/* Header */}
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "#EDE7DA" }}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B7D6B]">
              Detalle de Producto
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#FAF7F2] text-[#8B7D6B] hover:text-[#26302B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {/* Categoría y Título */}
            <div>
              {product.categoryName && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
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

            {/* 1. Selector de Color */}
            {product.availableColors.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2.5" style={{ color: "#26302B" }}>
                  1. Color:{" "}
                  <span className="font-normal text-[#556B5D] font-bold">{currentColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold border-2 transition-all cursor-pointer"
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

            {/* 2. Selector de Tipo de Manga (Corta / Larga) */}
            {availableSleeves.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2.5" style={{ color: "#26302B" }}>
                  2. Tipo de Manga:{" "}
                  <span className="font-normal text-[#556B5D] font-bold">{currentSleeve}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSleeves.map((slv) => (
                    <button
                      key={slv}
                      onClick={() => handleSleeveChange(slv)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer"
                      style={
                        currentSleeve === slv
                          ? { borderColor: "#26302B", backgroundColor: "#26302B", color: "white" }
                          : { borderColor: "#E4DDD1", backgroundColor: "white", color: "#26302B" }
                      }
                    >
                      {slv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Selector de Talla */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold" style={{ color: "#26302B" }}>
                  3. Talla ({currentColor}{currentSleeve ? ` · ${currentSleeve}` : ""}):{" "}
                  <span className="font-normal text-[#556B5D] font-bold">{currentSize}</span>
                </p>
                <button
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-[11px] font-bold underline underline-offset-2 cursor-pointer"
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
                  Sin tallas disponibles en esta combinación.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className="min-w-[48px] h-11 px-3 text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer"
                      style={
                        currentSize === size
                          ? { borderColor: "#556B5D", backgroundColor: "#556B5D", color: "white" }
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
                backgroundColor: isOutOfStock ? "#FEF5F5" : isLowStock ? "#FBF4E8" : "#F0F7F3",
                borderLeft: `3px solid ${isOutOfStock ? "#B85450" : isLowStock ? "#C49A5A" : "#3F7D58"}`,
              }}
            >
              <ShieldCheck
                className="w-4 h-4 shrink-0"
                style={{ color: isOutOfStock ? "#B85450" : isLowStock ? "#C49A5A" : "#3F7D58" }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: isOutOfStock ? "#B85450" : isLowStock ? "#C49A5A" : "#3F7D58" }}
              >
                {isOutOfStock
                  ? "Agotado en esta combinación"
                  : isLowStock
                  ? "Pocas piezas disponibles"
                  : "Disponible en existencia"}
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
                style={{ backgroundColor: "#FAF7F2", border: "1px solid #E4DDD1" }}
              >
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-white font-bold flex items-center justify-center shadow-xs cursor-pointer"
                  style={{ color: "#26302B" }}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm font-mono px-3 min-w-[32px] text-center" style={{ color: "#26302B" }}>
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(isOutOfStock ? 1 : 99, q + 1))}
                  className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center shadow-xs cursor-pointer"
                  style={{ backgroundColor: "#556B5D" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleAddToCartClick}
                disabled={isOutOfStock || !matchingVariant}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: addedSuccess ? "#3F7D58" : "#26302B" }}
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    ¡Agregado al Pedido!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Agregar al Pedido
                  </>
                )}
              </button>

              <button
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-98 cursor-pointer"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4" />
                Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Zoom */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        images={images}
        initialIndex={activeImageIndex}
        productName={product.name}
      />
    </div>
  );
}
