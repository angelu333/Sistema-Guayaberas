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
  /** Clave única: productId + sleeveTypeId para separar tarjetas por manga */
  cardKey: string;
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
  /** Tipo de manga de esta tarjeta (Manga Corta o Manga Larga) */
  sleeveTypeId: string | null;
  sleeveTypeName: string | null;
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
   * Carga la información completa del catálogo público (empresa, filtros, catálogo)
   * en una sola llamada de alto rendimiento sin sobrecarga de RLS.
   */
  async getPublicBundleBySlug(slug: string): Promise<{
    tenant: PublicTenantInfo | null;
    filterOptions: PublicFilterOptions;
    catalog: ProductVariant[];
  } | null> {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/public-catalog?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch (err) {
        console.warn("Fallo al consultar /api/public-catalog, usando fallback:", err);
      }
    }

    const tenant = await this.getPublicTenantBySlug(slug);
    if (!tenant) return null;

    const [options, catalog] = await Promise.all([
      this.getPublicFilterOptions(tenant.id),
      this.getPublicCatalog(tenant.id),
    ]);

    return {
      tenant,
      filterOptions: options,
      catalog,
    };
  },

  /**
   * Obtiene la información pública de la empresa por su slug
   */
  async getPublicTenantBySlug(slug: string): Promise<PublicTenantInfo | null> {
    const rawSlug = decodeURIComponent(slug || "").trim();
    const cleanSlugWithoutPrefix = rawSlug.replace(/^guayaberas-?/i, "");

    // 1. Búsqueda exacta por slug
    let { data } = await supabase
      .from("tenants")
      .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active")
      .or(`slug.eq.${rawSlug},slug.eq.${cleanSlugWithoutPrefix}`)
      .eq("is_active", true)
      .maybeSingle();

    // 2. Si no encuentra por slug exacto, buscar por coincidencia en nombre
    if (!data) {
      const searchName = cleanSlugWithoutPrefix.replace(/-/g, " ").replace(/&/g, "").trim();
      const { data: fallbackData } = await supabase
        .from("tenants")
        .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active")
        .ilike("name", `%${searchName}%`)
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
    const [prodsRes, colorsRes, sizesRes, sleevesRes] = await Promise.all([
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
    ]);

    const modelos = (prodsRes.data || []).map((p: any) => ({ id: p.id, name: p.name }));
    const colores = (colorsRes.data || []).map((c: any) => ({ id: c.id, name: c.name, hexCode: c.hex_code }));
    const tallas = (sizesRes.data || []).map((s: any) => ({ id: s.id, name: s.name, sortOrder: s.sort_order || 0 }));
    const mangas = (sleevesRes.data || []).map((sl: any) => ({ id: sl.id, name: sl.name }));

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
          categorias(id, name)
        ),
        colores(id, name, hex_code),
        tallas(id, name, sort_order),
        tipos_manga(id, name)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("productos.is_active", true);

    if (error || !data) {
      console.error("Error al obtener catalogo publico:", error);
      return [];
    }

    const vIds = (data || []).map((v: any) => v.id);

    // Consultar imágenes de variantes y existencias en ráfaga paralela en lote
    const [varImgsRes, stockRes] = await Promise.all([
      vIds.length > 0
        ? supabase.from("imagenes_variante").select("id, variant_id, url, sort_order, is_primary").in("variant_id", vIds)
        : Promise.resolve({ data: [] }),
      vIds.length > 0
        ? supabase.from("existencias").select("variant_id, quantity").in("variant_id", vIds)
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

    let mapped: ProductVariant[] = data.map((v: any) => {
      const totalStock = stockMap.get(v.id) || 0;

      const pImages = v.productos?.image_url
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
        images: vImages,
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
   * Agrupa las variantes por (productId + sleeveTypeId) para la vista de tarjetas del catálogo.
   * Esto genera una tarjeta independiente por cada tipo de manga de cada modelo.
   * Ejemplo: "Modelo Valladolid" con Manga Corta y Manga Larga → 2 tarjetas separadas.
   */
  groupProductsForCatalog(variants: ProductVariant[]): PublicProductView[] {
    // Clave: productId + "|" + sleeveTypeId (o "none" si no tiene)
    const map = new Map<string, PublicProductView>();

    variants.forEach((v) => {
      if (!v.product) return;
      const sleeveKey = v.sleeveTypeId || "none";
      const cardKey = `${v.productId}|${sleeveKey}`;

      if (!map.has(cardKey)) {
        map.set(cardKey, {
          productId: v.productId,
          cardKey,
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
          sleeveTypeId: v.sleeveTypeId || null,
          sleeveTypeName: v.sleeveType?.name || null,
          totalStock: 0,
          variants: [],
        });
      }

      const entry = map.get(cardKey)!;
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

    // Ordenar: primero por nombre de producto, luego Manga Corta antes que Manga Larga
    return Array.from(map.values()).sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      // Manga Corta (CT) antes que Manga Larga (LG)
      const aIsCorta = (a.sleeveTypeName || "").toLowerCase().includes("corta");
      const bIsCorta = (b.sleeveTypeName || "").toLowerCase().includes("corta");
      if (aIsCorta && !bIsCorta) return -1;
      if (!aIsCorta && bIsCorta) return 1;
      return 0;
    });
  },
};
