// ================================================================
// /api/push/test — Guayabera Manager
// Envía una notificación push de prueba al usuario autenticado
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { sendPushToTenant } from "../send/route";

export async function POST(req: NextRequest) {
  try {
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
