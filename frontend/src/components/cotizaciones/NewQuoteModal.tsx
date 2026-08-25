"use client";

import { useState, useEffect } from "react";
import { X, FileText, Plus, Trash2, Tag, Percent } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inventoryService } from "@/services/inventory.service";
import { quotesService, type WholesaleTier, type CreateQuoteItemDTO } from "@/services/quotes.service";

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tiers: WholesaleTier[];
  onQuoteCreated: (
    clientName: string,
    clientPhone: string | null,
    items: CreateQuoteItemDTO[],
    notes?: string,
    validDays?: number
  ) => Promise<void>;
}

export function NewQuoteModal({
  isOpen,
  onClose,
  tenantId,
  tiers,
  onQuoteCreated,
}: NewQuoteModalProps) {
  const [variants, setVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [validDays, setValidDays] = useState(15);
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<{ variantId: string; quantity: number; unitPrice: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    async function fetchVariants() {
      setLoadingVariants(true);
      const vars = await inventoryService.getAllVariantsForAdjustment(tenantId);
      setVariants(vars);
      if (vars.length > 0) {
        setItems([
          {
            variantId: vars[0].id,
            quantity: 12,
            unitPrice: Number(vars[0].salePrice || 450),
          },
        ]);
      }
      setLoadingVariants(false);
    }

    fetchVariants();
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (variants.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        variantId: variants[0].id,
        quantity: 5,
        unitPrice: Number(variants[0].salePrice || 450),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculos en tiempo real
  const totalPieces = items.reduce((acc, i) => acc + i.quantity, 0);
  const activeDiscountPercent = quotesService.calculateTierDiscount(totalPieces, tiers);
  const rawSubtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const finalTotal = rawSubtotal * (1 - activeDiscountPercent / 100);
  const totalSavings = rawSubtotal - finalTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || items.length === 0) return;

    setSubmitting(true);
    await onQuoteCreated(
      clientName.trim(),
      clientPhone.trim() || null,
      items,
      notes.trim() || undefined,
      validDays
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Nueva Cotización de Mayoreo</h2>
              <p className="text-xs text-[#6B7A71]">Presupuesto automático con descuentos por escala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Nombre del Cliente / Empresa *
              </label>
              <input
                type="text"
                placeholder="Ej. Hotel Fiesta Americana / Don Carlos"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white font-bold text-[#26302B] focus:outline-none focus:border-[#556B5D]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                placeholder="999 123 4567"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          {/* Banner en tiempo real de escala de mayoreo */}
          <div className="p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#3F7D58]" />
              <div>
                <span className="font-bold text-[#26302B] block">
                  Total Guayaberas Solicitadas: {totalPieces} pzas
                </span>
                <span className="text-[11px] text-[#6B7A71]">
                  Descuento por escala asignado: <strong>{activeDiscountPercent}% OFF</strong>
                </span>
              </div>
            </div>

            {totalSavings > 0 && (
              <span className="text-xs font-bold text-[#3F7D58] bg-white px-2.5 py-1 rounded-lg border border-[#A7D7B9] font-mono">
                Ahorro: -${totalSavings.toFixed(2)} MXN
              </span>
            )}
          </div>

          {/* Tabla de Productos a Cotizar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#6B7A71] uppercase tracking-wider">
                Modelos / Guayaberas a Cotizar
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar Modelo
              </Button>
            </div>

            {loadingVariants ? (
              <p className="text-xs text-[#6B7A71]">Cargando catálogo de variantes...</p>
            ) : (
              <div className="space-y-2 border border-[#DDD9D0] rounded-xl p-3 bg-[#F8F6F1]">
                {items.map((item, idx) => {
                  const finalUnitPrice = item.unitPrice * (1 - activeDiscountPercent / 100);
                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-xl border border-[#DDD9D0]"
                    >
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-[10px] text-[#6B7A71]">Guayabera / Modelo</label>
                        <select
                          value={item.variantId}
                          onChange={(e) => {
                            const vId = e.target.value;
                            const found = variants.find((v) => v.id === vId);
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx
                                  ? {
                                      ...row,
                                      variantId: vId,
                                      unitPrice: Number(found?.salePrice || 450),
                                    }
                                  : row
                              )
                            );
                          }}
                          className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg bg-transparent font-medium text-[#26302B]"
                        >
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.productName} ({v.colorName} / T. {v.sizeName}) — SKU: {v.sku}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <label className="block text-[10px] text-[#6B7A71]">Cant.</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setItems((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, quantity: val } : row))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-bold text-center"
                        />
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] text-[#6B7A71]">Precio Reg.</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItems((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, unitPrice: val } : row))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-mono text-right text-[#8FA393]"
                        />
                      </div>

                      <div className="w-24 text-right">
                        <label className="block text-[10px] text-[#6B7A71]">P. Mayoreo</label>
                        <span className="font-mono font-bold text-[#3F7D58] text-xs pt-1 block">
                          ${finalUnitPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="w-24 text-right font-mono font-bold text-[#26302B] text-xs pt-3">
                        ${(item.quantity * finalUnitPrice).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg transition-colors mt-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Vigencia de la Cotización (Días)
              </label>
              <select
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              >
                <option value={7}>7 días (1 semana)</option>
                <option value={15}>15 días (Recomendado)</option>
                <option value={30}>30 días (1 mes)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Notas / Anticipo / Condiciones
              </label>
              <input
                type="text"
                placeholder="Ej. Anticipo del 50% para iniciar confección..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          {/* Subtotal y Total */}
          <div className="flex items-center justify-between p-3.5 bg-[#EBF0EC] rounded-xl border border-[#DDD9D0]">
            <div>
              <span className="font-bold text-[#26302B] block">Total Estimado de la Cotización:</span>
              <span className="text-xs text-[#6B7A71]">
                {totalPieces} piezas con {activeDiscountPercent}% de descuento de mayoreo
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-[#3F7D58]">
              ${finalTotal.toFixed(2)} MXN
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Generando..." : "Crear Cotización"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
