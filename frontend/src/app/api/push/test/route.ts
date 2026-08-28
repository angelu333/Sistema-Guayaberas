// ================================================================
// /api/push/test — Guayabera Manager
// Envía una notificación push de prueba al usuario autenticado
// Protegido por sesión activa
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

    const { tenantId, userId } = await req.json();

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Se requiere tenantId y userId." },
        { status: 400 }
      );
    }

    const result = await sendPushToTenant(tenantId, {
      title: "🧪 Notificación de Prueba",
      body: "¡Las notificaciones push están funcionando correctamente en Guayabera Manager!",
      tag: "test",
      data: {
        url: "/configuracion",
        type: "test",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Notificación enviada a ${result.sent} dispositivo(s).`,
      ...result,
    });
  } catch (err: any) {
    console.error("[API/Push/Test] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

