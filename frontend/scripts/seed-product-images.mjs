// scripts/seed-product-images.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");

const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [key, ...vals] = trimmed.split("=");
    envVars[key.trim()] = vals.join("=").trim();
  }
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["SUPABASE_SERVICE_ROLE_KEY"] || envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCT_IMAGES = [
  { match: "avaris", url: "/products/avaris.jpg" },
  { match: "gala", url: "/products/gala.jpg" },
  { match: "tho", url: "/products/tho.jpg" },
  { match: "valladolid", url: "/products/valladolid.jpg" },
];

async function seedImages() {
  console.log("Cargando productos de Supabase...");
  const { data: productos, error } = await supabase.from("productos").select("id, name, image_url");

  if (error || !productos) {
    console.error("Error al obtener productos:", error);
    return;
  }

  console.log(`Se encontraron ${productos.length} productos.`);

  for (let i = 0; i < productos.length; i++) {
    const prod = productos[i];
    const nameLower = prod.name.toLowerCase();
    
    let targetUrl = "/products/avaris.jpg";
    for (const item of PRODUCT_IMAGES) {
      if (nameLower.includes(item.match)) {
        targetUrl = item.url;
        break;
      }
    }
    if (targetUrl === "/products/avaris.jpg" && !nameLower.includes("avaris")) {
      const fallbackList = ["/products/avaris.jpg", "/products/gala.jpg", "/products/tho.jpg", "/products/valladolid.jpg"];
      targetUrl = fallbackList[i % fallbackList.length];
    }

    console.log(`Actualizando "${prod.name}" -> ${targetUrl}`);

    await supabase.from("productos").update({ image_url: targetUrl }).eq("id", prod.id);

    const { data: existingImg } = await supabase
      .from("imagenes_producto")
      .select("id")
      .eq("product_id", prod.id)
      .limit(1);

    if (!existingImg || existingImg.length === 0) {
      await supabase.from("imagenes_producto").insert({
        product_id: prod.id,
        url: targetUrl,
        is_primary: true,
        sort_order: 1,
      });
    } else {
      await supabase.from("imagenes_producto").update({ url: targetUrl }).eq("id", existingImg[0].id);
    }
  }

  console.log("✅ ¡Todas las fotos de productos han sido asignadas exitosamente!");
}

seedImages().catch(console.error);
