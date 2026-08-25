import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface InputItem {
  id: string;
  tenantId: string;
  name: string;
  category: "tela" | "boton" | "hilo" | "etiqueta" | "otro";
  unit: "metros" | "piezas" | "rollos" | "gramos";
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  supplierId: string | null;
  supplierName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ProductionRecipeItem {
  id?: string;
  tenantId?: string;
  productId: string;
  insumoId: string;
  insumoName?: string;
  insumoUnit?: string;
  quantityNeeded: number;
  notes?: string | null;
}

export const inputsService = {
  /**
   * Obtiene la lista de insumos y materias primas del tenant
   */
  async getInputs(tenantId: string): Promise<InputItem[]> {
    const { data, error } = await supabase
      .from("insumos")
      .select("*, proveedores(name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error al obtener insumos:", error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      category: r.category,
      unit: r.unit,
      currentStock: Number(r.current_stock || 0),
      minStock: Number(r.min_stock || 0),
      costPerUnit: Number(r.cost_per_unit || 0),
      supplierId: r.supplier_id || null,
      supplierName: r.proveedores?.name || null,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  },

  /**
   * Registra un nuevo insumo o materia prima
   */
  async createInput(
    tenantId: string,
    input: Omit<InputItem, "id" | "tenantId" | "isActive" | "createdAt" | "supplierName">
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from("insumos")
      .insert({
        tenant_id: tenantId,
        name: input.name.trim(),
        category: input.category || "tela",
        unit: input.unit || "metros",
        current_stock: input.currentStock || 0,
        min_stock: input.minStock || 0,
        cost_per_unit: input.costPerUnit || 0,
        supplier_id: input.supplierId || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Error al crear insumo." };
    }

    return { success: true, id: data.id };
  },

  /**
   * Suma o resta existencia a un insumo (Entrada de insumos / ajuste)
   */
  async updateInputStock(
    inputId: string,
    quantityDelta: number
  ): Promise<{ success: boolean; error?: string }> {
    const { data: current } = await supabase
      .from("insumos")
      .select("current_stock")
      .eq("id", inputId)
      .single();

    const newStock = Math.max(0, Number(current?.current_stock || 0) + quantityDelta);

    const { error } = await supabase
      .from("insumos")
      .update({ current_stock: newStock })
      .eq("id", inputId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Obtiene las recetas de confección (BOM) para un modelo de guayabera
   */
  async getProductionRecipes(tenantId: string, productId: string): Promise<ProductionRecipeItem[]> {
    const { data, error } = await supabase
      .from("recetas_produccion")
      .select("*, insumos(name, unit)")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId);

    if (error || !data) {
      console.error("Error al obtener recetas BOM:", error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      productId: r.product_id,
      insumoId: r.insumo_id,
      insumoName: r.insumos?.name || "Insumo",
      insumoUnit: r.insumos?.unit || "unidad",
      quantityNeeded: Number(r.quantity_needed || 0),
      notes: r.notes || null,
    }));
  },

  /**
   * Guarda o actualiza la receta de confección (BOM) para un modelo de guayabera
   */
  async saveProductionRecipe(
    tenantId: string,
    productId: string,
    recipeItems: { insumoId: string; quantityNeeded: number; notes?: string }[]
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Eliminar receta anterior del modelo
    await supabase
      .from("recetas_produccion")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("product_id", productId);

    if (recipeItems.length === 0) {
      return { success: true };
    }

    // 2. Insertar nuevos ingredientes/insumos
    const rows = recipeItems.map((item) => ({
      tenant_id: tenantId,
      product_id: productId,
      insumo_id: item.insumoId,
      quantity_needed: item.quantityNeeded,
      notes: item.notes?.trim() || null,
    }));

    const { error } = await supabase.from("recetas_produccion").insert(rows);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Descuenta automáticamente insumos según la receta BOM al producir guayaberas
   */
  async deductInputsForProduction(
    tenantId: string,
    productId: string,
    producedQuantity: number
  ): Promise<{ success: boolean; deductedCount?: number }> {
    const recipes = await this.getProductionRecipes(tenantId, productId);
    if (recipes.length === 0) return { success: true, deductedCount: 0 };

    let count = 0;
    for (const r of recipes) {
      const totalNeeded = r.quantityNeeded * producedQuantity;
      await this.updateInputStock(r.insumoId, -totalNeeded);
      count++;
    }

    return { success: true, deductedCount: count };
  },
};
