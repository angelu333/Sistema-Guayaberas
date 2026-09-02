"use client";

import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { productsService } from "@/services/products.service";
import { Category, Product } from "@/types/domain.types";
import { useAuthStore } from "@/stores/auth.store";
import { ImageGalleryUploader, type UploadedImage } from "@/components/productos/ImageGalleryUploader";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

export function EditProductModal({
  isOpen,
  onClose,
  product,
  categories,
  onSuccess,
}: EditProductModalProps) {
  const session = useAuthStore((state) => state.session);

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Creación rápida de categoría
  const [currentCategories, setCurrentCategories] = useState<Category[]>(categories);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);

  useEffect(() => {
    setCurrentCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (isOpen && product) {
      setProductName(product.name || "");
      setDescription(product.description || "");
      setCategoryId(product.categoryId || "");

      // Cargar imágenes existentes
      async function fetchImages() {
        if (!product) return;
        const currentImgs = await productsService.getProductImages(product.id);
        if (currentImgs.length > 0) {
          setImages(currentImgs.map((img) => ({ url: img.url, isPrimary: img.isPrimary })));
        } else if (product.imageUrl) {
          setImages([{ url: product.imageUrl, isPrimary: true }]);
        } else {
          setImages([]);
        }
      }

      fetchImages();
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleQuickCreateCategory = async () => {
    if (!newCategoryName.trim() || !session?.tenantId) return;
    setCreatingCategoryLoading(true);
    try {
      const created = await productsService.createCategory(session.tenantId, newCategoryName);
      setCurrentCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCategoryName("");
      setIsCreatingCategory(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear la categoría.");
    } finally {
      setCreatingCategoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productName.trim()) {
      setErrorMsg("El nombre del modelo es requerido.");
      return;
    }

    if (!session?.tenantId) {
      setErrorMsg("No se encontró una empresa activa en la sesión.");
      return;
    }

    setLoading(true);

    try {
      await productsService.updateProduct(session.tenantId, product.id, {
        name: productName,
        description,
        categoryId: categoryId || undefined,
        images: images.map((img) => ({ url: img.url, isPrimary: img.isPrimary })),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al actualizar el producto.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#26302B]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-[#DDD9D0] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#556B5D] text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#26302B] font-[Outfit]">
                Editar Fotografías y Datos del Modelo
              </h2>
              <p className="text-xs text-[#6B7A71]">
                {product.name} — Actualice la foto de portada y galería de detalles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6B7A71] hover:bg-[#E7E3DA] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450]">
              <span className="font-bold">Error:</span> {errorMsg}
            </div>
          )}

          {/* Datos del Producto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre del Modelo / Guayabera"
              placeholder="Ej: Valladolid, Presidencial, Maya"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#26302B]">Categoría</label>
                {!isCreatingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="text-xs font-bold text-[#556B5D] hover:underline cursor-pointer"
                  >
                    + Nueva Categoría
                  </button>
                )}
              </div>

              {isCreatingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nombre categoría..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 rounded-lg border border-[#556B5D] bg-white px-2.5 py-1.5 text-xs text-[#26302B] focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickCreateCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#556B5D] hover:bg-[#44564A] text-white text-xs px-2.5 py-1.5 h-auto"
                    disabled={creatingCategoryLoading || !newCategoryName.trim()}
                    onClick={handleQuickCreateCategory}
                  >
                    {creatingCategoryLoading ? "..." : "Guardar"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingCategory(false); setNewCategoryName(""); }}
                    className="text-xs text-[#6B7A71] hover:text-[#26302B] px-1.5 py-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  className="w-full rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-xs text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Sin Categoría --</option>
                  {currentCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#26302B]">Descripción de la Guayabera</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre el diseño, alforzas, bordados o características..."
              className="w-full rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-xs text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Galería de Fotografías */}
          <div className="pt-3 border-t border-[#DDD9D0]">
            <ImageGalleryUploader images={images} onChange={setImages} maxImages={5} />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-[#DDD9D0] flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#556B5D] hover:bg-[#44564A]">
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
