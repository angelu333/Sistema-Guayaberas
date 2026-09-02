"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Ruler,
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, Button, Input } from "@/components/ui";
import { productsService } from "@/services/products.service";
import type { Category, Color, Size } from "@/types/domain.types";

interface CatalogsSettingsProps {
  tenantId: string;
}

export function CatalogsSettings({ tenantId }: CatalogsSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"colores" | "tallas" | "categorias">("colores");
  const [loading, setLoading] = useState(true);

  const [colores, setColores] = useState<Color[]>([]);
  const [tallas, setTallas] = useState<Size[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);

  // Estados Formulario Color
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#26302B");
  const [creatingColor, setCreatingColor] = useState(false);

  // Estados Formulario Talla
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizeOrder, setNewSizeOrder] = useState<number>(50);
  const [creatingSize, setCreatingSize] = useState(false);

  // Estados Formulario Categoría
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadAllCatalogs();
  }, [tenantId]);

  const loadAllCatalogs = async () => {
    setLoading(true);
    try {
      const [c, t, cat] = await Promise.all([
        productsService.getColors(),
        productsService.getSizes(),
        productsService.getCategories(),
      ]);
      setColores(c);
      setTallas(t);
      setCategorias(cat);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // 1. Guardar Color
  const handleCreateColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim()) return;

    setCreatingColor(true);
    try {
      const created = await productsService.createColor(tenantId, newColorName, newColorHex);
      setColores((prev) => [...prev, created]);
      setNewColorName("");
      showFeedback("success", `Color "${created.name}" agregado con éxito.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Error al crear color.");
    } finally {
      setCreatingColor(false);
    }
  };

  const handleDeleteColor = async (id: string, name: string) => {
    if (!confirm(`¿Deseas eliminar el color "${name}"?`)) return;
    try {
      await productsService.deleteColor(id);
      setColores((prev) => prev.filter((c) => c.id !== id));
      showFeedback("success", `Color "${name}" eliminado.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Error al eliminar color.");
    }
  };

  // 2. Guardar Talla
  const handleCreateSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeName.trim()) return;

    setCreatingSize(true);
    try {
      const created = await productsService.createSize(tenantId, newSizeName, Number(newSizeOrder) || 50);
      setTallas((prev) => [...prev, created].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setNewSizeName("");
      showFeedback("success", `Talla "${created.name}" agregada con éxito.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Error al crear talla.");
    } finally {
      setCreatingSize(false);
    }
  };

  const handleDeleteSize = async (id: string, name: string) => {
    if (!confirm(`¿Deseas eliminar la talla "${name}"?`)) return;
    try {
      await productsService.deleteSize(id);
      setTallas((prev) => prev.filter((t) => t.id !== id));
      showFeedback("success", `Talla "${name}" eliminada.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Error al eliminar talla.");
    }
  };

  // 3. Guardar Categoría
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const created = await productsService.createCategory(tenantId, newCategoryName);
      setCategorias((prev) => [...prev, created]);
      setNewCategoryName("");
      showFeedback("success", `Categoría "${created.name}" agregada con éxito.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Error al crear categoría.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Deseas eliminar la categoría "${name}"?`)) return;
    try {
      await productsService.deleteCategory(id);
      setCategorias((prev) => prev.filter((cat) => cat.id !== id));
      showFeedback("success", `Categoría "${name}" eliminada.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Error al eliminar categoría.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-[#DDD9D0] rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("colores")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "colores"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B] hover:bg-[#F8F6F1]"
          }`}
        >
          <Palette className="w-4 h-4" />
          Colores ({colores.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("tallas")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "tallas"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B] hover:bg-[#F8F6F1]"
          }`}
        >
          <Ruler className="w-4 h-4" />
          Tallas ({tallas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("categorias")}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "categorias"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B] hover:bg-[#F8F6F1]"
          }`}
        >
          <Tag className="w-4 h-4" />
          Categorías ({categorias.length})
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-medium animate-fade-in ${
            feedbackMsg.type === "success"
              ? "bg-[#EBF5F0] text-[#3F7D58] border border-[#A7D7B9]"
              : "bg-[#FAEAEA] text-[#B85450] border border-[#B85450]/30"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {loading ? (
        <Card className="p-8 flex flex-col items-center justify-center text-[#6B7A71] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#556B5D]" />
          <span className="text-xs">Cargando catálogos de prendas...</span>
        </Card>
      ) : (
        <>
          {/* ============================================================
              1. PESTAÑA: COLORES
              ============================================================ */}
          {activeSubTab === "colores" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario Agregar Color */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#DDD9D0]">
                  <Palette className="w-4 h-4 text-[#556B5D]" />
                  <h3 className="font-bold text-sm text-[#26302B] font-[Outfit]">Nuevo Color</h3>
                </div>

                <form onSubmit={handleCreateColor} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#26302B] mb-1">Nombre del Color:</label>
                    <input
                      type="text"
                      placeholder="Ej: Azul Petróleo, Hueso, Coral..."
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#26302B] mb-1">Muestra Visual / Tono (HEX):</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-[#DDD9D0] cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#DDD9D0] rounded-xl font-mono text-xs uppercase"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={creatingColor || !newColorName.trim()}
                    className="w-full bg-[#556B5D] hover:bg-[#44564A] text-white font-bold py-2.5 rounded-xl shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    {creatingColor ? "Guardando..." : "Guardar Color"}
                  </Button>
                </form>
              </Card>

              {/* Lista de Colores */}
              <Card className="lg:col-span-2 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DDD9D0]">
                  <h3 className="font-bold text-sm text-[#26302B] font-[Outfit]">Colores Registrados</h3>
                  <span className="text-xs text-[#6B7A71]">{colores.length} colores disponibles</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {colores.map((col) => (
                    <div
                      key={col.id}
                      className="p-3 rounded-2xl border border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-between gap-2 group hover:border-[#556B5D] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-5 h-5 rounded-full border border-black/20 shrink-0 shadow-xs"
                          style={{ backgroundColor: col.hexCode || "#CCCCCC" }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#26302B] truncate">{col.name}</p>
                          <p className="text-[10px] text-[#6B7A71] font-mono">{col.hexCode || "Sin código"}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteColor(col.id, col.name)}
                        className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Eliminar color"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ============================================================
              2. PESTAÑA: TALLAS
              ============================================================ */}
          {activeSubTab === "tallas" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario Agregar Talla */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#DDD9D0]">
                  <Ruler className="w-4 h-4 text-[#556B5D]" />
                  <h3 className="font-bold text-sm text-[#26302B] font-[Outfit]">Nueva Talla</h3>
                </div>

                <form onSubmit={handleCreateSize} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#26302B] mb-1">Nombre / Identificador de Talla:</label>
                    <input
                      type="text"
                      placeholder="Ej: 36, 38, 48, 50, CH, M, G, XL, 4 Infantil..."
                      value={newSizeName}
                      onChange={(e) => setNewSizeName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#26302B] mb-1">Número de Orden (1 al 100):</label>
                    <input
                      type="number"
                      value={newSizeOrder}
                      onChange={(e) => setNewSizeOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D]"
                      placeholder="50"
                    />
                    <span className="text-[10px] text-[#6B7A71] block mt-1">
                      Sirve para ordenar las tallas de menor a mayor en el catálogo.
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={creatingSize || !newSizeName.trim()}
                    className="w-full bg-[#556B5D] hover:bg-[#44564A] text-white font-bold py-2.5 rounded-xl shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    {creatingSize ? "Guardando..." : "Guardar Talla"}
                  </Button>
                </form>
              </Card>

              {/* Lista de Tallas */}
              <Card className="lg:col-span-2 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DDD9D0]">
                  <h3 className="font-bold text-sm text-[#26302B] font-[Outfit]">Tallas Registradas</h3>
                  <span className="text-xs text-[#6B7A71]">{tallas.length} tallas disponibles</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {tallas.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl border border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-between gap-2 group hover:border-[#556B5D] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-[#26302B]">{t.name}</p>
                        <p className="text-[10px] text-[#6B7A71]">Orden: {t.sortOrder || 0}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSize(t.id, t.name)}
                        className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Eliminar talla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ============================================================
              3. PESTAÑA: CATEGORÍAS
              ============================================================ */}
          {activeSubTab === "categorias" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario Agregar Categoría */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#DDD9D0]">
                  <Tag className="w-4 h-4 text-[#556B5D]" />
                  <h3 className="font-bold text-sm text-[#26302B] font-[Outfit]">Nueva Categoría</h3>
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#26302B] mb-1">Nombre de la Categoría:</label>
                    <input
                      type="text"
                      placeholder="Ej: Presidenciales, Gala, Tradicional, Vestidos..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D]"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="w-full bg-[#556B5D] hover:bg-[#44564A] text-white font-bold py-2.5 rounded-xl shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    {creatingCategory ? "Guardando..." : "Guardar Categoría"}
                  </Button>
                </form>
              </Card>

              {/* Lista de Categorías */}
              <Card className="lg:col-span-2 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DDD9D0]">
                  <h3 className="font-bold text-sm text-[#26302B] font-[Outfit]">Categorías Registradas</h3>
                  <span className="text-xs text-[#6B7A71]">{categorias.length} categorías disponibles</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {categorias.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl border border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-between gap-2 group hover:border-[#556B5D] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#26302B] truncate">{cat.name}</p>
                        <p className="text-[10px] text-[#556B5D]">Activo en catálogo</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
