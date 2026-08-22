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
}

export interface PublicCatalogFilters {
  modelo?: string; // ID o Nombre de modelo
  talla?: string;  // ID o Nombre de talla
  color?: string;  // ID o Nombre de color
}

export const publicCatalogService = {
  /**
   * Obtiene la informacion publica de la empresa por su slug
   */
  async getPublicTenantBySlug(slug: string): Promise<PublicTenantInfo | null> {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, phone, email, address, logo_url, whatsapp, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Error al obtener tenant por slug:", error);
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
   * Obtiene las opciones disponibles de Modelo, Talla y Color para poblar los 3 filtros
   */
  async getPublicFilterOptions(tenantId: string): Promise<PublicFilterOptions> {
    const [prodsRes, colorsRes, sizesRes] = await Promise.all([
      supabase.from("productos").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
      supabase.from("colores").select("id, name, hex_code").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
      supabase.from("tallas").select("id, name, sort_order").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order"),
    ]);

    return {
      modelos: (prodsRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
      colores: (colorsRes.data || []).map((c: any) => ({ id: c.id, name: c.name, hexCode: c.hex_code })),
      tallas: (sizesRes.data || []).map((s: any) => ({ id: s.id, name: s.name, sortOrder: s.sort_order })),
    };
  },

  /**
   * Obtiene el catalogo de variantes publicas filtrando por Modelo, Talla y Color
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
        productos!inner(id, name, description, is_active, categorias(id, name)),
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
        images: [],
        totalStock,
      };
    });

    // Aplicar los 3 filtros principales: Modelo, Talla y Color
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

    return mapped;
  },
};
