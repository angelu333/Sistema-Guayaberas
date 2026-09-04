/**
 * Utilidad para comprimir y subir imágenes directamente a Supabase Storage
 * Genera URLs públicas cortas que no consumen Egress de la base de datos PostgreSQL.
 */

export async function compressImageToBlob(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("No se pudo generar el blob de la imagen"));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen en memoria"));
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
  });
}

export async function uploadProductImage(file: File, tenantId: string): Promise<string> {
  try {
    const blob = await compressImageToBlob(file, 1200, 0.82);
    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("tenantId", tenantId || "general");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn("Fallo subida a Supabase Storage, usando fallback en memoria:", err);
  }

  // Fallback seguro en memoria (DataURL) en caso de fallo de red
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1000 / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
    };
  });
}
