import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  type: "taller" | "telas" | "insumos" | "bordado" | "otro";
  city: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseItemDTO {
  variantId: string;
  quantity: number;
  unitCost: number;
  locationId?: string;
}

export interface PurchaseRecord {
  id: string;
  tenantId: string;
  orderNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  status: "pending" | "received" | "cancelled";
  totalCost: number;
  notes: string | null;
  createdAt: string;
  receivedAt: string | null;
  details: PurchaseDetailRecord[];
}

export interface PurchaseDetailRecord {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitCost: number;
  locationId: string | null;
  locationName: string | null;
}

export const suppliersService = {
  /**
   * Obtiene la lista de proveedores del tenant
   */
  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error al obtener proveedores:", error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      contactName: r.contact_name || null,
      phone: r.phone || null,
      email: r.email || null,
      type: r.type,
      city: r.city || null,
      notes: r.notes || null,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  },

  /**
   * Crea un nuevo proveedor
   */
  async createSupplier(
    tenantId: string,
    supplier: Omit<Supplier, "id" | "tenantId" | "isActive" | "createdAt">
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from("proveedores")
      .insert({
        tenant_id: tenantId,
        name: supplier.name.trim(),
        contact_name: supplier.contactName?.trim() || null,
        phone: supplier.phone?.trim() || null,
        email: supplier.email?.trim() || null,
        type: supplier.type || "telas",
        city: supplier.city?.trim() || null,
        notes: supplier.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Error al crear proveedor" };
    }

    return { success: true, id: data.id };
  },

  /**
   * Desactiva a un proveedor
   */
  async deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("proveedores")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Obtiene las ordenes de compra registradas
   */
  async getPurchases(tenantId: string): Promise<PurchaseRecord[]> {
    const { data, error } = await supabase
      .from("compras")
      .select(`
        id,
        tenant_id,
        order_number,
        supplier_id,
        status,
        total_cost,
        notes,
        created_at,
        received_at,
        proveedores(name),
        detalle_compras(
          id,
          variant_id,
          quantity,
          unit_cost,
          location_id,
          ubicaciones(name),
          variantes_producto(
            sku,
            productos(name),
            colores(name),
            tallas(name)
          )
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error al obtener compras:", error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      orderNumber: r.order_number,
      supplierId: r.supplier_id || null,
      supplierName: r.proveedores?.name || "Sin Proveedor",
      status: r.status,
      totalCost: Number(r.total_cost || 0),
      notes: r.notes || null,
      createdAt: r.created_at,
      receivedAt: r.received_at || null,
      details: (r.detalle_compras || []).map((d: any) => {
        const v = d.variantes_producto;
        return {
          id: d.id,
          variantId: d.variant_id,
          sku: v?.sku || "S/SKU",
          productName: v?.productos?.name || "Guayabera",
          colorName: v?.colores?.name || null,
          sizeName: v?.tallas?.name || null,
          quantity: d.quantity,
          unitCost: Number(d.unit_cost || 0),
          locationId: d.location_id || null,
          locationName: d.ubicaciones?.name || null,
        };
      }),
    }));
  },

  /**
   * Crea una nueva orden de compra
   */
  async createPurchase(
    tenantId: string,
    supplierId: string | null,
    items: PurchaseItemDTO[],
    notes?: string,
    userId?: string
  ): Promise<{ success: boolean; purchaseId?: string; orderNumber?: string; error?: string }> {
    if (items.length === 0) {
      return { success: false, error: "La compra debe tener al menos un producto." };
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `CO-${todayStr}-${randomSuffix}`;

    const totalCost = items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);

    const { data: purchase, error: purchaseErr } = await supabase
      .from("compras")
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        supplier_id: supplierId || null,
        status: "pending",
        total_cost: totalCost,
        notes: notes?.trim() || null,
        created_by: userId || null,
      })
      .select("id")
      .single();

    if (purchaseErr || !purchase) {
      return { success: false, error: purchaseErr?.message || "Error al crear la compra." };
    }

    const detailRows = items.map((item) => ({
      tenant_id: tenantId,
      purchase_id: purchase.id,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      location_id: item.locationId || null,
    }));

    const { error: detailErr } = await supabase.from("detalle_compras").insert(detailRows);

    if (detailErr) {
      console.error("Error al insertar detalle de compra:", detailErr);
    }

    return { success: true, purchaseId: purchase.id, orderNumber };
  },

  /**
   * Recibe una orden de compra e ingresa automáticamente las existencias mediante movimientos_inventario tipo ENTRADA
   */
  async receivePurchase(
    purchase: PurchaseRecord
  ): Promise<{ success: boolean; error?: string }> {
    if (purchase.status === "received") {
      return { success: false, error: "Esta compra ya fue recibida anteriormente." };
    }

    // 1. Obtener ubicacion por defecto si algun detalle no tiene location_id
    const { data: locs } = await supabase
      .from("ubicaciones")
      .select("id")
      .eq("tenant_id", purchase.tenantId)
      .eq("is_active", true)
      .order("created_at")
      .limit(1);

    const defaultLocationId = locs?.[0]?.id || null;

    // 2. Insertar movimiento de inventario ENTRADA por cada detalle
    for (const d of purchase.details) {
      const locId = d.locationId || defaultLocationId;
      if (locId && d.quantity > 0) {
        await supabase.from("movimientos_inventario").insert({
          tenant_id: purchase.tenantId,
          variant_id: d.variantId,
          location_id: locId,
          type: "ENTRADA",
          quantity: d.quantity,
          reason: `Recepción de compra ${purchase.orderNumber}`,
        });
      }
    }

    // 3. Marcar la compra como received
    const { error } = await supabase
      .from("compras")
      .update({
        status: "received",
        received_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // 4. Bitacora de auditoria
    await supabase.from("auditoria").insert({
      tenant_id: purchase.tenantId,
      entity: "INVENTARIO",
      action: "CREAR",
      details: `Recepción de compra ${purchase.orderNumber} ($${purchase.totalCost.toFixed(2)} MXN)`,
      new_data: {
        orderNumber: purchase.orderNumber,
        totalCost: purchase.totalCost,
        supplierName: purchase.supplierName,
      },
    });

    return { success: true };
  },
};
