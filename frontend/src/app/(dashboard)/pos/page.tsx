"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  X,
  CheckCircle,
  User,
  Percent,
  Package,
  Printer,
  Shirt,
  Layers,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { salesService } from "@/services/sales.service";
import { clientsService } from "@/services/clients.service";
import type { ProductVariant, PaymentMethod, Client } from "@/types/domain.types";
import { createClient } from "@/lib/supabase/client";
import { POSVariantSelectModal, type GroupedPOSProduct } from "@/components/pos/POSVariantSelectModal";

const supabase = createClient();

type CheckoutStep = "cart" | "payment" | "success";

interface TicketData {
  ticketNumber: string;
  items: { sku: string; productName: string; colorName: string | null; sizeName: string | null; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  payments: { method: PaymentMethod; amount: number }[];
  change: number;
  createdAt: string;
}

export default function POSPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const cart = useCartStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastTicket, setLastTicket] = useState<TicketData | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Modal de Selección Rápida de Variantes (Color, Talla, Cantidad)
  const [selectedProductForModal, setSelectedProductForModal] = useState<GroupedPOSProduct | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const loadVariants = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingVariants(true);
    const { data, error } = await supabase
      .from("variantes_producto")
      .select(`
        id,
        sku,
        sale_price,
        cost_price,
        min_stock,
        is_active,
        productos(id, name, image_url, categorias(name)),
        colores(id, name, hex_code),
        tallas(id, name, sort_order),
        tipos_manga(id, name),
        existencias(quantity)
      `)
      .eq("tenant_id", effectiveTenantId)
      .eq("is_active", true);

    if (!error && data) {
      const mapped: ProductVariant[] = data.map((v: any) => {
        const totalStock = (v.existencias || []).reduce(
          (acc: number, ex: any) => acc + (ex.quantity || 0),
          0
        );
        return {
          id: v.id,
          tenantId: effectiveTenantId,
          productId: v.productos?.id || "",
          product: {
            id: v.productos?.id || "",
            tenantId: effectiveTenantId,
            name: v.productos?.name || "",
            description: null,
            categoryId: null,
            imageUrl: v.productos?.image_url || null,
            category: v.productos?.categorias
              ? { id: "", tenantId: effectiveTenantId, name: v.productos.categorias.name, isActive: true }
              : null,
            isActive: true,
            createdAt: "",
            updatedAt: "",
          },
          colorId: v.colores?.id || null,
          color: v.colores ? { id: v.colores.id, tenantId: effectiveTenantId, name: v.colores.name, hexCode: v.colores.hex_code, isActive: true } : null,
          sizeId: v.tallas?.id || null,
          size: v.tallas ? { id: v.tallas.id, tenantId: effectiveTenantId, name: v.tallas.name, sortOrder: v.tallas.sort_order, isActive: true } : null,
          sleeveTypeId: v.tipos_manga?.id || null,
          sleeveType: v.tipos_manga ? { id: v.tipos_manga.id, tenantId: effectiveTenantId, name: v.tipos_manga.name, isActive: true } : null,
          sku: v.sku,
          costPrice: Number(v.cost_price || 0),
          salePrice: Number(v.sale_price || 0),
          minStock: v.min_stock || 0,
          isActive: v.is_active,
          images: [],
          totalStock,
        };
      });
      setVariants(mapped);
    }
    setLoadingVariants(false);
  }, [effectiveTenantId]);

  const loadClients = useCallback(async () => {
    if (!effectiveTenantId) return;
    try {
      const data = await clientsService.getClients(effectiveTenantId);
      setClients(data);
    } catch (e) {
      console.error(e);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadVariants();
    loadClients();
  }, [loadVariants, loadClients]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Agrupar variantes por modelo base de guayabera para el POS
  const groupedProducts: GroupedPOSProduct[] = (() => {
    const map = new Map<string, GroupedPOSProduct>();

    variants.forEach((v) => {
      if (!v.product) return;
      const pId = v.productId;

      if (!map.has(pId)) {
        map.set(pId, {
          productId: pId,
          name: v.product.name,
          categoryName: v.product.category?.name || "Guayabera",
          imageUrl: v.product.imageUrl || null,
          minPrice: v.salePrice,
          maxPrice: v.salePrice,
          totalStock: 0,
          availableColors: [],
          variants: [],
        });
      }

      const entry = map.get(pId)!;
      entry.minPrice = Math.min(entry.minPrice, v.salePrice);
      entry.maxPrice = Math.max(entry.maxPrice, v.salePrice);
      entry.totalStock += v.totalStock || 0;

      if (v.color?.name && !entry.availableColors.some((c) => c.name === v.color?.name)) {
        entry.availableColors.push({
          name: v.color.name,
          hexCode: v.color.hexCode || null,
        });
      }

      entry.variants.push(v);
    });

    return Array.from(map.values());
  })();

  // Filtrar modelos por búsqueda
  const filteredProducts = groupedProducts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.color?.name.toLowerCase().includes(q))
    );
  });

  // Agregar al carrito desde el modal de variantes
  const handleAddToCartFromModal = (variant: ProductVariant, quantity: number) => {
    cart.addItem(variant, quantity);
  };

  // Manejo de totales calculados desde el store
  const subtotal = cart.subtotal();
  const discountAmount = cart.discountAmount();
  const total = cart.total();

  const handleStartCheckout = () => {
    if (cart.items.length === 0) return;
    setErrorMsg(null);
    setCashReceived(total.toString());
    setCheckoutStep("payment");
  };

  const handleProcessPayment = async () => {
    if (!effectiveTenantId) {
      setErrorMsg("No hay un negocio activo.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const parsedCash = parseFloat(cashReceived) || total;
      const change = selectedPaymentMethod === "cash" ? Math.max(0, parsedCash - total) : 0;

      const result = await salesService.completeSale({
        tenantId: effectiveTenantId,
        sellerId: session?.userId || "",
        clientId: cart.clientId,
        items: cart.items,
        globalDiscountPercent: cart.globalDiscountPercent,
        notes: cart.notes,
        payments: [
          {
            method: selectedPaymentMethod,
            amount: total,
          },
        ],
      });

      if (!result.success || !result.ticketNumber) {
        throw new Error(result.error || "Error al registrar la venta.");
      }

      setLastTicket({
        ticketNumber: result.ticketNumber,
        items: cart.items.map((i) => ({
          sku: i.variant.sku,
          productName: i.variant.product?.name || "Guayabera",
          colorName: i.variant.color?.name || null,
          sizeName: i.variant.size?.name || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        })),
        subtotal,
        discountAmount,
        total,
        payments: [
          {
            method: selectedPaymentMethod,
            amount: total,
          },
        ],
        change,
        createdAt: new Date().toISOString(),
      });

      cart.clearCart();
      setCheckoutStep("success");
      loadVariants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la venta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setCheckoutStep("cart");
    setLastTicket(null);
    searchRef.current?.focus();
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden bg-[#F8F6F1]">
      {/* ============================================================
          PANEL IZQUIERDO: CATÁLOGO AGRUPADO POR MODELO DE GUAYABERA
          ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#DDD9D0] bg-white">
        {/* Barra de búsqueda */}
        <div className="p-4 border-b border-[#DDD9D0] bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar modelo o escanear código SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Cuadrícula de Modelos de Guayabera (1 tarjeta por modelo) */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingVariants ? (
            <div className="flex items-center justify-center h-40 text-xs text-[#6B7A71]">
              Cargando modelos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#6B7A71] gap-2">
              <Package className="w-8 h-8 text-[#DDD9D0]" />
              <p className="text-xs">
                {searchQuery ? "Sin resultados para esa búsqueda" : "No hay modelos en el catálogo"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.totalStock <= 0;

                return (
                  <button
                    key={prod.productId}
                    onClick={() => setSelectedProductForModal(prod)}
                    className="relative text-left p-3 rounded-2xl border border-[#DDD9D0] bg-white hover:border-[#556B5D] hover:shadow-md active:scale-98 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* Miniatura de Foto de Portada */}
                      <div className="aspect-4/3 w-full rounded-xl overflow-hidden bg-[#F8F6F1] mb-2.5 flex items-center justify-center border border-[#DDD9D0] group-hover:scale-102 transition-transform">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#8FA393]">
                            <Shirt className="w-8 h-8 stroke-1" />
                          </div>
                        )}
                      </div>

                      {/* Stock Badge */}
                      <span className={`absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-md font-bold shadow-xs ${
                        isOutOfStock
                          ? "bg-[#FAEAEA] text-[#B85450]"
                          : "bg-[#EBF5F0] text-[#3F7D58] border border-[#A7D7B9]"
                      }`}>
                        {isOutOfStock ? "Agotado" : `${prod.totalStock} pzas`}
                      </span>

                      {/* Nombre y Categoría */}
                      <span className="text-[10px] font-bold text-[#556B5D] uppercase tracking-wider block">
                        {prod.categoryName}
                      </span>
                      <p className="text-sm font-extrabold text-[#26302B] font-[Outfit] truncate mt-0.5">
                        {prod.name}
                      </p>

                      {/* Colores disponibles */}
                      {prod.availableColors.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {prod.availableColors.map((c) => (
                            <span
                              key={c.name}
                              className="w-2.5 h-2.5 rounded-full border border-black/15 inline-block"
                              style={{ backgroundColor: c.hexCode || "#CCCCCC" }}
                              title={c.name}
                            />
                          ))}
                          <span className="text-[10px] text-[#8FA393] ml-0.5">
                            {prod.variants.length} variante{prod.variants.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Precio */}
                    <div className="mt-3 pt-2 border-t border-[#DDD9D0] flex items-center justify-between">
                      <span className="text-base font-extrabold font-mono text-[#3F7D58]">
                        ${prod.minPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-[#556B5D] bg-[#EBF0EC] px-2 py-0.5 rounded-md">
                        Elegir Talla ➔
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          PANEL DERECHO: CARRITO Y COBRO
          ============================================================ */}
      <div className="w-full lg:w-96 flex flex-col bg-[#F8F6F1] shrink-0">
        {/* Header Carrito */}
        <div className="p-4 border-b border-[#DDD9D0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#556B5D]" />
            <span className="font-bold text-sm text-[#26302B] font-[Outfit]">Venta en Mostrador</span>
          </div>

          {cart.items.length > 0 && (
            <button
              onClick={() => cart.clearCart()}
              className="text-xs text-[#B85450] hover:underline flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Selector de Cliente */}
        <div className="p-3 border-b border-[#DDD9D0] bg-white">
          <label className="block text-[10px] font-bold text-[#6B7A71] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#556B5D]" /> Cliente Asignado
            </span>
            {cart.clientName && (
              <span className="text-[10px] text-[#3F7D58] font-bold">✓ Vinculado</span>
            )}
          </label>
          <select
            value={cart.clientId || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                cart.setClient(null, null);
                cart.setGlobalDiscount(0);
              } else {
                const found = clients.find((c) => c.id === val);
                if (found) {
                  cart.setClient(found.id, found.fullName);
                  if (found.discountPercent > 0) {
                    cart.setGlobalDiscount(found.discountPercent);
                  }
                }
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
          >
            <option value="">Público General (Sin registrar)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} {c.company ? `(${c.company})` : ""} {c.discountPercent > 0 ? `— ${c.discountPercent}% Desc.` : ""}
              </option>
            ))}
          </select>
        </div>

        {checkoutStep === "cart" && (
          <>
            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#DDD9D0]">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#6B7A71] gap-3 py-12">
                  <ShoppingCart className="w-12 h-12 text-[#DDD9D0]" />
                  <p className="text-xs">El carrito está vacío</p>
                  <p className="text-[10px] text-[#9DAAA2]">Seleccione un modelo para elegir talla y color</p>
                </div>
              ) : (
                cart.items.map((item) => {
                  const lineTotal = item.unitPrice * item.quantity * (1 - (item.discountPercent || 0) / 100);

                  return (
                    <div key={item.variantId} className="p-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono text-[#556B5D]">{item.variant.sku}</p>
                          <p className="text-xs font-bold text-[#26302B] truncate">
                            {item.variant.product?.name}
                          </p>
                          <p className="text-[10px] text-[#6B7A71]">
                            {[item.variant.color?.name, item.variant.size?.name ? `Talla ${item.variant.size.name}` : null]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        </div>
                        <button
                          onClick={() => cart.removeItem(item.variantId)}
                          className="p-1 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Cantidad */}
                        <div className="flex items-center gap-1 bg-[#F8F6F1] p-0.5 rounded-lg border border-[#DDD9D0]">
                          <button
                            onClick={() => cart.updateQuantity(item.variantId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white text-[#26302B] shadow-xs text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-bold font-mono">{item.quantity}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.variantId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-[#556B5D] text-white shadow-xs text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal linea */}
                        <span className="text-xs font-bold font-mono text-[#26302B]">
                          ${lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totales y Botón Cobrar */}
            <div className="p-4 border-t border-[#DDD9D0] bg-white space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6B7A71]">
                  <span>Subtotal:</span>
                  <span className="font-mono">${subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#3F7D58] font-semibold">
                    <span>Descuento:</span>
                    <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-[#26302B] pt-2 border-t border-[#DDD9D0]">
                  <span>TOTAL:</span>
                  <span className="font-mono text-[#3F7D58] text-lg">${total.toFixed(2)} MXN</span>
                </div>
              </div>

              <Button
                className="w-full bg-[#3F7D58] hover:bg-[#326446] text-white font-bold py-3 text-sm rounded-xl shadow-md"
                disabled={cart.items.length === 0}
                onClick={handleStartCheckout}
              >
                Cobrar ${total.toFixed(2)}
              </Button>
            </div>
          </>
        )}

        {/* Pasos de Pago */}
        {checkoutStep === "payment" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#26302B]">Método de Pago</h3>
              <button
                onClick={() => setCheckoutStep("cart")}
                className="text-xs text-[#556B5D] hover:underline"
              >
                Volver al Carrito
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedPaymentMethod("cash")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                  selectedPaymentMethod === "cash"
                    ? "bg-[#556B5D] text-white border-[#556B5D] shadow-sm"
                    : "bg-[#F8F6F1] text-[#26302B] border-[#DDD9D0]"
                }`}
              >
                <Banknote className="w-5 h-5" />
                Efectivo
              </button>

              <button
                onClick={() => setSelectedPaymentMethod("card")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                  selectedPaymentMethod === "card"
                    ? "bg-[#556B5D] text-white border-[#556B5D] shadow-sm"
                    : "bg-[#F8F6F1] text-[#26302B] border-[#DDD9D0]"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Tarjeta
              </button>

              <button
                onClick={() => setSelectedPaymentMethod("transfer")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                  selectedPaymentMethod === "transfer"
                    ? "bg-[#556B5D] text-white border-[#556B5D] shadow-sm"
                    : "bg-[#F8F6F1] text-[#26302B] border-[#DDD9D0]"
                }`}
              >
                <ArrowRightLeft className="w-5 h-5" />
                Transf.
              </button>
            </div>

            {selectedPaymentMethod === "cash" && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-[#26302B]">Monto Recibido en Efectivo:</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold font-mono border border-[#DDD9D0] rounded-xl"
                  placeholder="0.00"
                />

                {parseFloat(cashReceived) >= total && (
                  <div className="p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-[#26302B]">Cambio / Vuelto:</span>
                    <span className="font-mono font-bold text-[#3F7D58] text-base">
                      ${(parseFloat(cashReceived) - total).toFixed(2)} MXN
                    </span>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450]">
                {errorMsg}
              </div>
            )}

            <Button
              className="w-full bg-[#3F7D58] hover:bg-[#326446] text-white font-bold py-3 text-sm rounded-xl mt-4"
              disabled={isSubmitting}
              onClick={handleProcessPayment}
            >
              {isSubmitting ? "Procesando Venta..." : `Confirmar Pago de $${total.toFixed(2)}`}
            </Button>
          </div>
        )}

        {/* Pantalla de Éxito y Ticket */}
        {checkoutStep === "success" && lastTicket && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF5F0] text-[#3F7D58] flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-[#26302B]">¡Venta Completada!</h3>
              <p className="text-xs text-[#6B7A71] mt-0.5">Ticket #{lastTicket.ticketNumber}</p>
            </div>

            <div className="w-full p-4 bg-[#F8F6F1] rounded-2xl border border-[#DDD9D0] space-y-2 text-xs text-left font-mono">
              <div className="flex justify-between font-bold text-sm text-[#26302B] border-b border-[#DDD9D0] pb-2">
                <span>TOTAL:</span>
                <span>${lastTicket.total.toFixed(2)}</span>
              </div>
              {lastTicket.change > 0 && (
                <div className="flex justify-between text-[#3F7D58] font-bold pt-1">
                  <span>Cambio Entregado:</span>
                  <span>${lastTicket.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="w-full space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full border-[#556B5D] text-[#556B5D] hover:bg-[#556B5D]/10"
                onClick={async () => {
                  if (!lastTicket) return;
                  setDownloadingPdf(true);
                  try {
                    const { downloadSaleReceiptPDF } = await import("@/lib/pdf/sale-receipt-pdf");
                    const clientObj = clients.find((c) => c.id === cart.clientId);
                    await downloadSaleReceiptPDF(
                      {
                        ticketNumber: lastTicket.ticketNumber,
                        createdAt: lastTicket.createdAt,
                        clientName: clientObj?.fullName || "Público General",
                        sellerName: session?.fullName || null,
                        locationName: tenant?.name || null,
                        subtotal: lastTicket.subtotal,
                        discountAmount: lastTicket.discountAmount,
                        total: lastTicket.total,
                        items: lastTicket.items,
                        payments: lastTicket.payments,
                        change: lastTicket.change,
                      },
                      {
                        name: tenant?.name,
                        phone: tenant?.phone,
                        email: tenant?.email,
                      }
                    );
                  } catch (err) {
                    console.error("Error al descargar ticket PDF:", err);
                    alert("Error al generar PDF del ticket.");
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1.5" />
                )}
                {downloadingPdf ? "Generando..." : "Descargar Recibo PDF"}
              </Button>

              <Button variant="outline" className="w-full" onClick={handlePrintTicket}>
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Ticket Térmico
              </Button>
              <Button className="w-full bg-[#556B5D] hover:bg-[#44564A]" onClick={handleNewSale}>
                Nueva Venta
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Selección Rápida de Variantes */}
      <POSVariantSelectModal
        isOpen={!!selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        product={selectedProductForModal}
        onAddToCart={handleAddToCartFromModal}
      />
    </div>
  );
}
