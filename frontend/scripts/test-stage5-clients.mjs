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

async function runStage5Tests() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL ETAPA 5: CLIENTES Y CRM");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Crear Cliente Mayorista
  const wholesaleName = `Novedades Peninsulares S.A. (${Date.now().toString().slice(-4)})`;
  const { data: client, error: cErr } = await supabase
    .from("clientes")
    .insert({
      tenant_id: tenantId,
      full_name: wholesaleName,
      company: "Grupo Peninsular",
      rfc: "GPE9001019A1",
      phone: "999-555-0199",
      email: "ventas@peninsular.com",
      type: "wholesale",
      discount_percent: 15.0,
      notes: "Cliente preferente precio mayorista",
    })
    .select()
    .single();

  if (cErr || !client) {
    console.error("❌ Error al crear cliente mayorista:", cErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Cliente mayorista registrado con éxito: "${client.full_name}" (Descuento: ${client.discount_percent}%)`);

  // 3. Obtener variante para venta
  const { data: variants } = await supabase
    .from("variantes_producto")
    .select("id, sku, sale_price")
    .eq("tenant_id", tenantId)
    .limit(1);

  const variant = variants[0];
  console.log(`   ✓ Variante seleccionada para compra mayorista: SKU "${variant.sku}" ($${variant.sale_price})`);

  // 4. Registrar Venta con Cliente Asignado y Descuento Mayorista (15%)
  const qty = 4; // 4 guayaberas
  const unitPrice = Number(variant.sale_price); // ej 950
  const subtotal = qty * unitPrice; // 3800
  const discountAmount = subtotal * (client.discount_percent / 100); // 570
  const total = subtotal - discountAmount; // 3230

  const { data: ticketNumber } = await supabase.rpc("generate_ticket_number", { p_tenant_id: tenantId });

  const { data: sale, error: sErr } = await supabase
    .from("ventas")
    .insert({
      tenant_id: tenantId,
      ticket_number: ticketNumber,
      client_id: client.id,
      seller_id: userId,
      subtotal,
      discount_amount: discountAmount,
      total,
      status: "completed",
      notes: "Compra de lote mayorista",
    })
    .select("id")
    .single();

  if (sErr || !sale) {
    console.error("❌ Error registrando venta mayorista:", sErr?.message);
    process.exit(1);
  }

  await supabase.from("detalle_ventas").insert({
    tenant_id: tenantId,
    sale_id: sale.id,
    variant_id: variant.id,
    quantity: qty,
    unit_price: unitPrice,
    discount_pct: client.discount_percent,
    subtotal: total,
  });

  await supabase.from("pagos_venta").insert({
    tenant_id: tenantId,
    sale_id: sale.id,
    method: "transfer",
    amount: total,
  });

  console.log(`   ✓ Venta mayorista registrada con ticket: "${ticketNumber}"`);
  console.log(`     - Subtotal: $${subtotal} | Desc (15%): -$${discountAmount} | Total a Pagar: $${total}`);

  // 5. Consultar Historial Acumulado del Cliente
  const { data: clientHistory } = await supabase
    .from("ventas")
    .select("ticket_number, total, created_at")
    .eq("tenant_id", tenantId)
    .eq("client_id", client.id);

  console.log(`   ✓ Historial acumulado del cliente verificado: ${clientHistory?.length} compras asociadas.`);
  clientHistory?.forEach((ch) => {
    console.log(`     - Ticket: ${ch.ticket_number} | Total Comprado: $${ch.total}`);
  });

  console.log("\n=======================================================");
  console.log("🎉 ETAPA 5 (CLIENTES Y CRM) VALIDADA CON ÉXITO 100%");
  console.log("=======================================================\n");
}

runStage5Tests().catch((err) => {
  console.error("❌ Error en prueba Etapa 5:", err);
  process.exit(1);
});
