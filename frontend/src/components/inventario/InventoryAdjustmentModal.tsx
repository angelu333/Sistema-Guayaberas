"use client";

import { useState, useEffect } from "react";
import { X, Package, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { inventoryService, type StockItemView } from "@/services/inventory.service";
import type { Location } from "@/types/domain.types";
import { useTenantStore } from "@/stores/tenant.store";

interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVariantId?: string;
}

export function InventoryAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedVariantId,
}: InventoryAdjustmentModalProps) {
  const { tenant } = useTenantStore();
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(preselectedVariantId || "");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [movementType, setMovementType] = useState<"ENTRADA" | "AJUSTE" | "SALIDA">("ENTRADA");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenant?.id) {
      loadInitialData();
    }
  }, [isOpen, tenant?.id]);

  useEffect(() => {
    if (preselectedVariantId) {
      setSelectedVariantId(preselectedVariantId);
    }
  }, [preselectedVariantId]);

  useEffect(() => {
    if (filteredItems.length > 0) {
      const exists = filteredItems.some((it) => it.variantId === selectedVariantId);
      if (!exists) {
        setSelectedVariantId(filteredItems[0].variantId);
      }
    } else {
      setSelectedVariantId("");
    }
  }, [searchFilter, stockItems]);

  const loadInitialData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [locs, items] = await Promise.all([
        inventoryService.getLocations(tenant.id),
        inventoryService.getAllVariantsForAdjustment(tenant.id),
      ]);
      setLocations(locs);
      setStockItems(items);

      if (locs.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locs[0].id);
      }
      if (items.length > 0 && !selectedVariantId) {
        setSelectedVariantId(items[0].variantId);
      }
    } catch (err) {
      console.error("Error al cargar datos de inventario:", err);
      setErrorMsg("No se pudieron cargar los productos o ubicaciones.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = stockItems.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.colorName && item.colorName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (item.sizeName && item.sizeName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const selectedItem = stockItems.find((item) => item.variantId === selectedVariantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedVariantId || !selectedLocationId) {
      setErrorMsg("Selecciona un producto y una ubicación válida.");
      return;
    }
    if (quantity <= 0 && movementType !== "AJUSTE") {
      setErrorMsg("La cantidad debe ser mayor a 0.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await inventoryService.registerMovement({
      tenantId: tenant.id,
      variantId: selectedVariantId,
      locationId: selectedLocationId,
      type: movementType,
      quantity: Number(quantity),
      reason: reason.trim() || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || "Ocurrió un error al registrar el movimiento.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#DDD9D0] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#26302B]">
                Movimiento de Inventario
              </h2>
              <p className="text-xs text-[#6B7A71]">
                Registra entradas, mermas o ajustes manuales de stock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-[#B85450] bg-[#FAEAEA] border border-[#B85450]/20 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMovementType("ENTRADA")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                  movementType === "ENTRADA"
                    ? "bg-[#EBF5F0] border-[#3F7D58] text-[#3F7D58] shadow-xs"
                    : "bg-white border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Entrada
              </button>

              <button
                type="button"
                onClick={() => setMovementType("AJUSTE")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                  movementType === "AJUSTE"
                    ? "bg-[#FDF5E4] border-[#D89B2B] text-[#D89B2B] shadow-xs"
                    : "bg-white border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Ajuste Directo
              </button>

              <button
                type="button"
                onClick={() => setMovementType("SALIDA")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                  movementType === "SALIDA"
                    ? "bg-[#FAEAEA] border-[#B85450] text-[#B85450] shadow-xs"
                    : "bg-white border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Salida / Merma
              </button>
            </div>
          </div>

          {/* Buscador y Selección de Producto */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5">
              Producto / Variante
            </label>
            <input
              type="text"
              placeholder="Buscar por SKU o modelo..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full mb-2 px-3 py-1.5 text-xs border border-[#DDD9D0] rounded-lg focus:outline-none focus:border-[#556B5D]"
            />
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#DDD9D0] rounded-lg bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              required
            >
              {filteredItems.length === 0 ? (
                <option value="">No hay variantes encontradas</option>
              ) : (
                filteredItems.map((item) => (
                  <option key={item.variantId} value={item.variantId}>
                    {item.sku} — {item.productName} ({item.colorName || "N/A"} / {item.sizeName || "N/A"}) — Stock Actual: {item.quantity}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Ubicación / Bodega */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5">
              Ubicación / Almacén
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#DDD9D0] rounded-lg bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              required
            >
              {locations.length === 0 ? (
                <option value="">Bodega Principal</option>
              ) : (
                locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Cantidad y Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={movementType === "AJUSTE" ? "Nuevo Stock Total" : "Cantidad a Mover"}
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5">
                Motivo / Referencia
              </label>
              <input
                type="text"
                placeholder="Ej. Reabastecimiento taller, merma..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#DDD9D0] rounded-lg bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          {/* Preview del Stock resultante */}
          {selectedItem && (
            <div className="p-3 bg-[#F8F6F1] rounded-lg border border-[#E7E3DA] flex items-center justify-between text-xs text-[#6B7A71]">
              <span>Stock Actual: <strong className="text-[#26302B]">{selectedItem.quantity}</strong></span>
              <span>
                Resultado Estimado:{" "}
                <strong className="text-[#556B5D]">
                  {movementType === "ENTRADA"
                    ? selectedItem.quantity + Number(quantity)
                    : movementType === "SALIDA"
                    ? Math.max(0, selectedItem.quantity - Number(quantity))
                    : Number(quantity)}{" "}
                  unidades
                </strong>
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDD9D0]">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Guardar Movimiento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
