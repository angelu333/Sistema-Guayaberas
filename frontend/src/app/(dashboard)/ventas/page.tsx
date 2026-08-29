"use client";

import { useEffect, useState, useCallback, Fragment, Suspense } from "react";
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
  Trash2,
  XCircle,
  Download,
  Loader2,
  Calendar,
  MapPin,
  Filter,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatWhatsAppPhone } from "@/lib/utils/formatters";

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
import { ConvertQuoteModal } from "@/components/cotizaciones/ConvertQuoteModal";
import { DeleteQuoteModal } from "@/components/cotizaciones/DeleteQuoteModal";
import { WholesaleTierModal } from "@/components/cotizaciones/WholesaleTierModal";
import { locationsService, type LocationDetail } from "@/services/locations.service";

function VentasYCotizacionesContent() {
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
  const [downloadingSaleId, setDownloadingSaleId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationDetail[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<QuoteRecord | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<QuoteRecord | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<QuoteRecord | null>(null);

  const loadSalesData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingSales(true);
    try {
      const [salesData, metricsData, locationsData] = await Promise.all([
        salesService.getSalesHistory(effectiveTenantId, 100),
        salesService.getSalesMetrics(effectiveTenantId),
        locationsService.getLocations(effectiveTenantId).catch(() => []),
      ]);
      setSales(salesData);
      setSalesMetrics(metricsData);
      setLocations(locationsData);
    } catch (err) {
      console.error("Error al cargar ventas y sucursales:", err);
    } finally {
      setLoadingSales(false);
    }
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

  const handleDatePresetChange = (preset: "all" | "today" | "yesterday" | "week" | "month" | "custom") => {
    setDatePreset(preset);
    const today = new Date().toISOString().split("T")[0];

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split("T")[0]);
      setEndDate(today);
    } else if (preset === "month") {
      const m = new Date();
      setStartDate(new Date(m.getFullYear(), m.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(today);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchQuery !== "" || selectedLocation !== "all" || datePreset !== "all";

  const filteredSales = sales.filter((s) => {
    // 1. Filtro por texto / cliente / ticket
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        s.ticketNumber.toLowerCase().includes(q) ||
        (s.clientName && s.clientName.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // 2. Filtro por sucursal
    if (selectedLocation !== "all" && s.locationId !== selectedLocation) {
      return false;
    }

    // 3. Filtro por fecha
    if (datePreset !== "all") {
      const saleDate = s.createdAt.split("T")[0];
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
    }

    return true;
  });

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter === "pending") {
      return q.status === "draft" || q.status === "sent" || q.status === "accepted";
    }
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

  const handleCopyWhatsAppLink = (quote: QuoteRecord) => {
    const phone = quote.clientPhone ? formatWhatsAppPhone(quote.clientPhone) : "";
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

  const pendingCount = quotes.filter((q) => q.status === "draft" || q.status === "sent" || q.status === "accepted").length;
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
          {pendingCount > 0 && (
            <span className="ml-1 bg-[#EDE7DA] text-[#556B5D] text-xs font-mono px-2 py-0.5 rounded-full font-bold">
              {pendingCount}
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
            {/* Barra de Filtros Avanzados: Buscador + Sucursales + Fechas Rápidas */}
            <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Buscador */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
                  <Input
                    placeholder="Buscar por ticket o cliente..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Sucursal */}
                  {locations.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-white border border-[#DDD9D0] rounded-xl px-2.5 py-1.5 shadow-2xs">
                      <MapPin className="w-3.5 h-3.5 text-[#556B5D]" />
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-[#26302B] focus:outline-hidden cursor-pointer"
                      >
                        <option value="all">Todas las sucursales</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contador de resultados */}
                  <span className="text-xs font-semibold text-[#6B7A71] px-2 py-1 bg-white rounded-lg border border-[#DDD9D0]">
                    {filteredSales.length} {filteredSales.length === 1 ? "venta" : "ventas"}
                  </span>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="text-xs text-[#B85450] border-[#B85450]/30 hover:bg-[#FAEAEA]"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros de Fecha Rápidos (Pills) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#DDD9D0]/60">
                <span className="text-[11px] font-bold text-[#6B7A71] mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#556B5D]" />
                  Periodo:
                </span>

                {(
                  [
                    { id: "all", label: "Todo" },
                    { id: "today", label: "Hoy" },
                    { id: "yesterday", label: "Ayer" },
                    { id: "week", label: "Esta Semana" },
                    { id: "month", label: "Este Mes" },
                    { id: "custom", label: "Personalizado" },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleDatePresetChange(preset.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      datePreset === preset.id
                        ? "bg-[#556B5D] text-white shadow-2xs"
                        : "bg-white text-[#6B7A71] hover:text-[#26302B] border border-[#DDD9D0]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {datePreset === "custom" && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#DDD9D0] rounded-lg text-xs font-mono text-[#26302B]"
                    />
                    <span className="text-xs text-[#6B7A71]">al</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#DDD9D0] rounded-lg text-xs font-mono text-[#26302B]"
                    />
                  </div>
                )}
              </div>
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

                                  {/* Botón Descargar Ticket PDF */}
                                  <div className="pt-3 border-t border-[#DDD9D0]/60 mt-3 flex justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        setDownloadingSaleId(sale.id);
                                        try {
                                          const { downloadSaleReceiptPDF } = await import("@/lib/pdf/sale-receipt-pdf");
                                          await downloadSaleReceiptPDF(
                                            {
                                              ticketNumber: sale.ticketNumber,
                                              createdAt: sale.createdAt,
                                              clientName: sale.clientName || "Público General",
                                              sellerName: sale.sellerName,
                                              locationName: sale.locationName || tenant?.name || null,
                                              subtotal: sale.subtotal,
                                              discountAmount: sale.discountAmount,
                                              total: sale.total,
                                              items: sale.items,
                                              payments: sale.payments,
                                            },
                                            {
                                              name: tenant?.name,
                                              phone: tenant?.phone,
                                              email: tenant?.email,
                                            }
                                          );
                                        } catch (err) {
                                          console.error("Error al descargar ticket PDF:", err);
                                          alert("Error al generar el recibo PDF.");
                                        } finally {
                                          setDownloadingSaleId(null);
                                        }
                                      }}
                                      disabled={downloadingSaleId === sale.id}
                                      className="text-xs bg-white hover:bg-[#556B5D]/10 text-[#556B5D] border-[#556B5D]"
                                    >
                                      {downloadingSaleId === sale.id ? (
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                      )}
                                      {downloadingSaleId === sale.id ? "Generando..." : "Descargar Recibo PDF"}
                                    </Button>
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
                  Cotizaciones Pendientes
                </span>
                <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
                {loadingQuotes ? "..." : pendingCount}
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

          {/* Selector de Pestañas de Estado */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-[#DDD9D0]">
            <span className="text-xs font-bold text-[#6B7A71] px-2 uppercase tracking-wider">Filtrar por:</span>
            {[
              { id: "pending", label: "Pendientes / En Cola" },
              { id: "accepted", label: "Aceptadas" },
              { id: "converted", label: "Convertidas a Venta" },
              { id: "rejected", label: "Rechazadas / No Finalizadas" },
              { id: "all", label: "Histórico Completo" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === st.id
                    ? "bg-[#556B5D] text-white shadow-xs"
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
                              <Button size="sm" onClick={() => setConvertingQuote(q)} className="bg-[#3F7D58] text-xs py-1 text-white font-bold">
                                <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Vender
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingQuote(q)}
                              className="text-[#B85450] hover:bg-[#FEF5F5] border-[#F5CACA]"
                              title="Eliminar Cotización"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

      <ConvertQuoteModal
        isOpen={!!convertingQuote}
        onClose={() => setConvertingQuote(null)}
        quote={convertingQuote}
        userId={session?.userId}
        onConverted={() => loadQuotesData()}
      />

      <DeleteQuoteModal
        isOpen={!!deletingQuote}
        onClose={() => setDeletingQuote(null)}
        quote={deletingQuote}
        onDeleted={() => loadQuotesData()}
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

export default function VentasYCotizacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VentasYCotizacionesContent />
    </Suspense>
  );
}
