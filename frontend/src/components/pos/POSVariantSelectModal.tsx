"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, Shirt, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProductVariant } from "@/types/domain.types";

export interface GroupedPOSProduct {
  productId: string;
  name: string;
  categoryName: string | null;
  imageUrl: string | null;
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  availableColors: { name: string; hexCode: string | null }[];
  variants: ProductVariant[];
}

interface POSVariantSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: GroupedPOSProduct | null;
  onAddToCart: (variant: ProductVariant, quantity: number) => void;
}

export function POSVariantSelectModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
}: POSVariantSelectModalProps) {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  // Inicializar al abrir modal
  useEffect(() => {
    if (isOpen && product) {
      const firstColor = product.availableColors[0]?.name || "";
      setSelectedColor(firstColor);

      // Tallas disponibles para el primer color
      const sizes = product.variants
        .filter((v) => !firstColor || v.color?.name === firstColor)
        .map((v) => v.size?.name)
        .filter(Boolean) as string[];
      const unique = Array.from(new Set(sizes));
      setSelectedSize(unique[0] || "");
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const currentColor = selectedColor || product.availableColors[0]?.name || "";

  // Tallas reactivas que existen EXCLUSIVAMENTE para el color seleccionado
  const sizesForCurrentColor = product.variants
    .filter((v) => !currentColor || v.color?.name === currentColor)
    .map((v) => v.size?.name)
    .filter(Boolean) as string[];
  const availableSizes = Array.from(new Set(sizesForCurrentColor));

  const currentSize =
    selectedSize && availableSizes.includes(selectedSize)
      ? selectedSize
      : availableSizes[0] || "";

  // Encontrar la variante exacta
  const matchingVariant = product.variants.find(
    (v) =>
      (!currentColor || v.color?.name === currentColor) &&
      (!currentSize || v.size?.name === currentSize)
  );

  const price = matchingVariant ? matchingVariant.salePrice : product.minPrice;
  const stock = matchingVariant ? matchingVariant.totalStock ?? 0 : 0;
  const isOutOfStock = stock <= 0;

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    const validSizes = product.variants
      .filter((v) => v.color?.name === colorName)
      .map((v) => v.size?.name)
      .filter(Boolean) as string[];
    const unique = Array.from(new Set(validSizes));
    if (!unique.includes(selectedSize)) {
      setSelectedSize(unique[0] || "");
    }
  };

  const handleAdd = () => {
    if (!matchingVariant || isOutOfStock) return;
    onAddToCart(matchingVariant, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#556B5D] text-white flex items-center justify-center shadow-xs">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#26302B] font-[Outfit] leading-tight">
                {product.name}
              </h2>
              <span className="text-[11px] font-semibold text-[#556B5D] bg-[#EBF0EC] px-2 py-0.5 rounded-md">
                {product.categoryName || "Guayabera"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Foto + Precio */}
          <div className="flex items-center gap-4 p-3 bg-[#F8F6F1] rounded-2xl border border-[#DDD9D0]">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-[#DDD9D0] shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8FA393]">
                  <Shirt className="w-8 h-8 stroke-1" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-[#6B7A71] block font-mono">
                SKU: {matchingVariant?.sku || "Seleccione combinación"}
              </span>
              <span className="text-xl font-bold font-mono text-[#3F7D58]">
                ${price.toFixed(2)} MXN
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className={`w-3.5 h-3.5 ${isOutOfStock ? "text-[#B85450]" : "text-[#3F7D58]"}`} />
                <span className={`text-[11px] font-bold ${isOutOfStock ? "text-[#B85450]" : "text-[#3F7D58]"}`}>
                  {isOutOfStock ? "Agotado en esta talla" : `Stock disponible: ${stock} piezas`}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Selector de Color */}
          {product.availableColors.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#26302B]">
                1. Seleccione Color: <span className="font-normal text-[#556B5D] font-bold">{currentColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.availableColors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleColorSelect(c.name)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition-all ${
                      currentColor === c.name
                        ? "bg-[#556B5D] text-white border-[#556B5D] shadow-xs font-bold scale-105"
                        : "bg-white text-[#26302B] border-[#DDD9D0] hover:border-[#8FA393]"
                    }`}
                  >
                    {c.hexCode && (
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: c.hexCode }}
                      />
                    )}
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Selector Reactivo de Tallas */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#26302B]">
              2. Seleccione Talla disponible en {currentColor}:{" "}
              <span className="font-normal text-[#556B5D] font-bold">{currentSize}</span>
            </label>
            {availableSizes.length === 0 ? (
              <div className="p-2.5 bg-[#FAEAEA] border border-[#B85450]/20 rounded-xl flex items-center gap-2 text-xs text-[#B85450]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No hay tallas registradas en este color.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((sz) => {
                  const isSelected = currentSize === sz;
                  const v = product.variants.find(
                    (item) => item.color?.name === currentColor && item.size?.name === sz
                  );
                  const vStock = v?.totalStock ?? 0;

                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`min-w-[48px] h-10 px-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[#26302B] text-white border-[#26302B] shadow-md scale-105"
                          : "bg-white text-[#26302B] border-[#DDD9D0] hover:border-[#8FA393]"
                      }`}
                    >
                      <span>{sz}</span>
                      <span className={`text-[9px] ${isSelected ? "text-[#C49A5A]" : "text-[#8FA393]"}`}>
                        {vStock} pz
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Selector de Cantidad */}
          <div className="pt-2 border-t border-[#DDD9D0] flex items-center justify-between">
            <span className="text-xs font-bold text-[#26302B]">Cantidad a cobrar:</span>
            <div className="flex items-center gap-2 bg-[#F8F6F1] p-1 rounded-xl border border-[#DDD9D0]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-white text-[#26302B] font-bold flex items-center justify-center shadow-xs"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm font-mono px-3 min-w-[32px] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(stock > 0 ? stock : 99, q + 1))}
                className="w-8 h-8 rounded-lg bg-[#556B5D] text-white font-bold flex items-center justify-center shadow-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#DDD9D0] bg-[#F8F6F1] flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-[#3F7D58] hover:bg-[#326446] text-white font-bold"
            disabled={isOutOfStock || !matchingVariant}
            onClick={handleAdd}
          >
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            Cobrar ${(price * quantity).toFixed(2)}
          </Button>
        </div>
      </div>
    </div>
  );
}
