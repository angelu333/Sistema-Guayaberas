"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, PackageCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProductionOrder, ProductionStage } from "@/services/production.service";

interface CompleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  finalStage: ProductionStage | null;
  onConfirm: (order: ProductionOrder, finalStage: ProductionStage, completedQty: number) => Promise<void>;
}

export function CompleteOrderModal({
  isOpen,
  onClose,
  order,
  finalStage,
  onConfirm,
}: CompleteOrderModalProps) {
  const [completedQty, setCompletedQty] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setCompletedQty(order.targetQuantity);
    }
  }, [order]);

  if (!isOpen || !order || !finalStage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (completedQty < 0) return;

    setSubmitting(true);
    await onConfirm(order, finalStage, completedQty);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#EBF5F0]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#3F7D58]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Finalizar Lote e Ingresar a Inventario</h2>
              <p className="text-xs text-[#6B7A71]">Confirmación de prendas aprobadas en control de calidad</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl space-y-1">
            <span className="font-mono text-xs font-bold text-[#556B5D]">{order.orderNumber}</span>
            <p className="font-bold text-[#26302B] text-sm">{order.productName}</p>
            <p className="text-[#6B7A71]">
              {[order.colorName, order.sizeName ? `Talla ${order.sizeName}` : null].filter(Boolean).join(" / ")}
            </p>
            <p className="text-[#3F7D58] font-semibold mt-1">
              Piezas solicitadas originalmente: {order.targetQuantity} pzas
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Piezas Finales que Pasaron Control de Calidad *
            </label>
            <input
              type="number"
              min={0}
              max={order.targetQuantity * 2}
              value={completedQty}
              onChange={(e) => setCompletedQty(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] font-bold text-base focus:outline-none focus:border-[#556B5D]"
              required
            />
            <p className="text-[11px] text-[#6B7A71] mt-1">
              Estas piezas se sumarán automáticamente al stock en:{" "}
              <strong className="text-[#26302B]">{order.targetLocationName || "Bodega Principal"}</strong>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[#3F7D58] hover:bg-[#326446]">
              {submitting ? "Ingresando..." : "Confirmar e Ingresar a Inventario"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
