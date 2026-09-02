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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignSleeveTypes() {
  console.log("🔍 Consultando tipos de manga disponibles en la BD...");
  
  let { data: sleeveTypes, error: stErr } = await supabase
    .from("tipos_manga")
    .select("id, name");

  if (stErr || !sleeveTypes || sleeveTypes.length === 0) {
    console.log("No se encontraron tipos de manga, intentando crearlos...");
    const { data: inserted, error: insErr } = await supabase
      .from("tipos_manga")
      .insert([
        { name: "Corta" },
        { name: "Larga" }
      ])
      .select("id, name");
    
    if (insErr) {
      console.error("Error al crear tipos de manga:", insErr);
      return;
    }
    sleeveTypes = inserted;
  }

  console.log("Tipos de manga encontrados:", sleeveTypes.map(s => `${s.name} (${s.id})`));

  console.log("🔍 Consultando variantes de producto...");
  const { data: variants, error: vErr } = await supabase
    .from("variantes_producto")
    .select("id, sku, sleeve_type_id, productos(name)");

  if (vErr || !variants) {
    console.error("Error al consultar variantes:", vErr);
    return;
  }

  console.log(`Se encontraron ${variants.length} variantes. Asignando tipos de manga...`);

  let updatedCount = 0;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    // Alternar o asignar aleatoriamente entre los tipos de manga disponibles
    const selectedSleeve = sleeveTypes[i % sleeveTypes.length];

    const { error: updErr } = await supabase
      .from("variantes_producto")
      .update({ sleeve_type_id: selectedSleeve.id })
      .eq("id", v.id);

    if (updErr) {
      console.error(`Error al actualizar variante ${v.sku}:`, updErr.message);
    } else {
      updatedCount++;
      console.log(`✓ Variante ${v.sku} (${v.productos?.name || "Guayabera"}) -> Manga ${selectedSleeve.name}`);
    }
  }

  console.log(`\n🎉 Proceso finalizado: ${updatedCount} de ${variants.length} variantes actualizadas con tipo de manga.`);
}

assignSleeveTypes().catch(console.error);
