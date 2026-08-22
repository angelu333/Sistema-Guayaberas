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
  const searchRef = useRef<HTMLInputElement>(null);

  const loadClients = useCallback(async () => {
    if (!effectiveTenantId) return;
    const clientList = await clientsService.getClients(effectiveTenantId);
    setClients(clientList);
  }, [effectiveTenantId]);

  const loadVariants = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingVariants(true);
    const { data, error } = await supabase
      .from("variantes_producto")
      .select(`
        id, sku, sale_price, cost_price, min_stock, is_active,
        productos!inner(id, name, categorias(name)),
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

  useEffect(() => {
    loadVariants();
    loadClients();
  }, [loadVariants, loadClients]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filteredVariants = variants.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.sku.toLowerCase().includes(q) ||
      (v.product?.name || "").toLowerCase().includes(q) ||
      (v.color?.name || "").toLowerCase().includes(q) ||
      (v.size?.name || "").toLowerCase().includes(q)
    );
  });

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = selectedPaymentMethod === "cash"
    ? Math.max(0, cashReceivedNum - cart.total())
    : 0;

  const handleCompleteSale = async () => {
    if (!tenant?.id || !session?.userId) return;
    if (cart.items.length === 0) {
      setErrorMsg("El carrito está vacío.");
      return;
    }

    const payments: { method: PaymentMethod; amount: number }[] = [
      { method: selectedPaymentMethod, amount: cart.total() },
    ];

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await salesService.completeSale({
      tenantId: tenant.id,
      sellerId: session.userId,
      items: cart.items,
      payments,
      clientId: cart.clientId,
      globalDiscountPercent: cart.globalDiscountPercent,
      notes: cart.notes,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || "Error al registrar la venta.");
      return;
    }

    // Preparar datos de ticket
    setLastTicket({
      ticketNumber: result.ticketNumber!,
      items: cart.items.map((item) => ({
        sku: item.variant.sku,
        productName: item.variant.product?.name || "Producto",
        colorName: item.variant.color?.name || null,
        sizeName: item.variant.size?.name || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal:
          item.unitPrice * item.quantity * (1 - item.discountPercent / 100),
      })),
      subtotal: cart.subtotal(),
      discountAmount: cart.discountAmount(),
      total: cart.total(),
      payments,
      change,
      createdAt: new Date().toLocaleString("es-MX"),
    });

    cart.clearCart();
    setCheckoutStep("success");
    loadVariants(); // refrescar stock
  };

  const handleNewSale = () => {
    setCheckoutStep("cart");
    setSelectedPaymentMethod("cash");
    setCashReceived("");
    setLastTicket(null);
    setErrorMsg(null);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const methodLabel = (m: PaymentMethod) =>
    m === "cash" ? "Efectivo" : m === "card" ? "Tarjeta" : "Transferencia";

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 -mx-6 -mt-4 overflow-hidden">

      {/* ======= LADO IZQUIERDO: CATALOGO ======= */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#F8F6F1] border-r border-[#DDD9D0]">

        {/* Buscador */}
        <div className="p-4 border-b border-[#DDD9D0] bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por SKU, modelo, color o talla..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingVariants ? (
            <div className="flex items-center justify-center h-40 text-[#6B7A71]">
              Cargando catálogo...
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#6B7A71] gap-2">
              <Package className="w-8 h-8 text-[#DDD9D0]" />
              <p className="text-sm">
                {searchQuery ? "Sin resultados para esa búsqueda" : "No hay productos en el catálogo"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredVariants.map((variant) => {
                const isOutOfStock = (variant.totalStock ?? 0) === 0;
                const inCart = cart.items.find((i) => i.variantId === variant.id);
                return (
                  <button
                    key={variant.id}
                    onClick={() => !isOutOfStock && cart.addItem(variant)}
                    disabled={isOutOfStock}
                    className={`relative text-left p-3 rounded-xl border transition-all group ${
                      isOutOfStock
                        ? "bg-white border-[#DDD9D0] opacity-50 cursor-not-allowed"
                        : inCart
                        ? "bg-[#EBF5F0] border-[#3F7D58] shadow-sm"
                        : "bg-white border-[#DDD9D0] hover:border-[#556B5D] hover:shadow-sm active:scale-95"
                    }`}
                  >
                    {/* Color dot */}
                    {variant.color?.hexCode && (
                      <span
                        className="inline-block w-3 h-3 rounded-full mb-1.5 border border-black/10"
                        style={{ backgroundColor: variant.color.hexCode }}
                      />
                    )}

                    <p className="text-xs font-mono text-[#556B5D] truncate">{variant.sku}</p>
                    <p className="text-sm font-semibold text-[#26302B] truncate mt-0.5">
                      {variant.product?.name}
                    </p>
                    <p className="text-xs text-[#6B7A71] truncate">
                      {[variant.color?.name, variant.size?.name].filter(Boolean).join(" / ")}
                    </p>
                    <p className="text-base font-bold text-[#26302B] mt-2">
                      ${variant.salePrice.toFixed(2)}
                    </p>

                    {/* Stock badge */}
                    <span className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-semibold ${
                      isOutOfStock
                        ? "bg-[#FAEAEA] text-[#B85450]"
                        : (variant.totalStock ?? 0) <= variant.minStock
                        ? "bg-[#FDF5E4] text-[#D89B2B]"
                        : "bg-[#EBF5F0] text-[#3F7D58]"
                    }`}>
                      {isOutOfStock ? "Agotado" : `${variant.totalStock ?? 0}`}
                    </span>

                    {/* In cart indicator */}
                    {inCart && (
                      <span className="absolute bottom-2 right-2 text-xs font-bold text-[#3F7D58]">
                        x{inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======= LADO DERECHO: CARRITO ======= */}
      <div className="flex flex-col w-[380px] shrink-0 bg-white">

        {/* Header carrito */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#556B5D]" />
            <span className="font-semibold text-[#26302B]">Carrito</span>
            {cart.itemCount() > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-[#556B5D] text-white rounded-full">
                {cart.itemCount()}
              </span>
            )}
          </div>
          {cart.items.length > 0 && (
            <button
              onClick={cart.clearCart}
              className="text-xs text-[#B85450] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Selector de Cliente */}
        <div className="p-3 border-b border-[#DDD9D0] bg-white">
          <label className="block text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider mb-1 flex items-center justify-between">
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
            className="w-full px-2.5 py-1.5 text-xs border border-[#DDD9D0] rounded-lg bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
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
                  <p className="text-sm">El carrito está vacío</p>
                  <p className="text-xs text-[#9DAAA2]">Haz clic en un producto para agregarlo</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.variantId} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-[#556B5D]">{item.variant.sku}</p>
                        <p className="text-sm font-semibold text-[#26302B] truncate">
                          {item.variant.product?.name}
                        </p>
                        <p className="text-xs text-[#6B7A71]">
                          {[item.variant.color?.name, item.variant.size?.name]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </div>
                      <button
                        onClick={() => cart.removeItem(item.variantId)}
                        className="p-1 text-[#B85450] hover:bg-[#FAEAEA] rounded transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Cantidad */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cart.updateQuantity(item.variantId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-[#DDD9D0] text-[#26302B] hover:bg-[#F8F6F1] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => cart.updateQuantity(item.variantId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-[#DDD9D0] text-[#26302B] hover:bg-[#F8F6F1] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Precio y descuento */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#26302B]">
                          ${(item.unitPrice * item.quantity * (1 - item.discountPercent / 100)).toFixed(2)}
                        </p>
                        <p className="text-xs text-[#9DAAA2]">
                          ${item.unitPrice.toFixed(2)} c/u
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Descuento global */}
            {cart.items.length > 0 && (
              <div className="px-3 py-2 border-t border-[#DDD9D0] flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#6B7A71] shrink-0" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Descuento global %"
                  value={cart.globalDiscountPercent || ""}
                  onChange={(e) => cart.setGlobalDiscount(Number(e.target.value))}
                  className="flex-1 text-sm px-2 py-1.5 border border-[#DDD9D0] rounded-lg focus:outline-none focus:border-[#556B5D]"
                />
              </div>
            )}

            {/* Totales */}
            {cart.items.length > 0 && (
              <div className="p-3 border-t border-[#DDD9D0] bg-[#F8F6F1] space-y-1.5">
                <div className="flex justify-between text-sm text-[#6B7A71]">
                  <span>Subtotal</span>
                  <span>${cart.subtotal().toFixed(2)}</span>
                </div>
                {cart.discountAmount() > 0 && (
                  <div className="flex justify-between text-sm text-[#B85450]">
                    <span>Descuento</span>
                    <span>-${cart.discountAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-[#26302B] pt-1 border-t border-[#DDD9D0]">
                  <span>Total</span>
                  <span>${cart.total().toFixed(2)}</span>
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => setCheckoutStep("payment")}
                  disabled={cart.items.length === 0}
                >
                  Continuar al Cobro
                </Button>
              </div>
            )}
          </>
        )}

        {checkoutStep === "payment" && (
          <div className="flex flex-col flex-1">
            {/* Resumen de total */}
            <div className="p-4 bg-[#26302B] text-white">
              <p className="text-xs text-[#8FA393]">Total a cobrar</p>
              <p className="text-3xl font-bold mt-0.5">${cart.total().toFixed(2)}</p>
              <p className="text-xs text-[#8FA393] mt-1">{cart.itemCount()} artículos</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Metodo de pago */}
              <div>
                <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
                  Metodo de Pago
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "card", "transfer"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                        selectedPaymentMethod === method
                          ? "bg-[#26302B] border-[#26302B] text-white shadow-sm"
                          : "bg-white border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
                      }`}
                    >
                      {method === "cash" ? (
                        <Banknote className="w-5 h-5" />
                      ) : method === "card" ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <ArrowRightLeft className="w-5 h-5" />
                      )}
                      {methodLabel(method)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Efectivo recibido */}
              {selectedPaymentMethod === "cash" && (
                <div>
                  <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
                    Efectivo Recibido
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-4 py-3 text-xl font-bold border border-[#DDD9D0] rounded-xl focus:outline-none focus:border-[#556B5D] text-center"
                  />
                  {cashReceivedNum >= cart.total() && (
                    <div className="mt-2 p-3 bg-[#EBF5F0] rounded-xl flex justify-between items-center">
                      <span className="text-sm text-[#3F7D58] font-semibold">Cambio a entregar</span>
                      <span className="text-xl font-bold text-[#3F7D58]">
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="p-3 bg-[#FAEAEA] text-[#B85450] text-sm rounded-xl border border-[#B85450]/20">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="p-3 border-t border-[#DDD9D0] space-y-2">
              <Button
                className="w-full"
                onClick={handleCompleteSale}
                loading={isSubmitting}
                disabled={
                  isSubmitting ||
                  (selectedPaymentMethod === "cash" && cashReceivedNum < cart.total() && cashReceivedNum > 0)
                }
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Venta
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCheckoutStep("cart")}
                disabled={isSubmitting}
              >
                Volver al Carrito
              </Button>
            </div>
          </div>
        )}

        {checkoutStep === "success" && lastTicket && (
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Encabezado exito */}
            <div className="p-6 bg-[#EBF5F0] flex flex-col items-center text-center border-b border-[#DDD9D0]">
              <CheckCircle className="w-12 h-12 text-[#3F7D58] mb-2" />
              <p className="text-lg font-bold text-[#26302B]">Venta Registrada</p>
              <p className="text-sm text-[#6B7A71] mt-1">
                Ticket <span className="font-mono font-bold text-[#556B5D]">{lastTicket.ticketNumber}</span>
              </p>
            </div>

            {/* Ticket de venta */}
            <div className="flex-1 p-4 space-y-3">
              <div className="text-xs text-[#6B7A71] text-center">{lastTicket.createdAt}</div>

              <div className="border border-[#DDD9D0] rounded-xl overflow-hidden">
                {lastTicket.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2 border-b border-[#DDD9D0] last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#26302B] truncate">{item.productName}</p>
                      <p className="text-xs text-[#9DAAA2]">
                        {[item.colorName, item.sizeName].filter(Boolean).join(" / ")} x{item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#26302B] shrink-0 ml-2">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-[#6B7A71]">
                  <span>Subtotal</span><span>${lastTicket.subtotal.toFixed(2)}</span>
                </div>
                {lastTicket.discountAmount > 0 && (
                  <div className="flex justify-between text-[#B85450]">
                    <span>Descuento</span><span>-${lastTicket.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-[#26302B] pt-1 border-t border-[#DDD9D0]">
                  <span>Total</span><span>${lastTicket.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6B7A71]">
                  <span>Pago ({methodLabel(lastTicket.payments[0]?.method)})</span>
                  <span>${lastTicket.payments[0]?.amount.toFixed(2)}</span>
                </div>
                {lastTicket.change > 0 && (
                  <div className="flex justify-between text-[#3F7D58] font-semibold">
                    <span>Cambio</span><span>${lastTicket.change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-[#DDD9D0] space-y-2">
              <Button variant="outline" className="w-full" onClick={handlePrintTicket}>
                <Printer className="w-4 h-4" />
                Imprimir Ticket
              </Button>
              <Button className="w-full" onClick={handleNewSale}>
                <Plus className="w-4 h-4" />
                Nueva Venta
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
