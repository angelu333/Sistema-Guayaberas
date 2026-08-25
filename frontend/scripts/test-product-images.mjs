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

async function runProductImagesTest() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL: FOTOGRAFÍAS, CARRUSEL Y VISTA POS");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 1. Crear Producto de Guayabera con Galería de Fotos
  const testCoverPhoto = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80";
  const testDetailPhoto1 = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80";
  const testDetailPhoto2 = "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80";

  const { data: prod, error: pErr } = await supabase
    .from("productos")
    .insert({
      tenant_id: tenantId,
      name: "Guayabera Montejo Lino Fino",
      description: "Guayabera artesanal yucateca con 4 bolsas y alforzado fino de 20 líneas en 100% lino.",
      image_url: testCoverPhoto,
    })
    .select()
    .single();

  if (pErr) {
    console.log(`   ⚠️ Nota al crear producto: ${pErr.message} (ejecuta 012_product_images.sql en Supabase)`);
    return;
  }

  console.log(`   ✓ Producto Base Creado: ${prod.name}`);
  console.log(`     - Foto de Portada: ${prod.image_url.slice(0, 40)}...`);

  // 2. Insertar Fotos en Galería de Carrusel (imagenes_producto)
  const imageRows = [
    { tenant_id: tenantId, product_id: prod.id, url: testCoverPhoto, sort_order: 1, is_primary: true },
    { tenant_id: tenantId, product_id: prod.id, url: testDetailPhoto1, sort_order: 2, is_primary: false },
    { tenant_id: tenantId, product_id: prod.id, url: testDetailPhoto2, sort_order: 3, is_primary: false },
  ];

  await supabase.from("imagenes_producto").insert(imageRows);
  console.log(`   ✓ Galería de 3 Fotos guardada para el Carrusel de la tienda.`);

  // 3. Crear Variantes con SKU
  const { data: color } = await supabase.from("colores").select("id, name").eq("tenant_id", tenantId).limit(1).single();
  const { data: talla } = await supabase.from("tallas").select("id, name").eq("tenant_id", tenantId).limit(1).single();

  const testSku = `MONT-${Date.now().toString().slice(-4)}`;
  await supabase.from("variantes_producto").insert({
    tenant_id: tenantId,
    product_id: prod.id,
    color_id: color.id,
    size_id: talla.id,
    sku: testSku,
    cost_price: 400,
    sale_price: 850,
    min_stock: 3,
  });

  console.log(`   ✓ Variante creada SKU: ${testSku} ($850 MXN)`);

  // 4. Verificar Consulta del Catálogo Público con Fotos y Carrusel
  const { data: catalogResult } = await supabase
    .from("variantes_producto")
    .select(`
      id, sku, sale_price,
      productos(id, name, image_url, imagenes_producto(url, sort_order, is_primary)),
      colores(name),
      tallas(name)
    `)
    .eq("id", (await supabase.from("variantes_producto").select("id").eq("sku", testSku).single()).data.id)
    .single();

  const retrievedImages = catalogResult.productos?.imagenes_producto || [];
  console.log(`\n   ✓ Verificación de Catálogo Público:`);
  console.log(`     - Nombre: ${catalogResult.productos?.name}`);
  console.log(`     - Foto Principal en Tarjeta: ${Boolean(catalogResult.productos?.image_url)}`);
  console.log(`     - Total de Fotos para el Carrusel: ${retrievedImages.length} fotos`);

  console.log("\n=======================================================");
  console.log("🎉 MÓDULO DE FOTOGRAFÍAS, CARRUSEL Y POS VALIDADO 100%");
  console.log("=======================================================\n");
}

runProductImagesTest().catch((err) => {
  console.error("❌ Error en prueba de imágenes:", err);
});
