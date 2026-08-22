import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface SalesReportRow {
  ticketNumber: string;
  date: string;
  clientName: string;
  sellerName: string;
  paymentMethod: string;
  status: string;
  total: number;
}

export interface InventoryValuationRow {
  sku: string;
  productName: string;
  categoryName: string;
  colorName: string;
  sizeName: string;
  sleeveTypeName: string;
  stock: number;
  costPrice: number;
  salePrice: number;
  totalCostValue: number;
  totalSaleValue: number;
  estimatedProfit: number;
}

export interface SellerPerformanceRow {
  sellerName: string;
  totalSalesCount: number;
  totalRevenue: number;
  averageTicket: number;
}

export const reportsService = {
  /**
   * Obtiene el reporte de ventas por rango de fechas
   */
  async getSalesReport(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SalesReportRow[]> {
    let query = supabase
      .from("ventas")
      .select("ticket_number, created_at, status, total, client_id, seller_id, user_profiles!seller_id(full_name), clientes!client_id(full_name), pagos_venta(method, amount)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00Z`);
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener reporte de ventas:", error.message || error);
      return [];
    }

    return (data || []).map((row: any) => {
      const pMethods = (row.pagos_venta || [])
        .map((p: any) =>
          p.method === "cash"
            ? "Efectivo"
            : p.method === "card"
            ? "Tarjeta"
            : "Transferencia"
        )
        .join(" + ");

      return {
        ticketNumber: row.ticket_number,
        date: new Date(row.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
        clientName: row.clientes?.full_name || "Público General",
        sellerName: row.user_profiles?.full_name || "Vendedor",
        paymentMethod: pMethods || "Efectivo",
        status: row.status === "completed" ? "Completada" : "Cancelada",
        total: Number(row.total || 0),
      };
    });
  },

  /**
   * Obtiene el reporte de inventario valorizado con costo, venta y margen de ganancia proyectada
   */
  async getInventoryValuationReport(tenantId: string): Promise<InventoryValuationRow[]> {
    const { data, error } = await supabase
      .from("variantes_producto")
      .select(`
        sku,
        cost_price,
        sale_price,
        productos!inner(name, categorias(name)),
        colores(name),
        tallas(name),
        tipos_manga(name),
        existencias(quantity)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error || !data) {
      console.error("Error al obtener reporte de valuacion:", error?.message || error);
      return [];
    }

    return data.map((v: any) => {
      const stock = (v.existencias || []).reduce((acc: number, e: any) => acc + (e.quantity || 0), 0);
      const costP = Number(v.cost_price || 0);
      const saleP = Number(v.sale_price || 0);
      const totalCostValue = stock * costP;
      const totalSaleValue = stock * saleP;
      const estimatedProfit = totalSaleValue - totalCostValue;

      return {
        sku: v.sku,
        productName: v.productos?.name || "Guayabera",
        categoryName: v.productos?.categorias?.name || "General",
        colorName: v.colores?.name || "-",
        sizeName: v.tallas?.name || "-",
        sleeveTypeName: v.tipos_manga?.name || "-",
        stock,
        costPrice: costP,
        salePrice: saleP,
        totalCostValue,
        totalSaleValue,
        estimatedProfit,
      };
    });
  },

  /**
   * Obtiene el rendimiento de ventas agrupado por vendedor
   */
  async getSellerPerformanceReport(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SellerPerformanceRow[]> {
    let query = supabase
      .from("ventas")
      .select("total, user_profiles!seller_id(full_name)")
      .eq("tenant_id", tenantId)
      .eq("status", "completed");

    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00Z`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59Z`);

    const { data, error } = await query;

    if (error || !data) {
      console.error("Error al obtener reporte por vendedor:", error?.message || error);
      return [];
    }

    const map: Record<string, { totalSalesCount: number; totalRevenue: number }> = {};

    data.forEach((row: any) => {
      const seller = row.user_profiles?.full_name || "Vendedor General";
      if (!map[seller]) {
        map[seller] = { totalSalesCount: 0, totalRevenue: 0 };
      }
      map[seller].totalSalesCount += 1;
      map[seller].totalRevenue += Number(row.total || 0);
    });

    return Object.entries(map).map(([sellerName, stats]) => ({
      sellerName,
      totalSalesCount: stats.totalSalesCount,
      totalRevenue: stats.totalRevenue,
      averageTicket: stats.totalSalesCount > 0 ? stats.totalRevenue / stats.totalSalesCount : 0,
    }));
  },

  /**
   * Descarga un archivo CSV compatible con Excel (con BOM UTF-8)
   */
  downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? "").replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(",")
      ),
    ].join("\n");

    // Agregar BOM UTF-8 (\uFEFF) para que Excel reconozca tildes y caracteres especiales
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
