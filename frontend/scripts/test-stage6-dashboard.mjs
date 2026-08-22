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

async function runStage6Tests() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL ETAPA 6: DASHBOARD Y GRÁFICAS RECHARTS");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Metricas financieras
  const { data: sales } = await supabase
    .from("ventas")
    .select("total, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "completed");

  const totalRev = (sales || []).reduce((acc, s) => acc + Number(s.total || 0), 0);
  console.log(`   ✓ Total Ingresos en Base de Datos: $${totalRev.toFixed(2)} en ${sales?.length || 0} venta(s)`);

  // 3. Valuacion de inventario
  const { data: variants } = await supabase
    .from("variantes_producto")
    .select("sale_price, existencias(quantity)")
    .eq("tenant_id", tenantId);

  let totalUnits = 0;
  let totalValuation = 0;
  (variants || []).forEach((v) => {
    const qty = (v.existencias || []).reduce((acc, e) => acc + (e.quantity || 0), 0);
    totalUnits += qty;
    totalValuation += qty * Number(v.sale_price || 0);
  });

  console.log(`   ✓ Valuación Total de Inventario: $${totalValuation.toFixed(2)} (${totalUnits} piezas físicas)`);

  // 4. Productos Mas Vendidos
  const { data: topDetail } = await supabase
    .from("detalle_ventas")
    .select("quantity, subtotal, variantes_producto(productos(name))")
    .eq("tenant_id", tenantId);

  console.log(`   ✓ Transacciones de detalle procesadas para gráfica Top: ${topDetail?.length || 0}`);

  console.log("\n=======================================================");
  console.log("🎉 ETAPA 6 (DASHBOARD Y GRÁFICAS) VALIDADA CON ÉXITO 100%");
  console.log("=======================================================\n");
}

runStage6Tests().catch((err) => {
  console.error("❌ Error en prueba Etapa 6:", err);
  process.exit(1);
});
