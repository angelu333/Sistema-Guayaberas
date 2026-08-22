"use client";

import { useState, useEffect, useCallback } from "react";
import { X, User, ShoppingBag, Calendar, CreditCard, Percent, Phone, Mail, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { clientsService, type ClientPurchaseHistoryItem } from "@/services/clients.service";
import type { Client } from "@/types/domain.types";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

export function ClientDetailModal({
  isOpen,
  onClose,
  client,
}: ClientDetailModalProps) {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [history, setHistory] = useState<ClientPurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!effectiveTenantId || !client?.id) return;
    setLoading(true);
    const data = await clientsService.getClientPurchaseHistory(effectiveTenantId, client.id);
    setHistory(data);
    setLoading(false);
  }, [effectiveTenantId, client?.id]);

  useEffect(() => {
    if (isOpen && client) {
      loadHistory();
    }
  }, [isOpen, client, loadHistory]);

  if (!isOpen || !client) return null;

  const totalSpent = history
    .filter((h) => h.status === "completed")
    .reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#556B5D] text-white flex items-center justify-center font-bold text-lg">
              {client.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#26302B]">{client.fullName}</h2>
                {client.type === "wholesale" ? (
                  <Badge variant="warning">MAYORISTA ({client.discountPercent}%)</Badge>
                ) : (
                  <Badge variant="neutral">REGULAR</Badge>
                )}
              </div>
              <p className="text-xs text-[#6B7A71]">
                {client.company || "Cliente Particular"} {client.rfc ? `• RFC: ${client.rfc}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ficha Informativa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#F8F6F1] rounded-xl border border-[#E7E3DA]">
            <div>
              <p className="text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider">
                Compras Realizadas
              </p>
              <p className="text-xl font-bold text-[#26302B] mt-0.5">{history.length}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider">
                Total Acumulado
              </p>
              <p className="text-xl font-bold text-[#3F7D58] mt-0.5">
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#6B7A71] uppercase tracking-wider">
                Descuento Asignado
              </p>
              <p className="text-xl font-bold text-[#D89B2B] mt-0.5">
                {client.discountPercent}% OFF
              </p>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#6B7A71]">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#8FA393]" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#8FA393]" />
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <MapPin className="w-4 h-4 text-[#8FA393] shrink-0" />
                <span>{client.address}</span>
              </div>
            )}
          </div>

          {/* Historial de Compras */}
          <div>
            <h3 className="text-sm font-bold text-[#26302B] mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#556B5D]" />
              Historial de Compras Acumuladas
            </h3>

            {loading ? (
              <p className="text-xs text-[#6B7A71] text-center py-6">Cargando historial...</p>
            ) : history.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-[#E7E3DA] rounded-xl text-xs text-[#6B7A71]">
                Aún no hay compras registradas para este cliente.
              </div>
            ) : (
              <div className="border border-[#DDD9D0] rounded-xl overflow-hidden divide-y divide-[#DDD9D0]">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 text-xs hover:bg-[#F8F6F1] transition-colors">
                    <div>
                      <span className="font-mono font-bold text-[#556B5D]">{h.ticketNumber}</span>
                      <p className="text-[#9DAAA2] text-[11px]">
                        {new Date(h.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} — {h.itemCount} artículo(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-[#26302B]">${h.total.toFixed(2)}</span>
                      <span className="block text-[10px] text-[#3F7D58] font-semibold">Completada</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[#DDD9D0] bg-[#F8F6F1]">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
