"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Boxes,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  reportsService,
  type SalesReportRow,
  type InventoryValuationRow,
  type SellerPerformanceRow,
} from "@/services/reports.service";

type ActiveTab = "sales" | "inventory" | "sellers";

export default function ReportesPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [activeTab, setActiveTab] = useState<ActiveTab>("sales");
  const [loading, setLoading] = useState(true);

  // Filtros de fecha
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("month");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Datos de reportes
  const [salesReport, setSalesReport] = useState<SalesReportRow[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventoryValuationRow[]>([]);
  const [sellerReport, setSellerReport] = useState<SellerPerformanceRow[]>([]);

  const loadReportData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      if (activeTab === "sales") {
        const data = await reportsService.getSalesReport(effectiveTenantId, startDate, endDate);
        setSalesReport(data);
      } else if (activeTab === "inventory") {
        const data = await reportsService.getInventoryValuationReport(effectiveTenantId);
        setInventoryReport(data);
      } else if (activeTab === "sellers") {
        const data = await reportsService.getSellerPerformanceReport(effectiveTenantId, startDate, endDate);
        setSellerReport(data);
      }
    } catch (err) {
      console.error("Error al cargar datos del reporte:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId, activeTab, startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Manejador de preajustes de fecha
  const handleDatePreset = (preset: "today" | "week" | "month") => {
    setDateRange(preset);
    const today = new Date().toISOString().split("T")[0];
    setEndDate(today);

    if (preset === "today") {
      setStartDate(today);
    } else if (preset === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const d = new Date();
      setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]);
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (activeTab === "sales") {
      const headers = ["Ticket", "Fecha", "Cliente", "Vendedor", "Metodo Pago", "Estado", "Total MXN"];
      const rows = salesReport.map((s) => [
        s.ticketNumber,
        s.date,
        s.clientName,
        s.sellerName,
        s.paymentMethod,
        s.status,
        s.total.toFixed(2),
      ]);
      reportsService.downloadCSV(`Reporte_Ventas_${startDate}_al_${endDate}.csv`, headers, rows);
    } else if (activeTab === "inventory") {
      const headers = [
        "SKU",
        "Producto",
        "Categoria",
        "Color",
        "Talla",
        "Manga",
        "Stock",
        "Precio Costo",
        "Precio Venta",
        "Valuacion Costo",
        "Valuacion Venta",
        "Ganancia Est.",
      ];
      const rows = inventoryReport.map((i) => [
        i.sku,
        i.productName,
        i.categoryName,
        i.colorName,
        i.sizeName,
        i.sleeveTypeName,
        i.stock,
        i.costPrice.toFixed(2),
        i.salePrice.toFixed(2),
        i.totalCostValue.toFixed(2),
        i.totalSaleValue.toFixed(2),
        i.estimatedProfit.toFixed(2),
      ]);
      reportsService.downloadCSV(`Reporte_Inventario_Valorizado_${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
    } else if (activeTab === "sellers") {
      const headers = ["Vendedor", "Ventas Totales", "Ingresos Totales MXN", "Ticket Promedio MXN"];
      const rows = sellerReport.map((s) => [
        s.sellerName,
        s.totalSalesCount,
        s.totalRevenue.toFixed(2),
        s.averageTicket.toFixed(2),
      ]);
      reportsService.downloadCSV(`Reporte_Vendedores_${startDate}_al_${endDate}.csv`, headers, rows);
    }
  };

  // Totales calculados
  const totalSalesRevenue = salesReport.reduce((acc, s) => acc + (s.status === "Completada" ? s.total : 0), 0);
  const totalInventoryPieces = inventoryReport.reduce((acc, i) => acc + i.stock, 0);
  const totalInventoryCost = inventoryReport.reduce((acc, i) => acc + i.totalCostValue, 0);
  const totalInventoryValuation = inventoryReport.reduce((acc, i) => acc + i.totalSaleValue, 0);
  const totalEstimatedProfit = totalInventoryValuation - totalInventoryCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Reportes e Informes Financieros
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Análisis de ventas por periodo, valuación de existencias y exportación a Excel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadReportData} title="Refrescar datos">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={handleExportCSV} className="bg-[#3F7D58] hover:bg-[#326446]">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Exportar a CSV
          </Button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-[#DDD9D0] bg-white rounded-xl p-1 shadow-xs max-w-fit">
        <button
          onClick={() => setActiveTab("sales")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "sales"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Ventas por Período
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "inventory"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventario Valorizado
        </button>

        <button
          onClick={() => setActiveTab("sellers")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "sellers"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Users className="w-4 h-4" />
          Rendimiento por Vendedor
        </button>
      </div>

      {/* ======= CONTENIDO PESTAÑA 1: VENTAS POR PERÍODO ======= */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          {/* Barra de Filtros de Fecha */}
          <Card padding="md" className="bg-[#F8F6F1] border border-[#DDD9D0]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#556B5D]" />
                <span className="text-xs font-bold text-[#26302B] uppercase tracking-wider">
                  Rango de Fechas:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDatePreset("today")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      dateRange === "today"
                        ? "bg-[#556B5D] text-white border-[#556B5D]"
                        : "bg-white text-[#6B7A71] border-[#DDD9D0]"
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => handleDatePreset("week")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      dateRange === "week"
                        ? "bg-[#556B5D] text-white border-[#556B5D]"
                        : "bg-white text-[#6B7A71] border-[#DDD9D0]"
                    }`}
                  >
                    7 Días
                  </button>
                  <button
                    onClick={() => handleDatePreset("month")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      dateRange === "month"
                        ? "bg-[#556B5D] text-white border-[#556B5D]"
                        : "bg-white text-[#6B7A71] border-[#DDD9D0]"
                    }`}
                  >
                    Este Mes
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setDateRange("custom");
                    setStartDate(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-[#DDD9D0] rounded-lg text-[#26302B]"
                />
                <span className="text-xs text-[#6B7A71]">a</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setDateRange("custom");
                    setEndDate(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-[#DDD9D0] rounded-lg text-[#26302B]"
                />
              </div>
            </div>
          </Card>

          {/* KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#556B5D]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Ventas Totales del Período
              </p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading ? "..." : `$${totalSalesRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[#3F7D58] font-medium mt-0.5">
                Ventas completadas en el rango
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Total Registros
              </p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading ? "..." : salesReport.length}
              </p>
              <p className="text-xs text-[#8FA393] mt-0.5">Transacciones procesadas</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#8FA393]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Ticket Promedio
              </p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading || salesReport.length === 0
                  ? "..."
                  : `$${(totalSalesRevenue / salesReport.length).toFixed(2)}`}
              </p>
              <p className="text-xs text-[#6B7A71] mt-0.5">Promedio por venta</p>
            </Card>
          </div>

          {/* Tabla de Reporte */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Pago</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6B7A71]">
                        Generando reporte de ventas...
                      </td>
                    </tr>
                  ) : salesReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B7A71]">
                        No se encontraron ventas en el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    salesReport.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F6F1]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#556B5D]">{row.ticketNumber}</td>
                        <td className="py-3 px-4 text-xs text-[#6B7A71]">{row.date}</td>
                        <td className="py-3 px-4 text-xs">{row.clientName}</td>
                        <td className="py-3 px-4 text-xs text-[#6B7A71]">{row.sellerName}</td>
                        <td className="py-3 px-4 text-xs">{row.paymentMethod}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={row.status === "Completada" ? "success" : "error"}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono">${row.total.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======= CONTENIDO PESTAÑA 2: INVENTARIO VALORIZADO ======= */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* KPI Summary Valuacion */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#556B5D]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Piezas Físicas Totales
              </p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading ? "..." : totalInventoryPieces.toLocaleString()} pzas
              </p>
              <p className="text-xs text-[#8FA393] mt-0.5">En tienda y bodegas</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Valuación a Costo Total
              </p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading ? "..." : `$${totalInventoryCost.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[#6B7A71] mt-0.5">Inversión en material/taller</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#8FA393]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Valuación a Precio Venta
              </p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading ? "..." : `$${totalInventoryValuation.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[#3F7D58] font-medium mt-0.5">Valor bruto estimado</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Ganancia Proyectada Est.
              </p>
              <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
                {loading ? "..." : `$${totalEstimatedProfit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[#6B7A71] mt-0.5">Margen bruto esperado</p>
            </Card>
          </div>

          {/* Tabla de Inventario Valorizado */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Guayabera / Modelo</th>
                    <th className="py-3 px-4">Color / Talla</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-right">P. Costo</th>
                    <th className="py-3 px-4 text-right">P. Venta</th>
                    <th className="py-3 px-4 text-right">Valuación Costo</th>
                    <th className="py-3 px-4 text-right">Valuación Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#6B7A71]">
                        Generando reporte de inventario valorizado...
                      </td>
                    </tr>
                  ) : inventoryReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6B7A71]">
                        No hay prendas registradas en inventario.
                      </td>
                    </tr>
                  ) : (
                    inventoryReport.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F6F1]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#556B5D] text-xs">{row.sku}</td>
                        <td className="py-3 px-4 font-medium text-[#26302B]">{row.productName}</td>
                        <td className="py-3 px-4 text-xs text-[#6B7A71]">
                          {[row.colorName, `Talla ${row.sizeName}`].join(" / ")}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{row.stock} pzas</td>
                        <td className="py-3 px-4 text-right text-xs font-mono">${row.costPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-xs font-mono">${row.salePrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-xs font-mono text-[#6B7A71]">
                          ${row.totalCostValue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-mono font-bold text-[#556B5D]">
                          ${row.totalSaleValue.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======= CONTENIDO PESTAÑA 3: RENDIMIENTO POR VENDEDOR ======= */}
      {activeTab === "sellers" && (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4 text-center">Ventas Realizadas</th>
                    <th className="py-3 px-4 text-right">Ingresos Generados</th>
                    <th className="py-3 px-4 text-right">Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#6B7A71]">
                        Generando reporte de vendedores...
                      </td>
                    </tr>
                  ) : sellerReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#6B7A71]">
                        No hay ventas registradas por vendedores en este período.
                      </td>
                    </tr>
                  ) : (
                    sellerReport.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F6F1]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#26302B] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#EBF0EC] text-[#556B5D] flex items-center justify-center font-bold text-xs">
                            {row.sellerName.charAt(0)}
                          </div>
                          {row.sellerName}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">{row.totalSalesCount} ventas</td>
                        <td className="py-3 px-4 text-right font-bold text-[#3F7D58] font-mono">
                          ${row.totalRevenue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-mono text-[#6B7A71]">
                          ${row.averageTicket.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
