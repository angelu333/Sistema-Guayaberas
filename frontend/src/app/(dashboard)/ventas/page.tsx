"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  ShoppingBag,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import { salesService, type SaleRecord } from "@/services/sales.service";

export default function VentasPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    salesToday: 0,
    revenueToday: 0,
    salesThisWeek: 0,
    revenueThisWeek: 0,
  });

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    const [salesData, metricsData] = await Promise.all([
      salesService.getSalesHistory(effectiveTenantId, 100),
      salesService.getSalesMetrics(effectiveTenantId),
    ]);
    setSales(salesData);
    setMetrics(metricsData);
    setLoading(false);
  }, [effectiveTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = sales.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.ticketNumber.toLowerCase().includes(q) ||
      (s.clientName || "").toLowerCase().includes(q) ||
      (s.sellerName || "").toLowerCase().includes(q)
    );
  });

  const methodIcon = (method: string) => {
    if (method === "cash") return <Banknote className="w-3.5 h-3.5" />;
    if (method === "card") return <CreditCard className="w-3.5 h-3.5" />;
    return <ArrowRightLeft className="w-3.5 h-3.5" />;
  };

  const methodLabel = (method: string) =>
    method === "cash" ? "Efectivo" : method === "card" ? "Tarjeta" : "Transferencia";

  const totalRevenue = sales
    .filter((s) => s.status === "completed")
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Historial de Ventas
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Registro completo de transacciones realizadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={() => (window.location.href = "/pos")}>
            <ArrowUpRight className="w-4 h-4" />
            Ir al POS
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#556B5D]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Ventas Hoy
          </p>
          <p className="text-2xl font-bold text-[#26302B] mt-1">
            {loading ? "..." : metrics.salesToday}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">
            ${loading ? "..." : metrics.revenueToday.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8FA393]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Esta Semana
          </p>
          <p className="text-2xl font-bold text-[#26302B] mt-1">
            {loading ? "..." : metrics.salesThisWeek}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">
            ${loading ? "..." : metrics.revenueThisWeek.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#C49A5A]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Total Registros
          </p>
          <p className="text-2xl font-bold text-[#26302B] mt-1">
            {loading ? "..." : sales.length}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">Todas las ventas</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3F7D58]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Ingresos Totales
          </p>
          <p className="text-2xl font-bold text-[#26302B] mt-1">
            {loading ? "..." : `$${totalRevenue.toFixed(0)}`}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">Ventas completadas</p>
        </Card>
      </div>

      {/* Tabla de ventas */}
      <Card className="overflow-hidden">
        {/* Buscador */}
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B7A71]">
                    Cargando ventas...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-[#DDD9D0] mx-auto mb-2" />
                    <p className="text-[#6B7A71]">
                      {searchQuery ? "Sin resultados" : "Aun no hay ventas registradas"}
                    </p>
                    <p className="text-xs text-[#9DAAA2] mt-1">
                      {!searchQuery && "Ve al POS para registrar tu primera venta"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => (
                  <>
                    <tr
                      key={sale.id}
                      className="hover:bg-[#F8F6F1]/50 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === sale.id ? null : sale.id)
                      }
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#556B5D]">
                        {sale.ticketNumber}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71]">
                        {new Date(sale.createdAt).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {sale.clientName || (
                          <span className="text-[#9DAAA2]">Publico general</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71]">
                        {sale.sellerName || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {sale.payments.map((p, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs text-[#6B7A71]"
                          >
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
                        ) : sale.status === "cancelled" ? (
                          <Badge variant="error">Cancelada</Badge>
                        ) : (
                          <Badge variant="warning">Devolucion</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#9DAAA2]">
                        {expandedId === sale.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </td>
                    </tr>

                    {/* Detalle expandido */}
                    {expandedId === sale.id && (
                      <tr key={`${sale.id}-detail`} className="bg-[#F8F6F1]">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
                                Articulos vendidos
                              </p>
                              <div className="space-y-1.5">
                                {sale.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-center text-sm"
                                  >
                                    <div>
                                      <span className="font-mono text-xs text-[#556B5D]">
                                        {item.sku}
                                      </span>{" "}
                                      <span className="text-[#26302B]">
                                        {item.productName}
                                      </span>{" "}
                                      <span className="text-xs text-[#9DAAA2]">
                                        ({[item.colorName, item.sizeName].filter(Boolean).join("/")} x{item.quantity})
                                      </span>
                                    </div>
                                    <span className="font-semibold">
                                      ${item.subtotal.toFixed(2)}
                                    </span>
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
                                {sale.payments.map((p, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between text-[#6B7A71] text-xs"
                                  >
                                    <span className="flex items-center gap-1">
                                      {methodIcon(p.method)}{" "}
                                      {methodLabel(p.method)}
                                    </span>
                                    <span>${p.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                                {sale.notes && (
                                  <p className="text-xs text-[#9DAAA2] pt-1 italic">
                                    Nota: {sale.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
