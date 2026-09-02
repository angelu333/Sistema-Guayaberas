import { createClient } from "@/lib/supabase/client";
import type { ProductVariant, Tenant } from "@/types/domain.types";

const supabase = createClient();

export interface PublicTenantInfo {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
}

export interface PublicFilterOptions {
  modelos: { id: string; name: string }[];
  colores: { id: string; name: string; hexCode: string | null }[];
  tallas: { id: string; name: string; sortOrder: number }[];
  mangas: { id: string; name: string }[];
}

export interface PublicCatalogFilters {
  modelo?: string;
  talla?: string;
  color?: string;
  manga?: string;
}

export interface PublicProductView {
  productId: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  images: { id: string; url: string; isPrimary: boolean }[];
  minPrice: number;
  maxPrice: number;
  availableColors: string[];
  availableSizes: string[];
  availableSleeves: string[];
  totalStock: number;
  variants: {
    variantId: string;
    sku: string;
    colorName: string | null;
    sizeName: string | null;
    sleeveTypeName: string | null;
    salePrice: number;
    stock: number;
  }[];
}

export const publicCatalogService = {
  /**
   * Obtiene la informacion publica de la empresa por su slug
   */
  async getPublicTenantBySlug(slug: string): Promise<PublicTenantInfo | null> {
    // 1. Búsqueda exacta por slug
    let { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    // 2. Si no encuentra por slug exacto, buscar por coincidencia en nombre
    if (!data) {
      const cleanSlug = slug.replace(/-/g, " ");
      const { data: fallbackData } = await supabase
        .from("tenants")
        .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active")
        .ilike("name", `%${cleanSlug}%`)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      data = fallbackData;
    }

    // 3. Si aún no encuentra, cargar la empresa activa más reciente
    if (!data) {
      const { data: latestTenant } = await supabase
        .from("tenants")
        .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      data = latestTenant;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      logoUrl: data.logo_url || null,
      whatsapp: data.whatsapp || data.phone || null,
    };
  },

  /**
   * Obtiene TODAS las opciones de Modelo, Talla, Color y Tipo de Manga que existen en la BD
   */
  async getPublicFilterOptions(tenantId: string): Promise<PublicFilterOptions> {
    const [prodsRes, colorsRes, sizesRes, sleevesRes, variantsRes] = await Promise.all([
      supabase
        .from("productos")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("colores")
        .select("id, name, hex_code")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("tallas")
        .select("id, name, sort_order")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("tipos_manga")
        .select("id, name")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("variantes_producto")
        .select(`
          productos(id, name),
          colores(id, name, hex_code),
          tallas(id, name, sort_order),
          tipos_manga(id, name)
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
    ]);

    const modelosMap = new Map<string, { id: string; name: string }>();
    (prodsRes.data || []).forEach((p: any) => modelosMap.set(p.id, { id: p.id, name: p.name }));

    const coloresMap = new Map<string, { id: string; name: string; hexCode: string | null }>();
    (colorsRes.data || []).forEach((c: any) => coloresMap.set(c.id, { id: c.id, name: c.name, hexCode: c.hex_code }));

    const tallasMap = new Map<string, { id: string; name: string; sortOrder: number }>();
    (sizesRes.data || []).forEach((s: any) => tallasMap.set(s.id, { id: s.id, name: s.name, sortOrder: s.sort_order || 0 }));

    const mangasMap = new Map<string, { id: string; name: string }>();
    (sleevesRes.data || []).forEach((sl: any) => mangasMap.set(sl.id, { id: sl.id, name: sl.name }));

    // Consolidar también todo lo que venga en las variantes del tenant
    (variantsRes.data || []).forEach((v: any) => {
      if (v.productos?.id && v.productos?.name) {
        modelosMap.set(v.productos.id, { id: v.productos.id, name: v.productos.name });
      }
      if (v.colores?.id && v.colores?.name) {
        coloresMap.set(v.colores.id, { id: v.colores.id, name: v.colores.name, hexCode: v.colores.hex_code || null });
      }
      if (v.tallas?.id && v.tallas?.name) {
        tallasMap.set(v.tallas.id, { id: v.tallas.id, name: v.tallas.name, sortOrder: v.tallas.sort_order || 0 });
      }
      if (v.tipos_manga?.id && v.tipos_manga?.name) {
        mangasMap.set(v.tipos_manga.id, { id: v.tipos_manga.id, name: v.tipos_manga.name });
      }
    });

    const modelos = Array.from(modelosMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const colores = Array.from(coloresMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const tallas = Array.from(tallasMap.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const mangas = Array.from(mangasMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return { modelos, colores, tallas, mangas };
  },

  /**
   * Obtiene el catálogo de variantes públicas filtrando por Modelo, Talla, Color y Tipo de Manga
   */
  async getPublicCatalog(
    tenantId: string,
    filters?: PublicCatalogFilters
  ): Promise<ProductVariant[]> {
    const { data, error } = await supabase
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
        tipos_manga(id, name),
        existencias(quantity)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("productos.is_active", true);

    if (error || !data) {
      console.error("Error al obtener catalogo publico:", error);
      return [];
    }

    let mapped: ProductVariant[] = data.map((v: any) => {
      const totalStock = (v.existencias || []).reduce(
        (acc: number, ex: any) => acc + (ex.quantity || 0),
        0
      );

      const pImages = (v.productos?.imagenes_producto || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        sortOrder: img.sort_order,
        isPrimary: img.is_primary,
      }));

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
          category: v.productos?.categorias ? { id: "", tenantId, name: v.productos.categorias.name, isActive: true } : null,
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
        images: pImages,
        totalStock,
      };
    });

    // Aplicar filtros: Modelo, Talla, Color, Manga
    if (filters?.modelo) {
      const m = filters.modelo.toLowerCase();
      mapped = mapped.filter(
        (item) =>
          item.productId.toLowerCase() === m ||
          (item.product?.name || "").toLowerCase().includes(m)
      );
    }

    if (filters?.talla) {
      const t = filters.talla.toLowerCase();
      mapped = mapped.filter(
        (item) =>
          item.sizeId?.toLowerCase() === t ||
          (item.size?.name || "").toLowerCase() === t
      );
    }

    if (filters?.color) {
      const c = filters.color.toLowerCase();
      mapped = mapped.filter(
        (item) =>
          item.colorId?.toLowerCase() === c ||
          (item.color?.name || "").toLowerCase().includes(c)
      );
    }

    if (filters?.manga) {
      const sl = filters.manga.toLowerCase();
      mapped = mapped.filter(
        (item) =>
          item.sleeveTypeId?.toLowerCase() === sl ||
          (item.sleeveType?.name || "").toLowerCase().includes(sl)
      );
    }

    return mapped;
  },

  /**
   * Agrupa las variantes por modelo base de guayabera para la vista de tarjetas del catálogo
   */
  groupProductsForCatalog(variants: ProductVariant[]): PublicProductView[] {
    const map = new Map<string, PublicProductView>();

    variants.forEach((v) => {
      if (!v.product) return;
      const pId = v.productId;

      if (!map.has(pId)) {
        map.set(pId, {
          productId: pId,
          name: v.product.name,
          description: v.product.description,
          categoryName: v.product.category?.name || "Guayaberas",
          imageUrl: v.product.imageUrl || v.product.images?.[0]?.url || null,
          images: v.product.images || [],
          minPrice: v.salePrice,
          maxPrice: v.salePrice,
          availableColors: [],
          availableSizes: [],
          availableSleeves: [],
          totalStock: 0,
          variants: [],
        });
      }

      const entry = map.get(pId)!;
      entry.minPrice = Math.min(entry.minPrice, v.salePrice);
      entry.maxPrice = Math.max(entry.maxPrice, v.salePrice);
      entry.totalStock += v.totalStock || 0;

      if (v.color?.name && !entry.availableColors.includes(v.color.name)) {
        entry.availableColors.push(v.color.name);
      }

      if (v.size?.name && !entry.availableSizes.includes(v.size.name)) {
        entry.availableSizes.push(v.size.name);
      }

      if (v.sleeveType?.name && !entry.availableSleeves.includes(v.sleeveType.name)) {
        entry.availableSleeves.push(v.sleeveType.name);
      }

      entry.variants.push({
        variantId: v.id,
        sku: v.sku,
        colorName: v.color?.name || null,
        sizeName: v.size?.name || null,
        sleeveTypeName: v.sleeveType?.name || null,
        salePrice: v.salePrice,
        stock: v.totalStock || 0,
      });
    });

    return Array.from(map.values());
  },
};
