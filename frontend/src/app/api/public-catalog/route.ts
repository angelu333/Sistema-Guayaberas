import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const tenantIdParam = searchParams.get("tenantId");

    let tenantId = tenantIdParam;
    let tenantData: any = null;

    if (slug) {
      const rawSlug = decodeURIComponent(slug || "").trim();
      const cleanSlugWithoutPrefix = rawSlug.replace(/^guayaberas-?/i, "");

      // 1. Búsqueda por slug
      const { data: tData } = await supabaseAdmin
        .from("tenants")
        .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active, tenant_settings(ticket_header)")
        .or(`slug.eq.${rawSlug},slug.eq.${cleanSlugWithoutPrefix}`)
        .eq("is_active", true)
        .maybeSingle();

      tenantData = tData;

      if (!tenantData) {
        // Fallback por nombre
        const searchName = cleanSlugWithoutPrefix.replace(/-/g, " ").replace(/&/g, "").trim();
        const { data: fallbackData } = await supabaseAdmin
          .from("tenants")
          .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active, tenant_settings(ticket_header)")
          .ilike("name", `%${searchName}%`)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        tenantData = fallbackData;
      }

      if (!tenantData) {
        // Fallback al más reciente
        const { data: latestTenant } = await supabaseAdmin
          .from("tenants")
          .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active, tenant_settings(ticket_header)")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        tenantData = latestTenant;
      }

      if (tenantData) {
        tenantId = tenantData.id;
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // 2. Obtener opciones de catálogo y variantes en paralelo ultra rápido
    const [variantsRes, prodsRes, colorsRes, sizesRes, sleevesRes] = await Promise.all([
      supabaseAdmin
        .from("variantes_producto")
        .select(`
          id,
          sku,
          sale_price,
          cost_price,
          min_stock,
          is_active,
          productos!inner(
            id, 
            name, 
            description, 
            image_url,
            is_active, 
            categorias(id, name),
            imagenes_producto(id, url, sort_order, is_primary)
          ),
          colores(id, name, hex_code),
          tallas(id, name, sort_order),
          tipos_manga(id, name)
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .eq("productos.is_active", true),

      supabaseAdmin
        .from("productos")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name"),

      supabaseAdmin
        .from("colores")
        .select("id, name, hex_code")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("name"),

      supabaseAdmin
        .from("tallas")
        .select("id, name, sort_order")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("sort_order"),

      supabaseAdmin
        .from("tipos_manga")
        .select("id, name")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("name"),
    ]);

    const rawVariants = variantsRes.data || [];
    const rawVariantIds = rawVariants.map((v: any) => v.id);

    // 3. Obtener existencias e imágenes de variante en paralelo
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
            .select("variant_id, quantity")
            .in("variant_id", rawVariantIds)
        : Promise.resolve({ data: [] }),
    ]);

    const varImgsMap = new Map<string, any[]>();
    (varImgsRes.data || []).forEach((img: any) => {
      if (!varImgsMap.has(img.variant_id)) varImgsMap.set(img.variant_id, []);
      varImgsMap.get(img.variant_id)!.push(img);
    });

    const stockMap = new Map<string, number>();
    (stockRes.data || []).forEach((st: any) => {
      const curr = stockMap.get(st.variant_id) || 0;
      stockMap.set(st.variant_id, curr + (st.quantity || 0));
    });

    const mappedVariants = rawVariants.map((v: any) => {
      const totalStock = stockMap.get(v.id) || 0;
      
      const prodImages = (v.productos?.imagenes_producto || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        sortOrder: img.sort_order,
        isPrimary: img.is_primary,
      }));

      const pImages = prodImages.length > 0
        ? prodImages
        : v.productos?.image_url
          ? [{ id: "primary", url: v.productos.image_url, sortOrder: 1, isPrimary: true }]
          : [];

      const varImages = (varImgsMap.get(v.id) || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        sortOrder: img.sort_order,
        isPrimary: img.is_primary,
      }));

      const vImages = varImages.length > 0 ? varImages : pImages;

      return {
        id: v.id,
        tenantId,
        productId: v.productos?.id || "",
        product: {
          id: v.productos?.id || "",
          tenantId,
          name: v.productos?.name || "",
          description: v.productos?.description || null,
          categoryId: null,
          imageUrl: v.productos?.image_url || null,
          images: pImages,
          category: v.productos?.categorias
            ? { id: "", tenantId, name: v.productos.categorias.name, isActive: true }
            : null,
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
        colorId: v.colores?.id || null,
        color: v.colores ? { id: v.colores.id, tenantId, name: v.colores.name, hexCode: v.colores.hex_code, isActive: true } : null,
        sizeId: v.tallas?.id || null,
        size: v.tallas ? { id: v.tallas.id, tenantId, name: v.tallas.name, sortOrder: v.tallas.sort_order, isActive: true } : null,
        sleeveTypeId: v.tipos_manga?.id || null,
        sleeveType: v.tipos_manga ? { id: v.tipos_manga.id, tenantId, name: v.tipos_manga.name, isActive: true } : null,
        sku: v.sku,
        costPrice: Number(v.cost_price || 0),
        salePrice: Number(v.sale_price || 0),
        minStock: v.min_stock || 0,
        isActive: v.is_active,
        images: vImages,
        totalStock,
      };
    });

    const filterOptions = {
      modelos: (prodsRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
      colores: (colorsRes.data || []).map((c: any) => ({ id: c.id, name: c.name, hexCode: c.hex_code })),
      tallas: (sizesRes.data || []).map((s: any) => ({ id: s.id, name: s.name, sortOrder: s.sort_order || 0 })),
      mangas: (sleevesRes.data || []).map((sl: any) => ({ id: sl.id, name: sl.name })),
    };

    const banner = Array.isArray(tenantData?.tenant_settings)
      ? tenantData.tenant_settings[0]?.ticket_header
      : tenantData?.tenant_settings?.ticket_header;

    const tenantInfo = tenantData ? {
      id: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug,
      phone: tenantData.phone || null,
      email: tenantData.email || null,
      address: tenantData.address || null,
      logoUrl: tenantData.logo_url || null,
      whatsapp: tenantData.whatsapp || tenantData.phone || null,
      bannerText: banner || null,
    } : null;

    return NextResponse.json({
      tenant: tenantInfo,
      filterOptions,
      catalog: mappedVariants,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/public-catalog:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
