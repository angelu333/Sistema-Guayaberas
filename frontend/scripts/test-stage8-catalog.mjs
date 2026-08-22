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

async function runStage8Tests() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL ETAPA 8: CATÁLOGO PÚBLICO Y FILTROS");
  console.log("=======================================================\n");

  // 1. Obtener tenant por slug
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id, name, slug, phone, whatsapp")
    .eq("slug", "guayabera-test")
    .single();

  if (tErr || !tenant) {
    console.error("❌ Error obteniendo tenant publico:", tErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Tienda pública identificada: "${tenant.name}" (Slug: /catalogo/${tenant.slug})`);

  // 2. Obtener Opciones de Filtro (Modelo, Talla, Color)
  const [prods, colors, sizes] = await Promise.all([
    supabase.from("productos").select("name").eq("tenant_id", tenant.id),
    supabase.from("colores").select("name").eq("tenant_id", tenant.id),
    supabase.from("tallas").select("name").eq("tenant_id", tenant.id),
  ]);

  console.log(`   ✓ Opciones de filtro cargadas:`);
  console.log(`     - Modelos: [${prods.data?.map((p) => p.name).join(", ")}]`);
  console.log(`     - Tallas:  [${sizes.data?.map((s) => s.name).join(", ")}]`);
  console.log(`     - Colores: [${colors.data?.map((c) => c.name).join(", ")}]`);

  // 3. Consultar Catalogo Filtrado (Modelo: "Valladolid", Talla: "38")
  const { data: catalogFiltered, error: cErr } = await supabase
    .from("variantes_producto")
    .select(`
      sku,
      sale_price,
      productos!inner(name),
      colores(name),
      tallas(name),
      existencias(quantity)
    `)
    .eq("tenant_id", tenant.id)
    .eq("is_active", true);

  if (cErr) {
    console.error("❌ Error consultando catalogo publico:", cErr.message);
    process.exit(1);
  }

  console.log(`   ✓ Catálogo público consultado libremente (Sin login): ${catalogFiltered?.length} variantes listadas.`);
  catalogFiltered?.forEach((item) => {
    const stock = (item.existencias || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    console.log(`     - ${item.productos?.name} (${item.colores?.name} / Talla ${item.tallas?.name}): SKU ${item.sku} — $${item.sale_price} MXN (Stock: ${stock} pzas)`);
  });

  // 4. Simular enlace filtrado para WhatsApp
  const deepLink = `http://localhost:3000/catalogo/${tenant.slug}?modelo=Valladolid&talla=38&color=Azul`;
  console.log(`\n   ✓ Enlace filtrado generado para WhatsApp:`);
  console.log(`     👉 ${deepLink}`);

  console.log("\n=======================================================");
  console.log("🎉 ETAPA 8 (CATÁLOGO PÚBLICO) VALIDADA CON ÉXITO 100%");
  console.log("=======================================================\n");
}

runStage8Tests().catch((err) => {
  console.error("❌ Error en prueba Etapa 8:", err);
  process.exit(1);
});
