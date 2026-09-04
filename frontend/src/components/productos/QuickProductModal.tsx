"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Upload,
  Shirt,
  Sparkles,
  Check,
  AlertCircle,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Package,
  Minus,
  Plus,
} from "lucide-react";
import { productsService, CreateVariantDTO } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import { Category, Color, Size, SleeveType, Location } from "@/types/domain.types";
import { useAuthStore } from "@/stores/auth.store";

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    };
  });
}

function slugify(str: string): string {
  return str
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function buildSKU(productName: string, colorName: string, sizeName: string, sleeveName: string): string {
  const p = slugify(productName);
  const c = slugify(colorName).slice(0, 3);
  const s = sizeName.replace(/\s/g, "").toUpperCase().slice(0, 4);
  const m = sleeveName.toLowerCase().includes("larga") ? "LG" : "CT";
  return (p + "-" + c + "-" + s + "-" + m).replace(/-+/g, "-");
}

export function QuickProductModal({ isOpen, onClose, onSuccess }: QuickProductModalProps) {
  const session = useAuthStore((s) => s.session);

  // Catálogos
  const [categories, setCategories] = useState<Category[]>([]);
  const [allColors, setAllColors] = useState<Color[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allSleeves, setAllSleeves] = useState<SleeveType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Paso actual: 1 = Configuración, 2 = Stock por talla
  const [step, setStep] = useState<1 | 2>(1);

  // Campos Paso 1
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [selectedSleeves, setSelectedSleeves] = useState<Set<string>>(new Set());
  // Precio por manga: { [sleeveId]: number }
  const [priceBySleve, setPriceBySleeve] = useState<Record<string, number>>({});

  // Foto
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDragging, setPhotoDragging] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Crear rápido
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#26302B");
  const [newSizeName, setNewSizeName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddColor, setShowAddColor] = useState(false);
  const [showAddSize, setShowAddSize] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Paso 2: Stock por tipo de manga y talla { [sleeveId]: { [sizeId]: number } }
  const [stockBySleeveAndSize, setStockBySleeveAndSize] = useState<Record<string, Record<string, number>>>({});
  const [activeSleeveStep2, setActiveSleeveStep2] = useState<string>("");

  // Estado general
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const tenantId = session?.tenantId;
    if (!tenantId) return;
    const [cats, cols, szs, slvs, locs] = await Promise.all([
      productsService.getCategories(tenantId),
      productsService.getColors(tenantId),
      productsService.getSizes(tenantId),
      productsService.getSleeveTypes(tenantId),
      inventoryService.getLocations(tenantId),
    ]);
    setCategories(cats);
    setAllColors(cols);
    setAllSizes(szs);
    setAllSleeves(slvs);
    setLocations(locs);
    if (locs.length > 0) setLocationId(locs[0].id);
    // Pre-seleccionar TODOS los tipos de manga por defecto
    setSelectedSleeves(new Set(slvs.map((sl) => sl.id)));
    // Precio por defecto 750 para cada manga
    const defaultPrices: Record<string, number> = {};
    slvs.forEach((sl) => { defaultPrices[sl.id] = 750; });
    setPriceBySleeve(defaultPrices);
  }, [session?.tenantId]);

  const resetForm = useCallback(() => {
    setStep(1);
    setName("");
    setCategoryId("");
    setSelectedColors(new Set());
    setSelectedSizes(new Set());
    setSelectedSleeves(new Set());
    setPriceBySleeve({});
    setPhotoUrl(null);
    setError(null);
    setSuccess(false);
    setShowAddColor(false);
    setShowAddSize(false);
    setShowAddCategory(false);
    setStockBySleeveAndSize({});
    setActiveSleeveStep2("");
    setNewColorName("");
    setNewSizeName("");
    setNewCategoryName("");
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen, loadData, resetForm]);

  // Cuando cambian las mangas seleccionadas, asegurarse que haya un precio para cada una
  useEffect(() => {
    setPriceBySleeve((prev) => {
      const next = { ...prev };
      selectedSleeves.forEach((slId) => {
        if (!next[slId]) next[slId] = 750;
      });
      return next;
    });
  }, [selectedSleeves]);

  const totalVariants = selectedColors.size * selectedSizes.size * selectedSleeves.size;

  const handlePhotoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPhotoUrl(await compressImage(file));
  };

  const toggleSet = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const handleAddColor = async () => {
    if (!newColorName.trim() || !session?.tenantId) return;
    try {
      const c = await productsService.createColor(session.tenantId, newColorName, newColorHex);
      setAllColors((prev) => [...prev, c]);
      setSelectedColors((prev) => new Set([...prev, c.id]));
      setNewColorName("");
      setNewColorHex("#26302B");
      setShowAddColor(false);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    }
  };

  const handleAddSize = async () => {
    if (!newSizeName.trim() || !session?.tenantId) return;
    try {
      const s = await productsService.createSize(session.tenantId, newSizeName);
      setAllSizes((prev) => productsService.sortSizes([...prev, s]));
      setSelectedSizes((prev) => new Set([...prev, s.id]));
      setNewSizeName("");
      setShowAddSize(false);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !session?.tenantId) return;
    try {
      const c = await productsService.createCategory(session.tenantId, newCategoryName);
      setCategories((prev) => [...prev, c]);
      setCategoryId(c.id);
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    }
  };

  // Avanzar del Paso 1 al Paso 2
  const handleGoToStep2 = () => {
    setError(null);
    if (!name.trim()) { setError("El nombre del modelo es requerido."); return; }
    if (selectedColors.size === 0) { setError("Selecciona al menos un color."); return; }
    if (selectedSizes.size === 0) { setError("Selecciona al menos una talla."); return; }
    if (selectedSleeves.size === 0) { setError("Selecciona al menos un tipo de manga."); return; }

    const selectedSleeveArr = allSleeves.filter((sl) => selectedSleeves.has(sl.id));
    const selectedSizeArr = allSizes.filter((s) => selectedSizes.has(s.id));

    // Inicializar matriz de stock para cada manga y talla
    const nextStock: Record<string, Record<string, number>> = {};
    selectedSleeveArr.forEach((sl) => {
      nextStock[sl.id] = nextStock[sl.id] || {};
      selectedSizeArr.forEach((s) => {
        nextStock[sl.id][s.id] = stockBySleeveAndSize[sl.id]?.[s.id] ?? 0;
      });
    });
    setStockBySleeveAndSize(nextStock);

    if (!activeSleeveStep2 || !selectedSleeves.has(activeSleeveStep2)) {
      setActiveSleeveStep2(selectedSleeveArr[0]?.id || "");
    }

    setStep(2);
  };

  // Guardar todo
  const handleSubmit = async () => {
    setError(null);
    if (!session?.tenantId) { setError("No se encontró una empresa activa."); return; }

    setLoading(true);
    try {
      const colorArr = allColors.filter((c) => selectedColors.has(c.id));
      const sizeArr = allSizes.filter((s) => selectedSizes.has(s.id));
      const sleeveArr = allSleeves.filter((sl) => selectedSleeves.has(sl.id));

      const variants: CreateVariantDTO[] = [];
      for (const color of colorArr) {
        for (const sleeve of sleeveArr) {
          for (const size of sizeArr) {
            const salePrice = priceBySleve[sleeve.id] ?? 750;
            const stockForSize = stockBySleeveAndSize[sleeve.id]?.[size.id] ?? 0;
            variants.push({
              colorId: color.id,
              sizeId: size.id,
              sleeveTypeId: sleeve.id,
              sku: buildSKU(name, color.name, size.name, sleeve.name),
              costPrice: Math.round(salePrice * 0.5),
              salePrice,
              minStock: 5,
              initialStock: stockForSize > 0 ? stockForSize : 0,
            });
          }
        }
      }

      await productsService.createProduct(session.tenantId, {
        name: name.trim(),
        categoryId: categoryId || undefined,
        images: photoUrl ? [{ url: photoUrl, isPrimary: true }] : undefined,
        variants,
        locationId: locationId || undefined,
      });

      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 900);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Error al guardar el producto.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const badgeStyle = "ml-1 inline-flex items-center justify-center px-1.5 py-0.5 bg-[#3F7D58] text-white rounded-md text-[10px] font-bold leading-none";
  const chipBase = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none";
  const chipActive = "bg-[#3F7D58] text-white border-[#3F7D58] shadow-sm";
  const chipIdle = "bg-white text-[#26302B] border-[#DDD9D0] hover:border-[#3F7D58] hover:bg-[#F0F4F1]";

  // Tallas actualmente seleccionadas (en orden)
  const selectedSizeArr = allSizes.filter((s) => selectedSizes.has(s.id));
  const selectedSleeveArr = allSleeves.filter((sl) => selectedSleeves.has(sl.id));

  return (
    <div className="fixed inset-0 z-50 bg-[#26302B]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "fadeIn .18s ease", maxHeight: "90vh" }}
      >

        {/* HEADER */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E7E3DA] flex items-center justify-between shrink-0"
          style={{ background: "linear-gradient(to right, rgba(63,125,88,0.08), #F8F6F1)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#3F7D58] flex items-center justify-center shrink-0 shadow-sm">
              <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-[#26302B] leading-tight truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                {step === 1 ? "Registrar Nuevo Modelo" : "Asignar Stock por Talla"}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-[#6B7A71] truncate">
                {step === 1
                  ? "Elige colores, tallas y manga — variantes automáticas ✨"
                  : `${name} · ¿Cuántas piezas entran por talla?`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Stepper visual */}
            <div className="flex items-center gap-1.5 mr-1 sm:mr-3">
              <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-xs font-extrabold border-2 transition-all ${step === 1 ? "bg-[#3F7D58] text-white border-[#3F7D58]" : "bg-white text-[#3F7D58] border-[#3F7D58]"}`}>
                {step > 1 ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : "1"}
              </div>
              <div className="w-3 sm:w-5 h-0.5 bg-[#DDD9D0]" />
              <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-xs font-extrabold border-2 transition-all ${step === 2 ? "bg-[#3F7D58] text-white border-[#3F7D58]" : "bg-[#F0EDE8] text-[#9DAAA2] border-[#DDD9D0]"}`}>
                2
              </div>
            </div>

            <button onClick={onClose} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[#6B7A71] hover:bg-[#E7E3DA] flex items-center justify-center transition-colors cursor-pointer">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ==============================
            PASO 1: CONFIGURACIÓN DEL MODELO
            ============================== */}
        {step === 1 && (
          <>
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">

              {/* COLUMNA IZQUIERDA: FOTO + SUCURSAL */}
              <div className="w-full md:w-52 shrink-0 bg-[#F8F6F1] border-b md:border-b-0 md:border-r border-[#E7E3DA] flex flex-col gap-2.5 p-3 sm:p-4">
                <p className="text-[11px] font-bold text-[#6B7A71] uppercase tracking-wider">Foto del Modelo</p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setPhotoDragging(true); }}
                  onDragLeave={() => setPhotoDragging(false)}
                  onDrop={async (e) => { e.preventDefault(); setPhotoDragging(false); const f = e.dataTransfer.files[0]; if (f) await handlePhotoFile(f); }}
                  onClick={() => photoInputRef.current?.click()}
                  className={[
                    "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden h-24 md:h-auto md:aspect-square w-full",
                    photoDragging ? "border-[#3F7D58] bg-[#EBF5F0]" : photoUrl ? "border-[#3F7D58]/40 bg-white" : "border-[#DDD9D0] bg-white hover:border-[#3F7D58]/60 hover:bg-[#F0F4F1]",
                  ].join(" ")}
                >
                  {photoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-bold">Cambiar foto</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-row md:flex-col items-center justify-center gap-2 md:gap-1 p-2">
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-[#E7E3DA] flex items-center justify-center shrink-0">
                        <Upload className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#6B7A71]" />
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-[11px] text-[#6B7A71] font-medium leading-snug">
                          Arrastra una foto o haz clic
                        </p>
                        <p className="text-[10px] text-[#9DAAA2]">Opcional</p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handlePhotoFile(f); }}
                />

                {photoUrl && (
                  <button type="button" onClick={() => setPhotoUrl(null)} className="text-[11px] text-[#B85450] hover:underline text-center cursor-pointer">
                    Quitar foto
                  </button>
                )}

                <div className="mt-1 md:mt-auto">
                  <label className="text-[11px] font-bold text-[#6B7A71] uppercase tracking-wider flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3" /> Sucursal
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD9D0] bg-white px-2 py-1.5 text-xs text-[#26302B] font-medium focus:outline-none"
                  >
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              {/* COLUMNA DERECHA: DATOS */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">

                {error && (
                  <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* NOMBRE Y CATEGORÍA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#26302B] block mb-1">
                      Nombre del Modelo <span className="text-[#B85450]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Valladolid, Presidencial..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      className="w-full rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-sm text-[#26302B] placeholder-[#9DAAA2] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#26302B]">Categoría</label>
                      {!showAddCategory && (
                        <button type="button" onClick={() => setShowAddCategory(true)} className="text-[11px] font-bold text-[#3F7D58] hover:underline cursor-pointer">+ Nueva</button>
                      )}
                    </div>
                    {showAddCategory ? (
                      <div className="flex gap-1.5">
                        <input autoFocus type="text" placeholder="Nombre categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }} className="flex-1 rounded-xl border border-[#556B5D] bg-white px-2.5 py-1.5 text-xs focus:outline-none" />
                        <button type="button" onClick={handleAddCategory} className="px-2.5 py-1.5 bg-[#3F7D58] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#2F6348]">✓</button>
                        <button type="button" onClick={() => setShowAddCategory(false)} className="px-2.5 py-1.5 bg-[#F0EDE8] text-xs font-bold rounded-xl cursor-pointer">✕</button>
                      </div>
                    ) : (
                      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-sm text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30">
                        <option value="">Sin categoría</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* COLORES */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#26302B] uppercase tracking-wider">
                      🎨 Colores
                      {selectedColors.size > 0 && <span className={badgeStyle}>{selectedColors.size}</span>}
                    </label>
                    {!showAddColor && (
                      <button type="button" onClick={() => setShowAddColor(true)} className="text-[11px] font-bold text-[#3F7D58] hover:underline cursor-pointer">+ Nuevo Color</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allColors.map((c) => (
                      <button key={c.id} type="button" onClick={() => setSelectedColors(toggleSet(selectedColors, c.id))} className={chipBase + " " + (selectedColors.has(c.id) ? chipActive : chipIdle)}>
                        {c.hexCode && <span className="w-3 h-3 rounded-full border border-white/30 shadow-sm shrink-0" style={{ backgroundColor: c.hexCode }} />}
                        {c.name}
                        {selectedColors.has(c.id) && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    ))}
                    {showAddColor && (
                      <div className="flex items-center gap-1.5 bg-[#F0F4F1] border border-[#3F7D58]/30 rounded-xl px-2 py-1">
                        <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                        <input autoFocus type="text" placeholder="Nombre del color..." value={newColorName} onChange={(e) => setNewColorName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddColor(); } }} className="w-28 text-xs bg-transparent focus:outline-none text-[#26302B] font-medium" />
                        <button type="button" onClick={handleAddColor} className="text-[#3F7D58] font-bold text-xs cursor-pointer hover:underline">✓</button>
                        <button type="button" onClick={() => setShowAddColor(false)} className="text-[#B85450] text-xs cursor-pointer">✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* TALLAS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#26302B] uppercase tracking-wider">
                      📐 Tallas
                      {selectedSizes.size > 0 && <span className={badgeStyle}>{selectedSizes.size}</span>}
                    </label>
                    {!showAddSize && (
                      <button type="button" onClick={() => setShowAddSize(true)} className="text-[11px] font-bold text-[#3F7D58] hover:underline cursor-pointer">+ Nueva Talla</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allSizes.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSelectedSizes(toggleSet(selectedSizes, s.id))} className={chipBase + " min-w-[42px] justify-center " + (selectedSizes.has(s.id) ? chipActive : chipIdle)}>
                        {s.name}
                      </button>
                    ))}
                    {showAddSize && (
                      <div className="flex items-center gap-1.5 bg-[#F0F4F1] border border-[#3F7D58]/30 rounded-xl px-2.5 py-1">
                        <input autoFocus type="text" placeholder="Ej: 48, XL..." value={newSizeName} onChange={(e) => setNewSizeName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSize(); } }} className="w-20 text-xs bg-transparent focus:outline-none text-[#26302B] font-medium" />
                        <button type="button" onClick={handleAddSize} className="text-[#3F7D58] font-bold text-xs cursor-pointer hover:underline">✓</button>
                        <button type="button" onClick={() => setShowAddSize(false)} className="text-[#B85450] text-xs cursor-pointer">✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* TIPO DE MANGA + PRECIOS POR MANGA */}
                <div>
                  <label className="text-xs font-bold text-[#26302B] uppercase tracking-wider block mb-2">
                    👔 Tipo de Manga
                    {selectedSleeves.size > 0 && <span className={badgeStyle}>{selectedSleeves.size}</span>}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allSleeves.map((sl) => (
                      <button key={sl.id} type="button" onClick={() => setSelectedSleeves(toggleSet(selectedSleeves, sl.id))} className={chipBase + " px-4 " + (selectedSleeves.has(sl.id) ? chipActive : chipIdle)}>
                        {sl.name}
                        {selectedSleeves.has(sl.id) && <Check className="w-3 h-3 ml-1" />}
                      </button>
                    ))}
                  </div>

                  {/* Precios diferenciados por manga (solo las seleccionadas) */}
                  {selectedSleeveArr.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {selectedSleeveArr.map((sl) => (
                        <div key={sl.id} className="flex items-center gap-2 bg-[#F8F6F1] rounded-xl border border-[#DDD9D0] px-3 py-2">
                          <div className="w-2 h-2 rounded-full bg-[#3F7D58] shrink-0" />
                          <span className="text-xs font-bold text-[#26302B] flex-1">{sl.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-[#6B7A71]">$</span>
                            <input
                              type="number"
                              min={1}
                              value={priceBySleve[sl.id] ?? 750}
                              onChange={(e) => setPriceBySleeve((prev) => ({ ...prev, [sl.id]: Number(e.target.value) }))}
                              className="w-20 text-sm font-extrabold text-[#26302B] bg-white border border-[#DDD9D0] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* FOOTER PASO 1 */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-[#E7E3DA] bg-[#F8F6F1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <div className={[
                "flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center",
                totalVariants > 0 ? "bg-[#3F7D58] text-white shadow-sm" : "bg-[#E7E3DA] text-[#9DAAA2]",
              ].join(" ")}>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {totalVariants > 0 ? (
                  <span>
                    {selectedColors.size} col &times; {selectedSizes.size} tal &times; {selectedSleeves.size} man = <strong>{totalVariants} variantes</strong>
                  </span>
                ) : (
                  <span>Selecciona colores, tallas y manga</span>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl border border-[#DDD9D0] text-xs sm:text-sm font-bold text-[#6B7A71] hover:bg-[#E7E3DA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep2}
                  disabled={totalVariants === 0}
                  className={[
                    "flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm",
                    totalVariants === 0
                      ? "bg-[#9DAAA2] cursor-not-allowed"
                      : "bg-[#3F7D58] hover:bg-[#2F6348] active:scale-95 cursor-pointer",
                  ].join(" ")}
                >
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Siguiente: Stock
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==============================
            PASO 2: STOCK POR TALLA
            ============================== */}
        {step === 2 && (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

              {/* RESUMEN DEL MODELO */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#F8F6F1] rounded-2xl border border-[#E7E3DA] flex items-center gap-3">
                {photoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photoUrl} alt="Modelo" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#DDD9D0] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#26302B] text-sm truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedSleeveArr.map((sl) => (
                      <span key={sl.id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#3F7D58] text-white font-bold">
                        {sl.name} — ${(priceBySleve[sl.id] ?? 750).toLocaleString("es-MX")}
                      </span>
                    ))}
                    {allColors.filter((c) => selectedColors.has(c.id)).map((c) => (
                      <span key={c.id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDE7DA] text-[#556B5D] font-bold flex items-center gap-1">
                        {c.hexCode && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.hexCode }} />}
                        {c.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[#9DAAA2] mt-1">
                    {totalVariants} variantes en total · stock configurable por tipo de manga
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-[#EBF5F0] border border-[#3F7D58]/30 rounded-xl text-xs text-[#3F7D58] flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 shrink-0" />
                  Modelo registrado. Generando variantes...
                </div>
              )}

              {/* SELECTOR DE PESTAÑAS POR MANGA (SI HAY MÁS DE 1 MANGA) */}
              {selectedSleeveArr.length > 1 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-[#6B7A71] mb-2">Selecciona la manga para asignar sus piezas:</p>
                  <div className="flex items-center gap-2 p-1.5 bg-[#F0EDE8] rounded-2xl flex-wrap sm:flex-nowrap">
                    {selectedSleeveArr.map((sl) => {
                      const isActive = sl.id === activeSleeveStep2;
                      const sleeveTotal = Object.values(stockBySleeveAndSize[sl.id] || {}).reduce((a, b) => a + b, 0);
                      const sleevePrice = priceBySleve[sl.id] ?? 750;
                      return (
                        <button
                          key={sl.id}
                          type="button"
                          onClick={() => setActiveSleeveStep2(sl.id)}
                          className={`flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isActive
                              ? "bg-white text-[#26302B] shadow-sm border border-[#3F7D58]/30 ring-2 ring-[#3F7D58]/20"
                              : "text-[#6B7A71] hover:text-[#26302B] hover:bg-white/60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-left">
                            <Shirt className={`w-3.5 h-3.5 ${isActive ? "text-[#3F7D58]" : "text-[#9DAAA2]"}`} />
                            <div>
                              <div className="leading-tight">{sl.name}</div>
                              <div className="text-[10px] font-medium text-[#9DAAA2]">${sleevePrice.toLocaleString()}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                            sleeveTotal > 0 ? "bg-[#EBF5F0] text-[#3F7D58]" : "bg-[#DDD9D0]/60 text-[#9DAAA2]"
                          }`}>
                            {sleeveTotal} pzas
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* INSTRUCCIÓN DE LA MANGA ACTIVA */}
              {(() => {
                const currentSleeve = selectedSleeveArr.find((sl) => sl.id === activeSleeveStep2) || selectedSleeveArr[0];
                if (!currentSleeve) return null;
                const currentSleeveStock = stockBySleeveAndSize[currentSleeve.id] || {};

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#26302B]">
                          Stock para: <span className="text-[#3F7D58]">{currentSleeve.name}</span>
                        </h3>
                        <p className="text-[11px] text-[#6B7A71]">
                          Ingresa cuántas piezas entran de cada talla para {currentSleeve.name.toLowerCase()}.
                        </p>
                      </div>

                      {/* Botón copiar a otras mangas */}
                      {selectedSleeveArr.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStockBySleeveAndSize((prev) => {
                              const next = { ...prev };
                              const source = next[currentSleeve.id] || {};
                              selectedSleeveArr.forEach((sl) => {
                                if (sl.id !== currentSleeve.id) {
                                  next[sl.id] = { ...source };
                                }
                              });
                              return next;
                            });
                          }}
                          className="text-[11px] font-bold text-[#3F7D58] hover:underline cursor-pointer bg-[#EBF5F0] px-2.5 py-1 rounded-lg border border-[#3F7D58]/20"
                        >
                          Copiar cantidades a las demás mangas
                        </button>
                      )}
                    </div>

                    {/* GRID DE TALLAS PARA LA MANGA ACTIVA */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedSizeArr.map((s) => {
                        const qty = currentSleeveStock[s.id] ?? 0;
                        return (
                          <div
                            key={s.id}
                            className={`rounded-2xl border-2 p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 transition-all ${qty > 0 ? "border-[#3F7D58] bg-[#EBF5F0]" : "border-[#DDD9D0] bg-white"}`}
                          >
                            <span className={`text-base sm:text-lg font-extrabold ${qty > 0 ? "text-[#3F7D58]" : "text-[#26302B]"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                              {s.name}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setStockBySleeveAndSize((prev) => ({
                                    ...prev,
                                    [currentSleeve.id]: {
                                      ...(prev[currentSleeve.id] || {}),
                                      [s.id]: Math.max(0, ((prev[currentSleeve.id] || {})[s.id] ?? 0) - 1),
                                    },
                                  }))
                                }
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#DDD9D0] bg-white text-[#556B5D] flex items-center justify-center hover:bg-[#F0EDE8] transition-colors cursor-pointer font-bold"
                              >
                                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={qty}
                                onChange={(e) =>
                                  setStockBySleeveAndSize((prev) => ({
                                    ...prev,
                                    [currentSleeve.id]: {
                                      ...(prev[currentSleeve.id] || {}),
                                      [s.id]: Math.max(0, Number(e.target.value)),
                                    },
                                  }))
                                }
                                className={`w-10 sm:w-12 text-center text-base sm:text-lg font-extrabold rounded-xl border py-1 focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 transition-colors ${qty > 0 ? "text-[#3F7D58] border-[#3F7D58] bg-white" : "text-[#26302B] border-[#DDD9D0] bg-white"}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setStockBySleeveAndSize((prev) => ({
                                    ...prev,
                                    [currentSleeve.id]: {
                                      ...(prev[currentSleeve.id] || {}),
                                      [s.id]: ((prev[currentSleeve.id] || {})[s.id] ?? 0) + 1,
                                    },
                                  }))
                                }
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#3F7D58] bg-[#3F7D58] text-white flex items-center justify-center hover:bg-[#2F6348] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-[#9DAAA2]">
                              {qty > 0 ? `${qty} pzas` : "Sin stock"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Acceso rápido para la manga activa */}
                    <div className="mt-4 sm:mt-5 flex items-center gap-2 sm:gap-3 flex-wrap">
                      <p className="text-xs text-[#9DAAA2] font-medium">Acceso rápido ({currentSleeve.name}):</p>
                      {[2, 5, 10, 15, 20].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            const bulk: Record<string, number> = {};
                            selectedSizeArr.forEach((s) => { bulk[s.id] = n; });
                            setStockBySleeveAndSize((prev) => ({
                              ...prev,
                              [currentSleeve.id]: bulk,
                            }));
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[#DDD9D0] bg-white text-xs font-bold text-[#556B5D] hover:border-[#3F7D58] hover:bg-[#F0F4F1] transition-all cursor-pointer shadow-xs"
                        >
                          +{n} a todas
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setStockBySleeveAndSize((prev) => ({
                            ...prev,
                            [currentSleeve.id]: {},
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#B85450] hover:underline cursor-pointer"
                      >
                        Limpiar {currentSleeve.name}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Resumen del stock total de todas las mangas */}
              {(() => {
                let totalPieces = 0;
                const details: { name: string; total: number }[] = [];
                selectedSleeveArr.forEach((sl) => {
                  const slTotal = Object.values(stockBySleeveAndSize[sl.id] || {}).reduce((a, b) => a + b, 0);
                  details.push({ name: sl.name, total: slTotal });
                  totalPieces += slTotal;
                });

                const grandTotal = totalPieces * selectedColors.size;

                if (totalPieces === 0) return null;

                return (
                  <div className="mt-4 p-3.5 bg-[#EBF5F0] rounded-xl border border-[#3F7D58]/25 text-xs text-[#26302B] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#3F7D58] shrink-0" />
                      <div className="flex items-center gap-2 flex-wrap">
                        {details.map((d) => (
                          <span key={d.name} className="px-2 py-0.5 bg-white rounded-md border border-[#3F7D58]/20 text-[#3F7D58]">
                            {d.name}: <strong>{d.total} pzas</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-[#3F7D58]">
                      Total General: <strong>{grandTotal} prendas</strong> ({selectedColors.size} color{selectedColors.size > 1 ? "es" : ""})
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* FOOTER PASO 2 */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-[#E7E3DA] bg-[#F8F6F1] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="px-4 py-2 sm:py-2.5 rounded-xl border border-[#DDD9D0] text-xs sm:text-sm font-bold text-[#6B7A71] hover:bg-[#E7E3DA] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver a Modificar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || success}
                className={[
                  "px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all flex items-center justify-center gap-2 shadow-sm",
                  loading || success
                    ? "bg-[#9DAAA2] cursor-not-allowed"
                    : "bg-[#3F7D58] hover:bg-[#2F6348] active:scale-95 cursor-pointer",
                ].join(" ")}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : success ? (
                  <>
                    <Check className="w-4 h-4" />
                    ¡Listo!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Guardar {totalVariants} Variantes
                  </>
                )}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
