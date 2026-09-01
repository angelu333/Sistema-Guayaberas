import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface DaySalesChartItem {
  dayName: string;
  date: string;
  total: number;
  count: number;
}

export interface TopProductChartItem {
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

export interface AdvancedDashboardMetrics {
  salesToday: number;
  revenueToday: number;
  salesThisWeek: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  totalInventoryUnits: number;
  totalInventoryValue: number;
  totalCostValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

/**
 * Convierte una fecha a string YYYY-MM-DD en la zona horaria local del cliente
 */
function getLocalDateString(d: Date | string): string {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const dashboardService = {
  /**
   * Obtiene las ventas diarias acumuladas de los ultimos 7 dias para la grafica de tendencia.
   * Si se pasa locationId, filtra exclusivamente las ventas de esa sucursal.
   */
  async getWeeklySalesData(tenantId: string, locationId?: string | null): Promise<DaySalesChartItem[]> {
    const days: DaySalesChartItem[] = [];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayName = dayNames[d.getDay()];
      days.push({
        dayName: i === 0 ? "Hoy" : dayName,
        date: dateStr,
        total: 0,
        count: 0,
      });
    }

    const startDate = days[0].date;

    let query = supabase
      .from("ventas")
      .select("total, created_at, status")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("created_at", `${startDate}T00:00:00.000Z`);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error("Error al obtener ventas semanales:", error);
      return days;
    }

    data.forEach((row: any) => {
      const saleDate = getLocalDateString(row.created_at);
      const targetDay = days.find((d) => d.date === saleDate);
      if (targetDay) {
        targetDay.total += Number(row.total || 0);
        targetDay.count += 1;
      }
    });

    return days;
  },

  /**
   * Obtiene los productos/modelos mas vendidos del tenant.
   * Si se pasa locationId, filtra por ventas de esa sucursal.
   */
  async getTopProductsData(tenantId: string, limit: number = 5, locationId?: string | null): Promise<TopProductChartItem[]> {
    let query = supabase
      .from("detalle_ventas")
      .select(`
        quantity,
        subtotal,
        variantes_producto!inner(
          sku,
          productos!inner(name)
        ),
        ventas!inner(location_id)
      `)
      .eq("tenant_id", tenantId);

    if (locationId) {
      query = query.eq("ventas.location_id", locationId);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error("Error al obtener productos mas vendidos:", error);
      return [];
    }

    const map: Record<string, { name: string; sku: string; quantitySold: number; revenue: number }> = {};

    data.forEach((row: any) => {
      const v = row.variantes_producto;
      const name = v?.productos?.name || "Guayabera";
      const sku = v?.sku || "S/SKU";
      const key = name;

      if (!map[key]) {
        map[key] = { name, sku, quantitySold: 0, revenue: 0 };
      }

      map[key].quantitySold += row.quantity || 0;
      map[key].revenue += Number(row.subtotal || 0);
    });

    const result = Object.values(map);
    return result.sort((a, b) => b.quantitySold - a.quantitySold).slice(0, limit);
  },

  /**
   * Obtiene las metricas financieras y de inventario avanzadas.
   * Si se pasa locationId, las ventas se filtran por esa sucursal y el stock
   * se calcula solo con las existencias de esa ubicacion.
   */
  async getAdvancedMetrics(tenantId: string, locationId?: string | null): Promise<AdvancedDashboardMetrics> {
    const today = getLocalDateString(new Date());
    const firstDayOfMonth = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const weekAgo = getLocalDateString(new Date(Date.now() - 7 * 86400000));

    // Ventas — filtradas por sucursal si corresponde
    let salesQuery = supabase
      .from("ventas")
      .select("total, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "completed");

    if (locationId) {
      salesQuery = salesQuery.eq("location_id", locationId);
    }

    const { data: salesData } = await salesQuery;

    let salesToday = 0;
    let revenueToday = 0;
    let salesThisWeek = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;

    (salesData || []).forEach((s: any) => {
      const date = getLocalDateString(s.created_at);
      const amount = Number(s.total || 0);

      if (date >= firstDayOfMonth) revenueThisMonth += amount;
      if (date >= weekAgo) { salesThisWeek++; revenueThisWeek += amount; }
      if (date === today) { salesToday++; revenueToday += amount; }
    });

    // Inventario y valuación — si hay locationId, solo las existencias de esa sucursal
    const existenciasSelect = locationId
      ? `existencias!inner(quantity, location_id)`
      : `existencias(quantity, location_id)`;

    let variantsQuery = supabase
      .from("variantes_producto")
      .select(`id, sale_price, cost_price, min_stock, ${existenciasSelect}`)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (locationId) {
      variantsQuery = variantsQuery.eq("existencias.location_id", locationId);
    }

    const { data: variantsData } = await variantsQuery;

    let totalInventoryUnits = 0;
    let totalInventoryValue = 0;
    let totalCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    (variantsData || []).forEach((v: any) => {
      const stock = (v.existencias || []).reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
      const min = v.min_stock || 5;
      const saleP = Number(v.sale_price || 0);
      const costP = Number(v.cost_price || 0);

      totalInventoryUnits += stock;
      totalInventoryValue += stock * saleP;
      totalCostValue += stock * costP;

      if (stock === 0) outOfStockCount++;
      else if (stock <= min) lowStockCount++;
    });

    return {
      salesToday,
      revenueToday,
      salesThisWeek,
      revenueThisWeek,
      revenueThisMonth,
      totalInventoryUnits,
      totalInventoryValue,
      totalCostValue,
      lowStockCount,
      outOfStockCount,
    };
  },
};
