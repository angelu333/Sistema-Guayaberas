"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BrandLogoUploaderProps {
  logoUrl: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Optimiza y comprime el logotipo manteniendo transparencia PNG/WebP
 */
async function compressLogo(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Guardar como PNG para preservar transparencia
        const compressed = canvas.toDataURL("image/png");
        resolve(compressed);
      };
    };
  });
}

export function BrandLogoUploader({ logoUrl, onChange }: BrandLogoUploaderProps) {
  const [processing, setProcessing] = useState(false);
  const [previewBg, setPreviewBg] = useState<"light" | "dark">("dark");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const compressed = await compressLogo(file);
      onChange(compressed);
    } catch (err) {
      console.error("Error al procesar logo:", err);
      alert("No se pudo procesar la imagen del logotipo.");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-[#6B7A71] uppercase tracking-wider">
        Logotipo Oficial de la Marca
      </label>

      {/* Input de archivo invisible pero accesible mediante ref */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        onChange={handleFile}
        className="hidden"
        disabled={processing}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Contenedor de Vista Previa (hacer clic para abrir selector) */}
        <div
          onClick={handleTriggerUpload}
          className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center p-2 relative overflow-hidden transition-all shadow-inner cursor-pointer group ${
            previewBg === "dark"
              ? "bg-[#26302B] border-[#38463F] hover:border-[#8FA393]"
              : "bg-[#F8F6F1] border-[#DDD9D0] hover:border-[#556B5D]"
          }`}
          title="Haz clic para subir o cambiar el logotipo"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo de la Marca"
              className="max-w-full max-h-full object-contain group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="text-center flex flex-col items-center gap-1 text-[#8FA393] group-hover:text-white transition-colors">
              <ImageIcon className="w-8 h-8 stroke-1" />
              <span className="text-[10px] font-bold">Subir Logo</span>
            </div>
          )}

          {/* Overlay hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
            {logoUrl ? "Cambiar" : "Elegir"}
          </div>

          {processing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-[10px] font-bold">
              Optimizando...
            </div>
          )}
        </div>

        {/* Acciones y Configuración del Logo */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleTriggerUpload}
              disabled={processing}
              className="bg-[#556B5D] hover:bg-[#44564A] text-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {processing ? "Procesando..." : logoUrl ? "Cambiar Logo" : "Subir Logo"}
            </Button>

            {logoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(null)}
                className="text-[#B85450] hover:bg-[#FAEAEA] border-[#B85450]/30 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Eliminar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#6B7A71]">
            <span>Ver contraste:</span>
            <button
              type="button"
              onClick={() => setPreviewBg("dark")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                previewBg === "dark" ? "bg-[#26302B] text-white" : "bg-[#DDD9D0] text-[#26302B]"
              }`}
            >
              Fondo Oscuro (Sidebar)
            </button>
            <button
              type="button"
              onClick={() => setPreviewBg("light")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                previewBg === "light" ? "bg-[#556B5D] text-white" : "bg-[#DDD9D0] text-[#26302B]"
              }`}
            >
              Fondo Claro (Tickets/Catálogo)
            </button>
          </div>

          <p className="text-[11px] text-[#8FA393]">
            Recomendado: PNG con fondo transparente (máx. 800x800 px). Aparecerá en el Catálogo, Cotizaciones, Dashboard y Tickets.
          </p>
        </div>
      </div>
    </div>
  );
}
