"use client";

import { useState } from "react";
import {
  X,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { quotesService, type QuoteRecord } from "@/services/quotes.service";

interface ConvertQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteRecord | null;
  userId?: string;
  onConverted: (ticketNumber: string) => void;
}

export function ConvertQuoteModal({
  isOpen,
  onClose,
  quote,
  userId,
  onConverted,
}: ConvertQuoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !quote) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quotesService.convertQuoteToSale(quote.id, userId);
      if (res.success && res.ticketNumber) {
        onConverted(res.ticketNumber);
        onClose();
      } else {
        setError(res.error || "No se pudo convertir la cotización a venta.");
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar la venta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-[Outfit] animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EBF5F0] text-[#3F7D58]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#26302B]">
                Convertir a Venta Oficial
              </h3>
              <p className="text-xs text-[#6B7A71]">Cotización #{quote.quoteNumber}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-[#8B7D6B] hover:bg-[#EDE7DA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-[#FEF5F5] border border-[#F5CACA] rounded-xl text-[#B85450] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E4DDD1] space-y-2">
            <div className="flex justify-between items-center text-[#26302B]">
              <span className="font-medium text-[#6B7A71]">Cliente:</span>
              <span className="font-bold">{quote.clientName}</span>
            </div>

            <div className="flex justify-between items-center text-[#26302B]">
              <span className="font-medium text-[#6B7A71]">Prendas a descontar:</span>
              <span className="font-bold text-[#556B5D] flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {quote.totalPieces} pzas
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#E4DDD1] text-sm">
              <span className="font-bold text-[#26302B]">Total a Cobrar:</span>
              <span className="font-extrabold text-[#3F7D58] text-base font-mono">
                ${quote.totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#6B7A71] text-center leading-relaxed">
            Al confirmar, se registrará el pago, se generará el ticket oficial y se descontarán las prendas del inventario físico automáticamente.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[#3F7D58] hover:bg-[#326446] text-white font-extrabold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1.5" />
            )}
            {loading ? "Procesando..." : "Confirmar y Cobrar Venta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
