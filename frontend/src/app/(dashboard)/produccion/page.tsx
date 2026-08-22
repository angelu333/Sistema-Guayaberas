"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Factory,
  Plus,
  Settings2,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Clock,
  Shirt,
  Scissors,
  Check,
  Package,
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
import { ProductionStageConfigModal } from "@/components/produccion/ProductionStageConfigModal";
import { NewOrderModal } from "@/components/produccion/NewOrderModal";
import { CompleteOrderModal } from "@/components/produccion/CompleteOrderModal";

export default function ProduccionPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  const [selectedOrderToComplete, setSelectedOrderToComplete] = useState<ProductionOrder | null>(null);
  const [finalStageToComplete, setFinalStageToComplete] = useState<ProductionStage | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Avanzar orden a la siguiente etapa
  const handleAdvanceStage = async (order: ProductionOrder) => {
    if (!stages || stages.length === 0) return;

    // Buscar indice de la etapa actual
    const currentIdx = stages.findIndex((s) => s.id === order.currentStageId);
    const nextStage = currentIdx !== -1 && currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;

    if (!nextStage) return;

    // Si la etapa siguiente es la FINAL ("Terminado"), abrir modal para confirmar piezas recibidas
    if (nextStage.isFinal) {
      setSelectedOrderToComplete(order);
      setFinalStageToComplete(nextStage);
      setIsCompleteModalOpen(true);
      return;
    }

    // Avanzar etapa intermedia
    const res = await productionService.advanceOrderStage(order, nextStage);
    if (res.success) {
      await loadData();
    }
  };

  // Confirmar finalización de lote
  const handleConfirmCompletion = async (
    order: ProductionOrder,
    finalStage: ProductionStage,
    completedQty: number
  ) => {
    const res = await productionService.advanceOrderStage(order, finalStage, completedQty);
    if (res.success) {
      await loadData();
    }
  };

  // Guardar nueva orden
  const handleCreateOrder = async (dto: {
    variantId: string;
    targetQuantity: number;
    assignedTo?: string;
    targetLocationId?: string;
    notes?: string;
  }) => {
    if (!effectiveTenantId) return;
    const res = await productionService.createProductionOrder({
      tenantId: effectiveTenantId,
      userId: session?.userId,
      ...dto,
    });

    if (res.success) {
      await loadData();
    }
  };

  // Guardar configuracion de etapas
  const handleSaveStages = async (
    updatedStages: { id?: string; name: string; sortOrder: number; isFinal?: boolean }[]
  ) => {
    if (!effectiveTenantId) return;
    await productionService.saveProductionStages(effectiveTenantId, updatedStages);
    await loadData();
  };

  // Métricas rápidas
  const activeOrders = orders.filter((o) => o.status === "in_progress");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalPiecesInCrafting = activeOrders.reduce((acc, o) => acc + o.targetQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Órdenes de Producción y Taller
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Flujo de manufactura de guayaberas y control de etapas de confección
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsConfigModalOpen(true)}>
            <Settings2 className="w-4 h-4 mr-1.5" />
            Configurar Etapas del Taller
          </Button>

          <Button onClick={() => setIsNewOrderModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Orden de Producción
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
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
            {loading ? "..." : activeOrders.length}
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
            {loading ? "..." : `${totalPiecesInCrafting.toLocaleString()} pzas`}
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
            {loading ? "..." : completedOrders.length}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Prendas ingresadas a inventario</p>
        </Card>
      </div>

      {/* ======= TABLERO KANBAN DE ETAPAS DINÁMICAS ======= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#26302B] uppercase tracking-wider flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#556B5D]" />
            Tablero de Proceso de Taller
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-[#556B5D] hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar Tablero
          </button>
        </div>

        {loading ? (
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
                  {/* Encabezado Columna */}
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

                  {/* Tarjetas de Ordenes en esta Etapa */}
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

                          {/* Boton para avanzar etapa */}
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

      {/* Modales */}
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
    </div>
  );
}
