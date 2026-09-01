import { createClient } from "@/lib/supabase/client";
import type { Location, StockAlert } from "@/types/domain.types";

const supabase = createClient();

export interface StockItemView {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  categoryName: string;
  colorName: string | null;
  sizeName: string | null;
  sleeveTypeName: string | null;
  locationId: string;
  locationName: string;
  quantity: number;
  minStock: number;
  costPrice?: number;
  salePrice: number;
  updatedAt: string;
}

export interface InventoryMovementRecord {
  id: string;
  tenantId: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  locationId: string;
  locationName: string;
  type: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'DEVOLUCION';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  userId: string | null;
  createdAt: string;
}

export interface RegisterMovementParams {
  tenantId: string;
  variantId: string;
  locationId: string;
  type: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'DEVOLUCION';
  quantity: number;
  reason?: string;
  userId?: string;
}

export const inventoryService = {
  /**
   * Obtiene la lista de ubicaciones activas del tenant (bodegas/tiendas).
   * Si el tenant no tiene ninguna creada aun, crea automaticamente "Bodega Principal".
   */
  async getLocations(tenantId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from("ubicaciones")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error al obtener ubicaciones:", error);
      return [];
    }

    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
      }));
    }

    // Auto-crear "Bodega Principal" por defecto
    const { data: newLoc, error: createError } = await supabase
      .from("ubicaciones")
      .insert({
        tenant_id: tenantId,
        name: "Bodega Principal",
        description: "Ubicación predeterminada del negocio",
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newLoc) {
      console.error("Error al auto-crear ubicación por defecto:", createError);
      return [];
    }

    return [{
      id: newLoc.id,
      tenantId: newLoc.tenant_id,
      name: newLoc.name,
      description: newLoc.description,
      isActive: newLoc.is_active,
    }];
  },

  /**
   * Obtiene TODAS las variantes del tenant para el modal de ajuste (incluso con stock 0)
   */
  async getAllVariantsForAdjustment(tenantId: string): Promise<StockItemView[]> {
    const { data, error } = await supabase
      .from("variantes_producto")
      .select(`
        id,
        sku,
        sale_price,
        min_stock,
        productos!inner(
          name,
          categorias(name)
        ),
        colores(name),
        tallas(name),
        tipos_manga(name),
        existencias(
          quantity,
          location_id,
          ubicaciones(name)
        )
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error) {
      console.error("Error al obtener variantes para ajuste:", error);
      return [];
    }

    return (data || []).map((v: any) => {
      const p = v.productos;
      const totalStock = (v.existencias || []).reduce(
        (acc: number, curr: any) => acc + (curr.quantity || 0),
        0
      );
      return {
        id: v.id,
        variantId: v.id,
        sku: v.sku || "S/SKU",
        productName: p?.name || "Sin Nombre",
        categoryName: p?.categorias?.name || "Sin Categoría",
        colorName: v.colores?.name || null,
        sizeName: v.tallas?.name || null,
        sleeveTypeName: v.tipos_manga?.name || null,
        locationId: "",
        locationName: "Bodega Principal",
        quantity: totalStock,
        minStock: v.min_stock || 0,
        salePrice: Number(v.sale_price || 0),
        updatedAt: new Date().toISOString(),
      };
    });
  },

  /**
   * Obtiene las existencias desglosadas por variante y ubicación.
   * Si una variante no tiene fila en existencias, se incluye con cantidad 0.
   */
  async getStockByLocation(
    tenantId: string,
    locationId?: string
  ): Promise<StockItemView[]> {
    // 1. Obtener todas las variantes activas del tenant
    const { data: variants, error: varError } = await supabase
      .from("variantes_producto")
      .select(`
        id,
        sku,
        cost_price,
        sale_price,
        min_stock,
        productos!inner(
          name,
          categorias(name)
        ),
        colores(name),
        tallas(name),
        tipos_manga(name),
        existencias(
          id,
          quantity,
          location_id,
          updated_at,
          ubicaciones(name)
        )
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (varError) {
      console.error("Error al obtener variantes para inventario:", varError);
      return [];
    }

    const result: StockItemView[] = [];

    (variants || []).forEach((v: any) => {
      const p = v.productos;
      const existenciasList = v.existencias || [];

      if (existenciasList.length === 0) {
        // Variante sin existencias registradas todavía -> mostrar con cantidad 0
        result.push({
          id: `virtual-${v.id}`,
          variantId: v.id,
          sku: v.sku || "S/SKU",
          productName: p?.name || "Sin Nombre",
          categoryName: p?.categorias?.name || "Sin Categoría",
          colorName: v.colores?.name || null,
          sizeName: v.tallas?.name || null,
          sleeveTypeName: v.tipos_manga?.name || null,
          locationId: "",
          locationName: "Bodega Principal",
          quantity: 0,
          minStock: v.min_stock || 5,
          costPrice: Number(v.cost_price || 0),
          salePrice: Number(v.sale_price || 0),
          updatedAt: new Date().toISOString(),
        });
      } else {
        existenciasList.forEach((ex: any) => {
          if (locationId && ex.location_id !== locationId) return;

          result.push({
            id: ex.id,
            variantId: v.id,
            sku: v.sku || "S/SKU",
            productName: p?.name || "Sin Nombre",
            categoryName: p?.categorias?.name || "Sin Categoría",
            colorName: v.colores?.name || null,
            sizeName: v.tallas?.name || null,
            sleeveTypeName: v.tipos_manga?.name || null,
            locationId: ex.location_id,
            locationName: ex.ubicaciones?.name || "Bodega Principal",
            quantity: ex.quantity,
            minStock: v.min_stock || 5,
            costPrice: Number(v.cost_price || 0),
            salePrice: Number(v.sale_price || 0),
            updatedAt: ex.updated_at,
          });
        });
      }
    });

    return result;
  },

  /**
   * Registra un movimiento de inventario (Entrada, Ajuste o Salida)
   * El trigger en PostgreSQL actualizará automáticamente la tabla `existencias`
   */
  async registerMovement(
    params: RegisterMovementParams
  ): Promise<{ success: boolean; error?: string }> {
    const { tenantId, variantId, locationId, type, quantity, reason, userId } = params;

    const { error } = await supabase.from("movimientos_inventario").insert({
      tenant_id: tenantId,
      variant_id: variantId,
      location_id: locationId,
      type,
      quantity,
      reason: reason || null,
      user_id: userId || null,
    });

    if (error) {
      console.error("Error al registrar movimiento:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Obtiene el historial de movimientos de auditoría con detalles del producto
   */
  async getMovementHistory(
    tenantId: string,
    limit: number = 50
  ): Promise<InventoryMovementRecord[]> {
    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select(`
        id,
        tenant_id,
        variant_id,
        location_id,
        type,
        quantity,
        quantity_before,
        quantity_after,
        reason,
        user_id,
        created_at,
        ubicaciones(name),
        variantes_producto(
          sku,
          productos(name),
          colores(name),
          tallas(name)
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error al obtener historial de movimientos:", error);
      return [];
    }

    return (data || []).map((row: any) => {
      const v = row.variantes_producto;
      const p = v?.productos;
      return {
        id: row.id,
        tenantId: row.tenant_id,
        variantId: row.variant_id,
        sku: v?.sku || "S/SKU",
        productName: p?.name || "Producto",
        colorName: v?.colores?.name || null,
        sizeName: v?.tallas?.name || null,
        locationId: row.location_id,
        locationName: row.ubicaciones?.name || "Bodega Principal",
        type: row.type,
        quantity: row.quantity,
        quantityBefore: row.quantity_before,
        quantityAfter: row.quantity_after,
        reason: row.reason,
        userId: row.user_id,
        createdAt: row.created_at,
      };
    });
  },

  /**
   * Obtiene las alertas de variantes con bajo stock o stock en 0 (agotado).
   * Si se provee locationId, evalúa el stock exclusivamente de esa sucursal.
   */
  async getStockAlerts(tenantId: string, locationId?: string): Promise<StockAlert[]> {
    const { data, error } = await supabase
      .from("variantes_producto")
      .select(`
        id,
        sku,
        min_stock,
        productos!inner(name),
        colores(name),
        tallas(name),
        existencias(quantity, location_id)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error) {
      console.error("Error al obtener alertas de stock:", error);
      return [];
    }

    const alerts: StockAlert[] = [];

    (data || []).forEach((v: any) => {
      const filteredExistencias = (v.existencias || []).filter((ex: any) =>
        locationId ? ex.location_id === locationId : true
      );
      const totalStock = filteredExistencias.reduce(
        (acc: number, curr: any) => acc + (curr.quantity || 0),
        0
      );
      const minStock = v.min_stock || 5;

      if (totalStock <= minStock) {
        alerts.push({
          variantId: v.id,
          sku: v.sku,
          productName: v.productos?.name || "Guayabera",
          colorName: v.colores?.name || null,
          sizeName: v.tallas?.name || null,
          currentStock: totalStock,
          minStock,
          isOutOfStock: totalStock === 0,
        });
      }
    });

    return alerts.sort((a, b) => a.currentStock - b.currentStock);
  },
};
