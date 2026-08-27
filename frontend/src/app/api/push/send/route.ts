// ================================================================
// /api/push/send — Guayabera Manager
// Re-exporta la función sendPushToTenant para uso interno.
// Este endpoint no acepta peticiones HTTP directas.
// ================================================================
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Endpoint interno. Usa /api/push/send-sale o /api/push/test." }, { status: 405 });
}

export { sendPushToTenant } from "@/lib/push/send-push";
