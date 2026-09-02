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
  imageUrl?: string;
  images?: { url: string; isPrimary: boolean }[];
  variants: CreateVariantDTO[];
  locationId?: string; // Sucursal donde se asignará el stock inicial
}

export interface CreateVariantDTO {
  colorId?: string;
  sizeId?: string;
  sleeveTypeId?: string;
  sku: string;
  costPrice: number;
  salePrice: number;
  minStock?: number;
  initialStock?: number; // Piezas físicas en la sucursal al dar de alta
}

export interface ProductFilters {
  tenantId?: string;
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
        product:productos(
          id, 
          name, 
          description, 
          category_id, 
          image_url,
          is_active, 
          category:categorias(id, name),
          images:imagenes_producto(id, url, sort_order, is_primary)
        ),
        color:colores(id, name, hex_code),
        size:tallas(id, name, sort_order),
        sleeveType:tipos_manga(id, name),
        images:imagenes_variante(id, url, sort_order, is_primary)
      `)
      .order("created_at", { ascending: false });

    if (filters?.tenantId) {
      query = query.eq("tenant_id", filters.tenantId);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
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
        imageUrl: item.product.image_url || null,
        images: (item.product.images || []).map((img: any) => ({
          id: img.id,
          productId: item.product.id,
          url: img.url,
          sortOrder: img.sort_order,
          isPrimary: img.is_primary,
        })),
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

    // Obtener existencias actuales agrupadas por variante
    const variantIds = variants.map((v) => v.id);
    if (variantIds.length > 0) {
      const { data: stockData } = await supabase
        .from("existencias")
        .select("variant_id, location_id, quantity, ubicaciones(name)")
        .in("variant_id", variantIds);

      if (stockData) {
        const stockMap = new Map<string, { total: number; locations: any[] }>();

        stockData.forEach((s: any) => {
          const current = stockMap.get(s.variant_id) || { total: 0, locations: [] };
          current.total += s.quantity;
          current.locations.push({
            locationId: s.location_id,
            locationName: s.ubicaciones?.name || "Ubicación",
            quantity: s.quantity,
          });
          stockMap.set(s.variant_id, current);
        });

        variants = variants.map((v) => ({
          ...v,
          totalStock: stockMap.get(v.id)?.total ?? 0,
          stockByLocation: stockMap.get(v.id)?.locations ?? [],
        }));
      }
    }

    // Filtro por categoria si se provee
    if (filters?.categoryId) {
      variants = variants.filter(
        (v) => v.product?.categoryId === filters.categoryId
      );
    }

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
   * Crea un nuevo producto base y sus variantes iniciales
   */
  async createProduct(tenantId: string, dto: CreateProductDTO): Promise<string> {
    const supabase = createClient();

    // Determinar foto de portada
    const primaryImg = dto.images?.find((img) => img.isPrimary)?.url || dto.imageUrl || dto.images?.[0]?.url || null;

    // 1. Crear el producto base
    const { data: product, error: productError } = await supabase
      .from("productos")
      .insert({
        tenant_id: tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category_id: dto.categoryId || null,
        image_url: primaryImg,
      })
      .select("id")
      .single();

    if (productError) {
      throw new Error(`Error al crear el producto: ${productError.message}`);
    }

    // 2. Guardar galeria de imagenes del producto si existen
    if (dto.images && dto.images.length > 0) {
      const imageRows = dto.images.map((img, idx) => ({
        tenant_id: tenantId,
        product_id: product.id,
        url: img.url,
        sort_order: idx + 1,
        is_primary: img.isPrimary,
      }));

      await supabase.from("imagenes_producto").insert(imageRows);
    }

    // 3. Crear las variantes asociadas
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

    // 4. Si hay stock inicial y una ubicación definida, insertar existencias
    if (dto.locationId && dto.variants.some(v => (v.initialStock ?? 0) > 0)) {
      // Obtener los IDs de las variantes recién creadas por SKU
      const { data: createdVariants } = await supabase
        .from("variantes_producto")
        .select("id, sku")
        .eq("product_id", product.id);

      if (createdVariants && createdVariants.length > 0) {
        // Insertar movimiento ENTRADA por cada variante con stock > 0
        type MovRow = {
          tenant_id: string;
          variant_id: string;
          location_id: string;
          type: string;
          quantity: number;
          reason: string;
          user_id: null;
        };

        const movimientosRows: MovRow[] = createdVariants
          .map((cv: any) => {
            const dtoVariant = dto.variants.find(v => v.sku.toUpperCase().trim() === cv.sku);
            const qty = dtoVariant?.initialStock ?? 0;
            if (qty <= 0 || !dto.locationId) return null;
            return {
              tenant_id: tenantId,
              variant_id: cv.id as string,
              location_id: dto.locationId as string,
              type: "ENTRADA",
              quantity: qty,
              reason: "Carga inicial de inventario al registrar producto",
              user_id: null,
            } as MovRow;
          })
          .filter((v): v is MovRow => v !== null);

        if (movimientosRows.length > 0) {
          const { error: movErr } = await supabase
            .from("movimientos_inventario")
            .insert(movimientosRows);

          if (movErr) {
            console.warn("Stock inicial no pudo registrarse:", movErr.message);
          }
        }
      }
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
   * Elimina un producto/modelo completo y sus variantes
   */
  async deleteProduct(productId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from("imagenes_producto").delete().eq("product_id", productId);
    await supabase.from("variantes_producto").delete().eq("product_id", productId);
    const { error } = await supabase.from("productos").delete().eq("id", productId);

    if (error) {
      throw new Error(`Error al eliminar el producto: ${error.message}`);
    }
  },

  /**
   * Elimina una variante específica
   */
  async deleteVariant(variantId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("variantes_producto").delete().eq("id", variantId);

    if (error) {
      throw new Error(`Error al eliminar la variante: ${error.message}`);
    }
  },

  /**
   * Obtiene las categorias del tenant
   */
  async getCategories(tenantId?: string): Promise<Category[]> {
    const supabase = createClient();
    let query = supabase
      .from("categorias")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return (data || []).map((c: any) => ({
      id: c.id,
      tenantId: c.tenant_id,
      name: c.name,
      isActive: c.is_active,
    }));
  },

  /**
   * Crea una nueva categoría para la empresa
   */
  async createCategory(tenantId: string, name: string): Promise<Category> {
    const supabase = createClient();
    const cleanName = name.trim();
    if (!cleanName) throw new Error("El nombre de la categoría es requerido.");

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        tenant_id: tenantId,
        name: cleanName,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Error al crear categoría: ${error.message}`);

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      isActive: data.is_active,
    };
  },

  /**
   * Elimina/Desactiva una categoría
   */
  async deleteCategory(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("categorias")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw new Error(`Error al eliminar categoría: ${error.message}`);
  },

  /**
   * Obtiene los colores del tenant
   */
  async getColors(tenantId?: string): Promise<Color[]> {
    const supabase = createClient();
    let query = supabase
      .from("colores")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;

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
   * Crea un nuevo color para la empresa
   */
  async createColor(tenantId: string, name: string, hexCode?: string): Promise<Color> {
    const supabase = createClient();
    const cleanName = name.trim();
    if (!cleanName) throw new Error("El nombre del color es requerido.");

    const { data, error } = await supabase
      .from("colores")
      .insert({
        tenant_id: tenantId,
        name: cleanName,
        hex_code: hexCode || null,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Error al crear color: ${error.message}`);

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      hexCode: data.hex_code,
      isActive: data.is_active,
    };
  },

  /**
   * Elimina/Desactiva un color
   */
  async deleteColor(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("colores")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw new Error(`Error al eliminar color: ${error.message}`);
  },

  /**
   * Obtiene las tallas del tenant
   */
  async getSizes(tenantId?: string): Promise<Size[]> {
    const supabase = createClient();
    let query = supabase
      .from("tallas")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;

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
   * Crea una nueva talla para la empresa
   */
  async createSize(tenantId: string, name: string, sortOrder?: number): Promise<Size> {
    const supabase = createClient();
    const cleanName = name.trim();
    if (!cleanName) throw new Error("El nombre de la talla es requerido.");

    const { data, error } = await supabase
      .from("tallas")
      .insert({
        tenant_id: tenantId,
        name: cleanName,
        sort_order: sortOrder ?? 50,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Error al crear talla: ${error.message}`);

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      sortOrder: data.sort_order,
      isActive: data.is_active,
    };
  },

  /**
   * Elimina/Desactiva una talla
   */
  async deleteSize(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("tallas")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw new Error(`Error al eliminar talla: ${error.message}`);
  },

  /**
   * Obtiene los tipos de manga del tenant
   */
  async getSleeveTypes(tenantId?: string): Promise<SleeveType[]> {
    const supabase = createClient();
    let query = supabase
      .from("tipos_manga")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return (data || []).map((m: any) => ({
      id: m.id,
      tenantId: m.tenant_id,
      name: m.name,
      isActive: m.is_active,
    }));
  },

  /**
   * Crea un nuevo tipo de manga
   */
  async createSleeveType(tenantId: string, name: string): Promise<SleeveType> {
    const supabase = createClient();
    const cleanName = name.trim();
    if (!cleanName) throw new Error("El nombre del tipo de manga es requerido.");

    const { data, error } = await supabase
      .from("tipos_manga")
      .insert({
        tenant_id: tenantId,
        name: cleanName,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Error al crear tipo de manga: ${error.message}`);

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      isActive: data.is_active,
    };
  },

  /**
   * Genera un SKU unico recomendado segun modelo, color, talla y tipo de manga
   */
  generateSKU(productName: string, colorName?: string, sizeName?: string, sleeveName?: string): string {
    const pCode = productName
      .slice(0, 4)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const cCode = colorName
      ? colorName.slice(0, 3).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : "GEN";
    const sCode = sizeName ? sizeName.toUpperCase() : "UNI";
    const slCode = sleeveName
      ? sleeveName.toLowerCase().includes("larga")
        ? "-ML"
        : sleeveName.toLowerCase().includes("corta")
        ? "-MC"
        : ""
      : "";

    return `${pCode}-${cCode}-${sCode}${slCode}`;
  },

  /**
   * Actualiza los datos de un modelo base y su galería de fotografías
   */
  async updateProduct(
    tenantId: string,
    productId: string,
    data: {
      name: string;
      description?: string;
      categoryId?: string;
      images?: { id?: string; url: string; isPrimary: boolean }[];
    }
  ): Promise<void> {
    const supabase = createClient();

    const primaryImg = data.images?.find((img) => img.isPrimary)?.url || data.images?.[0]?.url || null;

    // 1. Actualizar producto base
    const { error: prodErr } = await supabase
      .from("productos")
      .update({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category_id: data.categoryId || null,
        image_url: primaryImg,
      })
      .eq("id", productId);

    if (prodErr) {
      throw new Error(`Error al actualizar el producto: ${prodErr.message}`);
    }

    // 2. Reemplazar galería de fotos en imagenes_producto
    if (data.images) {
      await supabase.from("imagenes_producto").delete().eq("product_id", productId);

      if (data.images.length > 0) {
        const imageRows = data.images.map((img, idx) => ({
          tenant_id: tenantId,
          product_id: productId,
          url: img.url,
          sort_order: idx + 1,
          is_primary: img.isPrimary,
        }));
        await supabase.from("imagenes_producto").insert(imageRows);
      }
    }
  },

  /**
   * Obtiene las fotos de un producto específico
   */
  async getProductImages(productId: string): Promise<{ id: string; url: string; isPrimary: boolean }[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("imagenes_producto")
      .select("id, url, is_primary, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      url: d.url,
      isPrimary: d.is_primary,
    }));
  },
};
