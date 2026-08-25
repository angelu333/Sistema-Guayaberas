"use client";

import { useState, useEffect } from "react";
import { X, ShoppingBag, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inventoryService } from "@/services/inventory.service";
import type { Supplier, PurchaseItemDTO } from "@/services/suppliers.service";
import type { Location } from "@/types/domain.types";

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  suppliers: Supplier[];
  onPurchaseCreated: (
    supplierId: string | null,
    items: PurchaseItemDTO[],
    notes?: string
  ) => Promise<void>;
}

export function NewPurchaseModal({
  isOpen,
  onClose,
  tenantId,
  suppliers,
  onPurchaseCreated,
}: NewPurchaseModalProps) {
  const [variants, setVariants] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { variantId: string; quantity: number; unitCost: number; locationId: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    async function fetchOptions() {
      setLoadingOptions(true);
      const [vars, locs] = await Promise.all([
        inventoryService.getAllVariantsForAdjustment(tenantId),
        inventoryService.getLocations(tenantId),
      ]);
      setVariants(vars);
      setLocations(locs);
      if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);

      // Fila por defecto si hay variantes y ubicaciones
      if (vars.length > 0 && locs.length > 0) {
        setItems([
          {
            variantId: vars[0].id,
            quantity: 10,
            unitCost: Number(vars[0].costPrice || 250),
            locationId: locs[0].id,
          },
        ]);
      }
      setLoadingOptions(false);
    }

    fetchOptions();
  }, [isOpen, tenantId, suppliers]);

  if (!isOpen) return null;

  const handleAddItemRow = () => {
    if (variants.length === 0 || locations.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        variantId: variants[0].id,
        quantity: 10,
        unitCost: Number(variants[0].costPrice || 250),
        locationId: locations[0].id,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    await onPurchaseCreated(
      selectedSupplierId || null,
      items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        locationId: i.locationId,
      })),
      notes.trim() || undefined
    );
    setSubmitting(false);
    onClose();
  };

  const grandTotal = items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Nueva Orden de Compra</h2>
              <p className="text-xs text-[#6B7A71]">Registro de pedido a proveedor o taller externo</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Proveedor *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] font-semibold text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Notas / Folio de Factura
              </label>
              <input
                type="text"
                placeholder="Ej. Factura A-40291 / Entregar el viernes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          {/* Tabla de Productos a Comprar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#6B7A71] uppercase tracking-wider">
                Productos / Variantes a Comprar
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar Producto
              </Button>
            </div>

            {loadingOptions ? (
              <p className="text-xs text-[#6B7A71]">Cargando catálogo de productos...</p>
            ) : (
              <div className="space-y-2 border border-[#DDD9D0] rounded-xl p-3 bg-[#F8F6F1]">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-xl border border-[#DDD9D0]">
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
                                    unitCost: Number(found?.costPrice || 250),
                                  }
                                : row
                            )
                          );
                        }}
                        className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg bg-transparent font-medium"
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
                      <label className="block text-[10px] text-[#6B7A71]">Costo Unit ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitCost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, unitCost: val } : row))
                          );
                        }}
                        className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-mono text-right"
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-[10px] text-[#6B7A71]">Bodega Destino</label>
                      <select
                        value={item.locationId}
                        onChange={(e) => {
                          const locId = e.target.value;
                          setItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, locationId: locId } : row))
                          );
                        }}
                        className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg bg-transparent text-[#6B7A71]"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 text-right font-mono font-bold text-[#556B5D] text-xs pt-3">
                      ${(item.quantity * item.unitCost).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg transition-colors mt-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtotal Total */}
          <div className="flex items-center justify-between p-3 bg-[#EBF0EC] rounded-xl border border-[#DDD9D0]">
            <span className="font-bold text-[#26302B]">Inversión Total de la Compra:</span>
            <span className="text-lg font-bold font-mono text-[#3F7D58]">
              ${grandTotal.toFixed(2)} MXN
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Generando..." : "Crear Orden de Compra"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
