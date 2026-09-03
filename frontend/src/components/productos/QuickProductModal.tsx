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

  // Paso 2: Stock por talla { [sizeId]: number }
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});

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
    setStockBySize({});
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
    // Inicializar stock en 0 para cada talla seleccionada
    const initStock: Record<string, number> = {};
    allSizes.filter((s) => selectedSizes.has(s.id)).forEach((s) => {
      initStock[s.id] = stockBySize[s.id] ?? 0;
    });
    setStockBySize(initStock);
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
        for (const size of sizeArr) {
          for (const sleeve of sleeveArr) {
            const salePrice = priceBySleve[sleeve.id] ?? 750;
            const stockForSize = stockBySize[size.id] ?? 0;
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
          className="px-6 py-4 border-b border-[#E7E3DA] flex items-center justify-between shrink-0"
          style={{ background: "linear-gradient(to right, rgba(63,125,88,0.08), #F8F6F1)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3F7D58] flex items-center justify-center shadow-sm">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#26302B] leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                {step === 1 ? "Registrar Nuevo Modelo" : "Asignar Stock por Talla"}
              </h2>
              <p className="text-[11px] text-[#6B7A71]">
                {step === 1
                  ? "Elige colores, tallas y manga — las variantes se generan solas ✨"
                  : `${name} · ¿Cuántas piezas entran por talla?`}
              </p>
            </div>
          </div>

          {/* Stepper visual */}
          <div className="flex items-center gap-2 mr-3">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold border-2 transition-all ${step === 1 ? "bg-[#3F7D58] text-white border-[#3F7D58]" : "bg-white text-[#3F7D58] border-[#3F7D58]"}`}>
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </div>
            <div className="w-5 h-0.5 bg-[#DDD9D0]" />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold border-2 transition-all ${step === 2 ? "bg-[#3F7D58] text-white border-[#3F7D58]" : "bg-[#F0EDE8] text-[#9DAAA2] border-[#DDD9D0]"}`}>
              2
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-lg text-[#6B7A71] hover:bg-[#E7E3DA] flex items-center justify-center transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==============================
            PASO 1: CONFIGURACIÓN DEL MODELO
            ============================== */}
        {step === 1 && (
          <>
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

              {/* COLUMNA IZQUIERDA: FOTO + SUCURSAL */}
              <div className="md:w-52 shrink-0 bg-[#F8F6F1] border-r border-[#E7E3DA] flex flex-col gap-3 p-4 overflow-y-auto">
                <p className="text-[11px] font-bold text-[#6B7A71] uppercase tracking-wider">Foto del Modelo</p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setPhotoDragging(true); }}
                  onDragLeave={() => setPhotoDragging(false)}
                  onDrop={async (e) => { e.preventDefault(); setPhotoDragging(false); const f = e.dataTransfer.files[0]; if (f) await handlePhotoFile(f); }}
                  onClick={() => photoInputRef.current?.click()}
                  className={[
                    "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                    photoDragging ? "border-[#3F7D58] bg-[#EBF5F0]" : photoUrl ? "border-[#3F7D58]/40 bg-white" : "border-[#DDD9D0] bg-white hover:border-[#3F7D58]/60 hover:bg-[#F0F4F1]",
                  ].join(" ")}
                  style={{ aspectRatio: "1" }}
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
                    <>
                      <div className="w-10 h-10 rounded-full bg-[#E7E3DA] flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5 text-[#6B7A71]" />
                      </div>
                      <p className="text-[11px] text-[#6B7A71] text-center font-medium leading-snug px-2">
                        Arrastra una foto o haz clic
                      </p>
                      <p className="text-[10px] text-[#9DAAA2] mt-0.5">Opcional</p>
                    </>
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

                <div className="mt-auto">
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
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

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
            <div className="px-5 py-4 border-t border-[#E7E3DA] bg-[#F8F6F1] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className={[
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                totalVariants > 0 ? "bg-[#3F7D58] text-white shadow-sm" : "bg-[#E7E3DA] text-[#9DAAA2]",
              ].join(" ")}>
                <Sparkles className="w-4 h-4 shrink-0" />
                {totalVariants > 0 ? (
                  <span>
                    {selectedColors.size} color{selectedColors.size !== 1 ? "es" : ""}{" "}
                    &times; {selectedSizes.size} talla{selectedSizes.size !== 1 ? "s" : ""}{" "}
                    &times; {selectedSleeves.size} manga{selectedSleeves.size !== 1 ? "s" : ""}{" "}
                    = <strong>{totalVariants} variantes</strong>
                  </span>
                ) : (
                  <span>Selecciona colores, tallas y manga</span>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#DDD9D0] text-sm font-bold text-[#6B7A71] hover:bg-[#E7E3DA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep2}
                  disabled={totalVariants === 0}
                  className={[
                    "px-5 py-2 rounded-xl text-sm font-extrabold text-white transition-all flex items-center gap-2 shadow-sm",
                    totalVariants === 0
                      ? "bg-[#9DAAA2] cursor-not-allowed"
                      : "bg-[#3F7D58] hover:bg-[#2F6348] active:scale-95 cursor-pointer",
                  ].join(" ")}
                >
                  <Package className="w-4 h-4" />
                  Siguiente: Asignar Stock
                  <ChevronRight className="w-4 h-4" />
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
            <div className="flex-1 overflow-y-auto p-6">

              {/* Resumen del modelo */}
              <div className="mb-5 p-4 rounded-2xl border border-[#E7E3DA] bg-[#F8F6F1] flex items-start gap-4">
                {photoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photoUrl} alt="Modelo" className="w-14 h-14 rounded-xl object-cover border border-[#DDD9D0] shrink-0" />
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
                  <p className="text-[11px] text-[#9DAAA2] mt-1">
                    {totalVariants} variantes en total · stock por talla aplica a todos los colores y mangas
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

              {/* INSTRUCCIÓN */}
              <div className="mb-4">
                <h3 className="text-sm font-extrabold text-[#26302B] mb-0.5">¿Cuántas piezas entran de cada talla?</h3>
                <p className="text-xs text-[#6B7A71]">
                  Este stock inicial se asignará a <strong>todos los colores</strong> y <strong>tipos de manga</strong> seleccionados.
                  Si una talla no entra, deja en 0.
                </p>
              </div>

              {/* GRID DE TALLAS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedSizeArr.map((s) => {
                  const qty = stockBySize[s.id] ?? 0;
                  return (
                    <div
                      key={s.id}
                      className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${qty > 0 ? "border-[#3F7D58] bg-[#EBF5F0]" : "border-[#DDD9D0] bg-white"}`}
                    >
                      <span className={`text-lg font-extrabold ${qty > 0 ? "text-[#3F7D58]" : "text-[#26302B]"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStockBySize((prev) => ({ ...prev, [s.id]: Math.max(0, (prev[s.id] ?? 0) - 1) }))}
                          className="w-8 h-8 rounded-full border border-[#DDD9D0] bg-white text-[#556B5D] flex items-center justify-center hover:bg-[#F0EDE8] transition-colors cursor-pointer font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => setStockBySize((prev) => ({ ...prev, [s.id]: Math.max(0, Number(e.target.value)) }))}
                          className={`w-12 text-center text-lg font-extrabold rounded-xl border py-1 focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 transition-colors ${qty > 0 ? "text-[#3F7D58] border-[#3F7D58] bg-white" : "text-[#26302B] border-[#DDD9D0] bg-white"}`}
                        />
                        <button
                          type="button"
                          onClick={() => setStockBySize((prev) => ({ ...prev, [s.id]: (prev[s.id] ?? 0) + 1 }))}
                          className="w-8 h-8 rounded-full border border-[#3F7D58] bg-[#3F7D58] text-white flex items-center justify-center hover:bg-[#2F6348] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-[#9DAAA2]">
                        {qty > 0 ? `${qty} pzas` : "Sin stock"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Acceso rápido: poner misma cantidad a todas */}
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <p className="text-xs text-[#9DAAA2] font-medium">Acceso rápido:</p>
                {[2, 5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      const bulk: Record<string, number> = {};
                      selectedSizeArr.forEach((s) => { bulk[s.id] = n; });
                      setStockBySize((prev) => ({ ...prev, ...bulk }));
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F0EDE8] text-[#556B5D] hover:bg-[#E7E3DA] transition-colors cursor-pointer border border-[#DDD9D0]"
                  >
                    {n} en todas
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const bulk: Record<string, number> = {};
                    selectedSizeArr.forEach((s) => { bulk[s.id] = 0; });
                    setStockBySize((prev) => ({ ...prev, ...bulk }));
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAEAEA] text-[#B85450] hover:bg-[#F5D5D5] transition-colors cursor-pointer border border-[#B85450]/30"
                >
                  Limpiar todo
                </button>
              </div>

              {/* Resumen del stock total */}
              {Object.values(stockBySize).some((v) => v > 0) && (
                <div className="mt-4 p-3 bg-[#EBF5F0] rounded-xl border border-[#3F7D58]/20 text-xs text-[#3F7D58] font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 shrink-0" />
                  Stock total a ingresar:{" "}
                  <strong>
                    {Object.values(stockBySize).reduce((a, b) => a + b, 0)} pzas por color/manga
                  </strong>
                  {" = "}
                  <strong>
                    {Object.values(stockBySize).reduce((a, b) => a + b, 0) * selectedColors.size * selectedSleeves.size} pzas en total
                  </strong>
                </div>
              )}
            </div>

            {/* FOOTER PASO 2 */}
            <div className="px-5 py-4 border-t border-[#E7E3DA] bg-[#F8F6F1] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="px-4 py-2 rounded-xl border border-[#DDD9D0] text-sm font-bold text-[#6B7A71] hover:bg-[#E7E3DA] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver a Modificar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || success}
                className={[
                  "px-6 py-2.5 rounded-xl text-sm font-extrabold text-white transition-all flex items-center gap-2 shadow-sm",
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
