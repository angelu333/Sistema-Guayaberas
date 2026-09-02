"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  DollarSign,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  quotesService,
  type QuoteRecord,
  type WholesaleTier,
  type CreateQuoteItemDTO,
} from "@/services/quotes.service";
import { productsService } from "@/services/products.service";
import type { ProductVariant } from "@/types/domain.types";

interface QuoteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteRecord | null;
  tenantId: string;
  tiers: WholesaleTier[];
  onQuoteUpdated: () => void;
}

interface EditableItem {
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitPrice: number;
}

export function QuoteEditModal({
  isOpen,
  onClose,
  quote,
  tenantId,
  tiers,
  onQuoteUpdated,
}: QuoteEditModalProps) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [status, setStatus] = useState<QuoteRecord["status"]>("draft");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selector para agregar más prendas a la cotización
  const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [addQty, setAddQty] = useState(1);

  useEffect(() => {
    if (isOpen && quote) {
      setStatus(quote.status);
      setNotes(quote.notes || "");
      setError(null);

      const mapped: EditableItem[] = quote.details.map((d) => ({
        variantId: d.variantId,
        sku: d.sku,
        productName: d.productName,
        colorName: d.colorName,
        sizeName: d.sizeName,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
      }));
      setItems(mapped);

      // Cargar variantes activas para el selector
      productsService.getProducts({ tenantId, isActive: true }).then((vars) => {
        setAllVariants(vars);
      });
    }
  }, [isOpen, quote]);

  if (!isOpen || !quote) return null;

  const totalPieces = items.reduce((acc, i) => acc + i.quantity, 0);
  const tierDiscountPercent = quotesService.calculateTierDiscount(totalPieces, tiers);
  const rawSubtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const discountAmount = rawSubtotal * (tierDiscountPercent / 100);
  const finalTotal = rawSubtotal - discountAmount;

  const handleAddVariant = () => {
    if (!selectedVariantId) return;
    const v = allVariants.find((varItem) => varItem.id === selectedVariantId);
    if (!v) return;

    // Verificar si ya existe en la lista
    const existingIndex = items.findIndex((i) => i.variantId === v.id);
    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + addQty } : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          variantId: v.id,
          sku: v.sku,
          productName: v.product?.name || "Guayabera",
          colorName: v.color?.name || null,
          sizeName: v.size?.name || null,
          quantity: addQty,
          unitPrice: v.salePrice,
        },
      ]);
    }
    setSelectedVariantId("");
    setAddQty(1);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: newQty } : item))
    );
  };

  const handleUpdateUnitPrice = (index: number, newPrice: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: newPrice } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      setError("La cotización debe incluir al menos una guayabera.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createDTOs: CreateQuoteItemDTO[] = items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));

      const resItems = await quotesService.updateQuoteItems(
        quote.id,
        tenantId,
        createDTOs,
        tiers,
        notes
      );

      if (!resItems.success) {
        setError(resItems.error || "Error al actualizar las prendas de la cotización.");
        setSaving(false);
        return;
      }

      if (status !== quote.status) {
        await quotesService.updateQuoteStatus(quote.id, status);
      }

      onQuoteUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-[Outfit]">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">
                Editar Cotización #{quote.quoteNumber}
              </h2>
              <p className="text-xs text-[#6B7A71]">Cliente: {quote.clientName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-[#FEF5F5] border border-[#F5CACA] rounded-xl text-[#B85450] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cambiar Estado de la Cotización */}
          <div className="p-4 bg-[#F8F6F1] rounded-2xl border border-[#DDD9D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-[#26302B] block">Estado de la Cotización</span>
              <span className="text-[11px] text-[#6B7A71]">
                Cambia el estado según el avance de la negociación con el cliente
              </span>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border bg-white text-[#26302B] border-[#DDD9D0] focus:border-[#556B5D] cursor-pointer"
            >
              <option value="draft">Borrador / Enviada</option>
              <option value="accepted">Aceptada por Cliente</option>
              <option value="rejected">Rechazada / No Finalizada</option>
              <option value="converted">Convertida a Venta (Cobrada)</option>
            </select>
          </div>

          {/* Selector para Agregar más Prendas */}
          <div className="p-4 bg-white border border-[#DDD9D0] rounded-2xl space-y-3">
            <span className="font-bold text-[#26302B] block uppercase tracking-wider text-[11px]">
              + Agregar más guayaberas a esta cotización
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DDD9D0] bg-[#FAF7F2] text-[#26302B] font-medium"
              >
                <option value="">-- Seleccionar modelo del inventario --</option>
                {allVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.product?.name} · {v.color?.name || "Estándar"} · Talla {v.size?.name || "S/T"} (${v.salePrice} MXN)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-2 text-xs font-bold text-center border border-[#DDD9D0] rounded-xl"
                />
                <Button size="sm" onClick={handleAddVariant} disabled={!selectedVariantId} className="bg-[#556B5D]">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla de Prendas en Cotización */}
          <div className="border border-[#DDD9D0] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F6F1] border-b border-[#DDD9D0] text-[11px] font-bold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Modelo / Guayabera</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#6B7A71]">
                      No hay prendas agregadas.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8F6F1]/50">
                      <td className="py-2.5 px-3 font-bold text-[#26302B]">
                        {item.productName}
                        <span className="block text-[10px] text-[#6B7A71] font-normal">
                          {item.colorName || "Estándar"} · Talla {item.sizeName || "S/T"} ({item.sku})
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 border border-[#DDD9D0] rounded-lg p-0.5 bg-[#FAF7F2]">
                          <button
                            onClick={() => handleUpdateQuantity(idx, Math.max(1, item.quantity - 1))}
                            className="w-5 h-5 flex items-center justify-center font-bold text-[#26302B]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-white bg-[#556B5D] rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="10"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateUnitPrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-right font-mono font-bold border border-[#DDD9D0] rounded-lg"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#3F7D58]">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-[#B85450] hover:bg-[#FEF5F5] rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Notas y Condiciones del PDF */}
          <div>
            <label className="font-bold text-[#26302B] block mb-1">
              Notas & Condiciones de Entrega (se imprimirán en el PDF)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ejemplo: El costo de envío no está incluido. Validez por 15 días. ¡Gracias por su preferencia!"
              className="w-full p-2.5 text-xs rounded-xl border border-[#DDD9D0] focus:border-[#556B5D] focus:outline-none"
            />
          </div>

          {/* Resumen Totales */}
          <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#DDD9D0] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#26302B]">
                Resumen: {totalPieces} prendas
              </span>
              {tierDiscountPercent > 0 && (
                <p className="text-[11px] text-[#3F7D58] font-bold">
                  Descuento de mayoreo ({tierDiscountPercent}%): -${discountAmount.toFixed(2)} MXN
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#6B7A71] block uppercase tracking-wider">Total Cotizado</span>
              <span className="text-xl font-extrabold text-[#3F7D58] font-mono">
                ${finalTotal.toFixed(2)} MXN
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#556B5D]">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
