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

export const dashboardService = {
  /**
   * Obtiene las ventas diarias acumuladas de los ultimos 7 dias para la grafica de tendencia
   */
  async getWeeklySalesData(tenantId: string): Promise<DaySalesChartItem[]> {
    const days: DaySalesChartItem[] = [];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    // Generar ultimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = dayNames[d.getDay()];

      days.push({
        dayName: i === 0 ? "Hoy" : dayName,
        date: dateStr,
        total: 0,
        count: 0,
      });
    }

    const startDate = days[0].date;

    const { data, error } = await supabase
      .from("ventas")
      .select("total, created_at, status")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("created_at", `${startDate}T00:00:00Z`);

    if (error || !data) {
      console.error("Error al obtener ventas semanales:", error);
      return days;
    }

    data.forEach((row: any) => {
      const saleDate = row.created_at.split("T")[0];
      const targetDay = days.find((d) => d.date === saleDate);
      if (targetDay) {
        targetDay.total += Number(row.total || 0);
        targetDay.count += 1;
      }
    });

    return days;
  },

  /**
   * Obtiene los productos/modelos mas vendidos del tenant
   */
  async getTopProductsData(tenantId: string, limit: number = 5): Promise<TopProductChartItem[]> {
    const { data, error } = await supabase
      .from("detalle_ventas")
      .select(`
        quantity,
        subtotal,
        variantes_producto!inner(
          sku,
          productos!inner(name)
        )
      `)
      .eq("tenant_id", tenantId);

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
   * Obtiene las metricas financieras y de inventario avanzadas
   */
  async getAdvancedMetrics(tenantId: string): Promise<AdvancedDashboardMetrics> {
    const today = new Date().toISOString().split("T")[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Ventas
    const { data: salesData } = await supabase
      .from("ventas")
      .select("total, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "completed");

    let salesToday = 0;
    let revenueToday = 0;
    let salesThisWeek = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;

    (salesData || []).forEach((s: any) => {
      const date = s.created_at.split("T")[0];
      const amount = Number(s.total || 0);

      if (date >= firstDayOfMonth) {
        revenueThisMonth += amount;
      }
      if (date >= weekAgo) {
        salesThisWeek++;
        revenueThisWeek += amount;
      }
      if (date === today) {
        salesToday++;
        revenueToday += amount;
      }
    });

    // Inventario y valuacion
    const { data: variantsData } = await supabase
      .from("variantes_producto")
      .select(`
        id,
        sale_price,
        cost_price,
        min_stock,
        existencias(quantity)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

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

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= min) {
        lowStockCount++;
      }
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
