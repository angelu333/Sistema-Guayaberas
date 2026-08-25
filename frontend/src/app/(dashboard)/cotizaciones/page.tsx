"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Plus,
  Sliders,
  DollarSign,
  CheckCircle,
  Clock,
  Printer,
  Share2,
  ShoppingCart,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  quotesService,
  type QuoteRecord,
  type WholesaleTier,
  type CreateQuoteItemDTO,
} from "@/services/quotes.service";
import { NewQuoteModal } from "@/components/cotizaciones/NewQuoteModal";
import { QuotePreviewModal } from "@/components/cotizaciones/QuotePreviewModal";
import { WholesaleTierModal } from "@/components/cotizaciones/WholesaleTierModal";

export default function CotizacionesPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [tiers, setTiers] = useState<WholesaleTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modales
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<QuoteRecord | null>(null);

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      const [qData, tData] = await Promise.all([
        quotesService.getQuotes(effectiveTenantId),
        quotesService.getWholesaleTiers(effectiveTenantId),
      ]);
      setQuotes(qData);
      setTiers(tData);
    } catch (err) {
      console.error("Error al cargar cotizaciones:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Crear cotización
  const handleCreateQuote = async (
    clientName: string,
    clientPhone: string | null,
    items: CreateQuoteItemDTO[],
    notes?: string,
    validDays?: number
  ) => {
    if (!effectiveTenantId) return;
    const res = await quotesService.createQuote(
      effectiveTenantId,
      clientName,
      clientPhone,
      items,
      tiers,
      notes,
      validDays,
      session?.userId
    );
    if (res.success && res.quoteId) {
      await loadData();
      const created = await quotesService.getQuoteById(res.quoteId);
      if (created) setPreviewQuote(created);
    } else {
      alert(res.error || "Error al crear cotización.");
    }
  };

  // Cambiar estado
  const handleChangeStatus = async (quoteId: string, newStatus: QuoteRecord["status"]) => {
    const res = await quotesService.updateQuoteStatus(quoteId, newStatus);
    if (res.success) {
      await loadData();
    }
  };

  // Copiar Link WhatsApp
  const handleCopyWhatsAppLink = (quote: QuoteRecord) => {
    const publicUrl = `${window.location.origin}/cotizacion/${quote.id}`;
    const text = `Hola ${quote.clientName}, aquí tienes tu cotización de guayaberas al mayoreo (${quote.totalPieces} pzas) por un total de $${quote.totalAmount.toFixed(
      2
    )} MXN. Puedes verla y ajustar las cantidades en el siguiente enlace: ${publicUrl}`;
    navigator.clipboard.writeText(text);
    alert("¡Enlace y mensaje copiados al portapapeles! Puedes pegarlo en WhatsApp.");
  };

  // Filtrar
  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter === "all") return true;
    return q.status === statusFilter;
  });

  // Métricas
  const totalAmountCotizado = quotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const acceptedCount = quotes.filter((q) => q.status === "accepted" || q.status === "converted").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Cotizaciones de Mayoreo
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Presupuestos automáticos por volumen con ticket/PDF profesional y enlace interactivo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsTierModalOpen(true)}>
            <Sliders className="w-4 h-4 mr-1.5" />
            Escalas de Mayoreo
          </Button>

          <Button onClick={() => setIsNewQuoteModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="border-l-4 border-l-[#556B5D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Cotizaciones Registradas
            </span>
            <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
            {loading ? "..." : quotes.length}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">Presupuestos a clientes</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Cotizaciones Aceptadas
            </span>
            <div className="p-2 bg-[#EBF5F0] text-[#3F7D58] rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
            {loading ? "..." : acceptedCount}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Listas para producción o venta</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Monto Total Cotizado
            </span>
            <div className="p-2 bg-[#FBF4E8] text-[#C49A5A] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
            {loading ? "..." : `$${totalAmountCotizado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Valor total estimado</p>
        </Card>
      </div>

      {/* Filtros de Estado */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-[#DDD9D0]">
        <span className="text-xs font-bold text-[#6B7A71] px-2 uppercase tracking-wider">Estado:</span>
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === "all"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setStatusFilter("draft")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === "draft"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Borradores
        </button>
        <button
          onClick={() => setStatusFilter("accepted")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === "accepted"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Aceptadas
        </button>
        <button
          onClick={() => setStatusFilter("converted")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === "converted"
              ? "bg-[#556B5D] text-white"
              : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          Convertidas a Venta
        </button>
      </div>

      {/* Tabla de Cotizaciones */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Cliente / Empresa</th>
                <th className="py-3 px-4 text-center">Guayaberas</th>
                <th className="py-3 px-4 text-[#26302B] text-center">Estado</th>
                <th className="py-3 px-4 text-right">Total Estimado</th>
                <th className="py-3 px-4 text-center">Fecha</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6B7A71]">
                    Cargando cotizaciones...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7A71]">
                    No hay cotizaciones registradas. Haz clic en "Nueva Cotización" para generar la primera.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#556B5D]">{q.quoteNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#26302B] block">{q.clientName}</span>
                      {q.clientPhone && (
                        <span className="text-[11px] text-[#6B7A71]">{q.clientPhone}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-xs">{q.totalPieces} pzas</td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          q.status === "accepted" || q.status === "converted"
                            ? "success"
                            : q.status === "draft"
                            ? "neutral"
                            : "warning"
                        }
                      >
                        {q.status === "draft"
                          ? "Borrador"
                          : q.status === "accepted"
                          ? "Aceptada"
                          : q.status === "converted"
                          ? "En Venta/POS"
                          : q.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#3F7D58]">
                      ${q.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-[#6B7A71]">
                      {new Date(q.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewQuote(q)}
                          title="Ver Ticket / Imprimir PDF"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Ticket/PDF
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyWhatsAppLink(q)}
                          title="Copiar Link para WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#3F7D58]" />
                        </Button>

                        {q.status !== "converted" && (
                          <Button
                            size="sm"
                            onClick={() => handleChangeStatus(q.id, "accepted")}
                            className="bg-[#3F7D58] hover:bg-[#326446] text-xs py-1"
                            title="Marcar como Aceptada"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modales */}
      <NewQuoteModal
        isOpen={isNewQuoteModalOpen}
        onClose={() => setIsNewQuoteModalOpen(false)}
        tenantId={effectiveTenantId || ""}
        tiers={tiers}
        onQuoteCreated={handleCreateQuote}
      />

      <QuotePreviewModal
        isOpen={!!previewQuote}
        onClose={() => setPreviewQuote(null)}
        quote={previewQuote}
      />

      <WholesaleTierModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        tiers={tiers}
      />
    </div>
  );
}
