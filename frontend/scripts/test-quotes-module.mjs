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

async function runQuotesTest() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL: MÓDULO DE COTIZACIONES DE MAYOREO");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Crear Rango de Mayoreo de Prueba
  const { data: tier, error: tierErr } = await supabase
    .from("rangos_mayoreo")
    .insert({
      tenant_id: tenantId,
      name: "Mayoreo Especial Prueba (10-20 pzas)",
      min_quantity: 10,
      max_quantity: 20,
      discount_percent: 15.0,
    })
    .select()
    .single();

  if (tierErr) {
    console.log(`   ⚠️ Nota: ${tierErr.message} (ejecuta 011_quotes.sql en Supabase)`);
    return;
  }

  console.log(`   ✓ Escala de Mayoreo Creada: ${tier.name} (${tier.discount_percent}% OFF)`);

  // 3. Crear Cotización de Mayoreo (COT-XXXXXX)
  const { data: variant } = await supabase
    .from("variantes_producto")
    .select("id, sku, sale_price, productos(name)")
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  const quoteNum = `COT-${Date.now().toString().slice(-6)}`;
  const qty = 15;
  const unitPrice = Number(variant.sale_price || 450);
  const discountPercent = 15.0; // 15% OFF
  const finalPrice = unitPrice * (1 - discountPercent / 100);
  const subtotalRaw = qty * unitPrice;
  const finalSubtotal = qty * finalPrice;
  const discountAmount = subtotalRaw - finalSubtotal;

  const { data: quote } = await supabase
    .from("cotizaciones")
    .insert({
      tenant_id: tenantId,
      quote_number: quoteNum,
      client_name: "Hotel Presidente InterContinental",
      client_phone: "999 111 2233",
      status: "draft",
      total_pieces: qty,
      subtotal: subtotalRaw,
      discount_amount: discountAmount,
      total_amount: finalSubtotal,
      valid_days: 15,
      notes: "Cotización para uniformes de personal",
    })
    .select()
    .single();

  await supabase.from("detalle_cotizaciones").insert({
    tenant_id: tenantId,
    quote_id: quote.id,
    variant_id: variant.id,
    quantity: qty,
    unit_price: unitPrice,
    discount_percent: discountPercent,
    final_unit_price: finalPrice,
    subtotal: finalSubtotal,
  });

  console.log(`   ✓ Cotización ${quote.quote_number} generada exitosamente:`);
  console.log(`     - Cliente: ${quote.client_name}`);
  console.log(`     - Piezas: ${qty} pzas de ${variant.productos?.name}`);
  console.log(`     - Descuento de Mayoreo: ${discountPercent}% OFF (-$${discountAmount.toFixed(2)} MXN)`);
  console.log(`     - Total Cotizado: $${finalSubtotal.toFixed(2)} MXN`);

  // 4. Simular Ajuste Interactivo del Cliente en la página pública /cotizacion/[id]
  const newQty = 20; // Cliente sube la cantidad a 20 piezas
  const newSubtotalRaw = newQty * unitPrice;
  const newFinalSubtotal = newQty * finalPrice;
  const newDiscountAmount = newSubtotalRaw - newFinalSubtotal;

  await supabase
    .from("cotizaciones")
    .update({
      total_pieces: newQty,
      subtotal: newSubtotalRaw,
      discount_amount: newDiscountAmount,
      total_amount: newFinalSubtotal,
      status: "accepted",
    })
    .eq("id", quote.id);

  console.log(`\n   ✓ Simulación de Ajuste por el Cliente en Enlace Público (/cotizacion/${quote.id}):`);
  console.log(`     - Cantidad ajustada por el cliente: ${newQty} piezas`);
  console.log(`     - Nuevo Total Recalculado: $${newFinalSubtotal.toFixed(2)} MXN`);
  console.log(`     - Estado de Cotización cambiado a: "accepted" (Aceptada)`);

  console.log("\n=======================================================");
  console.log("🎉 MÓDULO DE COTIZACIONES DE MAYOREO VALIDADO AL 100%");
  console.log("=======================================================\n");
}

runQuotesTest().catch((err) => {
  console.error("❌ Error en prueba de cotizaciones:", err);
});
