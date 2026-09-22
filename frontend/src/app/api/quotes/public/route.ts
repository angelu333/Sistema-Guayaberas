import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PublicQuoteItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      clientName,
      clientPhone,
      items,
      notes,
      validDays = 15,
    }: {
      tenantId: string;
      clientName: string;
      clientPhone?: string | null;
      items: PublicQuoteItem[];
      notes?: string;
      validDays?: number;
    } = body;

    // Validaciones básicas
    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json({ success: false, error: "tenantId requerido" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "La cotizacion debe incluir al menos un articulo" }, { status: 400 });
    }

    // Verificar que el tenant existe y esta activo
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .eq("is_active", true)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Empresa no encontrada" }, { status: 404 });
    }

    // Generar numero de cotizacion unico
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quoteNumber = `COT-${todayStr}-${randomSuffix}`;

    const totalPieces = items.reduce((acc, i) => acc + i.quantity, 0);
    let rawSubtotal = 0;

    const detailRows = items.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      rawSubtotal += lineSubtotal;
      return {
        tenant_id: tenantId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percent: 0,
        final_unit_price: item.unitPrice,
        subtotal: lineSubtotal,
      };
    });

    // Insertar cotizacion usando service role (sin restriccion de RLS)
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("cotizaciones")
      .insert({
        tenant_id: tenantId,
        quote_number: quoteNumber,
        client_name: (clientName || "Cliente Catalogo Digital").trim(),
        client_phone: clientPhone?.trim() || null,
        status: "draft",
        total_pieces: totalPieces,
        subtotal: rawSubtotal,
        discount_amount: 0,
        total_amount: rawSubtotal,
        valid_days: validDays,
        notes: notes?.trim() || "Cotizacion registrada automaticamente desde el Catalogo Digital Publico",
        created_by: null,
      })
      .select("id")
      .single();

    if (quoteErr || !quote) {
      console.error("Error al crear cotizacion publica:", quoteErr);
      return NextResponse.json(
        { success: false, error: quoteErr?.message || "Error al crear la cotizacion" },
        { status: 500 }
      );
    }

    // Insertar detalles de la cotizacion
    const detailsWithQuoteId = detailRows.map((d) => ({ ...d, quote_id: quote.id }));
    const { error: detailErr } = await supabaseAdmin
      .from("detalle_cotizaciones")
      .insert(detailsWithQuoteId);

    if (detailErr) {
      console.error("Error al insertar detalles de cotizacion publica:", detailErr);
      // No falla el flujo completo
    }

    return NextResponse.json({ success: true, quoteId: quote.id, quoteNumber });
  } catch (error: any) {
    console.error("Error en POST /api/quotes/public:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
