"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Boxes,
  Users,
  RefreshCw,
  FileSpreadsheet,
  ShieldAlert,
  Search,
  Eye,
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
import {
  auditService,
  type AuditLogRecord,
  type AuditEntity,
  type AuditAction,
} from "@/services/audit.service";
import { AuditDetailModal } from "@/components/auditoria/AuditDetailModal";

type ActiveTab = "sales" | "inventory" | "sellers" | "auditoria";

export default function ReportesYAuditoriaPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam === "auditoria" ? "auditoria" : tabParam === "inventory" ? "inventory" : tabParam === "sellers" ? "sellers" : "sales"
  );
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

  // Estados Auditoría
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<AuditEntity | "ALL">("ALL");
  const [selectedAction, setSelectedAction] = useState<AuditAction | "ALL">("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

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
      } else if (activeTab === "auditoria") {
        const data = await auditService.getAuditLogs(effectiveTenantId, {
          entity: selectedEntity,
          action: selectedAction,
          search: auditSearch,
          limit: 100,
        });
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Error al cargar reporte/auditoría:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId, activeTab, startDate, endDate, selectedEntity, selectedAction, auditSearch]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    router.replace(`/reportes?tab=${tab}`);
  }

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
      const headers = ["SKU", "Producto", "Categoria", "Color", "Talla", "Manga", "Stock", "Precio Costo", "Precio Venta", "Valuacion Costo", "Valuacion Venta", "Ganancia Est."];
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

  const totalSalesRevenue = salesReport.reduce((acc, s) => acc + (s.status === "Completada" ? s.total : 0), 0);
  const totalInventoryPieces = inventoryReport.reduce((acc, i) => acc + i.stock, 0);
  const totalInventoryCost = inventoryReport.reduce((acc, i) => acc + i.totalCostValue, 0);
  const totalInventoryValuation = inventoryReport.reduce((acc, i) => acc + i.totalSaleValue, 0);
  const totalEstimatedProfit = totalInventoryValuation - totalInventoryCost;

  return (
    <div className="space-y-6 font-[Outfit]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Reportes & Bitácora de Auditoría
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Informes financieros, valuación de stock y trazabilidad de operaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadReportData} title="Refrescar datos">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          {activeTab !== "auditoria" && (
            <Button onClick={handleExportCSV} className="bg-[#3F7D58] hover:bg-[#326446]">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-[#DDD9D0] bg-white rounded-xl p-1 shadow-xs max-w-fit flex-wrap">
        <button
          onClick={() => handleTabChange("sales")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "sales" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Ventas por Período
        </button>

        <button
          onClick={() => handleTabChange("inventory")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "inventory" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventario Valorizado
        </button>

        <button
          onClick={() => handleTabChange("sellers")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "sellers" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Users className="w-4 h-4" />
          Vendedores
        </button>

        <button
          onClick={() => handleTabChange("auditoria")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "auditoria" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Bitácora de Auditoría
        </button>
      </div>

      {/* PESTAÑA 1: VENTAS */}
      {activeTab === "sales" && (
        <div className="space-y-6">
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
                      dateRange === "today" ? "bg-[#556B5D] text-white border-[#556B5D]" : "bg-white text-[#6B7A71] border-[#DDD9D0]"
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => handleDatePreset("week")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      dateRange === "week" ? "bg-[#556B5D] text-white border-[#556B5D]" : "bg-white text-[#6B7A71] border-[#DDD9D0]"
                    }`}
                  >
                    7 Días
                  </button>
                  <button
                    onClick={() => handleDatePreset("month")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      dateRange === "month" ? "bg-[#556B5D] text-white border-[#556B5D]" : "bg-white text-[#6B7A71] border-[#DDD9D0]"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#556B5D]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ventas Totales</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading ? "..." : `$${totalSalesRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Total Registros</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">{loading ? "..." : salesReport.length}</p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#8FA393]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ticket Promedio</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loading || salesReport.length === 0 ? "..." : `$${(totalSalesRevenue / salesReport.length).toFixed(2)}`}
              </p>
            </Card>
          </div>

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
                      <td colSpan={7} className="py-8 text-center text-[#6B7A71]">Cargando...</td>
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
                          <Badge variant={row.status === "Completada" ? "success" : "error"}>{row.status}</Badge>
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

      {/* PESTAÑA 2: INVENTARIO VALORIZADO */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#556B5D]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Piezas Totales</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">{loading ? "..." : totalInventoryPieces.toLocaleString()} pzas</p>
            </Card>
            <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Valuación a Costo</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">{loading ? "..." : `$${totalInventoryCost.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}</p>
            </Card>
            <Card padding="md" className="border-l-4 border-l-[#8FA393]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Valuación Venta</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">{loading ? "..." : `$${totalInventoryValuation.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}</p>
            </Card>
            <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ganancia Est.</p>
              <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">{loading ? "..." : `$${totalEstimatedProfit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}</p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Guayabera</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-right">P. Costo</th>
                    <th className="py-3 px-4 text-right">P. Venta</th>
                    <th className="py-3 px-4 text-right">Valuación Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {inventoryReport.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#556B5D] text-xs">{row.sku}</td>
                      <td className="py-3 px-4 font-medium">{row.productName}</td>
                      <td className="py-3 px-4 text-center font-bold">{row.stock} pzas</td>
                      <td className="py-3 px-4 text-right text-xs font-mono">${row.costPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-xs font-mono">${row.salePrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-xs font-mono font-bold text-[#556B5D]">${row.totalSaleValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 3: VENDEDORES */}
      {activeTab === "sellers" && (
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
                {sellerReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 font-bold">{row.sellerName}</td>
                    <td className="py-3 px-4 text-center font-semibold">{row.totalSalesCount} ventas</td>
                    <td className="py-3 px-4 text-right font-bold text-[#3F7D58] font-mono">${row.totalRevenue.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-[#6B7A71]">${row.averageTicket.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PESTAÑA 4: AUDITORÍA */}
      {activeTab === "auditoria" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
              <input
                type="text"
                placeholder="Buscar evento o usuario..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-white border border-[#DDD9D0] rounded-lg text-[#26302B]"
              >
                <option value="ALL">Todas las Entidades</option>
                <option value="PRODUCTO">Productos</option>
                <option value="PRECIO">Precios</option>
                <option value="INVENTARIO">Inventario</option>
                <option value="VENTA">Ventas</option>
              </select>

              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-white border border-[#DDD9D0] rounded-lg text-[#26302B]"
              >
                <option value="ALL">Todas las Acciones</option>
                <option value="CREAR">Creaciones</option>
                <option value="ACTUALIZAR">Modificaciones</option>
                <option value="ELIMINAR">Eliminaciones</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Entidad</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                  <th className="py-3 px-4">Detalle</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-right">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-[#6B7A71]">
                      {new Date(log.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 px-4"><Badge variant="primary">{log.entity}</Badge></td>
                    <td className="py-3 px-4 text-center"><Badge variant="neutral">{log.action}</Badge></td>
                    <td className="py-3 px-4 text-xs max-w-xs truncate">{log.details}</td>
                    <td className="py-3 px-4 text-xs text-[#6B7A71]">{log.userName || "Sistema"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setIsAuditModalOpen(true);
                        }}
                        className="p-1.5 text-[#556B5D] hover:bg-[#EBF0EC] rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Auditoria */}
      <AuditDetailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logItem={selectedLog}
      />
    </div>
  );
}
