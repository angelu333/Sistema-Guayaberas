"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ProductionStage } from "@/services/production.service";

interface ProductionStageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: ProductionStage[];
  onSave: (
    updatedStages: { id?: string; name: string; sortOrder: number; isFinal?: boolean }[]
  ) => Promise<void>;
}

export function ProductionStageConfigModal({
  isOpen,
  onClose,
  stages,
  onSave,
}: ProductionStageConfigModalProps) {
  const [stageList, setStageList] = useState<
    { id?: string; name: string; isFinal: boolean }[]
  >([]);
  const [newStageName, setNewStageName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStageList(
      stages.map((s) => ({
        id: s.id,
        name: s.name,
        isFinal: s.isFinal,
      }))
    );
  }, [stages]);

  if (!isOpen) return null;

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    setStageList((prev) => [
      ...prev,
      { name: newStageName.trim(), isFinal: false },
    ]);
    setNewStageName("");
  };

  const handleRemoveStage = (index: number) => {
    if (stageList.length <= 1) return;
    setStageList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setStageList((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === stageList.length - 1) return;
    setStageList((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleSaveAll = async () => {
    if (stageList.length === 0) return;
    setSaving(true);

    const formatted = stageList.map((s, idx) => ({
      id: s.id,
      name: s.name,
      sortOrder: idx + 1,
      isFinal: idx === stageList.length - 1, // La ultima siempre es la final
    }));

    await onSave(formatted);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Configurar Etapas del Taller</h2>
              <p className="text-xs text-[#6B7A71]">Agrega, renombrar o cambia el orden del proceso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Agregar Nueva Etapa */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva etapa (ej. Lavado, Deshebrado)..."
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              className="flex-1 px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white focus:outline-none focus:border-[#556B5D]"
            />
            <Button size="sm" onClick={handleAddStage}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>

          {/* Lista de Etapas Reordenables */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Secuencia del Proceso de Confección
            </p>

            <div className="divide-y divide-[#DDD9D0] border border-[#DDD9D0] rounded-xl overflow-hidden bg-[#F8F6F1]">
              {stageList.map((st, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === stageList.length - 1;

                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#EBF0EC] text-[#556B5D] font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStageList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                          );
                        }}
                        className="text-xs font-bold text-[#26302B] bg-transparent border-b border-transparent hover:border-[#556B5D] focus:border-[#556B5D] focus:outline-none px-1 py-0.5"
                      />
                      {isLast && <Badge variant="success">Final (Ingreso a Stock)</Badge>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={isFirst}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isFirst ? "text-[#DDD9D0] border-transparent" : "text-[#556B5D] hover:bg-[#F8F6F1] border-[#DDD9D0]"
                        }`}
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={isLast}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isLast ? "text-[#DDD9D0] border-transparent" : "text-[#556B5D] hover:bg-[#F8F6F1] border-[#DDD9D0]"
                        }`}
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRemoveStage(idx)}
                        disabled={stageList.length <= 1}
                        className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg transition-colors ml-1"
                        title="Eliminar etapa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#DDD9D0] bg-[#F8F6F1]">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </div>
    </div>
  );
}
