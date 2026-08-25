"use client";

import { useState } from "react";
import { Upload, Plus, Trash2, Star, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface UploadedImage {
  id?: string;
  url: string;
  isPrimary: boolean;
  file?: File;
}

interface ImageGalleryUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

/**
 * Comprime una imagen en el navegador para guardarla ligera y ultra rápida
 */
async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
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

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
    };
  });
}

export function ImageGalleryUploader({
  images,
  onChange,
  maxImages = 5,
}: ImageGalleryUploaderProps) {
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Manejar subida de archivo desde la computadora / celular con compresión automática
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessing(true);
    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    const newImages: UploadedImage[] = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        alert("Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).");
        continue;
      }

      try {
        const compressedUrl = await compressImage(file);
        const isFirst = images.length === 0 && newImages.length === 0;
        newImages.push({
          url: compressedUrl,
          isPrimary: isFirst,
          file,
        });
      } catch (err) {
        console.error("Error al procesar imagen:", err);
      }
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }

    setProcessing(false);
    e.target.value = "";
  };

  // Agregar por URL
  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    if (images.length >= maxImages) {
      alert(`Has alcanzado el límite máximo de ${maxImages} fotos.`);
      return;
    }

    const isFirst = images.length === 0;
    onChange([...images, { url: urlInput.trim(), isPrimary: isFirst }]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  // Marcar como foto principal de portada
  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange(updated);
  };

  // Eliminar foto
  const handleRemove = (index: number) => {
    const removedWasPrimary = images[index]?.isPrimary;
    const updated = images.filter((_, i) => i !== index);

    if (removedWasPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }

    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#6B7A71] uppercase tracking-wider">
          Fotografías de la Guayabera ({images.length}/{maxImages})
        </label>
        <span className="text-[11px] text-[#8FA393]">
          {processing ? "Procesando y optimizando fotos..." : "Portada (⭐) + Fotos de detalle"}
        </span>
      </div>

      {/* Grid de Miniaturas de Fotos */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={`relative group aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-150 ${
              img.isPrimary
                ? "border-[#556B5D] ring-2 ring-[#556B5D]/30 shadow-md"
                : "border-[#DDD9D0] hover:border-[#8FA393]"
            }`}
          >
            <img
              src={img.url}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Badge Foto Principal */}
            {img.isPrimary ? (
              <span className="absolute top-1.5 left-1.5 bg-[#26302B] text-[#C49A5A] text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 fill-[#C49A5A]" />
                PORTADA
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSetPrimary(idx)}
                className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-white text-[#26302B] text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-opacity shadow-sm"
                title="Establecer como foto de portada"
              >
                <Star className="w-3 h-3 text-[#C49A5A]" />
                Hacer Portada
              </button>
            )}

            {/* Boton Eliminar */}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-[#B85450] text-white p-1 rounded-md hover:bg-[#A34340] transition-opacity shadow-sm"
              title="Eliminar fotografía"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Botón de Carga si no ha llegado al límite */}
        {images.length < maxImages && (
          <div className="flex flex-col gap-2">
            <label className="aspect-square rounded-2xl border-2 border-dashed border-[#DDD9D0] hover:border-[#556B5D] hover:bg-[#EBF0EC]/30 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center group">
              <Upload className="w-5 h-5 text-[#8FA393] group-hover:text-[#556B5D] mb-1" />
              <span className="text-[10px] font-bold text-[#6B7A71] group-hover:text-[#26302B]">
                {processing ? "Optimizando..." : "Subir Foto"}
              </span>
              <span className="text-[9px] text-[#8FA393]">Cámara o Galería</span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={processing}
              />
            </label>
          </div>
        )}
      </div>

      {/* Opción secundaria para pegar URL */}
      {images.length < maxImages && (
        <div className="pt-1">
          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="text-[11px] text-[#556B5D] hover:underline font-semibold flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              ¿O prefieres pegar el enlace de una foto en internet?
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="url"
                placeholder="https://ejemplo.com/foto-guayabera.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-[#DDD9D0] rounded-xl bg-white focus:outline-none focus:border-[#556B5D]"
              />
              <Button type="button" size="sm" onClick={handleAddUrl}>
                Agregar URL
              </Button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="p-1.5 text-[#6B7A71] hover:text-[#26302B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
