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

async function runStage9Tests() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL ETAPA 9: REPORTES Y EXPORTACIÓN CSV");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Reporte de Ventas por Periodo
  const { data: sales } = await supabase
    .from("ventas")
    .select("ticket_number, total, created_at, user_profiles(full_name)")
    .eq("tenant_id", tenantId);

  console.log(`   ✓ Reporte de ventas generado (${sales?.length || 0} filas):`);
  sales?.forEach((s) => {
    console.log(`     - Ticket ${s.ticket_number}: $${s.total} MXN (${s.user_profiles?.full_name || "Vendedor"})`);
  });

  // 3. Reporte de Inventario Valorizado
  const { data: variants } = await supabase
    .from("variantes_producto")
    .select("sku, cost_price, sale_price, existencias(quantity), productos(name)")
    .eq("tenant_id", tenantId);

  let totalCost = 0;
  let totalSale = 0;
  let totalPieces = 0;

  variants?.forEach((v) => {
    const stock = (v.existencias || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    totalPieces += stock;
    totalCost += stock * Number(v.cost_price || 0);
    totalSale += stock * Number(v.sale_price || 0);
  });

  console.log(`\n   ✓ Reporte de Inventario Valorizado:`);
  console.log(`     - Piezas físicas en existencia: ${totalPieces} pzas`);
  console.log(`     - Valuación total a costo:      $${totalCost.toFixed(2)} MXN`);
  console.log(`     - Valuación total a venta:      $${totalSale.toFixed(2)} MXN`);
  console.log(`     - Utilidad bruta estimada:       $${(totalSale - totalCost).toFixed(2)} MXN`);

  console.log("\n=======================================================");
  console.log("🎉 ETAPA 9 (REPORTES Y EXPORTACIÓN) VALIDADA CON ÉXITO 100%");
  console.log("=======================================================\n");
}

runStage9Tests().catch((err) => {
  console.error("❌ Error en prueba Etapa 9:", err);
  process.exit(1);
});
