// ================================================================
// /api/push/send-sale — Guayabera Manager
// Notifica a todos los dispositivos suscritos cuando se hace una venta
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { sendPushToTenant } from "@/lib/push/send-push";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, ticketNumber, total, totalItems, saleId } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "Falta tenantId." }, { status: 400 });
    }

    const result = await sendPushToTenant(tenantId, {
      title: "🛍️ Nueva Venta Registrada",
      body: `Ticket ${ticketNumber} — ${total} (${totalItems} prenda${totalItems !== 1 ? "s" : ""})`,
      tag: `venta-${saleId}`,
      data: {
        url: "/ventas",
        type: "sale",
        ticketNumber,
        saleId,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[API/Push/SaleSend] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
