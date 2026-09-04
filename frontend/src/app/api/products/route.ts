import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Cliente Supabase Admin para consultas directas de alto rendimiento (bypasses RLS bottleneck)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const colorId = searchParams.get("colorId");
    const sizeId = searchParams.get("sizeId");
    const search = searchParams.get("search");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId es requerido" },
        { status: 400 }
      );
    }

    // 1. Obtener todas las variantes activas del tenant en una sola consulta indexada
    let query = supabaseAdmin
      .from("variantes_producto")
      .select(`
        id,
        tenant_id,
        product_id,
        color_id,
        size_id,
        sleeve_type_id,
        sku,
        cost_price,
        sale_price,
        min_stock,
        is_active,
        created_at,
        updated_at,
        product:productos(
          id, 
          name, 
          description, 
          category_id, 
          image_url,
          is_active, 
          category:categorias(id, name)
        ),
        color:colores(id, name, hex_code),
        size:tallas(id, name, sort_order),
        sleeveType:tipos_manga(id, name)
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    if (colorId) {
      query = query.eq("color_id", colorId);
    }

    if (sizeId) {
      query = query.eq("size_id", sizeId);
    }

    const { data: rawVariants, error: varError } = await query;

    if (varError) {
      console.error("Error al consultar variantes:", varError);
      return NextResponse.json(
        { error: `Error al obtener productos: ${varError.message}` },
        { status: 500 }
      );
    }

    const rawVariantIds = (rawVariants || []).map((item: any) => item.id);

    // 2. Consultas en paralelo para imágenes de variante y existencias
    const [varImgsRes, stockRes] = await Promise.all([
      rawVariantIds.length > 0
        ? supabaseAdmin
            .from("imagenes_variante")
            .select("id, variant_id, url, sort_order, is_primary")
            .in("variant_id", rawVariantIds)
        : Promise.resolve({ data: [] }),
      rawVariantIds.length > 0
        ? supabaseAdmin
            .from("existencias")
            .select("variant_id, location_id, quantity, ubicaciones(name)")
            .in("variant_id", rawVariantIds)
        : Promise.resolve({ data: [] }),
    ]);

    const varImgsMap = new Map<string, any[]>();
    (varImgsRes.data || []).forEach((img: any) => {
      if (!varImgsMap.has(img.variant_id)) varImgsMap.set(img.variant_id, []);
      varImgsMap.get(img.variant_id)!.push(img);
    });

    const stockMap = new Map<string, { total: number; locations: any[] }>();
    (stockRes.data || []).forEach((s: any) => {
      const current = stockMap.get(s.variant_id) || { total: 0, locations: [] };
      current.total += s.quantity || 0;
      current.locations.push({
        locationId: s.location_id,
        locationName: s.ubicaciones?.name || "Ubicación",
        quantity: s.quantity || 0,
      });
      stockMap.set(s.variant_id, current);
    });

    // 3. Mapeo estructurado
    let variants = (rawVariants || []).map((item: any) => ({
      id: item.id,
      tenantId: item.tenant_id,
      productId: item.product_id,
      product: item.product
        ? {
            id: item.product.id,
            tenantId: item.tenant_id,
            name: item.product.name,
            description: item.product.description,
            categoryId: item.product.category_id,
            imageUrl: item.product.image_url || null,
            images: item.product.image_url
              ? [{ id: "primary", url: item.product.image_url, sortOrder: 1, isPrimary: true }]
              : [],
            category: item.product.category
              ? {
                  id: item.product.category.id,
                  tenantId: item.tenant_id,
                  name: item.product.category.name,
                  isActive: true,
                }
              : null,
            isActive: item.product.is_active,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }
        : null,
      colorId: item.color_id,
      color: item.color
        ? {
            id: item.color.id,
            tenantId: item.tenant_id,
            name: item.color.name,
            hexCode: item.color.hex_code,
            isActive: true,
          }
        : null,
      sizeId: item.size_id,
      size: item.size
        ? {
            id: item.size.id,
            tenantId: item.tenant_id,
            name: item.size.name,
            sortOrder: item.size.sort_order,
            isActive: true,
          }
        : null,
      sleeveTypeId: item.sleeve_type_id,
      sleeveType: item.sleeveType
        ? {
            id: item.sleeveType.id,
            tenantId: item.tenant_id,
            name: item.sleeveType.name,
            isActive: true,
          }
        : null,
      sku: item.sku,
      costPrice: Number(item.cost_price || 0),
      salePrice: Number(item.sale_price || 0),
      minStock: item.min_stock || 0,
      isActive: item.is_active,
      images: (varImgsMap.get(item.id) || []).map((img: any) => ({
        id: img.id,
        variantId: item.id,
        url: img.url,
        sortOrder: img.sort_order,
        isPrimary: img.is_primary,
      })),
      totalStock: stockMap.get(item.id)?.total ?? 0,
      stockByLocation: stockMap.get(item.id)?.locations ?? [],
    }));

    // Filtros opcionales
    if (categoryId) {
      variants = variants.filter((v: any) => v.product?.categoryId === categoryId);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      variants = variants.filter(
        (v: any) =>
          v.sku.toLowerCase().includes(q) ||
          v.product?.name.toLowerCase().includes(q) ||
          v.color?.name.toLowerCase().includes(q) ||
          v.size?.name.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(variants, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/products:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
