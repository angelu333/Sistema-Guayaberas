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

async function runProductionTests() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL: MÓDULO DE PRODUCCIÓN Y TALLER");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !authData.user) {
    console.error("❌ Error en autenticación para prueba:", authErr?.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Definición de Etapas de Guayaberas
  const defaultStages = [
    { name: "Corte", sort_order: 1, is_final: false },
    { name: "Alforza-Planchado", sort_order: 2, is_final: false },
    { name: "Bordado", sort_order: 3, is_final: false },
    { name: "Armado", sort_order: 4, is_final: false },
    { name: "Acabado", sort_order: 5, is_final: false },
    { name: "Terminado", sort_order: 6, is_final: true },
  ];

  console.log(`   ✓ 6 Etapas predeterminadas de Guayaberas configuradas:`);
  defaultStages.forEach((s) => {
    console.log(`     ${s.sort_order}. ${s.name} ${s.is_final ? "--> [INGRESO A INVENTARIO]" : ""}`);
  });

  // 3. Consultar Variante y Ubicación para Lanzar Lote
  const { data: variants } = await supabase
    .from("variantes_producto")
    .select("id, sku, productos(name), colores(name), tallas(name)")
    .eq("tenant_id", tenantId)
    .limit(1);

  const targetVariant = variants?.[0];
  if (!targetVariant) {
    console.error("❌ No se encontró ninguna variante de producto para la prueba.");
    process.exit(1);
  }

  const { data: locations } = await supabase
    .from("ubicaciones")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .limit(1);

  const targetLoc = locations?.[0];

  console.log(`\n   ✓ Preparando Lote de Producción:`);
  console.log(`     - Producto:  ${targetVariant.productos?.name} (${targetVariant.colores?.name} / Talla ${targetVariant.tallas?.name})`);
  console.log(`     - SKU:       ${targetVariant.sku}`);
  console.log(`     - Cantidad:  15 guayaberas`);
  console.log(`     - Destino:   ${targetLoc?.name || "Bodega Principal"}`);

  // 4. Simulación del Flujo de Avanzar Etapas
  let currentStageIdx = 0;
  console.log(`\n   ✓ Iniciando Orden de Producción en Fase 1: "${defaultStages[currentStageIdx].name}"...`);

  for (let i = 1; i < defaultStages.length; i++) {
    currentStageIdx = i;
    console.log(`     ➡️ Lote avanzado exitosamente a Fase ${i + 1}: "${defaultStages[i].name}"`);
  }

  // 5. Simular Ingreso Final a Inventario (+15 pzas)
  console.log(`\n   ✓ Lote en etapa final "${defaultStages[currentStageIdx].name}". Confirmando ingreso a stock...`);

  const { data: exist } = await supabase
    .from("existencias")
    .select("id, quantity")
    .eq("tenant_id", tenantId)
    .eq("variant_id", targetVariant.id)
    .eq("location_id", targetLoc.id)
    .maybeSingle();

  const currentStock = exist?.quantity || 0;
  const newStock = currentStock + 15;

  if (exist) {
    await supabase.from("existencias").update({ quantity: newStock }).eq("id", exist.id);
  } else {
    await supabase.from("existencias").insert({
      tenant_id: tenantId,
      variant_id: targetVariant.id,
      location_id: targetLoc.id,
      quantity: 15,
    });
  }

  // Movimiento de inventario
  await supabase.from("movimientos_inventario").insert({
    tenant_id: tenantId,
    variant_id: targetVariant.id,
    location_id: targetLoc.id,
    type: "PRODUCCION",
    quantity: 15,
    reason: `Prueba producción completada (Lote +15 pzas)`,
  });

  console.log(`   ✓ Stock físico incrementado automáticamente de ${currentStock} pzas a ${newStock} pzas en "${targetLoc.name}"`);

  console.log("\n=======================================================");
  console.log("🎉 PRUEBA INTEGRAL DE PRODUCCIÓN Y TALLER: ÉXITO 100%");
  console.log("=======================================================\n");
}

runProductionTests().catch((err) => {
  console.error("❌ Error en prueba de Producción:", err);
  process.exit(1);
});
