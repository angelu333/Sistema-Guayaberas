// ================================================================
// /api/push/send-quote — Guayabera Manager
// Notifica al tenant cuando un cliente genera una cotizacion
// desde el Catalogo Digital Publico.
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { sendPushToTenant } from "@/lib/push/send-push";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, quoteNumber, totalPieces, totalAmount } = await req.json();

    if (!tenantId || !quoteNumber) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 });
    }

    const result = await sendPushToTenant(tenantId, {
      title: "Nueva Cotizacion Recibida",
      body: `Folio ${quoteNumber} — ${totalPieces} prenda${totalPieces !== 1 ? "s" : ""} ($${Number(totalAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN) desde el Catalogo Digital`,
      tag: `cotizacion-${quoteNumber}`,
      data: {
        url: "/ventas",
        type: "sale",
        quoteNumber,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[API/Push/QuoteSend] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
