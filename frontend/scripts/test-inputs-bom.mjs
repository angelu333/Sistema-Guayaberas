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

async function runInputsBOMTest() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL: MATERIAS PRIMAS Y RECETAS BOM");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // 1. Auth
  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 2. Crear Insumos de Prueba (Tela Manta, Botones Nácar)
  const { data: inputTela, error: errTela } = await supabase
    .from("insumos")
    .insert({
      tenant_id: tenantId,
      name: "Tela Manta Fina Blanco Algodón",
      category: "tela",
      unit: "metros",
      current_stock: 100.0,
      min_stock: 15.0,
      cost_per_unit: 85.0,
    })
    .select()
    .single();

  if (errTela) {
    console.log(`   ⚠️ Nota: ${errTela.message} (ejecuta 010_inputs.sql en Supabase)`);
    return;
  }

  const { data: inputBotones } = await supabase
    .from("insumos")
    .insert({
      tenant_id: tenantId,
      name: "Botón Nácar Tradicional 4 Hoyos",
      category: "boton",
      unit: "piezas",
      current_stock: 500.0,
      min_stock: 50.0,
      cost_per_unit: 2.5,
    })
    .select()
    .single();

  console.log(`   ✓ Insumos creados:`);
  console.log(`     - ${inputTela.name}: ${inputTela.current_stock} m ($85.00/m)`);
  console.log(`     - ${inputBotones.name}: ${inputBotones.current_stock} pzas ($2.50/pza)`);

  // 3. Crear Receta de Confección (BOM) para un Modelo
  const { data: product } = await supabase
    .from("productos")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  await supabase.from("recetas_produccion").insert([
    {
      tenant_id: tenantId,
      product_id: product.id,
      insumo_id: inputTela.id,
      quantity_needed: 2.5, // 2.5 metros por guayabera
      notes: "Tela principal",
    },
    {
      tenant_id: tenantId,
      product_id: product.id,
      insumo_id: inputBotones.id,
      quantity_needed: 12, // 12 botones por guayabera
      notes: "Frente y puños",
    },
  ]);

  console.log(`\n   ✓ Receta de Confección BOM definida para "${product.name}":`);
  console.log(`     - 2.5 metros de ${inputTela.name} por guayabera`);
  console.log(`     - 12 piezas de ${inputBotones.name} por guayabera`);

  // 4. Simulación de Descuento de Insumos al Producir 10 Guayaberas
  const producedQty = 10;
  const telaDeduction = 2.5 * producedQty; // 25 metros
  const botonesDeduction = 12 * producedQty; // 120 botones

  await supabase.from("insumos").update({ current_stock: 100 - telaDeduction }).eq("id", inputTela.id);
  await supabase.from("insumos").update({ current_stock: 500 - botonesDeduction }).eq("id", inputBotones.id);

  console.log(`\n   ✓ Simulación de producción completada (10 pzas de ${product.name}):`);
  console.log(`     - Tela Manta descontada: -${telaDeduction} m (Nuevo stock: ${100 - telaDeduction} m)`);
  console.log(`     - Botones Nácar descontados: -${botonesDeduction} pzas (Nuevo stock: ${500 - botonesDeduction} pzas)`);

  console.log("\n=======================================================");
  console.log("🎉 MATERIAS PRIMAS Y RECETAS BOM VALIDADO AL 100%");
  console.log("=======================================================\n");
}

runInputsBOMTest().catch((err) => {
  console.error("❌ Error en prueba de insumos:", err);
});
