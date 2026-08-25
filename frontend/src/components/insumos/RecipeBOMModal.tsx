"use client";

import { useState, useEffect } from "react";
import { X, ScrollText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { inputsService, type InputItem } from "@/services/inputs.service";

interface ProductSimple {
  id: string;
  name: string;
  categoryName?: string;
}

interface RecipeBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  inputs: InputItem[];
  onRecipeSaved: () => Promise<void>;
}

export function RecipeBOMModal({
  isOpen,
  onClose,
  tenantId,
  inputs,
  onRecipeSaved,
}: RecipeBOMModalProps) {
  const [products, setProducts] = useState<ProductSimple[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const [recipeLines, setRecipeLines] = useState<
    { insumoId: string; quantityNeeded: number; notes: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  // Cargar productos directamente de Supabase
  useEffect(() => {
    if (!isOpen || !tenantId) return;

    async function fetchProducts() {
      setLoadingProducts(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("productos")
        .select("id, name, categorias(name)")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      const list: ProductSimple[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        categoryName: p.categorias?.name || "Guayabera",
      }));

      setProducts(list);
      if (list.length > 0) {
        setSelectedProductId(list[0].id);
      }
      setLoadingProducts(false);
    }

    fetchProducts();
  }, [isOpen, tenantId]);

  // Cargar receta del producto seleccionado
  useEffect(() => {
    if (!selectedProductId || !tenantId) return;

    async function fetchRecipe() {
      setLoadingRecipe(true);
      const existing = await inputsService.getProductionRecipes(tenantId, selectedProductId);
      if (existing.length > 0) {
        setRecipeLines(
          existing.map((e) => ({
            insumoId: e.insumoId,
            quantityNeeded: e.quantityNeeded,
            notes: e.notes || "",
          }))
        );
      } else {
        if (inputs.length > 0) {
          setRecipeLines([
            { insumoId: inputs[0].id, quantityNeeded: 2.5, notes: "Metros de tela por guayabera" },
          ]);
        } else {
          setRecipeLines([]);
        }
      }
      setLoadingRecipe(false);
    }

    fetchRecipe();
  }, [selectedProductId, tenantId, inputs]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    if (inputs.length === 0) return;
    setRecipeLines((prev) => [
      ...prev,
      { insumoId: inputs[0].id, quantityNeeded: 1, notes: "" },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setRecipeLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setSubmitting(true);
    await inputsService.saveProductionRecipe(tenantId, selectedProductId, recipeLines);
    await onRecipeSaved();
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Receta de Confección (BOM)</h2>
              <p className="text-xs text-[#6B7A71]">Define el consumo de insumos por modelo de guayabera</p>
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
          {/* Seleccionar Modelo */}
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Modelo de Guayabera *
            </label>
            {loadingProducts ? (
              <p className="text-xs text-[#6B7A71]">Cargando modelos...</p>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] font-bold text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.categoryName || "Guayabera"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Lineas de Insumos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#6B7A71] uppercase tracking-wider">
                Insumos consumidos por cada 1 guayabera producida
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar Insumo
              </Button>
            </div>

            {loadingRecipe ? (
              <p className="text-xs text-[#6B7A71]">Cargando receta del modelo...</p>
            ) : recipeLines.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[#DDD9D0] rounded-xl text-[#8FA393]">
                Este modelo no tiene insumos asignados aún.
              </div>
            ) : (
              <div className="space-y-2 border border-[#DDD9D0] rounded-xl p-3 bg-[#F8F6F1]">
                {recipeLines.map((line, idx) => {
                  const selectedInsumo = inputs.find((i) => i.id === line.insumoId);
                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-xl border border-[#DDD9D0]"
                    >
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-[10px] text-[#6B7A71]">Insumo / Materia Prima</label>
                        <select
                          value={line.insumoId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRecipeLines((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, insumoId: val } : r))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg bg-transparent font-medium"
                        >
                          {inputs.map((inp) => (
                            <option key={inp.id} value={inp.id}>
                              {inp.name} ({inp.category} - {inp.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <label className="block text-[10px] text-[#6B7A71]">
                          Consumo ({selectedInsumo?.unit || "unidad"})
                        </label>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={line.quantityNeeded}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.01;
                            setRecipeLines((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, quantityNeeded: val } : r))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg font-bold text-center"
                        />
                      </div>

                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] text-[#6B7A71]">Notas (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ej. Solo tela frontal"
                          value={line.notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRecipeLines((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, notes: val } : r))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs border border-[#DDD9D0] rounded-lg text-[#6B7A71]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
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

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Receta BOM"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
