"use client";

import { useState, useEffect } from "react";
import { X, Sliders, ShieldCheck, Plus, Trash2, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { quotesService, type WholesaleTier } from "@/services/quotes.service";

interface WholesaleTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tiers: WholesaleTier[];
  onTiersUpdated: () => Promise<void>;
}

export function WholesaleTierModal({
  isOpen,
  onClose,
  tenantId,
  tiers: initialTiers,
  onTiersUpdated,
}: WholesaleTierModalProps) {
  const [editableTiers, setEditableTiers] = useState<
    { name: string; minQuantity: number; maxQuantity: number | null; discountPercent: number }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  // Cargar escalas iniciales
  useEffect(() => {
    if (isOpen) {
      setEditableTiers(
        initialTiers.map((t) => ({
          name: t.name,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          discountPercent: t.discountPercent,
        }))
      );
    }
  }, [isOpen, initialTiers]);

  if (!isOpen) return null;

  // Agregar nueva fila de escala
  const handleAddTier = () => {
    const lastMin = editableTiers.length > 0 ? editableTiers[editableTiers.length - 1].minQuantity + 10 : 1;
    setEditableTiers((prev) => [
      ...prev,
      {
        name: `Mayoreo ${lastMin} pzas`,
        minQuantity: lastMin,
        maxQuantity: lastMin + 15,
        discountPercent: 15,
      },
    ]);
  };

  // Eliminar escala
  const handleRemoveTier = (index: number) => {
    setEditableTiers((prev) => prev.filter((_, i) => i !== index));
  };

  // Guardar todas las escalas en Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSubmitting(true);
    const res = await quotesService.saveWholesaleTiers(tenantId, editableTiers);
    if (res.success) {
      await onTiersUpdated();
      onClose();
    } else {
      alert(res.error || "Error al guardar las escalas de mayoreo.");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Configurador de Escalas de Mayoreo</h2>
              <p className="text-xs text-[#6B7A71]">Agrega, edita o elimina las reglas de descuento por volumen de piezas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#3F7D58] shrink-0 mt-0.5" />
            <p className="text-[#26302B] text-xs leading-relaxed">
              El sistema evalúa la suma total de guayaberas de cada cotización y aplica el porcentaje de descuento automáticamente. Puedes definir escalas como <strong>20 a 50 pzas con 20% OFF</strong>.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#6B7A71] uppercase tracking-wider">
              Escalas de Descuento Registradas ({editableTiers.length})
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar Nueva Escala
            </Button>
          </div>

          {/* Tabla editable de Escalas */}
          <div className="space-y-2.5 border border-[#DDD9D0] rounded-xl p-3 bg-[#F8F6F1]">
            {editableTiers.length === 0 ? (
              <p className="text-center py-6 text-[#8FA393]">
                No hay escalas configuradas. Haz clic en "Agregar Nueva Escala".
              </p>
            ) : (
              editableTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-3 rounded-xl border border-[#DDD9D0]"
                >
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-bold text-[#6B7A71] uppercase">Nombre de la Escala</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditableTiers((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, name: val } : t))
                        );
                      }}
                      className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-bold text-[#26302B]"
                      placeholder="Ej. Mayoreo 20-50 pzas"
                      required
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-[10px] font-bold text-[#6B7A71] uppercase">Cant. Mínima</label>
                    <input
                      type="number"
                      min={1}
                      value={tier.minQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setEditableTiers((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, minQuantity: val } : t))
                        );
                      }}
                      className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-bold text-center"
                      required
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-[#6B7A71] uppercase">Cant. Máxima</label>
                    <input
                      type="number"
                      min={tier.minQuantity}
                      placeholder="Sin Límite"
                      value={tier.maxQuantity ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        setEditableTiers((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, maxQuantity: val } : t))
                        );
                      }}
                      className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-medium text-center text-[#6B7A71]"
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-[10px] font-bold text-[#6B7A71] uppercase">% Descuento</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={tier.discountPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditableTiers((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, discountPercent: val } : t))
                        );
                      }}
                      className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-mono font-bold text-right text-[#3F7D58]"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTier(idx)}
                    className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg transition-colors mt-3"
                    title="Eliminar escala"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Escalas"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
