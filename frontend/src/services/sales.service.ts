import { createClient } from "@/lib/supabase/client";
import type { CartItem, PaymentMethod } from "@/types/domain.types";

const supabase = createClient();

export interface CompleteSaleParams {
  tenantId: string;
  sellerId: string;
  items: CartItem[];
  payments: { method: PaymentMethod; amount: number }[];
  clientId?: string | null;
  globalDiscountPercent?: number;
  notes?: string;
  /** ID de la sucursal/ubicación donde se realiza la venta */
  locationId?: string | null;
}

export interface SaleRecord {
  id: string;
  tenantId: string;
  ticketNumber: string;
  clientId: string | null;
  clientName: string | null;
  sellerName: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items: SaleItemRecord[];
  payments: SalePaymentRecord[];
}

export interface SaleItemRecord {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  subtotal: number;
}

export interface SalePaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
}

export const salesService = {
  /**
   * Completa una venta de forma atomica:
   * 1. Genera numero de ticket
   * 2. Inserta venta principal
   * 3. Inserta detalle por cada item
   * 4. Inserta pagos
   * 5. Registra movimiento de inventario tipo VENTA por cada item
   */
  async completeSale(
    params: CompleteSaleParams
  ): Promise<{ success: boolean; saleId?: string; ticketNumber?: string; error?: string }> {
    const {
      tenantId,
      sellerId,
      items,
      payments,
      clientId = null,
      globalDiscountPercent = 0,
      notes = "",
      locationId = null,
    } = params;

    // Calcular totales
    const subtotal = items.reduce((acc, item) => {
      const line = item.unitPrice * item.quantity;
      const lineDiscount = line * (item.discountPercent / 100);
      return acc + (line - lineDiscount);
    }, 0);

    const discountAmount = subtotal * (globalDiscountPercent / 100);
    const total = subtotal - discountAmount;

    // 1. Generar numero de ticket
    const { data: ticketData, error: ticketError } = await supabase.rpc(
      "generate_ticket_number",
      { p_tenant_id: tenantId }
    );

    if (ticketError) {
      return { success: false, error: "Error al generar numero de ticket: " + ticketError.message };
    }

    const ticketNumber = ticketData as string;

    // 2. Insertar venta principal (con sucursal activa si se provee)
    const { data: sale, error: saleError } = await supabase
      .from("ventas")
      .insert({
        tenant_id: tenantId,
        ticket_number: ticketNumber,
        client_id: clientId || null,
        seller_id: sellerId,
        location_id: locationId || null,
        subtotal,
        discount_amount: discountAmount,
        total,
        status: "completed",
        notes: notes || null,
      })
      .select("id")
      .single();

    if (saleError || !sale) {
      return { success: false, error: "Error al registrar la venta: " + saleError?.message };
    }

    const saleId = sale.id;

    // 3. Insertar detalle de items
    const detalleRows = items.map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const lineDiscount = lineTotal * (item.discountPercent / 100);
      return {
        tenant_id: tenantId,
        sale_id: saleId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_pct: item.discountPercent,
        subtotal: lineTotal - lineDiscount,
      };
    });

    const { error: detalleError } = await supabase
      .from("detalle_ventas")
      .insert(detalleRows);

    if (detalleError) {
      return { success: false, error: "Error al guardar el detalle de la venta: " + detalleError.message };
    }

    // 4. Insertar pagos
    const pagoRows = payments.map((p) => ({
      tenant_id: tenantId,
      sale_id: saleId,
      method: p.method,
      amount: p.amount,
    }));

    const { error: pagoError } = await supabase
      .from("pagos_venta")
      .insert(pagoRows);

    if (pagoError) {
      return { success: false, error: "Error al registrar el pago: " + pagoError.message };
    }

    // 5. Registrar movimiento de inventario VENTA por cada item
    // Usar la sucursal activa si se provee, si no buscar la primera del tenant
    let resolvedLocationId = locationId || null;

    if (!resolvedLocationId) {
      const { data: ubicaciones } = await supabase
        .from("ubicaciones")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at")
        .limit(1);
      resolvedLocationId = ubicaciones?.[0]?.id || null;
    }

    if (resolvedLocationId) {
      const movimientoRows = items.map((item) => ({
        tenant_id: tenantId,
        variant_id: item.variantId,
        location_id: resolvedLocationId,
        type: "VENTA",
        quantity: item.quantity,
        reason: `Venta ${ticketNumber}`,
        user_id: sellerId,
      }));

      await supabase.from("movimientos_inventario").insert(movimientoRows);
    }

    return { success: true, saleId, ticketNumber };
  },

  /**
   * Obtiene el historial de ventas del tenant
   */
  async getSalesHistory(
    tenantId: string,
    limit: number = 50
  ): Promise<SaleRecord[]> {
    const { data, error } = await supabase
      .from("ventas")
      .select(`
        id,
        tenant_id,
        ticket_number,
        client_id,
        seller_id,
        subtotal,
        discount_amount,
        total,
        status,
        notes,
        created_at,
        clientes(full_name),
        user_profiles!seller_id(full_name),
        detalle_ventas(
          id,
          variant_id,
          quantity,
          unit_price,
          discount_pct,
          subtotal,
          variantes_producto(
            sku,
            productos(name),
            colores(name),
            tallas(name)
          )
        ),
        pagos_venta(
          id,
          method,
          amount
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error al obtener historial de ventas:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      ticketNumber: row.ticket_number,
      clientId: row.client_id,
      clientName: row.clientes?.full_name || null,
      sellerName: row.user_profiles?.full_name || null,
      subtotal: Number(row.subtotal),
      discountAmount: Number(row.discount_amount),
      total: Number(row.total),
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      items: (row.detalle_ventas || []).map((d: any) => {
        const v = d.variantes_producto;
        return {
          id: d.id,
          variantId: d.variant_id,
          sku: v?.sku || "S/SKU",
          productName: v?.productos?.name || "Producto",
          colorName: v?.colores?.name || null,
          sizeName: v?.tallas?.name || null,
          quantity: d.quantity,
          unitPrice: Number(d.unit_price),
          discountPct: Number(d.discount_pct),
          subtotal: Number(d.subtotal),
        };
      }),
      payments: (row.pagos_venta || []).map((p: any) => ({
        id: p.id,
        method: p.method as PaymentMethod,
        amount: Number(p.amount),
      })),
    }));
  },

  /**
   * Cancela una venta (admin only) y devuelve el stock
   */
  async cancelSale(
    tenantId: string,
    saleId: string,
    sellerId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("ventas")
      .update({ status: "cancelled" })
      .eq("id", saleId)
      .eq("tenant_id", tenantId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Obtiene metricas rapidas de ventas
   */
  async getSalesMetrics(tenantId: string): Promise<{
    salesToday: number;
    revenueToday: number;
    salesThisWeek: number;
    revenueThisWeek: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("ventas")
      .select("total, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("created_at", weekAgo);

    if (error || !data) {
      return { salesToday: 0, revenueToday: 0, salesThisWeek: 0, revenueThisWeek: 0 };
    }

    let salesToday = 0;
    let revenueToday = 0;
    let salesThisWeek = 0;
    let revenueThisWeek = 0;

    data.forEach((row: any) => {
      const saleDate = row.created_at.split("T")[0];
      const amount = Number(row.total);

      salesThisWeek++;
      revenueThisWeek += amount;

      if (saleDate === today) {
        salesToday++;
        revenueToday += amount;
      }
    });

    return { salesToday, revenueToday, salesThisWeek, revenueThisWeek };
  },
};
