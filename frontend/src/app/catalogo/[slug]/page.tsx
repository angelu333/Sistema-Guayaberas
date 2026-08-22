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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  publicCatalogService,
  type PublicTenantInfo,
  type PublicFilterOptions,
} from "@/services/public-catalog.service";
import type { ProductVariant } from "@/types/domain.types";

interface CartOrderItem {
  variant: ProductVariant;
  quantity: number;
}

import { Suspense } from "react";

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
  const [loading, setLoading] = useState(true);

  // 3 Filtros Principales
  const selectedModelo = searchParams.get("modelo") || "";
  const selectedTalla = searchParams.get("talla") || "";
  const selectedColor = searchParams.get("color") || "";

  // Carrito de pedido publico
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

  // Carrito publico
  const addToOrder = (variant: ProductVariant) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id);
      if (existing) {
        return prev.map((i) =>
          i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { variant, quantity: 1 }];
    });
    setIsDrawerOpen(true);
  };

  const removeFromOrder = (variantId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(variantId);
      return;
    }
    setOrderItems((prev) =>
      prev.map((i) => (i.variant.id === variantId ? { ...i, quantity } : i))
    );
  };

  const totalOrderAmount = orderItems.reduce(
    (acc, item) => acc + item.variant.salePrice * item.quantity,
    0
  );

  const totalOrderPieces = orderItems.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  // Enviar pedido por WhatsApp
  const handleSendWhatsAppOrder = () => {
    if (!tenantInfo || orderItems.length === 0) return;

    let phone = tenantInfo.whatsapp || tenantInfo.phone || "";
    phone = phone.replace(/\D/g, ""); // limpiar caracteres no numericos

    let msg = `Hola *${tenantInfo.name}*, me interesa solicitar el siguiente pedido desde su catálogo web:\n\n`;
    orderItems.forEach((item, i) => {
      const v = item.variant;
      const details = [v.color?.name, v.size?.name, v.sleeveType?.name]
        .filter(Boolean)
        .join(" / ");
      msg += `${i + 1}. *${v.product?.name}* (${details})\n   ${item.quantity} pza(s) x $${v.salePrice.toFixed(2)} = *$${(item.quantity * v.salePrice).toFixed(2)}*\n`;
    });

    msg += `\n💰 *Total Estimado: $${totalOrderAmount.toFixed(2)} MXN* (${totalOrderPieces} prendas)\n`;
    msg += `\n¿Me confirman la disponibilidad para acordar la entrega? Muchas gracias.`;

    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!loading && !tenantInfo) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-16 h-16 text-[#DDD9D0] mb-3" />
        <h1 className="text-xl font-bold text-[#26302B]">Catálogo No Encontrado</h1>
        <p className="text-xs text-[#6B7A71] mt-1 max-w-sm">
          La tienda solicitada no existe o no tiene un catálogo público activo en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col text-[#26302B]">
      {/* ======= HEADER DE LA TIENDA ======= */}
      <header className="bg-white border-b border-[#DDD9D0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#556B5D] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {tenantInfo?.name.charAt(0).toUpperCase() || "G"}
            </div>
            <div>
              <h1 className="text-base font-bold text-[#26302B] leading-tight">
                {tenantInfo?.name || "Cargando..."}
              </h1>
              <p className="text-xs text-[#6B7A71] flex items-center gap-2">
                {tenantInfo?.address && (
                  <span className="hidden sm:inline-flex items-center gap-1">
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
                className="px-3 py-2 bg-[#3F7D58] hover:bg-[#326446] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Contactar WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ======= CONTENIDO Y FILTROS ======= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Informativo */}
        <div className="p-4 bg-[#26302B] text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Catálogo Digital de Guayaberas</h2>
            <p className="text-xs text-[#8FA393] mt-0.5">
              Filtra por Modelo, Talla o Color y envía tu pedido directamente a WhatsApp
            </p>
          </div>
          {orderItems.length > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-[#C49A5A] text-[#26302B] font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-[#d6aa68] transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Ver Mi Pedido ({totalOrderPieces} pzas)
            </button>
          )}
        </div>

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
                1. Modelo / Producto
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

        {/* ======= GALERÍA DE PRODUCTOS ======= */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#6B7A71] gap-2">
              <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Buscando guayaberas disponibles...</p>
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[#DDD9D0] p-6 gap-3">
              <Package className="w-12 h-12 text-[#DDD9D0]" />
              <p className="text-base font-bold text-[#26302B]">No se encontraron prendas con esos filtros</p>
              <p className="text-xs text-[#6B7A71] max-w-md">
                Intenta cambiando la combinación de Modelo, Talla o Color en la barra de filtros superior.
              </p>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Limpiar Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {variants.map((v) => {
                const isOutOfStock = (v.totalStock ?? 0) === 0;
                const inOrder = orderItems.find((i) => i.variant.id === v.id);

                return (
                  <div
                    key={v.id}
                    className="bg-white border border-[#DDD9D0] rounded-2xl p-4 flex flex-col justify-between hover:border-[#556B5D] hover:shadow-md transition-all relative group"
                  >
                    <div>
                      {/* Color dot y SKU */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {v.color?.hexCode && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                              style={{ backgroundColor: v.color.hexCode }}
                            />
                          )}
                          <span className="text-xs font-mono text-[#556B5D] font-bold">
                            {v.sku}
                          </span>
                        </div>
                        <Badge variant={isOutOfStock ? "error" : (v.totalStock ?? 0) <= v.minStock ? "warning" : "success"}>
                          {isOutOfStock ? "Agotado" : `${v.totalStock} pzas`}
                        </Badge>
                      </div>

                      {/* Nombre y Detalles */}
                      <h3 className="text-base font-bold text-[#26302B]">
                        {v.product?.name}
                      </h3>
                      <p className="text-xs text-[#6B7A71] mt-0.5">
                        {[v.color?.name, v.size?.name ? `Talla ${v.size.name}` : null, v.sleeveType?.name]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>

                      {v.product?.description && (
                        <p className="text-xs text-[#9DAAA2] mt-2 line-clamp-2">
                          {v.product.description}
                        </p>
                      )}
                    </div>

                    {/* Precio y Boton de Agregar */}
                    <div className="mt-4 pt-3 border-t border-[#DDD9D0] flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#6B7A71] block">Precio</span>
                        <span className="text-lg font-bold text-[#26302B]">
                          ${v.salePrice.toFixed(2)} <span className="text-xs font-normal text-[#6B7A71]">MXN</span>
                        </span>
                      </div>

                      {isOutOfStock ? (
                        <Button variant="outline" size="sm" disabled>
                          Agotado
                        </Button>
                      ) : inOrder ? (
                        <div className="flex items-center gap-1 bg-[#EBF5F0] p-1 rounded-xl border border-[#3F7D58]">
                          <button
                            onClick={() => updateQuantity(v.id, inOrder.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-[#26302B] hover:bg-[#F8F6F1]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{inOrder.quantity}</span>
                          <button
                            onClick={() => updateQuantity(v.id, inOrder.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-[#26302B] hover:bg-[#F8F6F1]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => addToOrder(v)}>
                          <Plus className="w-3.5 h-3.5" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ======= DRAWER DE PEDIDO POR WHATSAPP ======= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            {/* Header Drawer */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDD9D0] bg-[#F8F6F1]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#556B5D]" />
                <span className="font-bold text-[#26302B]">Mi Pedido ({totalOrderPieces} pzas)</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#DDD9D0]">
              {orderItems.length === 0 ? (
                <div className="text-center py-12 text-[#6B7A71] text-xs">
                  Aún no has agregado prendas a tu pedido.
                </div>
              ) : (
                orderItems.map((item) => (
                  <div key={item.variant.id} className="py-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-[#556B5D]">{item.variant.sku}</p>
                      <p className="text-sm font-bold text-[#26302B]">{item.variant.product?.name}</p>
                      <p className="text-xs text-[#6B7A71]">
                        {[item.variant.color?.name, item.variant.size?.name ? `Talla ${item.variant.size.name}` : null]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                      <p className="text-sm font-bold text-[#3F7D58] mt-1">
                        ${(item.variant.salePrice * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-[#DDD9D0] text-[#26302B]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-[#DDD9D0] text-[#26302B]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Drawer */}
            {orderItems.length > 0 && (
              <div className="p-4 border-t border-[#DDD9D0] bg-[#F8F6F1] space-y-3">
                <div className="flex justify-between items-center text-base font-bold text-[#26302B]">
                  <span>Total Estimado</span>
                  <span>${totalOrderAmount.toFixed(2)} MXN</span>
                </div>

                <Button
                  className="w-full bg-[#3F7D58] hover:bg-[#326446] text-white py-3 text-sm font-bold"
                  onClick={handleSendWhatsAppOrder}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enviar Pedido por WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
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
        <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center text-[#6B7A71]">
          <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold">Cargando catálogo digital...</p>
        </div>
      }
    >
      <PublicCatalogContent slug={slug} />
    </Suspense>
  );
}

