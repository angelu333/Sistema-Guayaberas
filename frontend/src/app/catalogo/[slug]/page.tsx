"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Phone,
  MapPin,
  MessageCircle,
  Filter,
  X,
  Check,
  Package,
  Plus,
  Minus,
  Trash2,
  Share2,
  Eye,
  Shirt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  publicCatalogService,
  type PublicTenantInfo,
  type PublicFilterOptions,
  type PublicProductView,
} from "@/services/public-catalog.service";
import type { ProductVariant } from "@/types/domain.types";
import { ProductDetailModal } from "@/components/catalogo/ProductDetailModal";
import { Suspense } from "react";

interface CartOrderItem {
  variant: ProductVariant;
  quantity: number;
}

function PublicCatalogContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tenantInfo, setTenantInfo] = useState<PublicTenantInfo | null>(null);
  const [filterOptions, setFilterOptions] = useState<PublicFilterOptions>({
    modelos: [],
    colores: [],
    tallas: [],
  });

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<PublicProductView[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<PublicProductView | null>(null);
  const [loading, setLoading] = useState(true);

  // 3 Filtros Principales
  const selectedModelo = searchParams.get("modelo") || "";
  const selectedTalla = searchParams.get("talla") || "";
  const selectedColor = searchParams.get("color") || "";

  // Carrito de pedido público
  const [orderItems, setOrderItems] = useState<CartOrderItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const tenant = await publicCatalogService.getPublicTenantBySlug(slug);
    if (!tenant) {
      setLoading(false);
      return;
    }

    setTenantInfo(tenant);

    const [options, catalog] = await Promise.all([
      publicCatalogService.getPublicFilterOptions(tenant.id),
      publicCatalogService.getPublicCatalog(tenant.id, {
        modelo: selectedModelo || undefined,
        talla: selectedTalla || undefined,
        color: selectedColor || undefined,
      }),
    ]);

    setFilterOptions(options);
    setVariants(catalog);
    setGroupedProducts(publicCatalogService.groupProductsForCatalog(catalog));
    setLoading(false);
  }, [slug, selectedModelo, selectedTalla, selectedColor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actualizar parametros URL al cambiar filtros
  const updateFilters = (key: "modelo" | "talla" | "color", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.replace(pathname);
  };

  const totalOrderPieces = orderItems.reduce((acc, item) => acc + item.quantity, 0);

  // Copiar link filtrado
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!tenantInfo && !loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#EBF0EC] text-[#556B5D] flex items-center justify-center mb-4">
          <Shirt className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-[#26302B] font-[Outfit]">Empresa no encontrada</h1>
        <p className="text-xs text-[#6B7A71] max-w-sm mt-1">
          No existe ninguna tienda de guayaberas registrada con el enlace &ldquo;{slug}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      {/* ======= ENCABEZADO DE LA TIENDA PÚBLICA ======= */}
      <header className="bg-white border-b border-[#DDD9D0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {tenantInfo?.logoUrl ? (
              <img
                src={tenantInfo.logoUrl}
                alt={tenantInfo.name}
                className="w-10 h-10 object-contain rounded-xl border border-[#DDD9D0]"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#26302B] text-[#C49A5A] flex items-center justify-center font-bold font-[Outfit] text-lg shrink-0 border border-[#C49A5A]/30">
                G
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-[Outfit] font-extrabold text-base sm:text-lg text-[#26302B] tracking-tight truncate">
                {tenantInfo?.name || "Catálogo de Guayaberas"}
              </h1>
              <p className="text-xs text-[#6B7A71] flex items-center gap-2 truncate">
                {tenantInfo?.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#8FA393]" /> {tenantInfo.address}
                  </span>
                )}
                {tenantInfo?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#8FA393]" /> {tenantInfo.phone}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-2 border border-[#DDD9D0] text-[#6B7A71] hover:text-[#26302B] rounded-xl hover:bg-[#F8F6F1] transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Copiar enlace del catálogo"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copiedLink ? "¡Copiado!" : "Compartir"}</span>
            </button>

            {tenantInfo?.whatsapp && (
              <a
                href={`https://wa.me/${tenantInfo.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-[#3F7D58] hover:bg-[#326446] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp Directo</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ======= CONTENIDO Y FILTROS ======= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">


        {/* ======= BARRA DE 3 FILTROS PRINCIPALES (Modelo, Talla, Color) ======= */}
        <div className="p-4 bg-white border border-[#DDD9D0] rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DDD9D0] pb-2">
            <span className="text-xs font-bold text-[#6B7A71] uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#556B5D]" /> Filtros de Búsqueda
            </span>
            {(selectedModelo || selectedTalla || selectedColor) && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#B85450] hover:underline flex items-center gap-1 font-semibold"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. FILTRO POR MODELO */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                1. Modelo / Guayabera
              </label>
              <select
                value={selectedModelo}
                onChange={(e) => updateFilters("modelo", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl text-[#26302B] focus:outline-none focus:border-[#556B5D] font-medium"
              >
                <option value="">Todos los modelos</option>
                {filterOptions.modelos.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. FILTRO POR TALLA */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                2. Talla
              </label>
              <select
                value={selectedTalla}
                onChange={(e) => updateFilters("talla", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl text-[#26302B] focus:outline-none focus:border-[#556B5D] font-medium"
              >
                <option value="">Todas las tallas</option>
                {filterOptions.tallas.map((t) => (
                  <option key={t.id} value={t.name}>
                    Talla {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. FILTRO POR COLOR */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                3. Color
              </label>
              <select
                value={selectedColor}
                onChange={(e) => updateFilters("color", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl text-[#26302B] focus:outline-none focus:border-[#556B5D] font-medium"
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

        {/* ======= CUADRÍCULA VISUAL DE GUAYABERAS ======= */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#6B7A71] gap-2">
              <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Cargando catálogo visual...</p>
            </div>
          ) : groupedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-[#DDD9D0] p-8 gap-3">
              <Package className="w-12 h-12 text-[#DDD9D0]" />
              <p className="text-base font-bold text-[#26302B]">No se encontraron prendas con esos filtros</p>
              <p className="text-xs text-[#6B7A71] max-w-md">
                Prueba cambiando la combinación de Modelo, Talla o Color en los selectores superiores.
              </p>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Limpiar Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedProducts.map((p) => {
                const isOutOfStock = p.totalStock <= 0;
                const photoCount = p.images.length || (p.imageUrl ? 1 : 0);

                return (
                  <div
                    key={p.productId}
                    onClick={() => setSelectedProductForModal(p)}
                    className="bg-white border border-[#DDD9D0] rounded-3xl overflow-hidden flex flex-col justify-between hover:border-[#556B5D] hover:shadow-xl transition-all group cursor-pointer"
                  >
                    {/* Contenedor de Fotografía */}
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-[#F8F6F1]">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#8FA393] gap-1.5">
                          <Shirt className="w-12 h-12 stroke-1" />
                          <span className="text-[11px]">Foto disponible en tienda</span>
                        </div>
                      )}

                      {/* Badge Conteo de Fotos */}
                      {photoCount > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {photoCount} fotos
                        </span>
                      )}

                      {/* Badge Estado */}
                      <span className="absolute top-2.5 left-2.5">
                        <Badge variant={isOutOfStock ? "error" : "success"}>
                          {isOutOfStock ? "Agotado" : `${p.totalStock} en stock`}
                        </Badge>
                      </span>
                    </div>

                    {/* Contenido de la Tarjeta */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#556B5D]">
                          {p.categoryName}
                        </span>
                        <h3 className="text-base font-extrabold text-[#26302B] font-[Outfit] mt-0.5 group-hover:text-[#556B5D] transition-colors">
                          {p.name}
                        </h3>

                        {p.description && (
                          <p className="text-xs text-[#6B7A71] line-clamp-2 mt-1">
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* Miniaturas de Colores & Tallas */}
                      <div className="space-y-1.5 pt-2 border-t border-[#DDD9D0]/60">
                        {p.availableColors.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#6B7A71] font-semibold">Colores:</span>
                            <div className="flex flex-wrap gap-1">
                              {p.availableColors.slice(0, 3).map((col) => (
                                <span key={col} className="text-[10px] bg-[#F8F6F1] px-1.5 py-0.5 rounded-md border border-[#DDD9D0]">
                                  {col}
                                </span>
                              ))}
                              {p.availableColors.length > 3 && (
                                <span className="text-[10px] text-[#8FA393]">+{p.availableColors.length - 3} más</span>
                              )}
                            </div>
                          </div>
                        )}

                        {p.availableSizes.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#6B7A71] font-semibold">Tallas:</span>
                            <div className="flex flex-wrap gap-1">
                              {p.availableSizes.map((sz) => (
                                <span key={sz} className="text-[10px] font-bold bg-[#EBF0EC] text-[#556B5D] px-1.5 py-0.5 rounded-md">
                                  {sz}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Precio & Boton de Detalle */}
                      <div className="pt-3 border-t border-[#DDD9D0] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#6B7A71] block">Precio</span>
                          <span className="text-lg font-extrabold text-[#3F7D58] font-mono">
                            ${p.minPrice.toFixed(2)} <span className="text-[10px] font-normal text-[#6B7A71]">MXN</span>
                          </span>
                        </div>

                        <Button size="sm" className="bg-[#26302B] hover:bg-[#556B5D] text-xs font-bold rounded-xl">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Ver Detalle
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ======= MODAL DE DETALLE CON CARRUSEL DE FOTOS ======= */}
      <ProductDetailModal
        isOpen={!!selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        product={selectedProductForModal}
        tenantName={tenantInfo?.name}
        tenantWhatsapp={tenantInfo?.whatsapp}
      />
    </div>
  );
}

export default function PublicCatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PublicCatalogContent slug={slug} />
    </Suspense>
  );
}
