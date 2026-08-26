import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface TransferItem {
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  availableStock: number;
}

export interface CreateTransferDTO {
  tenantId: string;
  userId: string;
  origenLocationId: string;
  destinoLocationId: string;
  items: { variantId: string; quantity: number }[];
  notes?: string;
}

export interface TransferRecord {
  id: string;
  tenantId: string;
  folio: string;
  origenLocationId: string;
  origenLocationName: string;
  destinoLocationId: string;
  destinoLocationName: string;
  status: "pendiente" | "en_transito" | "completada" | "cancelada";
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  items: TransferItemRecord[];
}

export interface TransferItemRecord {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
}

export const transfersService = {
  /**
   * Crea una nueva transferencia entre sucursales en estado "pendiente".
   */
  async createTransfer(dto: CreateTransferDTO): Promise<{ success: boolean; transferId?: string; folio?: string; error?: string }> {
    // 1. Generar folio automático
    const { data: folioData, error: folioError } = await supabase.rpc(
      "generate_transfer_folio",
      { p_tenant_id: dto.tenantId }
    );

    if (folioError) {
      return { success: false, error: "Error al generar folio de transferencia: " + folioError.message };
    }

    const folio = folioData as string;

    // 2. Crear la transferencia principal
    const { data: transfer, error: transferError } = await supabase
      .from("transferencias")
      .insert({
        tenant_id: dto.tenantId,
        folio,
        origen_location_id: dto.origenLocationId,
        destino_location_id: dto.destinoLocationId,
        status: "en_transito",
        notes: dto.notes?.trim() || null,
        created_by: dto.userId,
      })
      .select("id")
      .single();

    if (transferError || !transfer) {
      return { success: false, error: "Error al crear la transferencia: " + transferError?.message };
    }

    const transferId = transfer.id;

    // 3. Insertar el detalle de variantes
    const detalleRows = dto.items.map((item) => ({
      tenant_id: dto.tenantId,
      transferencia_id: transferId,
      variant_id: item.variantId,
      quantity: item.quantity,
    }));

    const { error: detalleError } = await supabase
      .from("detalle_transferencias")
      .insert(detalleRows);

    if (detalleError) {
      return { success: false, error: "Error al guardar el detalle de la transferencia: " + detalleError.message };
    }

    // 4. Registrar movimientos de inventario: SALIDA en origen
    const movimientosSalida = dto.items.map((item) => ({
      tenant_id: dto.tenantId,
      variant_id: item.variantId,
      location_id: dto.origenLocationId,
      type: "SALIDA" as const,
      quantity: item.quantity,
      reason: `Transferencia ${folio} hacia destino`,
      user_id: dto.userId,
    }));

    await supabase.from("movimientos_inventario").insert(movimientosSalida);

    // 5. Registrar movimientos de inventario: ENTRADA en destino
    const movimientosEntrada = dto.items.map((item) => ({
      tenant_id: dto.tenantId,
      variant_id: item.variantId,
      location_id: dto.destinoLocationId,
      type: "ENTRADA" as const,
      quantity: item.quantity,
      reason: `Transferencia ${folio} desde origen`,
      user_id: dto.userId,
    }));

    await supabase.from("movimientos_inventario").insert(movimientosEntrada);

    // 6. Marcar la transferencia como completada
    await supabase
      .from("transferencias")
      .update({ status: "completada", completed_at: new Date().toISOString() })
      .eq("id", transferId);

    return { success: true, transferId, folio };
  },

  /**
   * Obtiene el historial de transferencias del tenant.
   */
  async getTransfers(tenantId: string, limit = 50): Promise<TransferRecord[]> {
    const { data, error } = await supabase
      .from("transferencias")
      .select(`
        id,
        tenant_id,
        folio,
        origen_location_id,
        destino_location_id,
        status,
        notes,
        created_at,
        completed_at,
        origen:ubicaciones!transferencias_origen_location_id_fkey(name),
        destino:ubicaciones!transferencias_destino_location_id_fkey(name),
        detalle_transferencias(
          id,
          variant_id,
          quantity,
          variantes_producto(
            sku,
            productos(name),
            colores(name),
            tallas(name)
          )
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error al obtener transferencias:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      folio: row.folio,
      origenLocationId: row.origen_location_id,
      origenLocationName: row.origen?.name || "Origen",
      destinoLocationId: row.destino_location_id,
      destinoLocationName: row.destino?.name || "Destino",
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      items: (row.detalle_transferencias || []).map((d: any) => {
        const v = d.variantes_producto;
        return {
          id: d.id,
          variantId: d.variant_id,
          sku: v?.sku || "S/SKU",
          productName: v?.productos?.name || "Producto",
          colorName: v?.colores?.name || null,
          sizeName: v?.tallas?.name || null,
          quantity: d.quantity,
        };
      }),
    }));
  },

  /**
   * Obtiene las variantes con sus existencias disponibles en una ubicación específica.
   */
  async getVariantsWithStockAt(tenantId: string, locationId: string): Promise<TransferItem[]> {
    const { data, error } = await supabase
      .from("existencias")
      .select(`
        quantity,
        variant_id,
        variantes_producto!inner(
          sku,
          is_active,
          productos!inner(name),
          colores(name),
          tallas(name)
        )
      `)
      .eq("tenant_id", tenantId)
      .eq("location_id", locationId)
      .gt("quantity", 0);

    if (error) {
      console.error("Error al obtener stock por ubicación:", error);
      return [];
    }

    return (data || [])
      .filter((row: any) => row.variantes_producto?.is_active)
      .map((row: any) => {
        const v = row.variantes_producto;
        return {
          variantId: row.variant_id,
          sku: v?.sku || "S/SKU",
          productName: v?.productos?.name || "Producto",
          colorName: v?.colores?.name || null,
          sizeName: v?.tallas?.name || null,
          quantity: 0,
          availableStock: row.quantity,
        };
      });
  },
};
