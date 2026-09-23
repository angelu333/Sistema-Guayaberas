import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

function getAdminClient() {
  if (!SUPABASE_URL) {
    throw new Error(
      "La variable NEXT_PUBLIC_SUPABASE_URL no está configurada en este despliegue."
    );
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "La variable SUPABASE_SERVICE_ROLE_KEY no está configurada en este despliegue."
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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
      clientName?: string;
      clientPhone?: string | null;
      items: PublicQuoteItem[];
      notes?: string;
      validDays?: number;
    } = body;

    // Validaciones básicas
    if (!tenantId || typeof tenantId !== "string") {
      console.error("[API/QUOTES/PUBLIC] tenantId inválido o ausente:", tenantId);
      return NextResponse.json({ success: false, error: "tenantId requerido" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("[API/QUOTES/PUBLIC] No se incluyeron artículos en la cotización");
      return NextResponse.json({ success: false, error: "La cotización debe incluir al menos un artículo" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // Generar número de cotización único (COT-YYYYMMDD-XXXX)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quoteNumber = `COT-${todayStr}-${randomSuffix}`;

    const totalPieces = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
    let rawSubtotal = 0;

    const validItems = items.filter((item) => item.variantId);
    if (validItems.length === 0) {
      return NextResponse.json({ success: false, error: "Las variantes seleccionadas no son válidas" }, { status: 400 });
    }

    const detailRows = validItems.map((item) => {
      const q = Number(item.quantity) || 1;
      const p = Number(item.unitPrice) || 0;
      const lineSubtotal = q * p;
      rawSubtotal += lineSubtotal;
      return {
        tenant_id: tenantId,
        variant_id: item.variantId,
        quantity: q,
        unit_price: p,
        discount_percent: 0,
        final_unit_price: p,
        subtotal: lineSubtotal,
      };
    });

    // Insertar cotización usando service role (bypasea RLS)
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("cotizaciones")
      .insert({
        tenant_id: tenantId,
        quote_number: quoteNumber,
        client_name: (clientName || "Cliente Catálogo Digital").trim(),
        client_phone: clientPhone?.trim() || null,
        status: "draft",
        total_pieces: totalPieces,
        subtotal: rawSubtotal,
        discount_amount: 0,
        total_amount: rawSubtotal,
        valid_days: validDays || 15,
        notes: notes?.trim() || "Cotización registrada automáticamente desde el Catálogo Digital Público",
        created_by: null,
      })
      .select("id")
      .single();

    if (quoteErr || !quote) {
      console.error("[API/QUOTES/PUBLIC] Error al insertar en cotizaciones:", quoteErr);
      return NextResponse.json(
        { success: false, error: quoteErr?.message || "Error al crear la cotización" },
        { status: 500 }
      );
    }

    // Insertar detalles de la cotización
    const detailsWithQuoteId = detailRows.map((d) => ({ ...d, quote_id: quote.id }));
    const { error: detailErr } = await supabaseAdmin
      .from("detalle_cotizaciones")
      .insert(detailsWithQuoteId);

    if (detailErr) {
      console.error("[API/QUOTES/PUBLIC] Error al insertar detalle_cotizaciones:", detailErr);
      // La cotización principal ya se creó con éxito
    }

    console.log(`[API/QUOTES/PUBLIC] Cotización creada con éxito: ${quoteNumber} (${quote.id}) para tenant: ${tenantId}`);

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quoteNumber,
    });
  } catch (error: any) {
    console.error("[API/QUOTES/PUBLIC] Error crítico en POST:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
