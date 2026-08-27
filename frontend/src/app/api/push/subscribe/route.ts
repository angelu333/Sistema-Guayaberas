// ================================================================
// /api/push/subscribe — Guayabera Manager
// Guarda la suscripción push de un dispositivo en Supabase
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { subscription, tenantId, userId } = await req.json();

    if (!subscription?.endpoint || !tenantId || !userId) {
      return NextResponse.json(
        { error: "Datos incompletos: se requiere subscription, tenantId y userId." },
        { status: 400 }
      );
    }

    // Guardar o actualizar la suscripción en la tabla push_subscriptions
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          user_agent: req.headers.get("user-agent") || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "endpoint",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error("[API/Push] Error al guardar suscripción:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Suscripción registrada correctamente." });
  } catch (err: any) {
    console.error("[API/Push] Error interno:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
