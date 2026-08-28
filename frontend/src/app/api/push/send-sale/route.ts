// ================================================================
// /api/push/send-sale — Guayabera Manager
// Notifica a todos los dispositivos suscritos cuando se hace una venta
// Protegido por sesión activa del tenant
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendPushToTenant } from "@/lib/push/send-push";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

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

