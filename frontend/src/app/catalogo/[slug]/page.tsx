"use client";

import { useEffect, useState, useCallback, useMemo, use } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  MapPin,
  MessageCircle,
  X,
  Package,
  Share2,
  Eye,
  Shirt,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Search,
  Check,
  Copy,
  Link2,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import {
  publicCatalogService,
  type PublicTenantInfo,
  type PublicFilterOptions,
  type PublicProductView,
} from "@/services/public-catalog.service";
import type { ProductVariant } from "@/types/domain.types";
import { ProductDetailModal } from "@/components/catalogo/ProductDetailModal";
import { PublicCartDrawer, type PublicCartItem } from "@/components/catalogo/PublicCartDrawer";
import { Suspense } from "react";

function PublicCatalogContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuthStore();

  const [tenantInfo, setTenantInfo] = useState<PublicTenantInfo | null>(null);
  const [filterOptions, setFilterOptions] = useState<PublicFilterOptions>({
    modelos: [],
    colores: [],
    tallas: [],
    mangas: [],
  });

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<PublicProductView[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<PublicProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Estado del Carrito / Lista de Pedido Público
  const [cartItems, setCartItems] = useState<PublicCartItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(16);

  const selectedModelo = searchParams.get("modelo") || "";
  const selectedManga = searchParams.get("manga") || "";
  const selectedTalla = searchParams.get("talla") || "";
  const selectedColor = searchParams.get("color") || "";

  // Resetear paginación al cambiar búsqueda o filtros
  useEffect(() => {
    setVisibleCount(16);
  }, [selectedModelo, selectedManga, selectedTalla, selectedColor, searchText]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const bundle = await publicCatalogService.getPublicBundleBySlug(slug);
    if (!bundle || !bundle.tenant) {
      setLoading(false);
      return;
    }
    setTenantInfo(bundle.tenant);
    setFilterOptions(bundle.filterOptions);

    let filtered = bundle.catalog || [];
    if (selectedModelo) {
      const m = selectedModelo.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.productId.toLowerCase() === m ||
          (item.product?.name || "").toLowerCase().includes(m)
      );
    }
    if (selectedManga) {
      const sl = selectedManga.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.sleeveTypeId?.toLowerCase() === sl ||
          (item.sleeveType?.name || "").toLowerCase().includes(sl)
      );
    }
    if (selectedTalla) {
      const t = selectedTalla.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.sizeId?.toLowerCase() === t ||
          (item.size?.name || "").toLowerCase() === t
      );
    }
    if (selectedColor) {
      const c = selectedColor.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.colorId?.toLowerCase() === c ||
          (item.color?.name || "").toLowerCase().includes(c)
      );
    }

    setVariants(filtered);
    setGroupedProducts(publicCatalogService.groupProductsForCatalog(filtered));
    setLoading(false);
  }, [slug, selectedModelo, selectedManga, selectedTalla, selectedColor]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const updateFilters = (key: "modelo" | "talla" | "color" | "manga", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => router.replace(pathname);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `¡Hola! Te invito a ver nuestro catálogo digital de guayaberas de ${tenantInfo?.name || "nuestra tienda"}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  // Manejadores del Carrito
  const handleAddToCart = (newItem: PublicCartItem) => {
    setCartItems((prev) => {
      const index = prev.findIndex((i) => i.cartItemId === newItem.cartItemId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQuantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleClearCart = () => setCartItems([]);

  // Filtrado predictivo instantáneo por texto en el cliente
  const displayedProducts = useMemo(() => {
    if (!searchText.trim()) return groupedProducts;
    const q = searchText.toLowerCase().trim();
    return groupedProducts.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCategory = p.categoryName?.toLowerCase().includes(q);
      const matchColor = p.availableColors.some((c) => c.toLowerCase().includes(q));
      return matchName || matchCategory || matchColor;
    });
  }, [groupedProducts, searchText]);

  const hasActiveFilters = !!(selectedModelo || selectedManga || selectedTalla || selectedColor || searchText);

  if (!tenantInfo && !loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-8 text-center font-[Outfit]">
        <div className="w-16 h-16 rounded-2xl bg-[#EDE7DA] text-[#C49A5A] flex items-center justify-center mb-4 border border-[#E4DDD1]">
          <Shirt className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-[#26302B]">Tienda no encontrada</h1>
        <p className="text-xs text-[#8B7D6B] max-w-sm mt-1">
          No existe ninguna tienda de guayaberas registrada con el enlace &ldquo;{slug}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ backgroundColor: "#FAF7F2", fontFamily: "'Outfit', sans-serif" }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FRANJA DE ANUNCIO SUPERIOR PERSONALIZABLE
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ backgroundColor: "#C49A5A" }} className="text-white text-[11px] text-center py-1.5 px-4 font-semibold tracking-wider uppercase">
        {tenantInfo?.bannerText?.trim() || "Confección Artesanal Yucateca · Mérida, México"}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HEADER MARFIL ELEGANTE (Sticky)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        style={{ backgroundColor: "#F5EFE3", borderBottomColor: "#E4DDD1" }}
        className={`sticky top-0 z-30 border-b transition-shadow duration-200 ${scrolled ? "shadow-md" : "shadow-none"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Identidad de Marca */}
          <div className="flex items-center gap-3 min-w-0">
            {tenantInfo?.logoUrl ? (
              <img
                src={tenantInfo.logoUrl}
                alt={tenantInfo?.name}
                className="w-11 h-11 object-contain rounded-xl border border-[#E4DDD1] shrink-0"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-xl shrink-0 border"
                style={{ backgroundColor: "#26302B", color: "#C49A5A", borderColor: "#C49A5A40" }}
              >
                {tenantInfo?.name?.slice(0, 1).toUpperCase() || "G"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight truncate" style={{ color: "#26302B" }}>
                {tenantInfo?.name || "Catálogo de Guayaberas"}
              </h1>
              <div className="flex items-center gap-3 text-xs truncate" style={{ color: "#8B7D6B" }}>
                {tenantInfo?.address && (
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#C49A5A" }} />
                    {tenantInfo.address}
                  </span>
                )}
                {tenantInfo?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" style={{ color: "#C49A5A" }} />
                    {tenantInfo.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Volver al Panel (Solo para usuarios autenticados / administradores) */}
            {session && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#26302B] hover:bg-[#323D37] text-[#FAF7F2] border border-[#26302B] transition-all shadow-xs cursor-pointer"
                title="Regresar al panel de administración"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C49A5A]" />
                <span className="hidden sm:inline">Volver al Panel</span>
                <span className="sm:hidden">Panel</span>
              </Link>
            )}

            {/* Botón Copiar Enlace */}
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-xs cursor-pointer ${
                copiedLink
                  ? "bg-[#3F7D58] text-white border-[#3F7D58] scale-105"
                  : "bg-white text-[#26302B] border-[#E4DDD1] hover:border-[#C49A5A] hover:bg-[#FAF7F2]"
              }`}
              title="Copiar enlace del catálogo al portapapeles"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#C49A5A]" />
                  <span className="hidden sm:inline">Copiar Enlace</span>
                  <span className="sm:hidden">Copiar</span>
                </>
              )}
            </button>

            {/* Botón Compartir en WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-all shadow-xs cursor-pointer"
              title="Compartir catálogo por WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRA DE FILTROS EN MENÚS DESPLEGABLES (SELECTS ELEGANTES)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2">
        <div className="bg-white border rounded-2xl p-4 shadow-xs" style={{ borderColor: "#E4DDD1" }}>
          
          <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "#EDE7DA" }}>
            <span className="text-xs font-bold uppercase tracking-wider text-[#26302B] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#C49A5A]" /> Filtros de Búsqueda
            </span>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#B85450] hover:underline flex items-center gap-1 font-bold"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar Filtros
              </button>
            )}
          </div>

          {/* Grid de 4 Selects Desplegables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. SELECT MODELO */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B7D6B]">
                Modelo
              </label>
              <select
                value={selectedModelo}
                onChange={(e) => updateFilters("modelo", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border bg-[#FAF7F2] text-[#26302B] focus:outline-none focus:border-[#556B5D] cursor-pointer transition-all"
                style={{ borderColor: selectedModelo ? "#556B5D" : "#E4DDD1" }}
              >
                <option value="">Todos los modelos</option>
                {filterOptions.modelos.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. SELECT TIPO DE MANGA */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B7D6B]">
                Manga
              </label>
              <select
                value={selectedManga}
                onChange={(e) => updateFilters("manga", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border bg-[#FAF7F2] text-[#26302B] focus:outline-none focus:border-[#556B5D] cursor-pointer transition-all"
                style={{ borderColor: selectedManga ? "#556B5D" : "#E4DDD1" }}
              >
                <option value="">Todas las mangas</option>
                {filterOptions.mangas.map((sl) => (
                  <option key={sl.id} value={sl.name}>
                    {sl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. SELECT TALLA */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B7D6B]">
                Talla
              </label>
              <select
                value={selectedTalla}
                onChange={(e) => updateFilters("talla", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border bg-[#FAF7F2] text-[#26302B] focus:outline-none focus:border-[#556B5D] cursor-pointer transition-all"
                style={{ borderColor: selectedTalla ? "#556B5D" : "#E4DDD1" }}
              >
                <option value="">Todas las tallas</option>
                {filterOptions.tallas.map((t) => (
                  <option key={t.id} value={t.name}>
                    Talla {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. SELECT COLOR */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B7D6B]">
                Color
              </label>
              <select
                value={selectedColor}
                onChange={(e) => updateFilters("color", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border bg-[#FAF7F2] text-[#26302B] focus:outline-none focus:border-[#556B5D] cursor-pointer transition-all"
                style={{ borderColor: selectedColor ? "#556B5D" : "#E4DDD1" }}
              >
                <option value="">Todos los colores</option>
                {filterOptions.colores.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CUADRÍCULA DE PRODUCTOS & BUSCADOR PREDICTIVO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex-1">
        {/* Barra de Búsqueda Predictiva en Tiempo Real */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B7D6B]" />
          <input
            type="text"
            placeholder="Buscar por modelo, bordado o color (ej. Presidencial, Lino, Blanco, Azul)..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm font-semibold rounded-2xl border bg-white text-[#26302B] placeholder:text-[#8B7D6B]/60 shadow-2xs transition-all focus:outline-hidden focus:border-[#556B5D] focus:ring-2 focus:ring-[#556B5D]/20"
            style={{ borderColor: searchText ? "#556B5D" : "#E4DDD1" }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8B7D6B] hover:text-[#26302B] rounded-full hover:bg-[#FAF7F2] transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Encabezado del listado */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-[#8B7D6B]">
            {loading
              ? "Cargando..."
              : displayedProducts.length <= visibleCount
              ? `${displayedProducts.length} modelo${displayedProducts.length !== 1 ? "s" : ""} disponible${displayedProducts.length !== 1 ? "s" : ""}`
              : `Mostrando ${Math.min(visibleCount, displayedProducts.length)} de ${displayedProducts.length} modelos`}
          </p>

          {/* Resumen de Filtros Activos en forma de chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {searchText && (
                <span className="text-[10px] font-bold bg-[#FAF7F2] text-[#556B5D] px-2 py-0.5 rounded-md border border-[#556B5D]">
                  Búsqueda: &ldquo;{searchText}&rdquo;
                </span>
              )}
              {selectedModelo && (
                <span className="text-[10px] font-bold bg-[#EBF0EC] text-[#556B5D] px-2 py-0.5 rounded-md border border-[#A7D7B9]">
                  Modelo: {selectedModelo}
                </span>
              )}
              {selectedTalla && (
                <span className="text-[10px] font-bold bg-[#EBF0EC] text-[#556B5D] px-2 py-0.5 rounded-md border border-[#A7D7B9]">
                  Talla: {selectedTalla}
                </span>
              )}
              {selectedColor && (
                <span className="text-[10px] font-bold bg-[#EBF0EC] text-[#556B5D] px-2 py-0.5 rounded-md border border-[#A7D7B9]">
                  Color: {selectedColor}
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#8B7D6B]">
            <div className="w-10 h-10 border-4 border-[#C49A5A] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Cargando guayaberas...</p>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-[#E4DDD1] bg-white p-8">
            <Package className="w-12 h-12 mb-3 text-[#E4DDD1]" />
            <p className="text-base font-bold text-[#26302B]">No encontramos guayaberas con ese criterio</p>
            <p className="text-xs text-[#8B7D6B] mt-1 max-w-xs">
              {searchText
                ? `No hay modelos que coincidan con "${searchText}".`
                : "Prueba seleccionando otra combinación en los filtros desplegables."}
            </p>
            <button
              onClick={() => {
                setSearchText("");
                clearAllFilters();
              }}
              className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#556B5D] hover:bg-[#44564A] transition-colors cursor-pointer"
            >
              Ver todos los modelos
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {displayedProducts.slice(0, visibleCount).map((p) => {
                const isOutOfStock = p.totalStock <= 0;
                const isLowStock = p.totalStock > 0 && p.totalStock <= 3;
                const isCorta = (p.sleeveTypeName || "").toLowerCase().includes("corta");
                return (
                  <div
                    key={p.cardKey ?? p.productId}
                    onClick={() => setSelectedProductForModal(p)}
                    className="group cursor-pointer rounded-2xl overflow-hidden flex flex-col bg-white border border-[#E4DDD1] hover:border-[#556B5D] hover:shadow-lg transition-all"
                  >
                    {/* Fotografía — Ratio 3:4 con Lazy Loading */}
                    <div className="relative overflow-hidden aspect-3/4 bg-[#F5EFE3]">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#C49A5A]">
                          <Shirt className="w-14 h-14 stroke-1" />
                          <span className="text-[11px] text-[#8B7D6B]">Guayabera Fina</span>
                        </div>
                      )}

                      {/* Overlay con botón al hacer hover */}
                      <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-250 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                        <span className="text-white text-xs font-bold px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-xs border border-white/30 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          Ver Modelo
                        </span>
                      </div>

                      {/* Badge tipo de manga (Manga Corta / Manga Larga) — arriba izquierda */}
                      {p.sleeveTypeName && (
                        <div className="absolute top-2 left-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${
                              isCorta
                                ? "bg-[#3F7D58] text-white"
                                : "bg-[#26302B] text-white"
                            }`}
                          >
                            {p.sleeveTypeName}
                          </span>
                        </div>
                      )}

                      {/* Badge de Disponibilidad arriba-derecha */}
                      <div className="absolute top-2 right-2">
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#B85450] text-white shadow-xs">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C49A5A] text-white shadow-xs">
                            Pocas piezas
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#3F7D58] text-white shadow-xs">
                            Disponible
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contenido debajo de la foto */}
                    <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                      <h3 className="font-extrabold text-sm text-[#26302B] leading-snug group-hover:text-[#556B5D] transition-colors">
                        {p.name}
                      </h3>

                      {/* Chips de colores disponibles */}
                      {p.availableColors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.availableColors.slice(0, 3).map((col) => (
                            <span
                              key={col}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-[#EDE7DA] text-[#8B7D6B] font-medium"
                            >
                              {col}
                            </span>
                          ))}
                          {p.availableColors.length > 3 && (
                            <span className="text-[10px] font-bold text-[#C49A5A]">
                              +{p.availableColors.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Mangas y Tallas disponibles */}
                      <div className="flex flex-wrap items-center gap-1">
                        {p.availableSleeves && p.availableSleeves.length > 0 && (
                          p.availableSleeves.map((sl) => (
                            <span
                              key={sl}
                              className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#EBF0EC] text-[#556B5D] border border-[#A7D7B9]/60"
                            >
                              {sl}
                            </span>
                          ))
                        )}

                        {p.availableSizes.length > 0 && (
                          p.availableSizes.map((sz) => (
                            <span
                              key={sz}
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#E4DDD1] text-[#26302B] bg-[#F5EFE3]"
                            >
                              {sz}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Precio */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#EDE7DA]">
                        <div>
                          <span className="text-[10px] text-[#8B7D6B] block">Precio</span>
                          <p className="text-sm font-extrabold text-[#556B5D]">
                            ${p.minPrice.toFixed(2)}
                            <span className="text-[10px] font-normal text-[#8B7D6B] ml-0.5">MXN</span>
                          </p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#EDE7DA] text-[#556B5D] flex items-center justify-center">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón de Paginación Progresiva / Cargar Más */}
            {visibleCount < displayedProducts.length && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 py-4">
                <p className="text-xs text-[#8B7D6B] font-medium">
                  Mostrando <span className="font-bold text-[#26302B]">{Math.min(visibleCount, displayedProducts.length)}</span> de{" "}
                  <span className="font-bold text-[#26302B]">{displayedProducts.length}</span> modelos
                </p>

                {/* Barra de progreso visual elegante */}
                <div className="w-48 h-1.5 bg-[#EDE7DA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#556B5D] rounded-full transition-all duration-300"
                    style={{ width: `${(Math.min(visibleCount, displayedProducts.length) / displayedProducts.length) * 100}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 16)}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#556B5D] hover:bg-[#44564A] transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer flex items-center gap-2"
                  >
                    <span>Cargar más guayaberas (+{Math.min(16, displayedProducts.length - visibleCount)})</span>
                  </button>

                  {displayedProducts.length - visibleCount > 16 && (
                    <button
                      onClick={() => setVisibleCount(displayedProducts.length)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#556B5D] bg-[#EBF0EC] hover:bg-[#DFE8E1] border border-[#A7D7B9]/60 transition-all cursor-pointer"
                    >
                      Ver todas ({displayedProducts.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER ELEGANTE Y COMPACTO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="mt-12 bg-[#26302B] text-[#E7E3DA]">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          {/* Identidad */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              {tenantInfo?.logoUrl ? (
                <img src={tenantInfo.logoUrl} alt={tenantInfo.name} className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#323F38] text-[#C49A5A] flex items-center justify-center font-bold text-sm border border-[#C49A5A]/30">
                  {tenantInfo?.name?.slice(0, 1) || "G"}
                </div>
              )}
              <span className="font-extrabold text-sm text-white">{tenantInfo?.name || "Guayabera Manager"}</span>
            </div>
            <p className="text-[#8FA393] leading-relaxed">
              Confección artesanal yucateca. Guayaberas finas de calidad premium.
            </p>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-2 text-[#C49A5A]">Contacto</h4>
            <div className="space-y-1.5 text-[#8FA393]">
              {tenantInfo?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#C49A5A]" /> {tenantInfo.phone}
                </p>
              )}
              {tenantInfo?.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C49A5A]" /> {tenantInfo.address}
                </p>
              )}
            </div>
          </div>

          {/* Calidad */}
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-2 text-[#C49A5A]">Garantía de Calidad</h4>
            <p className="text-[#8FA393] leading-relaxed">
              Bordado artesanal a mano · Talla exacta · Envíos a todo México
            </p>
          </div>
        </div>

        <div className="border-t border-[#38463F] text-center text-[11px] text-[#6B7A71] py-3">
          © {new Date().getFullYear()} {tenantInfo?.name || "Guayabera Manager"} · Powered by <span className="text-[#C49A5A] font-semibold">Guayabera Manager</span>
        </div>
      </footer>

      {/* Modal de Detalle con botón Agregar a la lista */}
      <ProductDetailModal
        isOpen={!!selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        product={selectedProductForModal}
        tenantName={tenantInfo?.name}
        tenantWhatsapp={tenantInfo?.whatsapp || tenantInfo?.phone}
        onAddToCart={handleAddToCart}
      />

      {/* Drawer / Flotante de Carrito de Pedido Múltiple */}
      <PublicCartDrawer
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        tenantId={tenantInfo?.id}
        tenantName={tenantInfo?.name}
        tenantWhatsapp={tenantInfo?.whatsapp || tenantInfo?.phone}
      />
    </div>
  );
}

export default function PublicCatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="w-8 h-8 border-3 border-[#C49A5A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PublicCatalogContent slug={slug} />
    </Suspense>
  );
}
