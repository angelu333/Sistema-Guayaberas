"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  Percent,
  Eye,
  Edit2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import { clientsService } from "@/services/clients.service";
import type { Client, ClientType } from "@/types/domain.types";
import { ClientModal } from "@/components/clientes/ClientModal";
import { ClientDetailModal } from "@/components/clientes/ClientDetailModal";

export default function ClientesPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ClientType | "all">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientToView, setClientToView] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    const data = await clientsService.getClients(effectiveTenantId, {
      search: searchQuery,
      type: selectedType === "all" ? undefined : selectedType,
    });
    setClients(data);
    setLoading(false);
  }, [effectiveTenantId, searchQuery, selectedType]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const totalClients = clients.length;
  const wholesaleClients = clients.filter((c) => c.type === "wholesale").length;
  const regularClients = totalClients - wholesaleClients;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Gestión de Clientes y CRM
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Directorio de clientes particulares y compradores mayoristas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadClients} title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => {
              setClientToEdit(null);
              setIsModalOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#556B5D] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Total Clientes
            </p>
            <p className="text-2xl font-bold text-[#26302B] mt-1">
              {loading ? "..." : totalClients}
            </p>
            <p className="text-xs text-[#8FA393] mt-0.5">Registrados en el sistema</p>
          </div>
          <div className="p-3 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#D89B2B] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Mayoristas ⭐
            </p>
            <p className="text-2xl font-bold text-[#D89B2B] mt-1">
              {loading ? "..." : wholesaleClients}
            </p>
            <p className="text-xs text-[#6B7A71] mt-0.5">Con precio/descuento especial</p>
          </div>
          <div className="p-3 bg-[#FDF5E4] text-[#D89B2B] rounded-xl">
            <Star className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8FA393] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Clientes Regulares
            </p>
            <p className="text-2xl font-bold text-[#26302B] mt-1">
              {loading ? "..." : regularClients}
            </p>
            <p className="text-xs text-[#6B7A71] mt-0.5">Público general / detalle</p>
          </div>
          <div className="p-3 bg-[#F0F4F1] text-[#8FA393] rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Tabla de Clientes */}
      <Card className="overflow-hidden">
        {/* Buscador y Filtro */}
        <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, correo, empresa o RFC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedType === "all"
                  ? "bg-[#556B5D] text-white"
                  : "bg-white border border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedType("wholesale")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedType === "wholesale"
                  ? "bg-[#D89B2B] text-white"
                  : "bg-white border border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
              }`}
            >
              Mayoristas
            </button>
            <button
              onClick={() => setSelectedType("regular")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedType === "regular"
                  ? "bg-[#3F7D58] text-white"
                  : "bg-white border border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
              }`}
            >
              Regulares
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Empresa / RFC</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Descuento</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B7A71]">
                    Cargando directorio de clientes...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7A71]">
                    <Users className="w-10 h-10 text-[#DDD9D0] mx-auto mb-2" />
                    <p className="font-medium">No se encontraron clientes registrados.</p>
                    <p className="text-xs text-[#9DAAA2] mt-1">
                      Haz clic en "Nuevo Cliente" para agregar tu primer contacto.
                    </p>
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#26302B]">
                      {c.fullName}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6B7A71]">
                      {c.company || "-"}
                      {c.rfc && <span className="block font-mono text-[11px] text-[#8FA393]">{c.rfc}</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6B7A71]">
                      {c.phone && (
                        <span className="block flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#8FA393]" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="block flex items-center gap-1 text-[11px]">
                          <Mail className="w-3 h-3 text-[#8FA393]" /> {c.email}
                        </span>
                      )}
                      {!c.phone && !c.email && "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.type === "wholesale" ? (
                        <Badge variant="warning">Mayorista</Badge>
                      ) : (
                        <Badge variant="neutral">Regular</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-sm">
                      {c.discountPercent > 0 ? (
                        <span className="text-[#D89B2B]">{c.discountPercent}% OFF</span>
                      ) : (
                        <span className="text-[#9DAAA2] font-normal">0%</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setClientToView(c);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-[#556B5D] hover:bg-[#EBF0EC] rounded-lg transition-colors"
                        title="Ver detalle e historial"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setClientToEdit(c);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-[#6B7A71] hover:bg-[#E7E3DA] rounded-lg transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de alta/edición */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadClients}
        clientToEdit={clientToEdit}
      />

      {/* Modal de detalle e historial */}
      <ClientDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        client={clientToView}
      />
    </div>
  );
}
