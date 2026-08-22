"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Plus,
  ShoppingCart,
  Receipt,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { salesService, type SaleRecord } from "@/services/sales.service";
import { inventoryService, type StockItemView } from "@/services/inventory.service";
import type { StockAlert } from "@/types/domain.types";

export default function DashboardPage() {
  const { session } = useAuthStore();
  const { tenant } = useTenantStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [loading, setLoading] = useState(true);
  const [salesMetrics, setSalesMetrics] = useState({
    salesToday: 0,
    revenueToday: 0,
    salesThisWeek: 0,
    revenueThisWeek: 0,
  });
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      const [metrics, sales, stock, alerts] = await Promise.all([
        salesService.getSalesMetrics(effectiveTenantId),
        salesService.getSalesHistory(effectiveTenantId, 5),
        inventoryService.getStockByLocation(effectiveTenantId),
        inventoryService.getStockAlerts(effectiveTenantId),
      ]);
      setSalesMetrics(metrics);
      setRecentSales(sales);
      setStockItems(stock);
      setStockAlerts(alerts);
    } catch (err) {
      console.error("Error al cargar datos del dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Totales calculados
  const totalInventoryUnits = stockItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const outOfStockAlerts = stockAlerts.filter((a) => a.isOutOfStock);
  const lowStockAlerts = stockAlerts.filter((a) => !a.isOutOfStock);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={`Bienvenido, ${session?.fullName || "Administrador"}`}
        subtitle={`Resumen general de operaciones de ${session?.companyName || "su empresa"}`}
      />

      <div className="page-container space-y-6">
        {/* Fila 1: Tarjetas KPI principales en tiempo real */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Ventas Hoy */}
          <Card padding="md" className="border-l-4 border-l-[#556B5D]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Ventas de Hoy
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF0EC] text-[#556B5D] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : formatCurrency(salesMetrics.revenueToday)}
              </span>
              <span className="block text-[11px] text-[#3F7D58] font-medium mt-0.5">
                {loading ? "..." : `${salesMetrics.salesToday} venta${salesMetrics.salesToday === 1 ? "" : "s"} hoy`}
              </span>
            </div>
          </Card>

          {/* Inventario Total */}
          <Card padding="md" className="border-l-4 border-l-[#8FA393]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Inventario Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F0F4F1] text-[#8FA393] flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : totalInventoryUnits.toLocaleString()}
              </span>
              <span className="block text-[11px] text-[#6B7A71] font-medium mt-0.5">
                piezas disponibles
              </span>
            </div>
          </Card>

          {/* Bajo Stock */}
          <Card padding="md" className="border-l-4 border-l-[#D89B2B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Bajo Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FDF5E4] text-[#D89B2B] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : lowStockAlerts.length}
              </span>
              <span className="block text-[11px] text-[#D89B2B] font-medium mt-0.5">
                requieren reposición
              </span>
            </div>
          </Card>

          {/* Agotados */}
          <Card padding="md" className="border-l-4 border-l-[#B85450]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Agotados
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FAEAEA] text-[#B85450] flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : outOfStockAlerts.length}
              </span>
              <span className="block text-[11px] text-[#B85450] font-medium mt-0.5">
                variantes sin existencia
              </span>
            </div>
          </Card>

          {/* Esta semana */}
          <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Esta Semana
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FBF4E8] text-[#C49A5A] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : formatCurrency(salesMetrics.revenueThisWeek)}
              </span>
              <span className="block text-[11px] text-[#6B7A71] font-medium mt-0.5">
                {salesMetrics.salesThisWeek} ventas registradas
              </span>
            </div>
          </Card>
        </div>

        {/* Fila 2: Acciones Rápidas */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <CardHeader
              title="Acciones Rápidas"
              subtitle="Accesos directos a los flujos operativos principales"
            />
            <Button variant="ghost" size="sm" onClick={loadDashboardData} title="Refrescar datos">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <Link href="/pos">
              <Button variant="primary" fullWidth size="lg" className="justify-start">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Abrir Punto de Venta (POS)
              </Button>
            </Link>

            <Link href="/productos">
              <Button variant="outline" fullWidth size="lg" className="justify-start">
                <Plus className="w-5 h-5 mr-2" />
                Registrar Nuevo Producto
              </Button>
            </Link>

            <Link href="/ventas">
              <Button variant="ghost" fullWidth size="lg" className="justify-start border border-[#DDD9D0]">
                <Receipt className="w-5 h-5 mr-2" />
                Consultar Ventas del Día
              </Button>
            </Link>
          </div>
        </Card>

        {/* Fila 3: Paneles de información en tiempo real */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas Ventas */}
          <Card padding="md">
            <div className="flex items-center justify-between">
              <CardHeader
                title="Últimas Ventas Registradas"
                subtitle="Historial reciente de transacciones"
              />
              <Link href="/ventas" className="text-xs font-semibold text-[#556B5D] hover:underline flex items-center gap-1">
                Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="mt-4">
              {loading ? (
                <p className="text-xs text-[#6B7A71] text-center py-6">Cargando ventas...</p>
              ) : recentSales.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[#E7E3DA] rounded-lg">
                  <p className="text-xs text-[#6B7A71]">
                    Aún no hay ventas registradas en esta empresa. Realice su primera venta desde el Punto de Venta.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#DDD9D0] border border-[#DDD9D0] rounded-xl overflow-hidden">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-[#F8F6F1] transition-colors">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#556B5D]">{sale.ticketNumber}</span>
                        <p className="text-xs text-[#6B7A71]">
                          {new Date(sale.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} — {sale.clientName || "Público General"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#26302B]">{formatCurrency(sale.total)}</span>
                        <span className="block text-[10px] text-[#3F7D58] font-semibold uppercase">Completada</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Alertas de Inventario */}
          <Card padding="md">
            <div className="flex items-center justify-between">
              <CardHeader
                title="Alertas de Inventario"
                subtitle="Productos que requieren atención de stock"
              />
              <Link href="/inventario" className="text-xs font-semibold text-[#556B5D] hover:underline flex items-center gap-1">
                Ver inventario <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4">
              {loading ? (
                <p className="text-xs text-[#6B7A71] text-center py-6">Cargando alertas...</p>
              ) : stockAlerts.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[#E7E3DA] rounded-lg">
                  <Badge variant="success">Inventario Saludable</Badge>
                  <p className="text-xs text-[#6B7A71] mt-2">
                    No hay alertas activas de bajo stock en este momento.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#DDD9D0] border border-[#DDD9D0] rounded-xl overflow-hidden">
                  {stockAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.variantId} className="flex items-center justify-between p-3 hover:bg-[#F8F6F1] transition-colors">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#556B5D]">{alert.sku}</span>
                        <p className="text-xs font-medium text-[#26302B]">{alert.productName} ({[alert.colorName, alert.sizeName].filter(Boolean).join("/")})</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#26302B]">{alert.currentStock} pzas</span>
                        {alert.isOutOfStock ? (
                          <Badge variant="error">Agotado</Badge>
                        ) : (
                          <Badge variant="warning">Bajo Stock</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
