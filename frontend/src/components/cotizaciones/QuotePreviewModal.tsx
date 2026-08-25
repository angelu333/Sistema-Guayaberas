"use client";

import { useRef } from "react";
import { X, Printer, Share2, FileText, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { QuoteRecord } from "@/services/quotes.service";

interface QuotePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteRecord | null;
}

export function QuotePreviewModal({
  isOpen,
  onClose,
  quote,
}: QuotePreviewModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quote) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/cotizacion/${quote.id}`;
    navigator.clipboard.writeText(publicUrl);
    alert("¡Enlace interactivo copiado! Puedes pegarlo directamente en WhatsApp para tu cliente.");
  };

  const validUntilDate = new Date(
    new Date(quote.createdAt).getTime() + quote.validDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString("es-MX");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Header (Oculto al imprimir) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1] print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">
                Cotización de Mayoreo #{quote.quoteNumber}
              </h2>
              <p className="text-xs text-[#6B7A71]">Documento formal y ticket de presupuesto</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Share2 className="w-4 h-4 mr-1.5" />
              Copiar Link WhatsApp
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimir / PDF
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div
          ref={printableRef}
          className="flex-1 overflow-y-auto p-8 space-y-6 text-xs text-[#26302B] bg-white print:overflow-visible print:p-4"
        >
          {/* Header de la Empresa */}
          <div className="flex justify-between items-start border-b border-[#DDD9D0] pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#556B5D] text-white flex items-center justify-center font-bold font-[Outfit] text-2xl shadow-md">
                G
              </div>
              <div>
                <h1 className="font-[Outfit] text-xl font-bold text-[#26302B] tracking-tight">
                  {quote.tenantInfo?.name || "Guayabera Manager"}
                </h1>
                <p className="text-xs text-[#6B7A71]">Confección & Mayoreo de Guayaberas Finas</p>
                {quote.tenantInfo?.phone && (
                  <p className="text-xs text-[#6B7A71]">Tel: {quote.tenantInfo.phone}</p>
                )}
                {quote.tenantInfo?.email && (
                  <p className="text-xs text-[#6B7A71]">Email: {quote.tenantInfo.email}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-[#EBF0EC] text-[#556B5D] font-mono font-bold text-sm rounded-lg border border-[#A7D7B9]">
                {quote.quoteNumber}
              </span>
              <p className="text-xs text-[#6B7A71] mt-2">
                Emisión: <strong>{new Date(quote.createdAt).toLocaleDateString("es-MX")}</strong>
              </p>
              <p className="text-xs text-[#6B7A71]">
                Válido hasta: <strong>{validUntilDate}</strong> ({quote.validDays} días)
              </p>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="p-4 bg-[#F8F6F1] rounded-xl border border-[#DDD9D0] grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A71]">
                Cliente / Empresa
              </span>
              <p className="text-sm font-bold text-[#26302B] mt-0.5">{quote.clientName}</p>
              {quote.clientPhone && (
                <p className="text-xs text-[#6B7A71]">Teléfono: {quote.clientPhone}</p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A71]">
                Volumen Solicitado
              </span>
              <p className="text-sm font-bold text-[#3F7D58] mt-0.5">
                {quote.totalPieces} guayaberas en total
              </p>
              {quote.discountAmount > 0 && (
                <span className="inline-block text-[11px] font-bold text-[#3F7D58] bg-[#EBF5F0] px-2 py-0.5 rounded-md mt-1">
                  Descuento por Mayoreo Aplicado
                </span>
              )}
            </div>
          </div>

          {/* Tabla de Productos Cotizados */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-[11px] font-bold text-[#6B7A71] uppercase tracking-wider">
                <th className="py-2.5 px-3">Modelo / Guayabera</th>
                <th className="py-2.5 px-3 text-center">Variante</th>
                <th className="py-2.5 px-3 text-center">Cant.</th>
                <th className="py-2.5 px-3 text-right">Precio Reg.</th>
                <th className="py-2.5 px-3 text-right">Precio Mayoreo</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0] text-xs">
              {quote.details.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 px-3 font-semibold text-[#26302B]">
                    {d.productName}
                    <span className="block text-[10px] text-[#6B7A71] font-mono">SKU: {d.sku}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-[#6B7A71]">
                    {d.colorName || ""} {d.sizeName ? `(T. ${d.sizeName})` : ""}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#26302B]">{d.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono text-[#8FA393] line-through">
                    ${d.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#3F7D58]">
                    ${d.finalUnitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#26302B]">
                    ${d.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales y Resumen */}
          <div className="flex justify-end pt-4 border-t border-[#DDD9D0]">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B7A71]">
                <span>Subtotal Regular:</span>
                <span className="font-mono">${quote.subtotal.toFixed(2)}</span>
              </div>

              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-[#3F7D58] font-semibold">
                  <span>Descuento por Volumen:</span>
                  <span className="font-mono">-${quote.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#26302B] pt-2 border-t border-[#DDD9D0]">
                <span>TOTAL ESTIMADO:</span>
                <span className="font-mono text-[#3F7D58]">${quote.totalAmount.toFixed(2)} MXN</span>
              </div>
            </div>
          </div>

          {/* Notas y Condiciones */}
          {quote.notes && (
            <div className="p-3 bg-[#F8F6F1] rounded-xl border border-[#DDD9D0] text-xs">
              <span className="font-bold text-[#6B7A71] block uppercase tracking-wider mb-0.5">
                Notas & Condiciones:
              </span>
              <p className="text-[#26302B]">{quote.notes}</p>
            </div>
          )}

          {/* Footer de Firma / Términos */}
          <div className="pt-6 border-t border-[#DDD9D0] text-center text-[10px] text-[#8FA393]">
            <p>Cotización sujeta a disponibilidad de stock o tiempo de confección de taller.</p>
            <p className="mt-0.5 font-medium">¡Gracias por su preferencia!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
