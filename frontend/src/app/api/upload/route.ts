import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "product-images";

// Inicializar bucket público si no existe
let bucketChecked = false;
async function ensureBucket() {
  if (bucketChecked) return;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
      });
    }
    bucketChecked = true;
  } catch (err) {
    console.warn("Aviso al verificar/crear bucket de storage:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureBucket();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tenantId = (formData.get("tenantId") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo de imagen" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawExt = file.name.split(".").pop() || "jpg";
    const ext = rawExt.toLowerCase() === "png" ? "png" : rawExt.toLowerCase() === "webp" ? "webp" : "jpg";
    const cleanTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${cleanTenant}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error al subir a Supabase Storage:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      fileName,
    });
  } catch (err: any) {
    console.error("Error en endpoint /api/upload:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar la subida del archivo" },
      { status: 500 }
    );
  }
}
