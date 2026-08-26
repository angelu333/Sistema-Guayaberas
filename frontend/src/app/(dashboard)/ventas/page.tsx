"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  ArrowUpRight,
  FileText,
  Plus,
  Sliders,
  DollarSign,
  CheckCircle,
  Eye,
  Share2,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import { salesService, type SaleRecord } from "@/services/sales.service";
import {
  quotesService,
  type QuoteRecord,
  type WholesaleTier,
  type CreateQuoteItemDTO,
} from "@/services/quotes.service";
import { NewQuoteModal } from "@/components/cotizaciones/NewQuoteModal";
import { QuotePreviewModal } from "@/components/cotizaciones/QuotePreviewModal";
import { WholesaleTierModal } from "@/components/cotizaciones/WholesaleTierModal";

export default function VentasYCotizacionesPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"ventas" | "cotizaciones">(
    tabParam === "cotizaciones" ? "cotizaciones" : "ventas"
  );

  // Estados Ventas
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [salesMetrics, setSalesMetrics] = useState({
    salesToday: 0,
    revenueToday: 0,
    salesThisWeek: 0,
    revenueThisWeek: 0,
  });

  // Estados Cotizaciones
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [tiers, setTiers] = useState<WholesaleTier[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<QuoteRecord | null>(null);

  const loadSalesData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingSales(true);
    const [salesData, metricsData] = await Promise.all([
      salesService.getSalesHistory(effectiveTenantId, 100),
      salesService.getSalesMetrics(effectiveTenantId),
    ]);
    setSales(salesData);
    setSalesMetrics(metricsData);
    setLoadingSales(false);
  }, [effectiveTenantId]);

  const loadQuotesData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingQuotes(true);
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
      setLoadingQuotes(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadSalesData();
    loadQuotesData();
  }, [loadSalesData, loadQuotesData]);

  function handleTabChange(tab: "ventas" | "cotizaciones") {
    setActiveTab(tab);
    router.replace(`/ventas?tab=${tab}`);
  }

  // Métodos Cotizaciones
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
      await loadQuotesData();
      const created = await quotesService.getQuoteById(res.quoteId);
      if (created) setPreviewQuote(created);
    } else {
      alert(res.error || "Error al crear cotización.");
    }
  };

  const handleChangeStatus = async (quoteId: string, newStatus: QuoteRecord["status"]) => {
    const res = await quotesService.updateQuoteStatus(quoteId, newStatus);
    if (res.success) {
      await loadQuotesData();
    }
  };

  const handleConvertToSale = async (quote: QuoteRecord) => {
    if (!confirm(`¿Desea convertir la Cotización ${quote.quoteNumber} de ${quote.clientName} en una Venta Oficial?\n\nEsto descontará automáticamente ${quote.totalPieces} guayaberas del inventario y registrará el cobro.`)) {
      return;
    }
    const res = await quotesService.convertQuoteToSale(quote.id, session?.userId);
    if (res.success && res.ticketNumber) {
      alert(`¡Venta Registrada con Éxito!\nTicket #${res.ticketNumber}`);
      await Promise.all([loadQuotesData(), loadSalesData()]);
    } else {
      alert(res.error || "Error al convertir a venta.");
    }
  };

  const handleCopyWhatsAppLink = (quote: QuoteRecord) => {
    const publicUrl = `${window.location.origin}/cotizacion/${quote.id}`;
    const text = `Hola ${quote.clientName}, aquí tienes tu cotización de guayaberas al mayoreo (${quote.totalPieces} pzas) por un total de $${quote.totalAmount.toFixed(2)} MXN: ${publicUrl}`;
    navigator.clipboard.writeText(text);
    alert("¡Enlace copiado al portapapeles para WhatsApp!");
  };

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.ticketNumber.toLowerCase().includes(q) ||
      (s.clientName || "").toLowerCase().includes(q) ||
      (s.sellerName || "").toLowerCase().includes(q)
    );
  });

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter === "all") return true;
    return q.status === statusFilter;
  });

  const methodIcon = (method: string) => {
    if (method === "cash") return <Banknote className="w-3.5 h-3.5" />;
    if (method === "card") return <CreditCard className="w-3.5 h-3.5" />;
    return <ArrowRightLeft className="w-3.5 h-3.5" />;
  };

  const methodLabel = (method: string) =>
    method === "cash" ? "Efectivo" : method === "card" ? "Tarjeta" : "Transferencia";

  const totalRevenue = sales.filter((s) => s.status === "completed").reduce((acc, s) => acc + s.total, 0);
  const totalAmountCotizado = quotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const acceptedCount = quotes.filter((q) => q.status === "accepted" || q.status === "converted").length;

  return (
    <div className="space-y-6 font-[Outfit]">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Ventas & Cotizaciones
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Registro de transacciones en tienda y presupuestos de mayoreo
          </p>
        </div>

        {/* Acciones segun pestaña */}
        {activeTab === "ventas" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadSalesData} title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loadingSales ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button onClick={() => (window.location.href = "/pos")}>
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Ir al POS
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsTierModalOpen(true)}>
              <Sliders className="w-4 h-4 mr-1.5" />
              Escalas Mayoreo
            </Button>
            <Button onClick={() => setIsNewQuoteModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Cotización
            </Button>
          </div>
        )}
      </div>

      {/* Pestañas de Selector */}
      <div className="flex border-b border-[#E7E3DA] gap-6">
        <button
          onClick={() => handleTabChange("ventas")}
          className={`flex items-center gap-2 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === "ventas"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#8FA393] hover:text-[#26302B]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Historial de Ventas ({sales.length})
        </button>
        <button
          onClick={() => handleTabChange("cotizaciones")}
          className={`flex items-center gap-2 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === "cotizaciones"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#8FA393] hover:text-[#26302B]"
          }`}
        >
          <FileText className="w-4 h-4" />
          Cotizaciones Mayoreo ({quotes.length})
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: VENTAS */}
      {activeTab === "ventas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-[#556B5D]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ventas Hoy</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1">{loadingSales ? "..." : salesMetrics.salesToday}</p>
              <p className="text-xs text-[#8FA393] mt-0.5">${loadingSales ? "..." : salesMetrics.revenueToday.toFixed(2)}</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-[#8FA393]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Esta Semana</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1">{loadingSales ? "..." : salesMetrics.salesThisWeek}</p>
              <p className="text-xs text-[#8FA393] mt-0.5">${loadingSales ? "..." : salesMetrics.revenueThisWeek.toFixed(2)}</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-[#C49A5A]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Total Registros</p>
              <p className="text-2xl font-bold text-[#26302B] mt-1">{loadingSales ? "..." : sales.length}</p>
              <p className="text-xs text-[#8FA393] mt-0.5">Todas las ventas</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-[#3F7D58]">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ingresos Totales</p>
              <p className="text-2xl font-bold text-[#3F7D58] mt-1">{loadingSales ? "..." : `$${totalRevenue.toFixed(0)}`}</p>
              <p className="text-xs text-[#8FA393] mt-0.5">Ventas completadas</p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
                <input
                  type="text"
                  placeholder="Buscar por ticket, cliente o vendedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg focus:outline-none focus:border-[#556B5D]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Pago</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {loadingSales ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#6B7A71]">
                        Cargando ventas...
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <ShoppingBag className="w-10 h-10 text-[#DDD9D0] mx-auto mb-2" />
                        <p className="text-[#6B7A71]">
                          {searchQuery ? "Sin resultados" : "Aún no hay ventas registradas"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <Fragment key={sale.id}>
                        <tr
                          className="hover:bg-[#F8F6F1]/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-[#556B5D]">
                            {sale.ticketNumber}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#6B7A71]">
                            {new Date(sale.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {sale.clientName || <span className="text-[#9DAAA2]">Público general</span>}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#6B7A71]">{sale.sellerName || "-"}</td>
                          <td className="py-3 px-4">
                            {sale.payments.map((p, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-xs text-[#6B7A71]">
                                {methodIcon(p.method)} {methodLabel(p.method)}
                              </span>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-base">
                            ${sale.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {sale.status === "completed" ? (
                              <Badge variant="success">Completada</Badge>
                            ) : (
                              <Badge variant="error">Cancelada</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#9DAAA2]">
                            {expandedId === sale.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </td>
                        </tr>

                        {expandedId === sale.id && (
                          <tr key={`${sale.id}-detail`} className="bg-[#F8F6F1]">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
                                    Artículos vendidos
                                  </p>
                                  <div className="space-y-1.5">
                                    {sale.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div>
                                          <span className="font-mono text-xs text-[#556B5D]">{item.sku}</span>{" "}
                                          <span className="text-[#26302B]">{item.productName}</span>{" "}
                                          <span className="text-xs text-[#9DAAA2]">
                                            ({[item.colorName, item.sizeName].filter(Boolean).join("/")} x{item.quantity})
                                          </span>
                                        </div>
                                        <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
                                    Resumen de pago
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between text-[#6B7A71]">
                                      <span>Subtotal</span>
                                      <span>${sale.subtotal.toFixed(2)}</span>
                                    </div>
                                    {sale.discountAmount > 0 && (
                                      <div className="flex justify-between text-[#B85450]">
                                        <span>Descuento</span>
                                        <span>-${sale.discountAmount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-[#26302B] border-t border-[#DDD9D0] pt-1">
                                      <span>Total</span>
                                      <span>${sale.total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: COTIZACIONES */}
      {activeTab === "cotizaciones" && (
        <div className="space-y-6">
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
                {loadingQuotes ? "..." : quotes.length}
              </p>
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
                {loadingQuotes ? "..." : acceptedCount}
              </p>
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
                {loadingQuotes ? "..." : `$${totalAmountCotizado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-[#DDD9D0]">
            <span className="text-xs font-bold text-[#6B7A71] px-2 uppercase tracking-wider">Estado:</span>
            {["all", "draft", "accepted", "converted"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st
                    ? "bg-[#556B5D] text-white"
                    : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
                }`}
              >
                {st === "all" ? "Todas" : st === "draft" ? "Borradores" : st === "accepted" ? "Aceptadas" : "Convertidas"}
              </button>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-center">Guayaberas</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Total Estimado</th>
                    <th className="py-3 px-4 text-center">Fecha</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {loadingQuotes ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6B7A71]">
                        Cargando cotizaciones...
                      </td>
                    </tr>
                  ) : filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B7A71]">
                        No hay cotizaciones en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => (
                      <tr key={q.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#556B5D]">{q.quoteNumber}</td>
                        <td className="py-3 px-4 font-bold">{q.clientName}</td>
                        <td className="py-3 px-4 text-center font-bold text-xs">{q.totalPieces} pzas</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={q.status === "accepted" || q.status === "converted" ? "success" : "neutral"}>
                            {q.status === "draft" ? "Borrador" : q.status === "accepted" ? "Aceptada" : "En Venta/POS"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#3F7D58]">${q.totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-xs text-[#6B7A71]">{new Date(q.createdAt).toLocaleDateString("es-MX")}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setPreviewQuote(q)} title="Ticket/PDF">
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ticket/PDF
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCopyWhatsAppLink(q)}>
                              <Share2 className="w-3.5 h-3.5 text-[#3F7D58]" />
                            </Button>
                            {q.status === "accepted" && (
                              <Button size="sm" onClick={() => handleConvertToSale(q)} className="bg-[#3F7D58] text-xs py-1 text-white font-bold">
                                <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Vender
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
        </div>
      )}

      {/* Modales Cotizaciones */}
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
        tenantId={effectiveTenantId || ""}
        tiers={tiers}
        onTiersUpdated={loadQuotesData}
      />
    </div>
  );
}
