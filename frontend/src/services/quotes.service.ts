import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface WholesaleTier {
  id?: string;
  tenantId?: string;
  name: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
  isActive?: boolean;
}

export interface QuoteRecord {
  id: string;
  tenantId: string;
  quoteNumber: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "converted";
  totalPieces: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  validDays: number;
  notes: string | null;
  createdAt: string;
  details: QuoteDetailRecord[];
  tenantInfo?: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    rfc: string | null;
    logoUrl: string | null;
  };
}

export interface QuoteDetailRecord {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  sleeveTypeName: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  finalUnitPrice: number;
  subtotal: number;
}

export interface CreateQuoteItemDTO {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

export const DEFAULT_WHOLESALE_TIERS: WholesaleTier[] = [
  { name: "Menudeo (1 - 11 pzas)", minQuantity: 1, maxQuantity: 11, discountPercent: 0 },
  { name: "Mayoreo Inicial (12 - 24 pzas)", minQuantity: 12, maxQuantity: 24, discountPercent: 10 },
  { name: "Mayoreo Medio (25 - 49 pzas)", minQuantity: 25, maxQuantity: 49, discountPercent: 18 },
  { name: "Mayoreo Distribuidor (50+ pzas)", minQuantity: 50, maxQuantity: null, discountPercent: 25 },
];

export const quotesService = {
  /**
   * Obtiene la escala de rangos de mayoreo del tenant
   */
  async getWholesaleTiers(tenantId: string): Promise<WholesaleTier[]> {
    const { data, error } = await supabase
      .from("rangos_mayoreo")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("min_quantity", { ascending: true });

    if (error || !data || data.length === 0) {
      // Sembrar escalas por defecto si no existen
      await this.seedDefaultTiers(tenantId);
      return DEFAULT_WHOLESALE_TIERS;
    }

    return data.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      minQuantity: r.min_quantity,
      maxQuantity: r.max_quantity || null,
      discountPercent: Number(r.discount_percent || 0),
      isActive: r.is_active,
    }));
  },

  /**
   * Siembras escalas por defecto
   */
  async seedDefaultTiers(tenantId: string): Promise<void> {
    const rows = DEFAULT_WHOLESALE_TIERS.map((t) => ({
      tenant_id: tenantId,
      name: t.name,
      min_quantity: t.minQuantity,
      max_quantity: t.maxQuantity,
      discount_percent: t.discountPercent,
    }));
    await supabase.from("rangos_mayoreo").insert(rows);
  },

  /**
   * Guarda y reemplaza la lista de escalas de mayoreo del tenant
   */
  async saveWholesaleTiers(
    tenantId: string,
    tiers: { name: string; minQuantity: number; maxQuantity: number | null; discountPercent: number }[]
  ): Promise<{ success: boolean; error?: string }> {
    await supabase.from("rangos_mayoreo").delete().eq("tenant_id", tenantId);

    if (tiers.length === 0) return { success: true };

    const rows = tiers.map((t) => ({
      tenant_id: tenantId,
      name: t.name.trim(),
      min_quantity: t.minQuantity,
      max_quantity: t.maxQuantity || null,
      discount_percent: t.discountPercent,
    }));

    const { error } = await supabase.from("rangos_mayoreo").insert(rows);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Calcula el porcentaje de descuento por volumen aplicando la escala
   */
  calculateTierDiscount(totalPieces: number, tiers: WholesaleTier[]): number {
    const activeTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    for (const tier of activeTiers) {
      if (totalPieces >= tier.minQuantity) {
        if (!tier.maxQuantity || totalPieces <= tier.maxQuantity) {
          return tier.discountPercent;
        }
      }
    }
    return 0;
  },

  /**
   * Obtiene la lista de cotizaciones registradas
   */
  async getQuotes(tenantId: string): Promise<QuoteRecord[]> {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(`
        id,
        tenant_id,
        quote_number,
        client_id,
        client_name,
        client_phone,
        status,
        total_pieces,
        subtotal,
        discount_amount,
        total_amount,
        valid_days,
        notes,
        created_at,
        tenants(name, phone, email, address, rfc, logo_url),
        detalle_cotizaciones(
          id,
          variant_id,
          quantity,
          unit_price,
          discount_percent,
          final_unit_price,
          subtotal,
          variantes_producto(
            sku,
            productos(name),
            colores(name),
            tallas(name),
            tipos_manga(name)
          )
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error al obtener cotizaciones:", error);
      return [];
    }

    return data.map((r: any) => {
      const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      return {
        id: r.id,
        tenantId: r.tenant_id,
        quoteNumber: r.quote_number,
        clientId: r.client_id || null,
        clientName: r.client_name,
        clientPhone: r.client_phone || null,
        status: r.status,
        totalPieces: r.total_pieces,
        subtotal: Number(r.subtotal || 0),
        discountAmount: Number(r.discount_amount || 0),
        totalAmount: Number(r.total_amount || 0),
        validDays: r.valid_days,
        notes: r.notes || null,
        createdAt: r.created_at,
        tenantInfo: {
          name: (t as any)?.name || "Guayaberas Ábito & Montejo",
          phone: (t as any)?.phone || null,
          email: (t as any)?.email || null,
          address: (t as any)?.address || null,
          rfc: (t as any)?.rfc || null,
          logoUrl: (t as any)?.logo_url || null,
        },
        details: (r.detalle_cotizaciones || []).map((d: any) => {
          const v = d.variantes_producto;
          return {
            id: d.id,
            variantId: d.variant_id,
            sku: v?.sku || "S/SKU",
            productName: v?.productos?.name || "Guayabera",
            colorName: v?.colores?.name || null,
            sizeName: v?.tallas?.name || null,
            sleeveTypeName: v?.tipos_manga?.name || null,
            quantity: d.quantity,
            unitPrice: Number(d.unit_price || 0),
            discountPercent: Number(d.discount_percent || 0),
            finalUnitPrice: Number(d.final_unit_price || 0),
            subtotal: Number(d.subtotal || 0),
          };
        }),
      };
    });
  },

  /**
   * Obtiene una cotización específica por ID (incluyendo info del tenant para vista pública/ticket)
   */
  async getQuoteById(quoteId: string): Promise<QuoteRecord | null> {
    const { data: r, error } = await supabase
      .from("cotizaciones")
      .select(`
        id,
        tenant_id,
        quote_number,
        client_id,
        client_name,
        client_phone,
        status,
        total_pieces,
        subtotal,
        discount_amount,
        total_amount,
        valid_days,
        notes,
        created_at,
        tenants(name, phone, email, address, rfc, logo_url),
        detalle_cotizaciones(
          id,
          variant_id,
          quantity,
          unit_price,
          discount_percent,
          final_unit_price,
          subtotal,
          variantes_producto(
            sku,
            productos(name),
            colores(name),
            tallas(name),
            tipos_manga(name)
          )
        )
      `)
      .eq("id", quoteId)
      .single();

    if (error || !r) {
      console.error("Error al obtener cotización por ID:", error);
      return null;
    }

    const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;

    return {
      id: r.id,
      tenantId: r.tenant_id,
      quoteNumber: r.quote_number,
      clientId: r.client_id || null,
      clientName: r.client_name,
      clientPhone: r.client_phone || null,
      status: r.status,
      totalPieces: r.total_pieces,
      subtotal: Number(r.subtotal || 0),
      discountAmount: Number(r.discount_amount || 0),
      totalAmount: Number(r.total_amount || 0),
      validDays: r.valid_days,
      notes: r.notes || null,
      createdAt: r.created_at,
      tenantInfo: {
        name: (t as any)?.name || "Guayabera Manager",
        phone: (t as any)?.phone || null,
        email: (t as any)?.email || null,
        address: (t as any)?.address || null,
        rfc: (t as any)?.rfc || null,
        logoUrl: (t as any)?.logo_url || null,
      },
      details: (r.detalle_cotizaciones || []).map((d: any) => {
        const v = d.variantes_producto;
        return {
          id: d.id,
          variantId: d.variant_id,
          sku: v?.sku || "S/SKU",
          productName: v?.productos?.name || "Guayabera",
          colorName: v?.colores?.name || null,
          sizeName: v?.tallas?.name || null,
          sleeveTypeName: v?.tipos_manga?.name || null,
          quantity: d.quantity,
          unitPrice: Number(d.unit_price || 0),
          discountPercent: Number(d.discount_percent || 0),
          finalUnitPrice: Number(d.final_unit_price || 0),
          subtotal: Number(d.subtotal || 0),
        };
      }),
    };
  },

  /**
   * Crea una nueva cotización
   */
  async createQuote(
    tenantId: string,
    clientName: string,
    clientPhone: string | null,
    items: CreateQuoteItemDTO[],
    tiers: WholesaleTier[],
    notes?: string,
    validDays: number = 15,
    userId?: string
  ): Promise<{ success: boolean; quoteId?: string; quoteNumber?: string; error?: string }> {
    if (items.length === 0) {
      return { success: false, error: "La cotización debe incluir al menos una guayabera." };
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quoteNumber = `COT-${todayStr}-${randomSuffix}`;

    const totalPieces = items.reduce((acc, i) => acc + i.quantity, 0);
    const discountPercent = this.calculateTierDiscount(totalPieces, tiers);

    let rawSubtotal = 0;
    let finalSubtotal = 0;

    const detailRows = items.map((item) => {
      const lineSubtotalRaw = item.quantity * item.unitPrice;
      const finalPrice = item.unitPrice * (1 - discountPercent / 100);
      const lineSubtotalFinal = item.quantity * finalPrice;

      rawSubtotal += lineSubtotalRaw;
      finalSubtotal += lineSubtotalFinal;

      return {
        tenant_id: tenantId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percent: discountPercent,
        final_unit_price: finalPrice,
        subtotal: lineSubtotalFinal,
      };
    });

    const discountAmount = rawSubtotal - finalSubtotal;

    const { data: quote, error: quoteErr } = await supabase
      .from("cotizaciones")
      .insert({
        tenant_id: tenantId,
        quote_number: quoteNumber,
        client_name: clientName.trim(),
        client_phone: clientPhone?.trim() || null,
        status: "draft",
        total_pieces: totalPieces,
        subtotal: rawSubtotal,
        discount_amount: discountAmount,
        total_amount: finalSubtotal,
        valid_days: validDays,
        notes: notes?.trim() || null,
        created_by: userId || null,
      })
      .select("id")
      .single();

    if (quoteErr || !quote) {
      return { success: false, error: quoteErr?.message || "Error al crear la cotización." };
    }

    const detailsWithQuoteId = detailRows.map((d) => ({
      ...d,
      quote_id: quote.id,
    }));

    const { error: detailErr } = await supabase.from("detalle_cotizaciones").insert(detailsWithQuoteId);

    if (detailErr) {
      console.error("Error al insertar detalles de cotización:", detailErr);
    }

    return { success: true, quoteId: quote.id, quoteNumber };
  },

  /**
   * Actualiza las cantidades de una cotización (usado por el cliente en el enlace interactivo)
   */
  async updateQuoteQuantities(
    quoteId: string,
    updatedQuantities: { variantId: string; quantity: number }[],
    tiers: WholesaleTier[]
  ): Promise<{ success: boolean; totalAmount?: number; discountPercent?: number; error?: string }> {
    const quote = await this.getQuoteById(quoteId);
    if (!quote) return { success: false, error: "Cotización no encontrada." };

    const totalPieces = updatedQuantities.reduce((acc, q) => acc + q.quantity, 0);
    const discountPercent = this.calculateTierDiscount(totalPieces, tiers);

    let rawSubtotal = 0;
    let finalSubtotal = 0;

    for (const q of updatedQuantities) {
      const detail = quote.details.find((d) => d.variantId === q.variantId);
      if (!detail) continue;

      const lineRaw = q.quantity * detail.unitPrice;
      const finalPrice = detail.unitPrice * (1 - discountPercent / 100);
      const lineFinal = q.quantity * finalPrice;

      rawSubtotal += lineRaw;
      finalSubtotal += lineFinal;

      await supabase
        .from("detalle_cotizaciones")
        .update({
          quantity: q.quantity,
          discount_percent: discountPercent,
          final_unit_price: finalPrice,
          subtotal: lineFinal,
        })
        .eq("id", detail.id);
    }

    const discountAmount = rawSubtotal - finalSubtotal;

    await supabase
      .from("cotizaciones")
      .update({
        total_pieces: totalPieces,
        subtotal: rawSubtotal,
        discount_amount: discountAmount,
        total_amount: finalSubtotal,
      })
      .eq("id", quoteId);

    return { success: true, totalAmount: finalSubtotal, discountPercent };
  },

  /**
   * Actualiza las notas/términos personalizados de una cotización para el PDF
   */
  async updateQuoteNotes(
    quoteId: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("cotizaciones")
      .update({ notes: notes.trim() || null })
      .eq("id", quoteId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /**
   * Actualiza los ítems, cantidades y precios de una cotización existente
   */
  async updateQuoteItems(
    quoteId: string,
    tenantId: string,
    items: CreateQuoteItemDTO[],
    tiers: WholesaleTier[],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    await supabase.from("detalle_cotizaciones").delete().eq("quote_id", quoteId);

    const totalPieces = items.reduce((acc, i) => acc + i.quantity, 0);
    const discountPercent = this.calculateTierDiscount(totalPieces, tiers);

    let rawSubtotal = 0;
    let finalSubtotal = 0;

    const detailRows = items.map((item) => {
      const lineSubtotalRaw = item.quantity * item.unitPrice;
      const finalPrice = item.unitPrice * (1 - discountPercent / 100);
      const lineSubtotalFinal = item.quantity * finalPrice;

      rawSubtotal += lineSubtotalRaw;
      finalSubtotal += lineSubtotalFinal;

      return {
        quote_id: quoteId,
        tenant_id: tenantId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percent: discountPercent,
        final_unit_price: finalPrice,
        subtotal: lineSubtotalFinal,
      };
    });

    const discountAmount = rawSubtotal - finalSubtotal;

    const { error: insertErr } = await supabase.from("detalle_cotizaciones").insert(detailRows);
    if (insertErr) return { success: false, error: insertErr.message };

    const updateObj: any = {
      total_pieces: totalPieces,
      subtotal: rawSubtotal,
      discount_amount: discountAmount,
      total_amount: finalSubtotal,
    };
    if (notes !== undefined) {
      updateObj.notes = notes.trim() || null;
    }

    const { error: updateErr } = await supabase
      .from("cotizaciones")
      .update(updateObj)
      .eq("id", quoteId);

    if (updateErr) return { success: false, error: updateErr.message };

    return { success: true };
  },

  /**
   * Actualiza el estado de una cotización
   */
  async updateQuoteStatus(
    quoteId: string,
    status: QuoteRecord["status"]
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("cotizaciones")
      .update({ status })
      .eq("id", quoteId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Elimina una cotización y sus detalles de la base de datos
   */
  async deleteQuote(quoteId: string): Promise<{ success: boolean; error?: string }> {
    await supabase.from("detalle_cotizaciones").delete().eq("quote_id", quoteId);

    const { error } = await supabase.from("cotizaciones").delete().eq("id", quoteId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Convierte una cotización en una venta oficial completa:
   * 1. Registra la venta con número de ticket.
   * 2. Descuenta el inventario físico mediante movimientos_inventario (tipo VENTA).
   * 3. Registra en el Historial de Ventas y suma a las métricas del Dashboard.
   * 4. Actualiza el estado de la cotización a 'converted'.
   */
  async convertQuoteToSale(
    quoteId: string,
    sellerId?: string
  ): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
    const quote = await this.getQuoteById(quoteId);
    if (!quote) return { success: false, error: "Cotización no encontrada." };
    if (quote.status === "converted") {
      return { success: false, error: "Esta cotización ya fue convertida a venta previamente." };
    }

    const { salesService } = await import("./sales.service");

    const items = quote.details.map((d) => ({
      variantId: d.variantId,
      variant: {
        id: d.variantId,
        tenantId: quote.tenantId,
        productId: "",
        colorId: null,
        sizeId: null,
        sleeveTypeId: null,
        sku: d.sku,
        costPrice: 0,
        salePrice: d.finalUnitPrice,
        minStock: 0,
        isActive: true,
        images: [],
        product: {
          id: "",
          tenantId: quote.tenantId,
          name: d.productName,
          description: null,
          categoryId: null,
          category: null,
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
        color: d.colorName ? { id: "", tenantId: quote.tenantId, name: d.colorName, hexCode: null, isActive: true } : null,
        size: d.sizeName ? { id: "", tenantId: quote.tenantId, name: d.sizeName, sortOrder: 0, isActive: true } : null,
        sleeveType: null,
      },
      quantity: d.quantity,
      unitPrice: d.finalUnitPrice,
      discountPercent: 0,
    }));

    const saleResult = await salesService.completeSale({
      tenantId: quote.tenantId,
      sellerId: sellerId || "",
      clientId: quote.clientId,
      items,
      globalDiscountPercent: 0,
      notes: `Venta registrada desde Cotización #${quote.quoteNumber}`,
      payments: [
        {
          method: "cash",
          amount: quote.totalAmount,
        },
      ],
    });

    if (!saleResult.success) {
      return { success: false, error: saleResult.error };
    }

    await this.updateQuoteStatus(quoteId, "converted");

    return {
      success: true,
      ticketNumber: saleResult.ticketNumber,
    };
  },
};
