"use client";

import { useState, useEffect } from "react";
import { X, Plus, Package, Factory } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inventoryService } from "@/services/inventory.service";
import type { Location } from "@/types/domain.types";

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onOrderCreated: (dto: {
    variantId: string;
    targetQuantity: number;
    assignedTo?: string;
    targetLocationId?: string;
    notes?: string;
  }) => Promise<void>;
}

export function NewOrderModal({
  isOpen,
  onClose,
  tenantId,
  onOrderCreated,
}: NewOrderModalProps) {
  const [variants, setVariants] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [targetQuantity, setTargetQuantity] = useState<number>(10);
  const [assignedTo, setAssignedTo] = useState("");
  const [targetLocationId, setTargetLocationId] = useState("");
  const [notes, setNotes] = useState("");
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
      if (vars.length > 0) setSelectedVariantId(vars[0].id);
      if (locs.length > 0) setTargetLocationId(locs[0].id);
      setLoadingOptions(false);
    }

    fetchOptions();
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId || targetQuantity <= 0) return;

    setSubmitting(true);
    await onOrderCreated({
      variantId: selectedVariantId,
      targetQuantity,
      assignedTo: assignedTo.trim() || undefined,
      targetLocationId: targetLocationId || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Nueva Orden de Producción</h2>
              <p className="text-xs text-[#6B7A71]">Lanza un lote de fabricación en taller</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Seleccionar Guayabera */}
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Guayabera / Modelo y Talla *
            </label>
            {loadingOptions ? (
              <p className="text-xs text-[#6B7A71]">Cargando guayaberas...</p>
            ) : (
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] font-semibold text-[#26302B] focus:outline-none focus:border-[#556B5D]"
                required
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.productName} ({v.colorName} / Talla {v.sizeName}) — SKU: {v.sku}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cantidad de Piezas */}
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Piezas a Producir (Lote) *
            </label>
            <input
              type="number"
              min={1}
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] font-bold focus:outline-none focus:border-[#556B5D]"
              required
            />
          </div>

          {/* Taller / Sastre Asignado */}
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Taller / Sastre / Maquilador Asignado
            </label>
            <input
              type="text"
              placeholder="Ej. Taller Mérida / Sastre Don Carlos..."
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          {/* Bodega Destino */}
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Bodega / Tienda donde se Recibirá el Stock
            </label>
            <select
              value={targetLocationId}
              onChange={(e) => setTargetLocationId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Notas / Especificaciones de Confección
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Usar alforzado de 10 alforzas frontales, hilo blanco reforzado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Lanzando..." : "Lanzar Orden a Taller"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
