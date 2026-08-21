import { createClient } from "@/lib/supabase/client";
import {
  Product,
  ProductVariant,
  Category,
  Color,
  Size,
  SleeveType,
} from "@/types/domain.types";

export interface CreateProductDTO {
  name: string;
  description?: string;
  categoryId?: string;
  variants: CreateVariantDTO[];
}

export interface CreateVariantDTO {
  colorId?: string;
  sizeId?: string;
  sleeveTypeId?: string;
  sku: string;
  costPrice: number;
  salePrice: number;
  minStock?: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  colorId?: string;
  sizeId?: string;
  isActive?: boolean;
}

export const productsService = {
  /**
   * Obtiene todos los productos del tenant activo con sus variantes
   */
  async getProducts(filters?: ProductFilters): Promise<ProductVariant[]> {
    const supabase = createClient();

    let query = supabase
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
        product:productos(id, name, description, category_id, is_active, category:categorias(id, name)),
        color:colores(id, name, hex_code),
        size:tallas(id, name, sort_order),
        sleeveType:tipos_manga(id, name),
        images:imagenes_variante(id, url, sort_order, is_primary)
      `)
      .order("created_at", { ascending: false });

    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    if (filters?.categoryId) {
      query = query.eq("productos.category_id", filters.categoryId);
    }

    if (filters?.colorId) {
      query = query.eq("color_id", filters.colorId);
    }

    if (filters?.sizeId) {
      query = query.eq("size_id", filters.sizeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error al obtener los productos: ${error.message}`);
    }

    let variants: ProductVariant[] = (data || []).map((item: any) => ({
      id: item.id,
      tenantId: item.tenant_id,
      productId: item.product_id,
      product: item.product ? {
        id: item.product.id,
        tenantId: item.tenant_id,
        name: item.product.name,
        description: item.product.description,
        categoryId: item.product.category_id,
        category: item.product.category ? {
          id: item.product.category.id,
          tenantId: item.tenant_id,
          name: item.product.category.name,
          isActive: true,
        } : null,
        isActive: item.product.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      } : null,
      colorId: item.color_id,
      color: item.color ? {
        id: item.color.id,
        tenantId: item.tenant_id,
        name: item.color.name,
        hexCode: item.color.hex_code,
        isActive: true,
      } : null,
      sizeId: item.size_id,
      size: item.size ? {
        id: item.size.id,
        tenantId: item.tenant_id,
        name: item.size.name,
        sortOrder: item.size.sort_order,
        isActive: true,
      } : null,
      sleeveTypeId: item.sleeve_type_id,
      sleeveType: item.sleeveType ? {
        id: item.sleeveType.id,
        tenantId: item.tenant_id,
        name: item.sleeveType.name,
        isActive: true,
      } : null,
      sku: item.sku,
      costPrice: Number(item.cost_price),
      salePrice: Number(item.sale_price),
      minStock: item.min_stock,
      isActive: item.is_active,
      images: (item.images || []).map((img: any) => ({
        id: img.id,
        variantId: item.id,
        url: img.url,
        sortOrder: img.sort_order,
        isPrimary: img.is_primary,
      })),
    }));

    // Filtro rapido en memoria si se provee busqueda
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      variants = variants.filter(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.product?.name.toLowerCase().includes(q) ||
          v.color?.name.toLowerCase().includes(q) ||
          v.size?.name.toLowerCase().includes(q)
      );
    }

    return variants;
  },

  /**
   * Crea un nuevo producto base con sus variantes
   */
  async createProduct(tenantId: string, dto: CreateProductDTO): Promise<string> {
    const supabase = createClient();

    // 1. Crear el producto base
    const { data: product, error: productError } = await supabase
      .from("productos")
      .insert({
        tenant_id: tenantId,
        name: dto.name.trim(),
        description: dto.description || null,
        category_id: dto.categoryId || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (productError) {
      throw new Error(`Error al crear el producto: ${productError.message}`);
    }

    // 2. Crear las variantes asociadas
    const variantRows = dto.variants.map((v) => ({
      tenant_id: tenantId,
      product_id: product.id,
      color_id: v.colorId || null,
      size_id: v.sizeId || null,
      sleeve_type_id: v.sleeveTypeId || null,
      sku: v.sku.toUpperCase().trim(),
      cost_price: v.costPrice,
      sale_price: v.salePrice,
      min_stock: v.minStock ?? 5,
      is_active: true,
    }));

    const { error: variantError } = await supabase
      .from("variantes_producto")
      .insert(variantRows);

    if (variantError) {
      if (variantError.code === "23505") {
        throw new Error("Uno de los SKU especificados ya existe en su inventario.");
      }
      throw new Error(`Error al crear las variantes: ${variantError.message}`);
    }

    return product.id;
  },

  /**
   * Cambia el estado activo/inactivo de una variante
   */
  async toggleVariantStatus(variantId: string, isActive: boolean): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("variantes_producto")
      .update({ is_active: isActive })
      .eq("id", variantId);

    if (error) {
      throw new Error(`Error al actualizar estado de la variante: ${error.message}`);
    }
  },

  /**
   * Obtiene las categorias del tenant
   */
  async getCategories(): Promise<Category[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return (data || []).map((c: any) => ({
      id: c.id,
      tenantId: c.tenant_id,
      name: c.name,
      isActive: c.is_active,
    }));
  },

  /**
   * Obtiene los colores del tenant
   */
  async getColors(): Promise<Color[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("colores")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return (data || []).map((c: any) => ({
      id: c.id,
      tenantId: c.tenant_id,
      name: c.name,
      hexCode: c.hex_code,
      isActive: c.is_active,
    }));
  },

  /**
   * Obtiene las tallas del tenant
   */
  async getSizes(): Promise<Size[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tallas")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((s: any) => ({
      id: s.id,
      tenantId: s.tenant_id,
      name: s.name,
      sortOrder: s.sort_order,
      isActive: s.is_active,
    }));
  },

  /**
   * Obtiene los tipos de manga del tenant
   */
  async getSleeveTypes(): Promise<SleeveType[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tipos_manga")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return (data || []).map((m: any) => ({
      id: m.id,
      tenantId: m.tenant_id,
      name: m.name,
      isActive: m.is_active,
    }));
  },

  /**
   * Genera un SKU unico recomendado segun modelo, color y talla
   */
  generateSKU(productName: string, colorName?: string, sizeName?: string): string {
    const pCode = productName
      .slice(0, 4)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const cCode = colorName
      ? colorName.slice(0, 3).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : "GEN";
    const sCode = sizeName ? sizeName.toUpperCase() : "UNI";

    return `${pCode}-${cCode}-${sCode}`;
  },
};
