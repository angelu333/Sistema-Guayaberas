import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer .env.local manualmente sin dependencias
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚀 INICIANDO BATERÍA DE PRUEBAS INTERNAS (ETAPAS 1 - 4)");
  console.log("=======================================================\n");

  const email = "admintest@gmail.com";
  const password = "123456";

  // ---------------------------------------------------------------------------
  // 1. AUTENTICACIÓN Y OBTENCIÓN DE TENANT
  // ---------------------------------------------------------------------------
  console.log("🔑 [1/5] Probando Autenticación e Identificación de Tenant...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.error("❌ Error al iniciar sesión:", authError?.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`   ✓ Usuario autenticado con éxito (ID: ${userId})`);

  // Obtener perfil del usuario
  const { data: profile, error: profError } = await supabase
    .from("user_profiles")
    .select("*, tenants(*)")
    .eq("id", userId)
    .single();

  if (profError || !profile) {
    console.error("❌ Error al obtener perfil de usuario:", profError?.message);
    process.exit(1);
  }

  const tenantId = profile.tenant_id;
  const tenantName = profile.tenants?.name || "Desconocido";
  console.log(`   ✓ Tenant vinculado: "${tenantName}" (Tenant ID: ${tenantId})`);
  console.log(`   ✓ Rol del usuario: ${profile.role}`);

  // ---------------------------------------------------------------------------
  // 2. CATÁLOGO Y VARIANTES (ETAPA 2)
  // ---------------------------------------------------------------------------
  console.log("\n👔 [2/5] Probando Catálogo de Productos y Creación de Variantes...");

  // 2.1 Categoría
  let categoryId;
  const { data: existingCat } = await supabase
    .from("categorias")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "Guayabera Gala Test")
    .maybeSingle();

  if (existingCat) {
    categoryId = existingCat.id;
  } else {
    const { data: newCat, error: catErr } = await supabase
      .from("categorias")
      .insert({ tenant_id: tenantId, name: "Guayabera Gala Test" })
      .select("id")
      .single();
    if (catErr || !newCat) {
      console.error("❌ Error creando categoría:", catErr?.message);
      process.exit(1);
    }
    categoryId = newCat.id;
  }
  console.log(`   ✓ Categoría verificada/creada (ID: ${categoryId})`);

  // 2.2 Color
  let colorId;
  const { data: existingColor } = await supabase
    .from("colores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "Blanco Diamante")
    .maybeSingle();

  if (existingColor) {
    colorId = existingColor.id;
  } else {
    const { data: newColor, error: colErr } = await supabase
      .from("colores")
      .insert({ tenant_id: tenantId, name: "Blanco Diamante", hex_code: "#FFFFFF" })
      .select("id")
      .single();
    if (colErr || !newColor) {
      console.error("❌ Error creando color:", colErr?.message);
      process.exit(1);
    }
    colorId = newColor.id;
  }

  // 2.3 Talla
  let sizeId;
  const { data: existingSize } = await supabase
    .from("tallas")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "40")
    .maybeSingle();

  if (existingSize) {
    sizeId = existingSize.id;
  } else {
    const { data: newSize, error: sizeErr } = await supabase
      .from("tallas")
      .insert({ tenant_id: tenantId, name: "40", sort_order: 3 })
      .select("id")
      .single();
    if (sizeErr || !newSize) {
      console.error("❌ Error creando talla:", sizeErr?.message);
      process.exit(1);
    }
    sizeId = newSize.id;
  }

  // 2.4 Tipo de Manga
  let sleeveId;
  const { data: existingSleeve } = await supabase
    .from("tipos_manga")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "Manga Larga")
    .maybeSingle();

  if (existingSleeve) {
    sleeveId = existingSleeve.id;
  } else {
    const { data: newSleeve, error: slvErr } = await supabase
      .from("tipos_manga")
      .insert({ tenant_id: tenantId, name: "Manga Larga" })
      .select("id")
      .single();
    if (slvErr || !newSleeve) {
      console.error("❌ Error creando manga:", slvErr?.message);
      process.exit(1);
    }
    sleeveId = newSleeve.id;
  }

  // 2.5 Producto Base
  let productId;
  const { data: existingProd } = await supabase
    .from("productos")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "Guayabera Gala Presidencial Test")
    .maybeSingle();

  if (existingProd) {
    productId = existingProd.id;
  } else {
    const { data: newProd, error: prodErr } = await supabase
      .from("productos")
      .insert({
        tenant_id: tenantId,
        category_id: categoryId,
        name: "Guayabera Gala Presidencial Test",
        description: "Modelo exclusivo de prueba automatizada",
      })
      .select("id")
      .single();
    if (prodErr || !newProd) {
      console.error("❌ Error creando producto base:", prodErr?.message);
      process.exit(1);
    }
    productId = newProd.id;
  }
  console.log(`   ✓ Producto base listo (ID: ${productId})`);

  // 2.6 Variante
  const testSku = `GALA-DIA-40-ML-${Date.now().toString().slice(-4)}`;
  const { data: variant, error: varErr } = await supabase
    .from("variantes_producto")
    .insert({
      tenant_id: tenantId,
      product_id: productId,
      color_id: colorId,
      size_id: sizeId,
      sleeve_type_id: sleeveId,
      sku: testSku,
      cost_price: 450.00,
      sale_price: 950.00,
      min_stock: 5,
      is_active: true,
    })
    .select("id, sku, sale_price")
    .single();

  if (varErr || !variant) {
    console.error("❌ Error creando variante:", varErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Variante creada con éxito: SKU "${variant.sku}" — Precio Venta: $${variant.sale_price}`);

  // ---------------------------------------------------------------------------
  // 3. INVENTARIO Y MOVIMIENTOS ATÓMICOS (ETAPA 3)
  // ---------------------------------------------------------------------------
  console.log("\n📦 [3/5] Probando Control de Inventario, Entradas, Ajustes y Salidas...");

  // 3.1 Obtener/Crear Ubicación
  let locationId;
  const { data: locations } = await supabase
    .from("ubicaciones")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .limit(1);

  if (locations && locations.length > 0) {
    locationId = locations[0].id;
  } else {
    const { data: newLoc, error: locErr } = await supabase
      .from("ubicaciones")
      .insert({
        tenant_id: tenantId,
        name: "Bodega Principal",
        is_active: true,
      })
      .select("id")
      .single();
    if (locErr || !newLoc) {
      console.error("❌ Error creando ubicación:", locErr?.message);
      process.exit(1);
    }
    locationId = newLoc.id;
  }
  console.log(`   ✓ Ubicación asignada (ID: ${locationId})`);

  // 3.2 ENTRADA (+20 piezas)
  console.log("   --> Ejecutando ENTRADA (+20 unidades)...");
  const { error: mov1Err } = await supabase.from("movimientos_inventario").insert({
    tenant_id: tenantId,
    variant_id: variant.id,
    location_id: locationId,
    type: "ENTRADA",
    quantity: 20,
    reason: "Reabastecimiento inicial de taller",
    user_id: userId,
  });

  if (mov1Err) {
    console.error("❌ Error en movimiento ENTRADA:", mov1Err.message);
    process.exit(1);
  }

  // Verificar existencias
  const { data: stock1 } = await supabase
    .from("existencias")
    .select("quantity")
    .eq("tenant_id", tenantId)
    .eq("variant_id", variant.id)
    .eq("location_id", locationId)
    .single();

  console.log(`   ✓ Stock verificado tras ENTRADA: ${stock1?.quantity} unidades (Esperado: 20)`);
  if (stock1?.quantity !== 20) {
    console.error("❌ ERROR: El stock no coincide.");
    process.exit(1);
  }

  // 3.3 AJUSTE DIRECTO (Fijar a 25 piezas)
  console.log("   --> Ejecutando AJUSTE DIRECTO (Fijar a 25 unidades)...");
  const { error: mov2Err } = await supabase.from("movimientos_inventario").insert({
    tenant_id: tenantId,
    variant_id: variant.id,
    location_id: locationId,
    type: "AJUSTE",
    quantity: 25,
    reason: "Conteo físico en bodega",
    user_id: userId,
  });

  if (mov2Err) {
    console.error("❌ Error en movimiento AJUSTE:", mov2Err.message);
    process.exit(1);
  }

  const { data: stock2 } = await supabase
    .from("existencias")
    .select("quantity")
    .eq("tenant_id", tenantId)
    .eq("variant_id", variant.id)
    .eq("location_id", locationId)
    .single();

  console.log(`   ✓ Stock verificado tras AJUSTE: ${stock2?.quantity} unidades (Esperado: 25)`);
  if (stock2?.quantity !== 25) {
    console.error("❌ ERROR: El stock no coincide tras ajuste.");
    process.exit(1);
  }

  // 3.4 SALIDA / MERMA (-3 piezas)
  console.log("   --> Ejecutando SALIDA / MERMA (-3 unidades)...");
  const { error: mov3Err } = await supabase.from("movimientos_inventario").insert({
    tenant_id: tenantId,
    variant_id: variant.id,
    location_id: locationId,
    type: "SALIDA",
    quantity: 3,
    reason: "Prenda con mancha de fábrica",
    user_id: userId,
  });

  if (mov3Err) {
    console.error("❌ Error en movimiento SALIDA:", mov3Err.message);
    process.exit(1);
  }

  const { data: stock3 } = await supabase
    .from("existencias")
    .select("quantity")
    .eq("tenant_id", tenantId)
    .eq("variant_id", variant.id)
    .eq("location_id", locationId)
    .single();

  console.log(`   ✓ Stock verificado tras SALIDA: ${stock3?.quantity} unidades (Esperado: 22)`);
  if (stock3?.quantity !== 22) {
    console.error("❌ ERROR: El stock no coincide tras salida.");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // 4. PUNTO DE VENTA (POS) Y GENERACIÓN DE VENTA (ETAPA 4)
  // ---------------------------------------------------------------------------
  console.log("\n💳 [4/5] Probando Punto de Venta (POS), Descuento de Stock y Ticket...");

  const qtyToSell = 2;
  const unitPrice = 950.00;
  const lineSubtotal = qtyToSell * unitPrice; // 1,900.00
  const globalDiscountPercent = 10;
  const discountAmount = lineSubtotal * (globalDiscountPercent / 100); // 190.00
  const totalAmount = lineSubtotal - discountAmount; // 1,710.00

  // 4.1 Generar número de ticket automático
  const { data: ticketNumber, error: ticketErr } = await supabase.rpc("generate_ticket_number", {
    p_tenant_id: tenantId,
  });

  if (ticketErr || !ticketNumber) {
    console.error("❌ Error al invocar generate_ticket_number:", ticketErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Ticket generado por función RPC: "${ticketNumber}"`);

  // 4.2 Insertar Venta
  const { data: sale, error: saleErr } = await supabase
    .from("ventas")
    .insert({
      tenant_id: tenantId,
      ticket_number: ticketNumber,
      seller_id: userId,
      subtotal: lineSubtotal,
      discount_amount: discountAmount,
      total: totalAmount,
      status: "completed",
      notes: "Venta de prueba automatizada integral",
    })
    .select("id")
    .single();

  if (saleErr || !sale) {
    console.error("❌ Error al insertar venta:", saleErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Venta guardada en base de datos (ID: ${sale.id})`);

  // 4.3 Insertar Detalle de Venta
  const { error: detErr } = await supabase.from("detalle_ventas").insert({
    tenant_id: tenantId,
    sale_id: sale.id,
    variant_id: variant.id,
    quantity: qtyToSell,
    unit_price: unitPrice,
    discount_pct: 0,
    subtotal: lineSubtotal,
  });

  if (detErr) {
    console.error("❌ Error al insertar detalle de venta:", detErr.message);
    process.exit(1);
  }
  console.log(`   ✓ Detalle de venta guardado (${qtyToSell} pzas x $${unitPrice})`);

  // 4.4 Insertar Pago
  const { error: pagoErr } = await supabase.from("pagos_venta").insert({
    tenant_id: tenantId,
    sale_id: sale.id,
    method: "cash",
    amount: totalAmount,
  });

  if (pagoErr) {
    console.error("❌ Error al registrar pago:", pagoErr.message);
    process.exit(1);
  }
  console.log(`   ✓ Pago registrado: $${totalAmount} en Efectivo`);

  // 4.5 Descontar Inventario con movimiento tipo VENTA
  console.log("   --> Descontando 2 unidades de inventario por VENTA...");
  const { error: movVentaErr } = await supabase.from("movimientos_inventario").insert({
    tenant_id: tenantId,
    variant_id: variant.id,
    location_id: locationId,
    type: "VENTA",
    quantity: qtyToSell,
    reason: `Venta POS ticket ${ticketNumber}`,
    user_id: userId,
  });

  if (movVentaErr) {
    console.error("❌ Error en movimiento VENTA:", movVentaErr.message);
    process.exit(1);
  }

  // 4.6 Validar que el stock bajó a 20
  const { data: stockFinal } = await supabase
    .from("existencias")
    .select("quantity")
    .eq("tenant_id", tenantId)
    .eq("variant_id", variant.id)
    .eq("location_id", locationId)
    .single();

  console.log(`   ✓ Stock final tras la venta: ${stockFinal?.quantity} unidades (Esperado: 20)`);
  if (stockFinal?.quantity !== 20) {
    console.error("❌ ERROR: El stock no se descontó correctamente.");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // 5. AUDITORÍA, HISTORIAL Y MÉTRICAS
  // ---------------------------------------------------------------------------
  console.log("\n📊 [5/5] Comprobando Integridad de Consultas e Historial...");

  // 5.1 Historial de movimientos
  const { data: movHistory } = await supabase
    .from("movimientos_inventario")
    .select("type, quantity, reason, created_at")
    .eq("tenant_id", tenantId)
    .eq("variant_id", variant.id)
    .order("created_at", { ascending: false });

  console.log(`   ✓ Movimientos de auditoría registrados: ${movHistory?.length} operaciones`);
  movHistory?.forEach((m, idx) => {
    console.log(`     ${idx + 1}. [${m.type}] Cantidad: ${m.quantity} | Motivo: "${m.reason}"`);
  });

  // 5.2 Historial de ventas
  const { data: salesList } = await supabase
    .from("ventas")
    .select("ticket_number, total, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log(`   ✓ Ventas recientes consultadas con éxito:`);
  salesList?.forEach((s) => {
    console.log(`     - Ticket: ${s.ticket_number} | Total: $${s.total} | Estado: ${s.status}`);
  });

  console.log("\n=======================================================");
  console.log("🎉 ¡TODAS LAS PRUEBAS (ETAPAS 1 A 4) PASARON CON ÉXITO!");
  console.log("   - Autenticación y Multi-tenant: 100% OK");
  console.log("   - Catálogo y Variantes:         100% OK");
  console.log("   - Inventario y Movimientos:      100% OK");
  console.log("   - POS, Pagos y Tickets:          100% OK");
  console.log("   - Descuento Automático de Stock: 100% OK");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Excepción no controlada durante las pruebas:", err);
  process.exit(1);
});
