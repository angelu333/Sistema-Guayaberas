import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Cliente Supabase Admin para consultas directas sin cuello de botella de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const locationId = searchParams.get("locationId") || undefined;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId es requerido" },
        { status: 400 }
      );
    }

    // Ejecutar consultas en paralelo sin bloqueo de RLS
    const [variantsRes, locationsRes, movementsRes] = await Promise.all([
      supabaseAdmin
        .from("variantes_producto")
        .select(`
          id,
          sku,
          cost_price,
          sale_price,
          min_stock,
          is_active,
          productos!inner(
            name,
            categorias(name)
          ),
          colores(name),
          tallas(name),
          tipos_manga(name)
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true),

      supabaseAdmin
        .from("ubicaciones")
        .select("id, tenant_id, name, description, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name"),

      supabaseAdmin
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
          variantes_producto(
            sku,
            productos(name),
            colores(name),
            tallas(name)
          ),
          ubicaciones(name)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const variants = variantsRes.data || [];
    const locations = locationsRes.data || [];
    const vIds = variants.map((v: any) => v.id);

    // Obtener existencias
    let stockQuery = supabaseAdmin
      .from("existencias")
      .select(`
        id,
        variant_id,
        quantity,
        location_id,
        updated_at,
        ubicaciones(name)
      `)
      .in("variant_id", vIds.length > 0 ? vIds : ["00000000-0000-0000-0000-000000000000"]);

    if (locationId) {
      stockQuery = stockQuery.eq("location_id", locationId);
    }

    const { data: stockData } = await stockQuery;

    const existenciasMap = new Map<string, any[]>();
    (stockData || []).forEach((st: any) => {
      if (!existenciasMap.has(st.variant_id)) existenciasMap.set(st.variant_id, []);
      existenciasMap.get(st.variant_id)!.push(st);
    });

    const stockItems: any[] = [];
    const alerts: any[] = [];

    variants.forEach((v: any) => {
      const p = v.productos;
      const existenciasList = existenciasMap.get(v.id) || [];
      const minStock = v.min_stock || 5;

      if (existenciasList.length === 0) {
        // Sin existencias
        stockItems.push({
          id: `virtual-${v.id}`,
          variantId: v.id,
          sku: v.sku || "S/SKU",
          productName: p?.name || "Sin Nombre",
          categoryName: p?.categorias?.name || "Sin Categoría",
          colorName: v.colores?.name || null,
          sizeName: v.tallas?.name || null,
          sleeveTypeName: v.tipos_manga?.name || null,
          locationId: locationId || "",
          locationName: "Bodega Principal",
          quantity: 0,
          minStock,
          costPrice: Number(v.cost_price || 0),
          salePrice: Number(v.sale_price || 0),
          updatedAt: new Date().toISOString(),
        });

        alerts.push({
          variantId: v.id,
          sku: v.sku || "S/SKU",
          productName: p?.name || "Sin Nombre",
          colorName: v.colores?.name || null,
          sizeName: v.tallas?.name || null,
          sleeveTypeName: v.tipos_manga?.name || null,
          locationId: locationId || "",
          locationName: "Bodega Principal",
          currentStock: 0,
          minStock,
          isOutOfStock: true,
        });
      } else {
        let totalVariantStock = 0;
        existenciasList.forEach((ex: any) => {
          if (locationId && ex.location_id !== locationId) return;

          const qty = ex.quantity || 0;
          totalVariantStock += qty;

          stockItems.push({
            id: ex.id,
            variantId: v.id,
            sku: v.sku || "S/SKU",
            productName: p?.name || "Sin Nombre",
            categoryName: p?.categorias?.name || "Sin Categoría",
            colorName: v.colores?.name || null,
            sizeName: v.tallas?.name || null,
            sleeveTypeName: v.tipos_manga?.name || null,
            locationId: ex.location_id,
            locationName: ex.ubicaciones?.name || "Ubicación",
            quantity: qty,
            minStock,
            costPrice: Number(v.cost_price || 0),
            salePrice: Number(v.sale_price || 0),
            updatedAt: ex.updated_at || new Date().toISOString(),
          });

          if (qty <= minStock) {
            alerts.push({
              variantId: v.id,
              sku: v.sku || "S/SKU",
              productName: p?.name || "Sin Nombre",
              colorName: v.colores?.name || null,
              sizeName: v.tallas?.name || null,
              sleeveTypeName: v.tipos_manga?.name || null,
              locationId: ex.location_id,
              locationName: ex.ubicaciones?.name || "Ubicación",
              currentStock: qty,
              minStock,
              isOutOfStock: qty === 0,
            });
          }
        });
      }
    });

    // Mapear historial de movimientos
    const movements = (movementsRes.data || []).map((row: any) => {
      const v = row.variantes_producto;
      return {
        id: row.id,
        tenantId: row.tenant_id,
        variantId: row.variant_id,
        sku: v?.sku || "S/SKU",
        productName: v?.productos?.name || "Producto Desconocido",
        colorName: v?.colores?.name || null,
        sizeName: v?.tallas?.name || null,
        locationId: row.location_id,
        locationName: row.ubicaciones?.name || "Ubicación",
        type: row.type,
        quantity: row.quantity,
        quantityBefore: row.quantity_before ?? 0,
        quantityAfter: row.quantity_after ?? 0,
        reason: row.reason,
        userId: row.user_id,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      stockItems,
      movements,
      alerts,
      locations: locations.map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
      })),
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/inventory:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
