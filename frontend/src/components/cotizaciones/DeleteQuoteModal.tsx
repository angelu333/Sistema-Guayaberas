"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { quotesService, type QuoteRecord } from "@/services/quotes.service";

interface DeleteQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteRecord | null;
  onDeleted: () => void;
}

export function DeleteQuoteModal({
  isOpen,
  onClose,
  quote,
  onDeleted,
}: DeleteQuoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !quote) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quotesService.deleteQuote(quote.id);
      if (res.success) {
        onDeleted();
        onClose();
      } else {
        setError(res.error || "No se pudo eliminar la cotización.");
      }
    } catch (err: any) {
      setError(err.message || "Error al eliminar.");
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
        <div className="flex items-center justify-between p-4 border-b border-[#DDD9D0] bg-[#FEF5F5]">
          <div className="flex items-center gap-2 text-[#B85450]">
            <div className="p-2 rounded-xl bg-[#FDE8E8]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#26302B]">
                Eliminar Cotización
              </h3>
              <p className="text-xs text-[#B85450] font-semibold">Folio #{quote.quoteNumber}</p>
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
            <div className="p-3 bg-[#FEF5F5] border border-[#F5CACA] rounded-xl text-[#B85450]">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E4DDD1] space-y-1.5">
            <div className="flex justify-between items-center text-[#26302B]">
              <span className="font-medium text-[#6B7A71]">Cliente:</span>
              <span className="font-bold">{quote.clientName}</span>
            </div>
            <div className="flex justify-between items-center text-[#26302B]">
              <span className="font-medium text-[#6B7A71]">Total Cotizado:</span>
              <span className="font-bold text-[#3F7D58] font-mono">
                ${quote.totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#FEF5F5] border border-[#F5CACA] rounded-xl text-[#B85450] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              ¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer y se borrará permanentemente del sistema.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="bg-[#B85450] hover:bg-[#A34541] text-white font-extrabold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1.5" />
            )}
            {loading ? "Eliminando..." : "Eliminar Cotización"}
          </Button>
        </div>
      </div>
    </div>
  );
}
