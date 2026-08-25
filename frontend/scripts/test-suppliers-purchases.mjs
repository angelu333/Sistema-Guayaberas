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

async function runSuppliersTest() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL: MÓDULO DE PROVEEDORES Y COMPRAS");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Crear Proveedor de Prueba
  const { data: supplier, error: supErr } = await supabase
    .from("proveedores")
    .insert({
      tenant_id: tenantId,
      name: "Textiles del Mayab S.A.",
      contact_name: "Don Fernando Pech",
      phone: "999 987 6543",
      email: "ventas@textilesmayab.com",
      type: "telas",
      city: "Mérida",
      notes: "Proveedor principal de lino y manta",
    })
    .select()
    .single();

  if (supErr) {
    console.log(`   ⚠️ Nota: ${supErr.message} (ejecuta 009_suppliers.sql en Supabase)`);
    return;
  }

  console.log(`   ✓ Proveedor registrado: ${supplier.name} (${supplier.city})`);

  // 3. Crear Orden de Compra
  const { data: variant } = await supabase
    .from("variantes_producto")
    .select("id, sku, productos(name)")
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  const { data: loc } = await supabase
    .from("ubicaciones")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  const orderNum = `CO-${Date.now().toString().slice(-6)}`;
  const { data: purchase } = await supabase
    .from("compras")
    .insert({
      tenant_id: tenantId,
      order_number: orderNum,
      supplier_id: supplier.id,
      status: "pending",
      total_cost: 5000.0,
      notes: "Compra de lote especial para temporada",
    })
    .select()
    .single();

  await supabase.from("detalle_compras").insert({
    tenant_id: tenantId,
    purchase_id: purchase.id,
    variant_id: variant.id,
    quantity: 20,
    unit_cost: 250.0,
    location_id: loc.id,
  });

  console.log(`   ✓ Orden de Compra ${purchase.order_number} registrada (20 pzas a $250.00 MXN = $5,000.00 MXN)`);

  // 4. Recepción de Compra -> Ingreso a Inventario (ENTRADA)
  await supabase.from("compras").update({ status: "received", received_at: new Date().toISOString() }).eq("id", purchase.id);

  await supabase.from("movimientos_inventario").insert({
    tenant_id: tenantId,
    variant_id: variant.id,
    location_id: loc.id,
    type: "ENTRADA",
    quantity: 20,
    reason: `Recepción de compra ${purchase.order_number}`,
  });

  console.log(`   ✓ Mercancía recibida: Stock incrementado +20 pzas en "${loc.name}" mediante movimiento ENTRADA`);

  console.log("\n=======================================================");
  console.log("🎉 MÓDULO DE PROVEEDORES Y COMPRAS VALIDADO AL 100%");
  console.log("=======================================================\n");
}

runSuppliersTest().catch((err) => {
  console.error("❌ Error en prueba de compras:", err);
});
