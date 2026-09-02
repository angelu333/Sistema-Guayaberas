"use client";

import { useState, useEffect } from "react";
import {
  X,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  Layers,
  Shirt,
  DollarSign,
  PackagePlus,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { productsService } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import { Category, Product, ProductVariant, Color, Size, SleeveType, Location } from "@/types/domain.types";
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

  const [activeTab, setActiveTab] = useState<"general" | "variants">("general");

  // Datos generales del modelo
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Variantes del producto
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  // Catálogos auxiliares para nueva variante
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [sleeveTypes, setSleeveTypes] = useState<SleeveType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Formulario de nueva variante
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [newVarColorId, setNewVarColorId] = useState("");
  const [newVarSizeId, setNewVarSizeId] = useState("");
  const [newVarSleeveId, setNewVarSleeveId] = useState("");
  const [newVarSku, setNewVarSku] = useState("");
  const [newVarCost, setNewVarCost] = useState(350);
  const [newVarPrice, setNewVarPrice] = useState(750);
  const [newVarStock, setNewVarStock] = useState(0);
  const [newVarLocationId, setNewVarLocationId] = useState("");
  const [addingVariantLoading, setAddingVariantLoading] = useState(false);

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
      setErrorMsg(null);
      setSuccessMsg(null);
      setActiveTab("general");

      loadProductData();
    }
  }, [isOpen, product]);

  const loadProductData = async () => {
    if (!product) return;
    const tenantId = session?.tenantId;

    // 1. Cargar imágenes
    try {
      const currentImgs = await productsService.getProductImages(product.id);
      if (currentImgs.length > 0) {
        setImages(currentImgs.map((img) => ({ url: img.url, isPrimary: img.isPrimary })));
      } else if (product.imageUrl) {
        setImages([{ url: product.imageUrl, isPrimary: true }]);
      } else {
        setImages([]);
      }
    } catch (e) {
      console.error("Error al cargar fotos:", e);
    }

    // 2. Cargar variantes del producto
    setLoadingVariants(true);
    try {
      const vars = await productsService.getVariantsByProduct(product.id);
      setVariants(vars);
    } catch (e) {
      console.error("Error al cargar variantes:", e);
    } finally {
      setLoadingVariants(false);
    }

    // 3. Cargar catálogos para nueva variante si no están cargados
    try {
      const [cols, szs, slvs, locs] = await Promise.all([
        productsService.getColors(tenantId),
        productsService.getSizes(tenantId),
        productsService.getSleeveTypes(tenantId),
        tenantId ? inventoryService.getLocations(tenantId) : Promise.resolve([]),
      ]);
      setColors(cols);
      setSizes(szs);
      setSleeveTypes(slvs);
      setLocations(locs);

      if (cols.length > 0) setNewVarColorId(cols[0].id);
      if (szs.length > 0) setNewVarSizeId(szs[0].id);
      if (slvs.length > 0) setNewVarSleeveId(slvs[0].id);
      if (locs.length > 0) setNewVarLocationId(locs[0].id);
    } catch (e) {
      console.error("Error al cargar catálogos:", e);
    }
  };

  // Autogenerar SKU al cambiar atributos de la nueva variante
  useEffect(() => {
    if (isAddingVariant && product) {
      const colorObj = colors.find((c) => c.id === newVarColorId);
      const sizeObj = sizes.find((s) => s.id === newVarSizeId);
      const sleeveObj = sleeveTypes.find((s) => s.id === newVarSleeveId);
      const auto = productsService.generateSKU(productName || product.name, colorObj?.name, sizeObj?.name, sleeveObj?.name);
      setNewVarSku(auto);
    }
  }, [newVarColorId, newVarSizeId, newVarSleeveId, isAddingVariant, productName, product]);

  if (!isOpen || !product) return null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // 1. Guardar Datos Generales (Nombre, Categoría, Fotos)
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productName.trim()) {
      setErrorMsg("El nombre del modelo es requerido.");
      return;
    }
    if (!session?.tenantId) return;

    setSavingGeneral(true);
    try {
      await productsService.updateProduct(session.tenantId, product.id, {
        name: productName,
        description,
        categoryId: categoryId || undefined,
        images: images.map((img) => ({ url: img.url, isPrimary: img.isPrimary })),
      });

      showSuccess("¡Datos del modelo y fotos actualizados con éxito!");
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar el producto.");
    } finally {
      setSavingGeneral(false);
    }
  };

  // 2. Guardar Precio/Costo de una Variante existente
  const handleUpdateVariantPrice = async (variant: ProductVariant) => {
    setSavingVariantId(variant.id);
    setErrorMsg(null);
    try {
      await productsService.updateVariant(variant.id, {
        salePrice: variant.salePrice,
        costPrice: variant.costPrice,
      });
      showSuccess(`¡Precio de SKU ${variant.sku} actualizado a $${variant.salePrice}!`);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar precio de variante.");
    } finally {
      setSavingVariantId(null);
    }
  };

  // 3. Toggle Activo/Inactivo de Variante
  const handleToggleVariant = async (variantId: string, currentStatus: boolean) => {
    try {
      await productsService.toggleVariantStatus(variantId, !currentStatus);
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, isActive: !currentStatus } : v))
      );
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar estado.");
    }
  };

  // 4. Eliminar / Archivar Variante Individual
  const handleDeleteVariant = async (variantId: string, sku: string) => {
    if (!confirm(`¿Deseas eliminar/archivar la variante ${sku}?`)) return;
    try {
      await productsService.deleteVariant(variantId);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      showSuccess(`Variante ${sku} eliminada/archivada con éxito.`);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar variante.");
    }
  };

  // 5. Agregar Nueva Variante / Talla al Modelo
  const handleAddNewVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.tenantId) return;
    if (!newVarSku.trim()) {
      setErrorMsg("El SKU de la variante es requerido.");
      return;
    }

    setAddingVariantLoading(true);
    setErrorMsg(null);
    try {
      await productsService.addVariant(
        session.tenantId,
        product.id,
        {
          colorId: newVarColorId,
          sizeId: newVarSizeId,
          sleeveTypeId: newVarSleeveId,
          sku: newVarSku,
          costPrice: Number(newVarCost) || 0,
          salePrice: Number(newVarPrice) || 0,
          initialStock: Number(newVarStock) || 0,
        },
        newVarLocationId || undefined
      );

      // Recargar variantes
      const updatedVars = await productsService.getVariantsByProduct(product.id);
      setVariants(updatedVars);
      setIsAddingVariant(false);
      setNewVarStock(0);
      showSuccess("¡Nueva variante / talla agregada exitosamente al modelo!");
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al agregar la variante.");
    } finally {
      setAddingVariantLoading(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-[#26302B]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-fade-in bg-white">
        {/* Header */}
        <div className="p-5 border-b border-[#DDD9D0] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#556B5D] text-white flex items-center justify-center shadow-xs">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#26302B] font-[Outfit]">
                Editar Modelo: {product.name}
              </h2>
              <p className="text-xs text-[#6B7A71]">
                Modifique datos, fotos, precios de venta o agregue nuevas tallas y combinaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6B7A71] hover:bg-[#E7E3DA] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#DDD9D0] bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-[#556B5D] text-[#556B5D]"
                : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Datos Generales y Fotografías
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("variants")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "variants"
                ? "border-[#556B5D] text-[#556B5D]"
                : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
            }`}
          >
            <Layers className="w-4 h-4" />
            Tallas, Colores y Precios ({variants.length})
          </button>
        </div>

        {/* Notificaciones */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl text-xs text-[#3F7D58] font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ============================================================
            PESTAÑA 1: DATOS GENERALES Y FOTOS
            ============================================================ */}
        {activeTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
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
                      className="text-xs text-[#6B7A71] hover:text-[#26302B] px-1.5 py-1 cursor-pointer"
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
              <Button type="submit" disabled={savingGeneral} className="bg-[#556B5D] hover:bg-[#44564A] text-white">
                {savingGeneral ? "Guardando..." : "Guardar Datos y Fotos"}
              </Button>
            </div>
          </form>
        )}

        {/* ============================================================
            PESTAÑA 2: TALLAS, COLORES Y PRECIOS (VARIANTES)
            ============================================================ */}
        {activeTab === "variants" && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DDD9D0]">
              <div>
                <h3 className="text-sm font-bold text-[#26302B] font-[Outfit]">
                  Tallas y Precios del Modelo
                </h3>
                <p className="text-xs text-[#6B7A71]">
                  Modifique el precio de venta de cada combinación o agregue nuevas tallas
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsAddingVariant(!isAddingVariant)}
                className="bg-[#556B5D] hover:bg-[#44564A] text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {isAddingVariant ? "Cancelar Nueva Talla" : "Agregar Nueva Talla / Variante"}
              </Button>
            </div>

            {/* Formulario Agregar Nueva Variante */}
            {isAddingVariant && (
              <form onSubmit={handleAddNewVariant} className="p-4 bg-[#FAF7F2] border border-[#556B5D] rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 pb-2 border-b border-[#DDD9D0]">
                  <Plus className="w-4 h-4 text-[#556B5D]" />
                  <span className="font-bold text-xs text-[#26302B] uppercase tracking-wider font-[Outfit]">
                    Nueva Combinación (Talla / Color / Manga)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-[#26302B] block mb-1">Color:</label>
                    <select
                      value={newVarColorId}
                      onChange={(e) => setNewVarColorId(e.target.value)}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    >
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#26302B] block mb-1">Talla:</label>
                    <select
                      value={newVarSizeId}
                      onChange={(e) => setNewVarSizeId(e.target.value)}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    >
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#26302B] block mb-1">Manga:</label>
                    <select
                      value={newVarSleeveId}
                      onChange={(e) => setNewVarSleeveId(e.target.value)}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    >
                      {sleeveTypes.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#26302B] block mb-1">SKU:</label>
                    <input
                      type="text"
                      value={newVarSku}
                      onChange={(e) => setNewVarSku(e.target.value)}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#556B5D]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="font-bold text-[#26302B] block mb-1">Precio Venta ($):</label>
                    <input
                      type="number"
                      step="any"
                      value={newVarPrice}
                      onChange={(e) => setNewVarPrice(Number(e.target.value))}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#26302B] block mb-1">Precio Costo ($):</label>
                    <input
                      type="number"
                      step="any"
                      value={newVarCost}
                      onChange={(e) => setNewVarCost(Number(e.target.value))}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#3F7D58] block mb-1 flex items-center gap-1">
                      <PackagePlus className="w-3.5 h-3.5" />
                      Stock Inicial (opcional):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newVarStock}
                      onChange={(e) => setNewVarStock(Number(e.target.value))}
                      className="w-full bg-white border border-[#A7D7B9] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#3F7D58]"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#26302B] block mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#556B5D]" />
                      Sucursal:
                    </label>
                    <select
                      value={newVarLocationId}
                      onChange={(e) => setNewVarLocationId(e.target.value)}
                      className="w-full bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 text-xs"
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingVariant(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingVariantLoading}
                    className="bg-[#556B5D] hover:bg-[#44564A] text-white font-bold"
                  >
                    {addingVariantLoading ? "Guardando..." : "Guardar y Añadir Variante"}
                  </Button>
                </div>
              </form>
            )}

            {/* Listado de Variantes Existentes */}
            {loadingVariants ? (
              <div className="p-8 text-center text-[#6B7A71] flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#556B5D]" />
                <span>Cargando variantes del modelo...</span>
              </div>
            ) : variants.length === 0 ? (
              <div className="p-8 text-center text-[#6B7A71] bg-[#F8F6F1] rounded-2xl">
                No hay variantes registradas para este modelo. Agrega una arriba.
              </div>
            ) : (
              <div className="space-y-2.5">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      v.isActive
                        ? "bg-[#F8F6F1] border-[#DDD9D0]"
                        : "bg-[#F0EDE6]/50 border-dashed border-[#DDD9D0] opacity-60"
                    }`}
                  >
                    {/* Atributos: Color, Talla, Manga, SKU */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-xs"
                        style={{ backgroundColor: v.color?.hexCode || "#CCC" }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#26302B] text-xs">
                            {v.color?.name || "Sin Color"}
                          </span>
                          <span className="text-[#8FA393]">·</span>
                          <span className="font-extrabold text-[#26302B] text-xs bg-white px-2 py-0.5 rounded-md border border-[#DDD9D0]">
                            Talla {v.size?.name || "—"}
                          </span>
                          <span className="text-[#8FA393]">·</span>
                          <span className="text-xs text-[#556B5D] font-semibold">
                            {v.sleeveType?.name || "Manga"}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#8FA393] block mt-0.5">
                          SKU: {v.sku}
                        </span>
                      </div>
                    </div>

                    {/* Precios Editables y Acciones */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Precio de Venta */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#DDD9D0]">
                        <span className="text-[11px] font-bold text-[#6B7A71]">Venta: $</span>
                        <input
                          type="number"
                          step="any"
                          value={v.salePrice}
                          onChange={(e) => {
                            const newPrice = Number(e.target.value);
                            setVariants((prev) =>
                              prev.map((item) =>
                                item.id === v.id ? { ...item, salePrice: newPrice } : item
                              )
                            );
                          }}
                          className="w-20 text-xs font-extrabold text-[#26302B] focus:outline-none"
                        />
                      </div>

                      {/* Botón Guardar Precio */}
                      <button
                        type="button"
                        onClick={() => handleUpdateVariantPrice(v)}
                        disabled={savingVariantId === v.id}
                        className="p-2 bg-[#556B5D] hover:bg-[#44564A] text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                        title="Guardar nuevo precio"
                      >
                        {savingVariantId === v.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Toggle Activo/Inactivo */}
                      <button
                        type="button"
                        onClick={() => handleToggleVariant(v.id, v.isActive)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                          v.isActive
                            ? "bg-[#EBF5F0] text-[#3F7D58] border border-[#A7D7B9]"
                            : "bg-[#FAEAEA] text-[#B85450] border border-[#B85450]/30"
                        }`}
                        title={v.isActive ? "Desactivar de ventas" : "Activar"}
                      >
                        {v.isActive ? "Activo" : "Inactivo"}
                      </button>

                      {/* Eliminar / Archivar Variante */}
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(v.id, v.sku)}
                        className="p-2 text-[#B85450] hover:bg-[#FAEAEA] rounded-xl transition-colors cursor-pointer"
                        title="Eliminar / Archivar variante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
