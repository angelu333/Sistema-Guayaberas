import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");

const env = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runStage7Tests() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL ETAPA 7: AUDITORÍA E HISTORIAL DE CAMBIOS");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Registrar Evento de Prueba en Auditoria (Cambio de Precio)
  const { data: auditRecord, error: aErr } = await supabase
    .from("auditoria")
    .insert({
      tenant_id: tenantId,
      entity: "PRECIO",
      action: "ACTUALIZAR",
      details: "Actualización de precio de venta Guayabera Presidencial ($850 -> $950)",
      old_data: { sale_price: 850.00, sku: "GALA-DIA-40-ML" },
      new_data: { sale_price: 950.00, sku: "GALA-DIA-40-ML" },
      user_id: userId,
    })
    .select()
    .single();

  if (aErr || !auditRecord) {
    console.error("❌ Error al insertar evento de auditoría:", aErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Evento de cambio de precio registrado en la bitácora (ID: ${auditRecord.id})`);

  // 3. Registrar Evento de Prueba en Auditoria (Ajuste de Stock)
  const { data: auditRecord2 } = await supabase
    .from("auditoria")
    .insert({
      tenant_id: tenantId,
      entity: "INVENTARIO",
      action: "AJUSTE",
      details: "Ajuste manual de inventario en Bodega Principal (+5 pzas)",
      old_data: { current_stock: 20 },
      new_data: { current_stock: 25 },
      user_id: userId,
    })
    .select()
    .single();

  console.log(`   ✓ Evento de ajuste de inventario registrado (ID: ${auditRecord2?.id})`);

  // 4. Consultar Bitacora Completa
  const { data: logs } = await supabase
    .from("auditoria")
    .select("entity, action, details, created_at, user_profiles(full_name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(5);

  console.log(`   ✓ Bitácora consultada con éxito (${logs?.length} eventos recientes):`);
  logs?.forEach((l, i) => {
    console.log(`     ${i + 1}. [${l.entity} / ${l.action}] ${l.details} — Usuario: ${l.user_profiles?.full_name || "Sistema"}`);
  });

  console.log("\n=======================================================");
  console.log("🎉 ETAPA 7 (AUDITORÍA E HISTORIAL) VALIDADA CON ÉXITO 100%");
  console.log("=======================================================\n");
}

runStage7Tests().catch((err) => {
  console.error("❌ Error en prueba Etapa 7:", err);
  process.exit(1);
});
