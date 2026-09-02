"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";

import { Button, Input, Card } from "@/components/ui";
import {
  productsService,
  CreateVariantDTO,
} from "@/services/products.service";
import { Category, Color, Size, SleeveType } from "@/types/domain.types";
import { useAuthStore } from "@/stores/auth.store";
import { ImageGalleryUploader, type UploadedImage } from "@/components/productos/ImageGalleryUploader";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductModal({ isOpen, onClose, onSuccess }: ProductModalProps) {
  const session = useAuthStore((state) => state.session);

  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [sleeveTypes, setSleeveTypes] = useState<SleeveType[]>([]);

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  const [variants, setVariants] = useState<CreateVariantDTO[]>([
    {
      colorId: "",
      sizeId: "",
      sleeveTypeId: "",
      sku: "",
      costPrice: 350,
      salePrice: 750,
      minStock: 5,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Creación rápida de categoría
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCatalogData();
      setImages([]);
    }
  }, [isOpen]);

  const loadCatalogData = async () => {
    try {
      const [cats, cols, szs, slvs] = await Promise.all([
        productsService.getCategories(),
        productsService.getColors(),
        productsService.getSizes(),
        productsService.getSleeveTypes(),
      ]);

      setCategories(cats);
      setColors(cols);
      setSizes(szs);
      setSleeveTypes(slvs);
    } catch (err) {
      console.error("Error al cargar catalogos auxiliares:", err);
    }
  };

  const handleQuickCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (!session?.tenantId) return;

    setCreatingCategoryLoading(true);
    try {
      const created = await productsService.createCategory(session.tenantId, newCategoryName);
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCategoryName("");
      setIsCreatingCategory(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear la categoría.");
    } finally {
      setCreatingCategoryLoading(false);
    }
  };

  const handleAddVariantRow = () => {
    const defaultColor = colors[0]?.id || "";
    const defaultSize = sizes[0]?.id || "";
    const defaultSleeve = sleeveTypes[0]?.id || "";

    const colorName = colors.find((c) => c.id === defaultColor)?.name;
    const sizeName = sizes.find((s) => s.id === defaultSize)?.name;
    const sleeveName = sleeveTypes.find((s) => s.id === defaultSleeve)?.name;
    const autoSku = productsService.generateSKU(productName || "GUAY", colorName, sizeName, sleeveName);

    setVariants((prev) => [
      ...prev,
      {
        colorId: defaultColor,
        sizeId: defaultSize,
        sleeveTypeId: defaultSleeve,
        sku: autoSku,
        costPrice: 350,
        salePrice: 750,
        minStock: 5,
      },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof CreateVariantDTO,
    value: any
  ) => {
    setVariants((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // Si cambia color, talla o manga, autogenerar SKU sugerido
      if (field === "colorId" || field === "sizeId" || field === "sleeveTypeId") {
        const colorObj = colors.find((c) => c.id === (field === "colorId" ? value : current.colorId));
        const sizeObj = sizes.find((s) => s.id === (field === "sizeId" ? value : current.sizeId));
        const sleeveObj = sleeveTypes.find((s) => s.id === (field === "sleeveTypeId" ? value : current.sleeveTypeId));
        current.sku = productsService.generateSKU(productName || "GUAY", colorObj?.name, sizeObj?.name, sleeveObj?.name);
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productName.trim()) {
      setErrorMsg("El nombre del modelo es requerido.");
      return;
    }

    if (!session?.tenantId) {
      setErrorMsg("No se encontro una empresa activa en la sesion.");
      return;
    }

    setLoading(true);

    try {
      await productsService.createProduct(session.tenantId, {
        name: productName,
        description,
        categoryId: categoryId || undefined,
        variants,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al registrar el producto.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#26302B]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
        {/* Header del Modal */}
        <div className="p-5 border-b border-[#DDD9D0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#26302B] font-[Outfit]">
              Registrar Nuevo Producto / Modelo
            </h2>
            <p className="text-xs text-[#6B7A71] mt-0.5">
              Ingrese el modelo principal y configure sus variantes (color, talla, precio y SKU)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6B7A71] hover:bg-[#E7E3DA] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-[#FAEAEA] border border-[#B85450]/30 rounded-lg text-xs text-[#B85450]">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          {/* Datos Generales del Producto */}
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
                <label className="text-sm font-medium text-[#26302B]">Categoría</label>
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
                    placeholder="Nombre (ej: Niños, Vestidos)..."
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
                  className="w-full rounded-lg border border-[#DDD9D0] bg-white px-3 py-2 text-sm text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Sin Categoría --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#26302B]">Descripción (opcional)</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre el diseño, bordado o características de la prenda..."
              className="w-full rounded-lg border border-[#DDD9D0] bg-white px-3 py-2 text-sm text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Galería de Fotografías del Modelo */}
          <div className="pt-2 border-t border-[#DDD9D0]">
            <ImageGalleryUploader images={images} onChange={setImages} maxImages={5} />
          </div>

          {/* Variantes del Producto */}
          <div className="space-y-3 pt-2 border-t border-[#DDD9D0]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#26302B] font-[Outfit]">
                  Variantes de Producto (Combinaciones)
                </h3>
                <p className="text-xs text-[#6B7A71]">
                  Cada variante representa un color, talla y SKU especifico
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariantRow}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Variante
              </Button>
            </div>

            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[#F8F6F1] border border-[#DDD9D0] grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
                >
                  <div className="sm:col-span-1">
                    <label className="text-xs font-medium text-[#6B7A71] block mb-1">Color</label>
                    <select
                      className="w-full rounded-md border border-[#DDD9D0] bg-white px-2 py-1.5 text-xs text-[#26302B]"
                      value={v.colorId || ""}
                      onChange={(e) => handleVariantChange(idx, "colorId", e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-xs font-medium text-[#6B7A71] block mb-1">Talla</label>
                    <select
                      className="w-full rounded-md border border-[#DDD9D0] bg-white px-2 py-1.5 text-xs text-[#26302B]"
                      value={v.sizeId || ""}
                      onChange={(e) => handleVariantChange(idx, "sizeId", e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-xs font-medium text-[#6B7A71] block mb-1">Manga</label>
                    <select
                      className="w-full rounded-md border border-[#DDD9D0] bg-white px-2 py-1.5 text-xs text-[#26302B]"
                      value={v.sleeveTypeId || ""}
                      onChange={(e) => handleVariantChange(idx, "sleeveTypeId", e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {sleeveTypes.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <Input
                      label="SKU"
                      value={v.sku}
                      onChange={(e) => handleVariantChange(idx, "sku", e.target.value)}
                      required
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <Input
                      label="Precio Venta ($)"
                      type="number"
                      value={v.salePrice}
                      onChange={(e) => handleVariantChange(idx, "salePrice", Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={variants.length <= 1}
                      onClick={() => handleRemoveVariantRow(idx)}
                      className="p-2 text-[#B85450] hover:bg-[#FAEAEA] rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Eliminar variante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-4 border-t border-[#DDD9D0] flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              Guardar Producto y Variantes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
