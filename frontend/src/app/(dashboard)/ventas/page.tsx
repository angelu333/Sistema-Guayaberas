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
  Edit,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { QuoteEditModal } from "@/components/cotizaciones/QuoteEditModal";
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
  const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);

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
    if (activeTab === "ventas") {
      loadSalesData();
    } else {
      loadQuotesData();
    }
  }, [activeTab, loadSalesData, loadQuotesData]);

  const handleTabChange = (tab: "ventas" | "cotizaciones") => {
    setActiveTab(tab);
    router.replace(`/ventas?tab=${tab}`);
  };

  const filteredSales = sales.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.ticketNumber.toLowerCase().includes(q) ||
      (s.clientName && s.clientName.toLowerCase().includes(q))
    );
  });

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter === "all") return true;
    return q.status === statusFilter;
  });

  const handleCreateQuote = async (
    clientName: string,
    clientPhone: string | null,
    items: CreateQuoteItemDTO[],
    notes?: string,
    validDays: number = 15
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
    if (res.success) {
      loadQuotesData();
    }
  };

  const handleConvertToSale = async (quote: QuoteRecord) => {
    if (
      !confirm(
        `¿Deseas convertir la Cotización #${quote.quoteNumber} en una Venta Oficial por $${quote.totalAmount.toFixed(
          2
        )} MXN? Se descontarán los artículos del inventario.`
      )
    ) {
      return;
    }

    const res = await quotesService.convertQuoteToSale(quote.id, session?.userId);
    if (res.success) {
      alert(`¡Venta registrada exitosamente! Ticket #${res.ticketNumber}`);
      loadQuotesData();
    } else {
      alert(`Error al registrar la venta: ${res.error}`);
    }
  };

  const handleCopyWhatsAppLink = (quote: QuoteRecord) => {
    const phone = quote.clientPhone ? quote.clientPhone.replace(/\D/g, "") : "";
    const itemsText = quote.details
      .map(
        (d) =>
          `• ${d.productName} (${d.colorName || ""}/${d.sizeName || ""}) x${d.quantity} - $${d.subtotal.toFixed(2)}`
      )
      .join("\n");

    const text =
      `¡Hola ${quote.clientName}! Adjuntamos tu Cotización #${quote.quoteNumber}:\n\n` +
      `${itemsText}\n\n` +
      `Total Estimado: $${quote.totalAmount.toFixed(2)} MXN\n` +
      `Puedes ver el desglose en: ${window.location.origin}/cotizacion/${quote.id}`;

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      navigator.clipboard.writeText(text);
      alert("¡Texto de cotización copiado al portapapeles!");
    }
  };

  const methodLabel = (m: string) => {
    switch (m) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "transfer":
        return "Transferencia";
      default:
        return m;
    }
  };

  const methodIcon = (m: string) => {
    switch (m) {
      case "cash":
        return <Banknote className="w-3.5 h-3.5 text-[#3F7D58]" />;
      case "card":
        return <CreditCard className="w-3.5 h-3.5 text-[#C49A5A]" />;
      case "transfer":
        return <ArrowRightLeft className="w-3.5 h-3.5 text-[#556B5D]" />;
      default:
        return <DollarSign className="w-3.5 h-3.5" />;
    }
  };

  const statusBadge = (st: QuoteRecord["status"]) => {
    switch (st) {
      case "draft":
      case "sent":
        return <Badge variant="neutral">Enviada / Pendiente</Badge>;
      case "accepted":
        return <Badge variant="success">Aceptada</Badge>;
      case "rejected":
        return <Badge variant="error">Rechazada / No finalizada</Badge>;
      case "converted":
        return <Badge variant="primary">Convertida a Venta</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  const acceptedCount = quotes.filter((q) => q.status === "accepted").length;
  const totalAmountCotizado = quotes.reduce((acc, q) => acc + q.totalAmount, 0);

  return (
    <div className="page-container space-y-6">
      {/* Header General */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#26302B] font-[Outfit] tracking-tight">
            Ventas & Cotizaciones
          </h1>
          <p className="text-xs text-[#6B7A71] mt-0.5">
            Historial de tickets cobrados, presupuestos de mayoreo y gestión de escalas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "cotizaciones" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsTierModalOpen(true)}>
                <Sliders className="w-4 h-4 mr-1.5" /> Escalas de Mayoreo
              </Button>
              <Button size="sm" onClick={() => setIsNewQuoteModalOpen(true)} className="bg-[#556B5D]">
                <Plus className="w-4 h-4 mr-1.5" /> Nueva Cotización
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={loadSalesData}>
              <RefreshCw className={`w-4 h-4 ${loadingSales ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Principales: Ventas / Cotizaciones */}
      <div className="flex border-b border-[#DDD9D0]">
        <button
          onClick={() => handleTabChange("ventas")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "ventas"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Historial de Ventas (Tickets)
        </button>

        <button
          onClick={() => handleTabChange("cotizaciones")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "cotizaciones"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <FileText className="w-4 h-4" />
          Cotizaciones de Mayoreo
          {quotes.length > 0 && (
            <span className="ml-1 bg-[#EDE7DA] text-[#556B5D] text-xs font-mono px-2 py-0.5 rounded-full">
              {quotes.length}
            </span>
          )}
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: HISTORIAL DE VENTAS */}
      {activeTab === "ventas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#556B5D]">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ventas de Hoy</span>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loadingSales ? "..." : salesMetrics.salesToday}
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ingresos de Hoy</span>
              <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
                {loadingSales ? "..." : `$${salesMetrics.revenueToday.toFixed(2)}`}
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ventas Esta Semana</span>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loadingSales ? "..." : salesMetrics.salesThisWeek}
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#26302B]">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Ingresos Esta Semana</span>
              <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
                {loadingSales ? "..." : `$${salesMetrics.revenueThisWeek.toFixed(2)}`}
              </p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
                <Input
                  placeholder="Buscar por ticket o cliente..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              <span className="text-xs font-semibold text-[#6B7A71]">
                Mostrando {filteredSales.length} transacciones
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-center">Artículos</th>
                    <th className="py-3 px-4">Forma de Pago</th>
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
                      <td colSpan={8} className="py-12 text-center text-[#6B7A71]">
                        No se encontraron registros de ventas.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <Fragment key={sale.id}>
                        <tr
                          onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                          className="cursor-pointer hover:bg-[#F8F6F1]/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#556B5D]">
                            {sale.ticketNumber}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#6B7A71]">
                            {new Date(sale.createdAt).toLocaleDateString("es-MX")} ·{" "}
                            {new Date(sale.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {sale.clientName || "Público General"}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-xs">
                            {sale.items.reduce((acc, i) => acc + i.quantity, 0)} pzas
                          </td>
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
            {[
              { id: "all", label: "Todas" },
              { id: "sent", label: "Enviadas / Pendientes" },
              { id: "accepted", label: "Aceptadas" },
              { id: "rejected", label: "Rechazadas / No Finalizadas" },
              { id: "converted", label: "Convertidas a Venta" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st.id
                    ? "bg-[#556B5D] text-white"
                    : "bg-[#F8F6F1] text-[#6B7A71] hover:text-[#26302B]"
                }`}
              >
                {st.label}
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
                          {statusBadge(q.status)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#3F7D58]">${q.totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-xs text-[#6B7A71]">{new Date(q.createdAt).toLocaleDateString("es-MX")}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => setPreviewQuote(q)} title="Ticket/PDF">
                              <Eye className="w-3.5 h-3.5 mr-1" /> PDF
                            </Button>
                            
                            <Button size="sm" variant="outline" onClick={() => setEditingQuote(q)} title="Editar Cotización">
                              <Edit className="w-3.5 h-3.5 text-[#556B5D] mr-1" /> Editar
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => handleCopyWhatsAppLink(q)} title="Enviar WhatsApp">
                              <Share2 className="w-3.5 h-3.5 text-[#3F7D58]" />
                            </Button>

                            {q.status !== "converted" && (
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

      <QuoteEditModal
        isOpen={!!editingQuote}
        onClose={() => setEditingQuote(null)}
        quote={editingQuote}
        tenantId={effectiveTenantId || ""}
        tiers={tiers}
        onQuoteUpdated={loadQuotesData}
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
