"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Layers,
  AlertTriangle,
  XCircle,
  History,
  Plus,
  Search,
  RefreshCw,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import {
  inventoryService,
  type StockItemView,
  type InventoryMovementRecord,
} from "@/services/inventory.service";
import type { StockAlert } from "@/types/domain.types";
import { InventoryAdjustmentModal } from "@/components/inventario/InventoryAdjustmentModal";

import { useAuthStore } from "@/stores/auth.store";

export default function InventarioPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [activeTab, setActiveTab] = useState<"existencias" | "historial" | "alertas">("existencias");

  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      const [itemsData, movementsData, alertsData] = await Promise.all([
        inventoryService.getStockByLocation(effectiveTenantId),
        inventoryService.getMovementHistory(effectiveTenantId, 50),
        inventoryService.getStockAlerts(effectiveTenantId),
      ]);
      setStockItems(itemsData);
      setMovements(movementsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error("Error al cargar datos de inventario:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos para KPIs
  const totalUnits = stockItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalValue = stockItems.reduce((acc, curr) => acc + curr.quantity * curr.salePrice, 0);
  const outOfStockCount = alerts.filter((a) => a.isOutOfStock).length;
  const lowStockCount = alerts.length - outOfStockCount;

  // Filtrado de existencias
  const filteredStock = stockItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.sku.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      (item.colorName && item.colorName.toLowerCase().includes(q)) ||
      (item.sizeName && item.sizeName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Encabezado de la página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Gestión de Inventarios
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Control de existencias por ubicación, auditoría de movimientos y alertas de bajo stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} title="Recargar existencias">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => {
              setSelectedVariantId(undefined);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Registrar Movimiento
          </Button>
        </div>
      </div>

      {/* Resumen KPI Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#556B5D]">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Total Unidades
            </p>
            <p className="text-2xl font-bold text-[#26302B] mt-1">
              {loading ? "..." : totalUnits.toLocaleString()}
            </p>
            <p className="text-xs text-[#8FA393] mt-0.5">
              Valor estimado: ${totalValue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#D89B2B]">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Bajo Stock
            </p>
            <p className="text-2xl font-bold text-[#D89B2B] mt-1">
              {loading ? "..." : lowStockCount}
            </p>
            <p className="text-xs text-[#6B7A71] mt-0.5">
              Requieren reabastecimiento
            </p>
          </div>
          <div className="p-3 bg-[#FDF5E4] text-[#D89B2B] rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#B85450]">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Variantes Agotadas
            </p>
            <p className="text-2xl font-bold text-[#B85450] mt-1">
              {loading ? "..." : outOfStockCount}
            </p>
            <p className="text-xs text-[#6B7A71] mt-0.5">
              Sin existencias disponibles
            </p>
          </div>
          <div className="p-3 bg-[#FAEAEA] text-[#B85450] rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#8FA393]">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Movimientos Registrados
            </p>
            <p className="text-2xl font-bold text-[#26302B] mt-1">
              {loading ? "..." : movements.length}
            </p>
            <p className="text-xs text-[#6B7A71] mt-0.5">
              Últimas operaciones auditoría
            </p>
          </div>
          <div className="p-3 bg-[#F0F4F1] text-[#8FA393] rounded-xl">
            <History className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex items-center gap-1 border-b border-[#DDD9D0]">
        <button
          onClick={() => setActiveTab("existencias")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "existencias"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Layers className="w-4 h-4" />
          Existencias por Ubicación ({stockItems.length})
        </button>

        <button
          onClick={() => setActiveTab("historial")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "historial"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Movimientos ({movements.length})
        </button>

        <button
          onClick={() => setActiveTab("alertas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${
            activeTab === "alertas"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Alertas de Stock
          {alerts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[#B85450] text-white rounded-full">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido de la pestaña: Existencias */}
      {activeTab === "existencias" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
              <input
                type="text"
                placeholder="Buscar variante por SKU, modelo o color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg focus:outline-none focus:border-[#556B5D]"
              />
            </div>
            <p className="text-xs text-[#6B7A71]">
              Mostrando {filteredStock.length} de {stockItems.length} registros
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Producto / Modelo</th>
                  <th className="py-3 px-4">Variante</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7A71]">
                      Cargando existencias...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7A71]">
                      No se encontraron registradas existencias en el sistema.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item) => {
                    const isOut = item.quantity === 0;
                    const isLow = item.quantity > 0 && item.quantity <= item.minStock;

                    return (
                      <tr key={item.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[#556B5D]">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {item.productName}
                          <span className="block text-xs text-[#6B7A71]">
                            {item.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#6B7A71]">
                          {[item.colorName, item.sizeName, item.sleeveTypeName]
                            .filter(Boolean)
                            .join(" / ") || "Estándar"}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-[#26302B]">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-[#8FA393]" />
                            {item.locationName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          ${item.salePrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-base">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOut ? (
                            <Badge variant="error">Agotado</Badge>
                          ) : isLow ? (
                            <Badge variant="warning">Bajo Stock</Badge>
                          ) : (
                            <Badge variant="success">Disponible</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVariantId(item.variantId);
                              setIsModalOpen(true);
                            }}
                            className="text-xs font-semibold text-[#556B5D] hover:underline"
                          >
                            + Ajustar Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Contenido de la pestaña: Historial de Movimientos */}
      {activeTab === "historial" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
            <h3 className="text-sm font-semibold text-[#26302B]">
              Historial de Auditoría de Movimientos
            </h3>
            <p className="text-xs text-[#6B7A71]">
              Registro cronológico de entradas, ventas y ajustes manuales
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">SKU / Producto</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Operación</th>
                  <th className="py-3 px-4 text-center">Cambio</th>
                  <th className="py-3 px-4 text-center">Antes → Después</th>
                  <th className="py-3 px-4">Motivo / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6B7A71]">
                      No hay movimientos registrados aún.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isEntry = m.type === "ENTRADA" || m.type === "DEVOLUCION";
                    const isExit = m.type === "SALIDA" || m.type === "VENTA";

                    return (
                      <tr key={m.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-[#6B7A71]">
                          {new Date(m.createdAt).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-[#556B5D]">
                            {m.sku}
                          </span>
                          <span className="block text-xs font-medium text-[#26302B]">
                            {m.productName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#6B7A71]">
                          {m.locationName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                              isEntry
                                ? "bg-[#EBF5F0] text-[#3F7D58]"
                                : isExit
                                ? "bg-[#FAEAEA] text-[#B85450]"
                                : "bg-[#FDF5E4] text-[#D89B2B]"
                            }`}
                          >
                            {isEntry ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : isExit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {isEntry ? `+${m.quantity}` : isExit ? `-${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-mono text-[#6B7A71]">
                          {m.quantityBefore} →{" "}
                          <strong className="text-[#26302B]">{m.quantityAfter}</strong>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#6B7A71]">
                          {m.reason || "Sin motivo especificado"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Contenido de la pestaña: Alertas de Stock */}
      {activeTab === "alertas" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
            <h3 className="text-sm font-semibold text-[#26302B]">
              Alertas de Bajo Stock y Reabastecimiento
            </h3>
            <p className="text-xs text-[#6B7A71]">
              Variantes que alcanzaron o sobrepasaron su nivel mínimo de seguridad
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Variante</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Mínimo Requerido</th>
                  <th className="py-3 px-4 text-center">Estado Alerta</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#3F7D58] font-medium">
                      ✓ Todo el inventario se encuentra dentro de los niveles óptimos.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => (
                    <tr key={a.variantId} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#556B5D]">
                        {a.sku}
                      </td>
                      <td className="py-3 px-4 font-medium">{a.productName}</td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71]">
                        {[a.colorName, a.sizeName].filter(Boolean).join(" / ") || "Estándar"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-base text-[#B85450]">
                        {a.currentStock}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-mono text-[#6B7A71]">
                        {a.minStock} unidades
                      </td>
                      <td className="py-3 px-4 text-center">
                        {a.isOutOfStock ? (
                          <Badge variant="error">AGOTADO</Badge>
                        ) : (
                          <Badge variant="warning">BAJO STOCK</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedVariantId(a.variantId);
                            setIsModalOpen(true);
                          }}
                        >
                          Reabastecer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Movimiento de Inventario */}
      <InventoryAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        preselectedVariantId={selectedVariantId}
      />
    </div>
  );
}
