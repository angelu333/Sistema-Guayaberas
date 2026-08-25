"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Layers,
  Plus,
  ScrollText,
  AlertTriangle,
  RefreshCw,
  Building2,
  DollarSign,
  Boxes,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  inputsService,
  type InputItem,
} from "@/services/inputs.service";
import { suppliersService, type Supplier } from "@/services/suppliers.service";
import { NewInputModal } from "@/components/insumos/NewInputModal";
import { RecipeBOMModal } from "@/components/insumos/RecipeBOMModal";

export default function InsumosPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modales
  const [isNewInputModalOpen, setIsNewInputModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

  // Modal para agregar stock de insumo
  const [stockIntakeInput, setStockIntakeInput] = useState<InputItem | null>(null);
  const [addQty, setAddQty] = useState<number>(10);
  const [updatingStock, setUpdatingStock] = useState(false);

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      const [inpData, supData] = await Promise.all([
        inputsService.getInputs(effectiveTenantId),
        suppliersService.getSuppliers(effectiveTenantId),
      ]);
      setInputs(inpData);
      setSuppliers(supData);
    } catch (err) {
      console.error("Error al cargar insumos:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Crear insumo
  const handleCreateInput = async (dto: any) => {
    if (!effectiveTenantId) return;
    const res = await inputsService.createInput(effectiveTenantId, dto);
    if (res.success) {
      await loadData();
    }
  };

  // Entrada de stock de insumo
  const handleConfirmStockIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockIntakeInput || addQty <= 0) return;

    setUpdatingStock(true);
    await inputsService.updateInputStock(stockIntakeInput.id, addQty);
    setUpdatingStock(false);
    setStockIntakeInput(null);
    await loadData();
  };

  // Filtrado por categoría
  const filteredInputs = inputs.filter((item) => {
    if (categoryFilter === "all") return true;
    return item.category === categoryFilter;
  });

  // Métricas
  const lowStockCount = inputs.filter((i) => i.currentStock <= i.minStock).length;
  const totalValuation = inputs.reduce((acc, i) => acc + i.currentStock * i.costPerUnit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Materias Primas, Insumos y Recetas (BOM)
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Control de telas, botones e hilos con consumo automático por modelo de guayabera
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsRecipeModalOpen(true)}>
            <ScrollText className="w-4 h-4 mr-1.5" />
            Configurar Recetas BOM
          </Button>

          <Button onClick={() => setIsNewInputModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Insumo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="border-l-4 border-l-[#556B5D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Insumos Registrados
            </span>
            <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
            {loading ? "..." : inputs.length}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">Telas, botones, hilos y etiquetas</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Alertas de Stock Bajo
            </span>
            <div className="p-2 bg-[#FBF4E8] text-[#C49A5A] rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
            {loading ? "..." : lowStockCount}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Por debajo del stock mínimo</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Valuación de Insumos
            </span>
            <div className="p-2 bg-[#EBF5F0] text-[#3F7D58] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
            {loading ? "..." : `$${totalValuation.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Costo total en materias primas</p>
        </Card>
      </div>

      {/* Filtros de Categoría */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-[#DDD9D0]">
        <span className="text-xs font-bold text-[#6B7A71] px-2 uppercase tracking-wider">Categoría:</span>
        <button
          onClick={() => setCategoryFilter("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            categoryFilter === "all"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setCategoryFilter("tela")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            categoryFilter === "tela"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Telas
        </button>
        <button
          onClick={() => setCategoryFilter("boton")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            categoryFilter === "boton"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Botones
        </button>
        <button
          onClick={() => setCategoryFilter("hilo")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            categoryFilter === "hilo"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Hilos
        </button>
        <button
          onClick={() => setCategoryFilter("etiqueta")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            categoryFilter === "etiqueta"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Etiquetas
        </button>
      </div>

      {/* Tabla de Insumos */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                <th className="py-3 px-4">Insumo</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-center">Existencia Actual</th>
                <th className="py-3 px-4 text-center">Stock Mínimo</th>
                <th className="py-3 px-4 text-right">Costo / Unidad</th>
                <th className="py-3 px-4 text-right">Valuación</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6B7A71]">
                    Cargando materias primas e insumos...
                  </td>
                </tr>
              ) : filteredInputs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7A71]">
                    No se encontraron insumos en esta categoría.
                  </td>
                </tr>
              ) : (
                filteredInputs.map((item) => {
                  const isLow = item.currentStock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#26302B]">{item.name}</span>
                        {item.supplierName && (
                          <span className="block text-[11px] text-[#6B7A71]">
                            Proveedor: {item.supplierName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <Badge variant="neutral">{item.category.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={isLow ? "text-[#B85450]" : "text-[#26302B]"}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-[#6B7A71]">
                        {item.minStock} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        ${item.costPerUnit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#3F7D58]">
                        ${(item.currentStock * item.costPerUnit).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStockIntakeInput(item);
                            setAddQty(10);
                          }}
                          className="text-xs py-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                          Entrada Stock
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Entrada de Stock de Insumo */}
      {stockIntakeInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
              <h2 className="text-base font-bold text-[#26302B]">Entrada de Insumo</h2>
              <button
                onClick={() => setStockIntakeInput(null)}
                className="p-1.5 text-[#6B7A71] hover:text-[#26302B]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmStockIntake} className="p-6 space-y-3 text-xs">
              <p className="font-bold text-[#26302B] text-sm">{stockIntakeInput.name}</p>
              <p className="text-[#6B7A71]">
                Stock actual: <strong>{stockIntakeInput.currentStock} {stockIntakeInput.unit}</strong>
              </p>

              <div>
                <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                  Cantidad a Ingresar ({stockIntakeInput.unit}) *
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={addQty}
                  onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white font-bold text-[#26302B] text-base focus:outline-none focus:border-[#556B5D]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
                <Button variant="outline" type="button" onClick={() => setStockIntakeInput(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatingStock}>
                  {updatingStock ? "Sumando..." : "Confirmar Entrada"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales */}
      <NewInputModal
        isOpen={isNewInputModalOpen}
        onClose={() => setIsNewInputModalOpen(false)}
        suppliers={suppliers}
        onInputCreated={handleCreateInput}
      />

      <RecipeBOMModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        tenantId={effectiveTenantId || ""}
        inputs={inputs}
        onRecipeSaved={loadData}
      />
    </div>
  );
}
