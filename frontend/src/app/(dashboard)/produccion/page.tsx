"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Factory,
  Plus,
  Settings2,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Shirt,
  Scissors,
  Layers,
  ScrollText,
  AlertTriangle,
  DollarSign,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  productionService,
  type ProductionStage,
  type ProductionOrder,
} from "@/services/production.service";
import { inputsService, type InputItem } from "@/services/inputs.service";
import { suppliersService, type Supplier } from "@/services/suppliers.service";
import { ProductionStageConfigModal } from "@/components/produccion/ProductionStageConfigModal";
import { NewOrderModal } from "@/components/produccion/NewOrderModal";
import { CompleteOrderModal } from "@/components/produccion/CompleteOrderModal";
import { NewInputModal } from "@/components/insumos/NewInputModal";
import { RecipeBOMModal } from "@/components/insumos/RecipeBOMModal";

export default function ProduccionPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"kanban" | "insumos">(
    tabParam === "insumos" ? "insumos" : "kanban"
  );

  // Estados Producción Kanban
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loadingProduction, setLoadingProduction] = useState(true);

  // Modales Producción
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderToComplete, setSelectedOrderToComplete] = useState<ProductionOrder | null>(null);
  const [finalStageToComplete, setFinalStageToComplete] = useState<ProductionStage | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // Estados Insumos
  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingInputs, setLoadingInputs] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isNewInputModalOpen, setIsNewInputModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [stockIntakeInput, setStockIntakeInput] = useState<InputItem | null>(null);
  const [addQty, setAddQty] = useState<number>(10);
  const [updatingStock, setUpdatingStock] = useState(false);

  const loadProductionData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingProduction(true);
    try {
      const [stageData, orderData] = await Promise.all([
        productionService.getProductionStages(effectiveTenantId),
        productionService.getProductionOrders(effectiveTenantId),
      ]);
      setStages(stageData);
      setOrders(orderData);
    } catch (err) {
      console.error("Error al cargar producción:", err);
    } finally {
      setLoadingProduction(false);
    }
  }, [effectiveTenantId]);

  const loadInputsData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingInputs(true);
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
      setLoadingInputs(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadProductionData();
    loadInputsData();
  }, [loadProductionData, loadInputsData]);

  function handleTabChange(tab: "kanban" | "insumos") {
    setActiveTab(tab);
    router.replace(`/produccion?tab=${tab}`);
  }

  // Avanzar orden Kanban
  const handleAdvanceStage = async (order: ProductionOrder) => {
    if (!stages || stages.length === 0) return;
    const currentIdx = stages.findIndex((s) => s.id === order.currentStageId);
    const nextStage = currentIdx !== -1 && currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;
    if (!nextStage) return;

    if (nextStage.isFinal) {
      setSelectedOrderToComplete(order);
      setFinalStageToComplete(nextStage);
      setIsCompleteModalOpen(true);
      return;
    }

    const res = await productionService.advanceOrderStage(order, nextStage);
    if (res.success) {
      await loadProductionData();
    }
  };

  const handleConfirmCompletion = async (
    order: ProductionOrder,
    finalStage: ProductionStage,
    completedQty: number
  ) => {
    const res = await productionService.advanceOrderStage(order, finalStage, completedQty);
    if (res.success) {
      await loadProductionData();
    }
  };

  const handleCreateOrder = async (dto: any) => {
    if (!effectiveTenantId) return;
    const res = await productionService.createProductionOrder({
      tenantId: effectiveTenantId,
      userId: session?.userId,
      ...dto,
    });
    if (res.success) {
      await loadProductionData();
    }
  };

  const handleSaveStages = async (updatedStages: any[]) => {
    if (!effectiveTenantId) return;
    await productionService.saveProductionStages(effectiveTenantId, updatedStages);
    await loadProductionData();
  };

  const handleCreateInput = async (dto: any) => {
    if (!effectiveTenantId) return;
    const res = await inputsService.createInput(effectiveTenantId, dto);
    if (res.success) {
      await loadInputsData();
    }
  };

  const handleConfirmStockIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockIntakeInput || addQty <= 0) return;
    setUpdatingStock(true);
    await inputsService.updateInputStock(stockIntakeInput.id, addQty);
    setUpdatingStock(false);
    setStockIntakeInput(null);
    await loadInputsData();
  };

  const activeOrders = orders.filter((o) => o.status === "in_progress");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalPiecesInCrafting = activeOrders.reduce((acc, o) => acc + o.targetQuantity, 0);

  const filteredInputs = inputs.filter((item) => {
    if (categoryFilter === "all") return true;
    return item.category === categoryFilter;
  });
  const lowStockCount = inputs.filter((i) => i.currentStock <= i.minStock).length;
  const totalValuation = inputs.reduce((acc, i) => acc + i.currentStock * i.costPerUnit, 0);

  return (
    <div className="space-y-6 font-[Outfit]">
      {/* Header General */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Taller y Producción
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Gestión de manufactura de guayaberas, insumos y recetas de confección
          </p>
        </div>

        {/* Acciones según pestaña */}
        {activeTab === "kanban" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsConfigModalOpen(true)}>
              <Settings2 className="w-4 h-4 mr-1.5" />
              Etapas Taller
            </Button>

            <Button onClick={() => setIsNewOrderModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Orden
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsRecipeModalOpen(true)}>
              <ScrollText className="w-4 h-4 mr-1.5" />
              Recetas BOM
            </Button>

            <Button onClick={() => setIsNewInputModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Insumo
            </Button>
          </div>
        )}
      </div>

      {/* Pestañas de Selector */}
      <div className="flex border-b border-[#E7E3DA] gap-6">
        <button
          onClick={() => handleTabChange("kanban")}
          className={`flex items-center gap-2 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === "kanban"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#8FA393] hover:text-[#26302B]"
          }`}
        >
          <Factory className="w-4 h-4" />
          Órdenes de Producción ({activeOrders.length} activas)
        </button>
        <button
          onClick={() => handleTabChange("insumos")}
          className={`flex items-center gap-2 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === "insumos"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#8FA393] hover:text-[#26302B]"
          }`}
        >
          <Layers className="w-4 h-4" />
          Materias Primas e Insumos ({inputs.length})
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: KANBAN DE PRODUCCIÓN */}
      {activeTab === "kanban" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#556B5D]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  Lotes en Taller
                </span>
                <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
                  <Factory className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loadingProduction ? "..." : activeOrders.length}
              </p>
              <p className="text-xs text-[#8FA393] mt-0.5">Órdenes activas en producción</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  Piezas en Confección
                </span>
                <div className="p-2 bg-[#FBF4E8] text-[#C49A5A] rounded-xl">
                  <Shirt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loadingProduction ? "..." : `${totalPiecesInCrafting.toLocaleString()} pzas`}
              </p>
              <p className="text-xs text-[#6B7A71] mt-0.5">Total en proceso de fabricación</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  Lotes Completados
                </span>
                <div className="p-2 bg-[#EBF5F0] text-[#3F7D58] rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
                {loadingProduction ? "..." : completedOrders.length}
              </p>
              <p className="text-xs text-[#6B7A71] mt-0.5">Prendas ingresadas a inventario</p>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#26302B] uppercase tracking-wider flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#556B5D]" />
                Tablero de Proceso de Taller
              </h2>
              <button
                onClick={loadProductionData}
                className="text-xs text-[#556B5D] hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProduction ? "animate-spin" : ""}`} />
                Actualizar Tablero
              </button>
            </div>

            {loadingProduction ? (
              <div className="py-16 text-center text-xs text-[#6B7A71]">
                Cargando tablero de producción...
              </div>
            ) : stages.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[#DDD9D0]">
                <p className="text-xs text-[#6B7A71]">No se encontraron etapas de taller configuradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
                {stages.map((st, idx) => {
                  const ordersInStage = activeOrders.filter((o) => o.currentStageId === st.id);
                  const isLastStage = idx === stages.length - 1;
                  const nextStageName = !isLastStage ? stages[idx + 1].name : "Ingresar a Stock";

                  return (
                    <div
                      key={st.id}
                      className="bg-white border border-[#DDD9D0] rounded-2xl p-3 flex flex-col min-h-[420px] shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#DDD9D0] pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#556B5D] text-white text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h3 className="text-xs font-bold text-[#26302B] truncate">{st.name}</h3>
                        </div>
                        <Badge variant={ordersInStage.length > 0 ? "primary" : "neutral"}>
                          {ordersInStage.length}
                        </Badge>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
                        {ordersInStage.length === 0 ? (
                          <div className="h-32 flex items-center justify-center text-[11px] text-[#9DAAA2] text-center italic border border-dashed border-[#E7E3DA] rounded-xl p-2">
                            Sin lotes en esta fase
                          </div>
                        ) : (
                          ordersInStage.map((ord) => (
                            <div
                              key={ord.id}
                              className="bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl p-3 space-y-2 hover:border-[#556B5D] transition-all shadow-2xs"
                            >
                              <div>
                                <span className="font-mono text-[10px] font-bold text-[#556B5D]">
                                  {ord.orderNumber}
                                </span>
                                <h4 className="text-xs font-bold text-[#26302B] leading-tight">
                                  {ord.productName}
                                </h4>
                                <p className="text-[11px] text-[#6B7A71] mt-0.5">
                                  {[ord.colorName, ord.sizeName ? `Talla ${ord.sizeName}` : null]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#DDD9D0]">
                                <span className="font-bold text-[#26302B]">
                                  Lote: {ord.targetQuantity} pzas
                                </span>
                                {ord.assignedTo && (
                                  <span className="text-[#8FA393] font-medium truncate max-w-[100px]">
                                    {ord.assignedTo}
                                  </span>
                                )}
                              </div>

                              {ord.notes && (
                                <p className="text-[10px] text-[#9DAAA2] italic line-clamp-1">
                                  Nota: {ord.notes}
                                </p>
                              )}

                              <button
                                onClick={() => handleAdvanceStage(ord)}
                                className="w-full mt-1 px-2.5 py-1.5 bg-[#556B5D] hover:bg-[#44564a] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>Avanzar a {nextStageName}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: INSUMOS Y MATERIAS PRIMAS */}
      {activeTab === "insumos" && (
        <div className="space-y-6">
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
                {loadingInputs ? "..." : inputs.length}
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
                {loadingInputs ? "..." : lowStockCount}
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
                {loadingInputs ? "..." : `$${totalValuation.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[#6B7A71] mt-0.5">Costo total en materias primas</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-[#DDD9D0]">
            <span className="text-xs font-bold text-[#6B7A71] px-2 uppercase tracking-wider">Categoría:</span>
            {["all", "tela", "boton", "hilo", "etiqueta"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  categoryFilter === cat
                    ? "bg-[#556B5D] text-white"
                    : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
                }`}
              >
                {cat === "all" ? "Todas" : cat.charAt(0).toUpperCase() + cat.slice(1) + "s"}
              </button>
            ))}
          </div>

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
                  {loadingInputs ? (
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
        </div>
      )}

      {/* Modales Producción */}
      <ProductionStageConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        stages={stages}
        onSave={handleSaveStages}
      />

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        tenantId={effectiveTenantId || ""}
        onOrderCreated={handleCreateOrder}
      />

      <CompleteOrderModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        order={selectedOrderToComplete}
        finalStage={finalStageToComplete}
        onConfirm={handleConfirmCompletion}
      />

      {/* Modales Insumos */}
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
                  className="w-full px-3 py-2 border border-[#DDD9D0] rounded-xl bg-white font-bold text-[#26302B] text-base focus:outline-none focus:border-[#556B5D]"
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
        onRecipeSaved={loadInputsData}
      />
    </div>
  );
}
