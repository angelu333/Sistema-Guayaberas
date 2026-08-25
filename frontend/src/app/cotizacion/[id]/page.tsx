"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Printer,
  Share2,
  CheckCircle,
  Plus,
  Minus,
  Percent,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { quotesService, type QuoteRecord, type WholesaleTier } from "@/services/quotes.service";

export default function PublicClientQuotePage() {
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [tiers, setTiers] = useState<WholesaleTier[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!quoteId) return;

    async function loadQuoteData() {
      setLoading(true);
      const q = await quotesService.getQuoteById(quoteId);
      setQuote(q);

      if (q) {
        const initialQty: Record<string, number> = {};
        q.details.forEach((d) => {
          initialQty[d.variantId] = d.quantity;
        });
        setQuantities(initialQty);

        const tList = await quotesService.getWholesaleTiers(q.tenantId);
        setTiers(tList);
      }
      setLoading(false);
    }

    loadQuoteData();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-10 h-10 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#6B7A71] font-[Outfit]">
          Cargando tu cotización personalizada...
        </p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center gap-4 p-4 text-center">
        <FileText className="w-12 h-12 text-[#8FA393]" />
        <h1 className="text-lg font-bold text-[#26302B]">Cotización no encontrada</h1>
        <p className="text-xs text-[#6B7A71] max-w-sm">
          El enlace de la cotización es inválido o ha caducado. Por favor solicita una nueva a tu asesor.
        </p>
      </div>
    );
  }

  // Ajustar cantidad de una variante
  const handleQuantityChange = async (variantId: string, newQty: number) => {
    const safeQty = Math.max(1, newQty);
    const updated = { ...quantities, [variantId]: safeQty };
    setQuantities(updated);

    setUpdating(true);
    const updatedItems = Object.entries(updated).map(([vId, q]) => ({
      variantId: vId,
      quantity: q,
    }));

    await quotesService.updateQuoteQuantities(quote.id, updatedItems, tiers);
    const refreshed = await quotesService.getQuoteById(quote.id);
    if (refreshed) setQuote(refreshed);
    setUpdating(false);
  };

  const totalPieces = Object.values(quantities).reduce((acc, q) => acc + q, 0);
  const activeDiscountPercent = quotesService.calculateTierDiscount(totalPieces, tiers);

  // Mensaje inteligente de upsell
  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const nextTier = sortedTiers.find((t) => t.minQuantity > totalPieces);
  const piecesNeededForNextTier = nextTier ? nextTier.minQuantity - totalPieces : 0;

  // Enviar a WhatsApp
  const handleConfirmWhatsApp = () => {
    const tenantPhone = quote.tenantInfo?.phone || "529991234567";
    const text = `¡Hola! Confirmo mi cotización #${quote.quoteNumber} para ${quote.clientName}. Total: ${quote.totalPieces} guayaberas por $${quote.totalAmount.toFixed(
      2
    )} MXN. ¿Cuáles son los pasos para realizar el pedido?`;
    window.open(`https://wa.me/${tenantPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const validUntilDate = new Date(
    new Date(quote.createdAt).getTime() + quote.validDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString("es-MX");

  return (
    <div className="min-h-screen bg-[#F8F6F1] py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Banner Superior Interactivo */}
        <div className="bg-[#26302B] text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C49A5A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8FA393]">
                Cotizador Interactivo
              </span>
            </div>
            <h1 className="text-lg font-bold font-[Outfit] text-white">
              Cotización Personalizada para {quote.clientName}
            </h1>
            <p className="text-xs text-[#D0C9BD]">
              Puedes ajustar las cantidades abajo y verás cómo baja tu costo por pieza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimir / PDF
            </Button>

            <Button
              size="sm"
              onClick={handleConfirmWhatsApp}
              className="bg-[#3F7D58] hover:bg-[#326446] text-white text-xs font-bold"
            >
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              Confirmar por WhatsApp
            </Button>
          </div>
        </div>

        {/* Mensaje de Descuento por Volumen en Tiempo Real */}
        {nextTier && piecesNeededForNextTier > 0 && (
          <div className="p-4 bg-[#FBF4E8] border border-[#E6D4B6] rounded-2xl flex items-center gap-3 animate-fade-in print:hidden">
            <Percent className="w-6 h-6 text-[#C49A5A] shrink-0" />
            <div>
              <span className="font-bold text-[#26302B] text-xs block">
                ¡Estás a solo {piecesNeededForNextTier} guayabera{piecesNeededForNextTier > 1 ? "s" : ""} de desbloquear mayor descuento!
              </span>
              <span className="text-[11px] text-[#6B7A71]">
                Suma {piecesNeededForNextTier} pieza{piecesNeededForNextTier > 1 ? "s" : ""} más para alcanzar el nivel <strong>{nextTier.name}</strong> con <strong>{nextTier.discountPercent}% OFF</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Documento Imprimible de Cotización */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#DDD9D0] p-8 space-y-6 print:shadow-none print:border-none print:p-0">
          {/* Header de Empresa */}
          <div className="flex justify-between items-start border-b border-[#DDD9D0] pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#556B5D] text-white flex items-center justify-center font-bold font-[Outfit] text-2xl shadow-md">
                G
              </div>
              <div>
                <h2 className="font-[Outfit] text-xl font-bold text-[#26302B] tracking-tight">
                  {quote.tenantInfo?.name || "Guayabera Manager"}
                </h2>
                <p className="text-xs text-[#6B7A71]">Confección & Mayoreo de Guayaberas Finas</p>
                {quote.tenantInfo?.phone && (
                  <p className="text-xs text-[#6B7A71]">Teléfono: {quote.tenantInfo.phone}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-[#EBF0EC] text-[#556B5D] font-mono font-bold text-sm rounded-lg border border-[#A7D7B9]">
                {quote.quoteNumber}
              </span>
              <p className="text-xs text-[#6B7A71] mt-2">
                Fecha: <strong>{new Date(quote.createdAt).toLocaleDateString("es-MX")}</strong>
              </p>
              <p className="text-xs text-[#6B7A71]">
                Vigencia: <strong>{validUntilDate}</strong>
              </p>
            </div>
          </div>

          {/* Resumen del Cliente */}
          <div className="p-4 bg-[#F8F6F1] rounded-2xl border border-[#DDD9D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A71]">
                Cotización para:
              </span>
              <p className="text-sm font-bold text-[#26302B]">{quote.clientName}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A71]">
                Descuento Aplicado:
              </span>
              <p className="text-sm font-bold text-[#3F7D58]">
                {activeDiscountPercent}% OFF ({totalPieces} guayaberas)
              </p>
            </div>
          </div>

          {/* Tabla de Modelos y Ajuste de Cantidades */}
          <div className="space-y-3">
            <span className="font-bold text-[#6B7A71] text-xs uppercase tracking-wider block">
              Modelos incluidos en tu cotización:
            </span>

            <div className="space-y-3">
              {quote.details.map((d) => {
                const currentQty = quantities[d.variantId] || d.quantity;
                return (
                  <div
                    key={d.id}
                    className="p-4 bg-[#F8F6F1] rounded-2xl border border-[#DDD9D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-[#26302B] text-sm">{d.productName}</h3>
                      <p className="text-xs text-[#6B7A71]">
                        {d.colorName || ""} {d.sizeName ? `(Talla ${d.sizeName})` : ""}
                      </p>
                      <p className="text-xs text-[#8FA393] font-mono">SKU: {d.sku}</p>
                    </div>

                    {/* Controles + / - (Ocultos al imprimir) */}
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-[#DDD9D0] print:hidden">
                      <button
                        onClick={() => handleQuantityChange(d.variantId, currentQty - 1)}
                        className="w-8 h-8 rounded-lg bg-[#F8F6F1] hover:bg-[#E7E3DA] text-[#26302B] flex items-center justify-center transition-colors"
                        disabled={updating}
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="font-bold font-mono text-sm min-w-[28px] text-center">
                        {currentQty}
                      </span>

                      <button
                        onClick={() => handleQuantityChange(d.variantId, currentQty + 1)}
                        className="w-8 h-8 rounded-lg bg-[#556B5D] hover:bg-[#44564A] text-white flex items-center justify-center transition-colors"
                        disabled={updating}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mostrar solo cantidad al imprimir */}
                    <div className="hidden print:block text-center font-bold text-xs">
                      {currentQty} pzas
                    </div>

                    <div className="text-right min-w-[120px]">
                      <span className="text-[10px] text-[#8FA393] line-through block font-mono">
                        ${(currentQty * d.unitPrice).toFixed(2)}
                      </span>
                      <span className="text-sm font-bold font-mono text-[#3F7D58]">
                        ${(currentQty * d.finalUnitPrice).toFixed(2)} MXN
                      </span>
                      <span className="text-[10px] text-[#6B7A71] block">
                        (${d.finalUnitPrice.toFixed(2)} c/u)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose de Totales */}
          <div className="flex justify-end pt-4 border-t border-[#DDD9D0]">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B7A71]">
                <span>Subtotal Regular:</span>
                <span className="font-mono">${quote.subtotal.toFixed(2)}</span>
              </div>

              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-[#3F7D58] font-bold">
                  <span>Ahorro por Mayoreo ({activeDiscountPercent}%):</span>
                  <span className="font-mono">-${quote.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold text-[#26302B] pt-3 border-t border-[#DDD9D0]">
                <span>TOTAL FINAL:</span>
                <span className="font-mono text-[#3F7D58]">
                  ${quote.totalAmount.toFixed(2)} MXN
                </span>
              </div>
            </div>
          </div>

          {/* Boton de Accion Final Celular */}
          <div className="pt-4 border-t border-[#DDD9D0] flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <p className="text-xs text-[#6B7A71]">
              ¿Tienes dudas o deseas confirmar? Haz clic abajo para enviarnos un WhatsApp.
            </p>
            <Button onClick={handleConfirmWhatsApp} className="w-full sm:w-auto bg-[#3F7D58] hover:bg-[#326446]">
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              Confirmar Pedido por WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
