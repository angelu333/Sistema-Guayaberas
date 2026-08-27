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
  DollarSign,
  BarChart3,
  Award,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  dashboardService,
  type DaySalesChartItem,
  type TopProductChartItem,
  type AdvancedDashboardMetrics,
} from "@/services/dashboard.service";
import { salesService, type SaleRecord } from "@/services/sales.service";
import { inventoryService } from "@/services/inventory.service";
import type { StockAlert } from "@/types/domain.types";
import { SalesWeeklyChart } from "@/components/dashboard/SalesWeeklyChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";

export default function DashboardPage() {
  const { session } = useAuthStore();
  const { tenant } = useTenantStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdvancedDashboardMetrics>({
    salesToday: 0,
    revenueToday: 0,
    salesThisWeek: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    totalInventoryUnits: 0,
    totalInventoryValue: 0,
    totalCostValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  const [weeklySalesChart, setWeeklySalesChart] = useState<DaySalesChartItem[]>([]);
  const [topProductsChart, setTopProductsChart] = useState<TopProductChartItem[]>([]);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  const loadAllData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      const [advMetrics, chartData, topData, salesList, alerts] = await Promise.all([
        dashboardService.getAdvancedMetrics(effectiveTenantId),
        dashboardService.getWeeklySalesData(effectiveTenantId),
        dashboardService.getTopProductsData(effectiveTenantId, 5),
        salesService.getSalesHistory(effectiveTenantId, 5),
        inventoryService.getStockAlerts(effectiveTenantId),
      ]);

      setMetrics(advMetrics);
      setWeeklySalesChart(chartData);
      setTopProductsChart(topData);
      setRecentSales(salesList);
      setStockAlerts(alerts);
    } catch (err) {
      console.error("Error al cargar dashboard completo:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const userRole = session?.role || "admin";
  const roleLabel =
    userRole === "admin" ? "Administrador General" : userRole === "seller" ? "Vendedor POS" : "Producción / Taller";

  return (
    <div className="flex flex-col min-h-screen pb-8">
      <Header
        title={`Bienvenido, ${session?.fullName || "Administrador"}`}
        subtitle="Panel de Inteligencia Operativa"
      />

      <div className="page-container space-y-6">
        {/* Barra de Accesos Rápidos y Rol */}
        <div className="p-4 bg-white rounded-xl border border-[#DDD9D0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="primary">{roleLabel}</Badge>
                <span className="text-xs text-[#6B7A71] hidden sm:inline">•</span>
                <span className="text-xs text-[#6B7A71]">
                  Gestión de ventas, valuación de inventarios y estado de caja
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAllData} title="Refrescar métricas">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Link href="/pos">
              <Button size="sm">
                <ShoppingCart className="w-4 h-4" />
                Ir al POS
              </Button>
            </Link>
          </div>
        </div>

        {/* Fila 1: Tarjetas KPI Avanzadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventas de Hoy */}
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
                {loading ? "..." : formatCurrency(metrics.revenueToday)}
              </span>
              <span className="block text-[11px] text-[#3F7D58] font-medium mt-0.5">
                {loading ? "..." : `${metrics.salesToday} transacción(es) hoy`}
              </span>
            </div>
          </Card>

          {/* Ingresos del Mes */}
          <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Ingresos del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FBF4E8] text-[#C49A5A] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : formatCurrency(metrics.revenueThisMonth)}
              </span>
              <span className="block text-[11px] text-[#6B7A71] font-medium mt-0.5">
                Acumulado mensual activo
              </span>
            </div>
          </Card>

          {/* Valuación Inventario */}
          <Card padding="md" className="border-l-4 border-l-[#8FA393]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Valuación Inventario
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F0F4F1] text-[#8FA393] flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {loading ? "..." : formatCurrency(metrics.totalInventoryValue)}
              </span>
              <span className="block text-[11px] text-[#6B7A71] font-medium mt-0.5">
                {loading ? "..." : `${metrics.totalInventoryUnits.toLocaleString()} piezas físicas`}
              </span>
            </div>
          </Card>

          {/* Alertas de Stock */}
          <Card padding="md" className="border-l-4 border-l-[#B85450]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Alertas de Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FAEAEA] text-[#B85450] flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#B85450] font-[Outfit]">
                {loading ? "..." : metrics.outOfStockCount}
              </span>
              <span className="text-xs text-[#6B7A71]">agotados /</span>
              <span className="text-lg font-bold text-[#D89B2B]">
                {loading ? "..." : metrics.lowStockCount}
              </span>
              <span className="text-xs text-[#6B7A71]">bajo stock</span>
            </div>
          </Card>
        </div>

        {/* Fila 2: Gráficas Interactivas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfica 1: Tendencia Semanal de Ventas (2 columnas) */}
          <Card padding="md" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#26302B] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#556B5D]" />
                  Tendencia Semanal de Ventas ($ MXN)
                </h3>
                <p className="text-xs text-[#6B7A71] mt-0.5">
                  Ventas brutas acumuladas por día en los últimos 7 días
                </p>
              </div>
              <Badge variant="success">Tiempo Real</Badge>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#6B7A71]">
                Cargando gráfica de ventas...
              </div>
            ) : (
              <SalesWeeklyChart data={weeklySalesChart} />
            )}
          </Card>

          {/* Gráfica 2: Productos Más Vendidos (1 columna) */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#26302B] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C49A5A]" />
                  Top Guayaberas Vendidas
                </h3>
                <p className="text-xs text-[#6B7A71] mt-0.5">
                  Modelos con mayor rotación en piezas
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#6B7A71]">
                Cargando productos top...
              </div>
            ) : (
              <TopProductsChart data={topProductsChart} />
            )}
          </Card>
        </div>

        {/* Fila 3: Últimas Ventas y Alertas Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas Ventas */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <CardHeader
                title="Últimas Ventas Registradas"
                subtitle="Historial reciente de transacciones"
              />
              <Link
                href="/ventas"
                className="text-xs font-semibold text-[#556B5D] hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-[#6B7A71] text-center py-6">Cargando ventas...</p>
            ) : recentSales.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-[#E7E3DA] rounded-lg">
                <p className="text-xs text-[#6B7A71]">
                  Aún no hay ventas registradas. Realice su primera venta desde el Punto de Venta.
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
          </Card>

          {/* Alertas de Stock */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <CardHeader
                title="Alertas de Reabastecimiento"
                subtitle="Guayaberas agotadas o cerca del stock mínimo"
              />
              <Link
                href="/inventario"
                className="text-xs font-semibold text-[#556B5D] hover:underline flex items-center gap-1"
              >
                Ir a inventario <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

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
                      <p className="text-xs font-medium text-[#26302B]">
                        {alert.productName} ({[alert.colorName, alert.sizeName].filter(Boolean).join("/")})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#26302B]">{alert.currentStock} pzas</span>
                      {alert.isOutOfStock ? (
                        <Badge variant="error">AGOTADO</Badge>
                      ) : (
                        <Badge variant="warning">BAJO STOCK</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
