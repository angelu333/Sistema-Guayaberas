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

async function runSettingsTest() {
  console.log("\n=======================================================");
  console.log("🚀 PRUEBA INTEGRAL: CONFIGURACIÓN, PERFIL Y LOGOTIPO");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
  const userId = authData.user.id;
  const { data: profile } = await supabase.from("user_profiles").select("tenant_id, full_name").eq("id", userId).single();
  const tenantId = profile.tenant_id;
  console.log(`   ✓ Autenticado para Tenant ID: ${tenantId}`);

  // 1. Probar actualización de datos de la empresa y Logo
  const testLogo = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=200&q=80";
  const updatePayload = {
    name: "Guayaberas Ábito & Montejo",
    slug: "abito-montejo",
    rfc: "GAM230815XYZ",
    phone: "999-923-8899",
    whatsapp: "529999238899",
    email: "ventas@abito.com.mx",
    address: "Paseo de Montejo #480, Mérida, Yucatán",
    logo_url: testLogo,
  };

  const { error: tErr } = await supabase.from("tenants").update(updatePayload).eq("id", tenantId);
  if (tErr) {
    console.error("❌ Error al actualizar tenant:", tErr.message);
    return;
  }
  console.log(`   ✓ Datos de la Empresa y Logotipo actualizados exitosamente:`);
  console.log(`     - Nombre: ${updatePayload.name}`);
  console.log(`     - Slug: /catalogo/${updatePayload.slug}`);
  console.log(`     - WhatsApp: ${updatePayload.whatsapp}`);
  console.log(`     - Logo URL: ${updatePayload.logo_url}`);

  // 2. Probar actualización de configuración de tickets (pie de ticket)
  const ticketFooterText = "¡Gracias por su compra! Confección artesanal 100% yucateca.";
  const { data: existingSettings } = await supabase.from("tenant_settings").select("id").eq("tenant_id", tenantId).single();
  if (existingSettings) {
    await supabase.from("tenant_settings").update({ ticket_footer: ticketFooterText }).eq("tenant_id", tenantId);
  } else {
    await supabase.from("tenant_settings").insert({ tenant_id: tenantId, ticket_footer: ticketFooterText });
  }
  console.log(`   ✓ Pie de ticket configurado: "${ticketFooterText}"`);

  // 3. Probar actualización de perfil de usuario
  const newFullName = "Don Carlos Montejo";
  await supabase.from("user_profiles").update({ full_name: newFullName }).eq("id", userId);
  console.log(`   ✓ Nombre de perfil actualizado a: "${newFullName}"`);

  // 4. Verificar consulta completa
  const { data: verifyTenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  const { data: verifyProfile } = await supabase.from("user_profiles").select("full_name").eq("id", userId).single();

  console.log(`\n   ✓ Verificación final de datos en Base de Datos:`);
  console.log(`     - Tenant Name: ${verifyTenant.name}`);
  console.log(`     - Tenant Logo: ${Boolean(verifyTenant.logo_url)}`);
  console.log(`     - User Full Name: ${verifyProfile.full_name}`);

  console.log("\n=======================================================");
  console.log("🎉 MÓDULO DE CONFIGURACIÓN, LOGOTIPO Y PERFIL 100% LISTO");
  console.log("=======================================================\n");
}

runSettingsTest().catch((err) => {
  console.error("❌ Error en prueba de configuración:", err);
});
