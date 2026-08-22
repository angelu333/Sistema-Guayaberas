import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface ProductionStage {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  isFinal: boolean;
  isActive: boolean;
}

export interface ProductionOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  sleeveTypeName: string | null;
  currentStageId: string | null;
  currentStageName: string | null;
  targetQuantity: number;
  completedQuantity: number;
  status: "in_progress" | "completed" | "cancelled";
  assignedTo: string | null;
  targetLocationId: string | null;
  targetLocationName: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateProductionOrderDTO {
  tenantId: string;
  variantId: string;
  targetQuantity: number;
  assignedTo?: string;
  targetLocationId?: string;
  notes?: string;
  userId?: string;
}

export const DEFAULT_GUAYABERA_STAGES = [
  { name: "Corte", sort_order: 1, is_final: false },
  { name: "Alforza-Planchado", sort_order: 2, is_final: false },
  { name: "Bordado", sort_order: 3, is_final: false },
  { name: "Armado", sort_order: 4, is_final: false },
  { name: "Acabado", sort_order: 5, is_final: false },
  { name: "Terminado", sort_order: 6, is_final: true },
];

export const productionService = {
  /**
   * Obtiene las etapas de produccion del tenant. Si no existen, siembra las 6 etapas por defecto de guayaberas.
   */
  async getProductionStages(tenantId: string): Promise<ProductionStage[]> {
    const { data, error } = await supabase
      .from("etapas_produccion")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("Aviso: Ejecute la migración 008_production.sql en Supabase. Usando etapas en memoria:", error.message);
      return DEFAULT_GUAYABERA_STAGES.map((s, idx) => ({
        id: `default-stage-${idx + 1}`,
        tenantId,
        name: s.name,
        sortOrder: s.sort_order,
        isFinal: s.is_final,
        isActive: true,
      }));
    }

    // Si no existen etapas, sembrar las 6 etapas predeterminadas de guayaberas
    if (!data || data.length === 0) {
      const rows = DEFAULT_GUAYABERA_STAGES.map((s) => ({
        tenant_id: tenantId,
        name: s.name,
        sort_order: s.sort_order,
        is_final: s.is_final,
        is_active: true,
      }));

      const { data: seeded, error: seedErr } = await supabase
        .from("etapas_produccion")
        .insert(rows)
        .select();

      if (seedErr || !seeded) {
        console.error("Error al sembrar etapas predeterminadas:", seedErr);
        return DEFAULT_GUAYABERA_STAGES.map((s, idx) => ({
          id: `default-stage-${idx + 1}`,
          tenantId,
          name: s.name,
          sortOrder: s.sort_order,
          isFinal: s.is_final,
          isActive: true,
        }));
      }

      return seeded.map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        sortOrder: row.sort_order,
        isFinal: row.is_final,
        isActive: row.is_active,
      }));
    }

    // Deduplicar etapas por nombre para evitar duplicados en pantalla
    const uniqueStages: ProductionStage[] = [];
    const seenNames = new Set<string>();

    data.forEach((row: any) => {
      const cleanName = (row.name || "").trim().toLowerCase();
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        uniqueStages.push({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          sortOrder: uniqueStages.length + 1,
          isFinal: row.is_final,
          isActive: row.is_active,
        });
      }
    });

    return uniqueStages;
  },

  /**
   * Guarda o actualiza las etapas del taller (agregar, renombrar, reordenar)
   */
  async saveProductionStages(
    tenantId: string,
    stages: { id?: string; name: string; sortOrder: number; isFinal?: boolean }[]
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Desactivar etapas existentes
    await supabase
      .from("etapas_produccion")
      .update({ is_active: false })
      .eq("tenant_id", tenantId);

    // 2. Insertar/Actualizar la nueva lista de etapas
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (s.id) {
        await supabase
          .from("etapas_produccion")
          .update({
            name: s.name.trim(),
            sort_order: i + 1,
            is_final: s.isFinal || i === stages.length - 1,
            is_active: true,
          })
          .eq("id", s.id);
      } else {
        await supabase.from("etapas_produccion").insert({
          tenant_id: tenantId,
          name: s.name.trim(),
          sort_order: i + 1,
          is_final: s.isFinal || i === stages.length - 1,
          is_active: true,
        });
      }
    }

    return { success: true };
  },

  /**
   * Obtiene las ordenes de produccion activas e historicas
   */
  async getProductionOrders(tenantId: string): Promise<ProductionOrder[]> {
    const { data, error } = await supabase
      .from("ordenes_produccion")
      .select(`
        id,
        tenant_id,
        order_number,
        variant_id,
        current_stage_id,
        target_quantity,
        completed_quantity,
        status,
        assigned_to,
        target_location_id,
        notes,
        created_at,
        completed_at,
        etapas_produccion(name),
        ubicaciones(name),
        variantes_producto!inner(
          sku,
          productos!inner(name),
          colores(name),
          tallas(name),
          tipos_manga(name)
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error al obtener ordenes de produccion:", error);
      return [];
    }

    return data.map((r: any) => {
      const v = r.variantes_producto;
      return {
        id: r.id,
        tenantId: r.tenant_id,
        orderNumber: r.order_number,
        variantId: r.variant_id,
        sku: v?.sku || "S/SKU",
        productName: v?.productos?.name || "Guayabera",
        colorName: v?.colores?.name || null,
        sizeName: v?.tallas?.name || null,
        sleeveTypeName: v?.tipos_manga?.name || null,
        currentStageId: r.current_stage_id,
        currentStageName: r.etapas_produccion?.name || "Sin Etapa",
        targetQuantity: r.target_quantity,
        completedQuantity: r.completed_quantity,
        status: r.status,
        assignedTo: r.assigned_to || null,
        targetLocationId: r.target_location_id || null,
        targetLocationName: r.ubicaciones?.name || null,
        notes: r.notes || null,
        createdAt: r.created_at,
        completedAt: r.completed_at || null,
      };
    });
  },

  /**
   * Crea una nueva orden de produccion (lote)
   */
  async createProductionOrder(
    dto: CreateProductionOrderDTO
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const stages = await this.getProductionStages(dto.tenantId);
    if (!stages || stages.length === 0) {
      return { success: false, error: "No hay etapas de producción configuradas." };
    }

    const firstStage = stages[0];

    // Generar numero consecutivo de orden OP-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `OP-${todayStr}-${randomSuffix}`;

    const { data, error } = await supabase
      .from("ordenes_produccion")
      .insert({
        tenant_id: dto.tenantId,
        order_number: orderNumber,
        variant_id: dto.variantId,
        current_stage_id: firstStage.id,
        target_quantity: dto.targetQuantity,
        completed_quantity: 0,
        status: "in_progress",
        assigned_to: dto.assignedTo || null,
        target_location_id: dto.targetLocationId || null,
        notes: dto.notes || null,
        created_by: dto.userId || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error al crear orden de produccion:", error);
      return { success: false, error: error?.message || "Error al crear la orden." };
    }

    return { success: true, orderId: data.id };
  },

  /**
   * Mueve una orden a la siguiente etapa o la finaliza con ingreso a inventario
   */
  async advanceOrderStage(
    order: ProductionOrder,
    nextStage: ProductionStage,
    completedQuantity?: number
  ): Promise<{ success: boolean; error?: string }> {
    // Si la siguiente etapa es la FINAL ("Terminado"), completar orden e ingresar a inventario
    if (nextStage.isFinal) {
      const finalQty = completedQuantity !== undefined ? completedQuantity : order.targetQuantity;

      // 1. Actualizar orden a completed
      const { error: orderErr } = await supabase
        .from("ordenes_produccion")
        .update({
          current_stage_id: nextStage.id,
          status: "completed",
          completed_quantity: finalQty,
          completed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderErr) {
        return { success: false, error: orderErr.message };
      }

      // 2. Ingresar existencias a inventario si hay ubicacion elegida
      let targetLocId = order.targetLocationId;
      if (!targetLocId) {
        const { data: locs } = await supabase
          .from("ubicaciones")
          .select("id")
          .eq("tenant_id", order.tenantId)
          .eq("is_active", true)
          .order("created_at")
          .limit(1);

        targetLocId = locs?.[0]?.id || null;
      }

      if (targetLocId && finalQty > 0) {
        // Upsert existencia
        const { data: exist } = await supabase
          .from("existencias")
          .select("id, quantity")
          .eq("tenant_id", order.tenantId)
          .eq("variant_id", order.variantId)
          .eq("location_id", targetLocId)
          .maybeSingle();

        if (exist) {
          await supabase
            .from("existencias")
            .update({
              quantity: (exist.quantity || 0) + finalQty,
              updated_at: new Date().toISOString(),
            })
            .eq("id", exist.id);
        } else {
          await supabase.from("existencias").insert({
            tenant_id: order.tenantId,
            variant_id: order.variantId,
            location_id: targetLocId,
            quantity: finalQty,
          });
        }

        // Registrar movimiento de inventario PRODUCCION
        await supabase.from("movimientos_inventario").insert({
          tenant_id: order.tenantId,
          variant_id: order.variantId,
          location_id: targetLocId,
          type: "PRODUCCION",
          quantity: finalQty,
          reason: `Producción finalizada ${order.orderNumber}`,
        });
      }

      return { success: true };
    }

    // Avanzar etapa intermedia
    const { error } = await supabase
      .from("ordenes_produccion")
      .update({
        current_stage_id: nextStage.id,
      })
      .eq("id", order.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },
};
