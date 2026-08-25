"use client";

import { useState } from "react";
import { X, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Supplier } from "@/services/suppliers.service";

interface NewInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onInputCreated: (input: {
    name: string;
    category: "tela" | "boton" | "hilo" | "etiqueta" | "otro";
    unit: "metros" | "piezas" | "rollos" | "gramos";
    currentStock: number;
    minStock: number;
    costPerUnit: number;
    supplierId?: string;
  }) => Promise<void>;
}

export function NewInputModal({
  isOpen,
  onClose,
  suppliers,
  onInputCreated,
}: NewInputModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"tela" | "boton" | "hilo" | "etiqueta" | "otro">("tela");
  const [unit, setUnit] = useState<"metros" | "piezas" | "rollos" | "gramos">("metros");
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [supplierId, setSupplierId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    await onInputCreated({
      name: name.trim(),
      category,
      unit,
      currentStock: currentStock || 0,
      minStock: minStock || 0,
      costPerUnit: costPerUnit || 0,
      supplierId: supplierId || undefined,
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
            <Layers className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Nuevo Insumo / Materia Prima</h2>
              <p className="text-xs text-[#6B7A71]">Registro de telas, botones, hilos o insumos de confección</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Nombre del Insumo *
            </label>
            <input
              type="text"
              placeholder="Ej. Tela de Manta Fina Blanco 100% Algodón"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] font-semibold focus:outline-none focus:border-[#556B5D]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setCategory(cat);
                  if (cat === "tela") setUnit("metros");
                  else if (cat === "boton" || cat === "etiqueta") setUnit("piezas");
                  else if (cat === "hilo") setUnit("rollos");
                }}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              >
                <option value="tela">Tela / Textil</option>
                <option value="boton">Botón</option>
                <option value="hilo">Hilo de Coser/Bordar</option>
                <option value="etiqueta">Etiqueta / Empaque</option>
                <option value="otro">Otro Insumo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Unidad de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              >
                <option value="metros">Metros (m)</option>
                <option value="piezas">Piezas (pzas)</option>
                <option value="rollos">Rollos</option>
                <option value="gramos">Gramos (g)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Existencia Inicial
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={currentStock}
                onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] font-bold focus:outline-none focus:border-[#556B5D]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Stock Mínimo
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={minStock}
                onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Costo / Unidad ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] font-mono focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Proveedor Habitual (Opcional)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              <option value="">-- Sin Proveedor --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Insumo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
