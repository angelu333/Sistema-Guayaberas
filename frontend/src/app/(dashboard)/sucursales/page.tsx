"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeftRight,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Phone,
  Package,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Search,
} from "lucide-react";
import {
  locationsService,
  LocationDetail,
  CreateLocationDTO,
  UpdateLocationDTO,
} from "@/services/locations.service";
import {
  transfersService,
  TransferRecord,
  TransferItem,
} from "@/services/transfers.service";
import { useAuthStore } from "@/stores/auth.store";
import { useLocationStore } from "@/stores/location.store";

// --- Colores de estado de transferencia ---
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente: { label: "Pendiente", color: "bg-[#FFF5CC] text-[#D89B2B] border-[#F5DFA0]", icon: <Clock className="w-3 h-3" /> },
  en_transito: { label: "En tránsito", color: "bg-blue-50 text-blue-600 border-blue-200", icon: <ArrowLeftRight className="w-3 h-3" /> },
  completada: { label: "Completada", color: "bg-[#EEF5F0] text-[#3F7D58] border-[#B6D8C3]", icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelada: { label: "Cancelada", color: "bg-red-50 text-red-500 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

// ==========================================
// MODAL DE CREAR / EDITAR SUCURSAL
// ==========================================
function LocationModal({
  location,
  onClose,
  onSave,
}: {
  location: LocationDetail | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(location?.name || "");
  const [description, setDescription] = useState(location?.description || "");
  const [phone, setPhone] = useState(location?.phone || "");
  const [address, setAddress] = useState(location?.address || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const session = useAuthStore((s) => s.session);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la sucursal es obligatorio.");
      return;
    }
    if (!session?.tenantId) return;
    setSaving(true);
    setError("");

    try {
      if (location) {
        const dto: UpdateLocationDTO = { name, description, phone, address };
        await locationsService.updateLocation(location.id, dto);
      } else {
        const dto: CreateLocationDTO = { name, description, phone, address };
        await locationsService.createLocation(session.tenantId, dto);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar la sucursal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-[#26302B] px-6 py-4">
          <h2 className="font-[Outfit] font-bold text-lg text-white">
            {location ? "Editar Sucursal" : "Nueva Sucursal"}
          </h2>
          <p className="font-[Outfit] text-xs text-[#8FA393] mt-0.5">
            {location ? "Modifica los datos de la sucursal." : "Registra una nueva tienda o taller de trabajo."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
              Nombre de la sucursal <span className="text-[#B85450]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Tienda Centro, Taller Principal"
              className="w-full border border-[#C9C4B8] rounded-xl px-4 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] focus:ring-2 focus:ring-[#556B5D]/15 bg-[#FAFAF8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción (opcional)"
              className="w-full border border-[#C9C4B8] rounded-xl px-4 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] focus:ring-2 focus:ring-[#556B5D]/15 bg-[#FAFAF8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="999 123 4567"
                className="w-full border border-[#C9C4B8] rounded-xl px-4 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] focus:ring-2 focus:ring-[#556B5D]/15 bg-[#FAFAF8]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                Dirección
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle y número"
                className="w-full border border-[#C9C4B8] rounded-xl px-4 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] focus:ring-2 focus:ring-[#556B5D]/15 bg-[#FAFAF8]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#B85450] font-[Outfit] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#C9C4B8] rounded-xl py-2.5 text-sm font-semibold font-[Outfit] text-[#556B5D] hover:bg-[#F0EDE6] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#556B5D] hover:bg-[#455A4D] text-white rounded-xl py-2.5 text-sm font-semibold font-[Outfit] transition-colors disabled:opacity-60"
            >
              {saving ? "Guardando..." : location ? "Guardar cambios" : "Crear sucursal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// MODAL DE NUEVA TRANSFERENCIA
// ==========================================
function NewTransferModal({
  locations,
  onClose,
  onSuccess,
}: {
  locations: LocationDetail[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const session = useAuthStore((s) => s.session);
  const activeLocation = useLocationStore((s) => s.activeLocation);

  const [origenId, setOrigenId] = useState(activeLocation?.id || "");
  const [destinoId, setDestinoId] = useState("");
  const [notes, setNotes] = useState("");
  const [availableItems, setAvailableItems] = useState<TransferItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ item: TransferItem; qty: number }[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeLocations = locations.filter((l) => l.isActive);

  useEffect(() => {
    if (!origenId || !session?.tenantId) return;
    setLoadingItems(true);
    setSelectedItems([]);
    transfersService
      .getVariantsWithStockAt(session.tenantId, origenId)
      .then((items) => setAvailableItems(items))
      .catch(console.error)
      .finally(() => setLoadingItems(false));
  }, [origenId, session?.tenantId]);

  const filteredItems = availableItems.filter(
    (i) =>
      !search ||
      i.productName.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      (i.colorName || "").toLowerCase().includes(search.toLowerCase())
  );

  function addItem(item: TransferItem) {
    const exists = selectedItems.find((s) => s.item.variantId === item.variantId);
    if (!exists) {
      setSelectedItems((prev) => [...prev, { item, qty: 1 }]);
    }
  }

  function removeItem(variantId: string) {
    setSelectedItems((prev) => prev.filter((s) => s.item.variantId !== variantId));
  }

  function updateQty(variantId: string, qty: number) {
    const found = selectedItems.find((s) => s.item.variantId === variantId);
    const max = found?.item.availableStock || 1;
    const clamped = Math.max(1, Math.min(qty, max));
    setSelectedItems((prev) =>
      prev.map((s) => (s.item.variantId === variantId ? { ...s, qty: clamped } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!origenId) return setError("Selecciona la sucursal de origen.");
    if (!destinoId) return setError("Selecciona la sucursal de destino.");
    if (origenId === destinoId) return setError("El origen y destino deben ser diferentes.");
    if (selectedItems.length === 0) return setError("Agrega al menos una guayabera a transferir.");
    if (!session) return;

    setSaving(true);
    try {
      const result = await transfersService.createTransfer({
        tenantId: session.tenantId,
        userId: session.userId,
        origenLocationId: origenId,
        destinoLocationId: destinoId,
        notes,
        items: selectedItems.map((s) => ({ variantId: s.item.variantId, quantity: s.qty })),
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Error al crear la transferencia.");
      }
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        <div className="bg-[#26302B] px-6 py-4 shrink-0">
          <h2 className="font-[Outfit] font-bold text-lg text-white">Nueva Transferencia de Stock</h2>
          <p className="font-[Outfit] text-xs text-[#8FA393]">
            Traspaso de mercancía entre sucursales.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                  Sucursal Origen <span className="text-[#B85450]">*</span>
                </label>
                <select
                  value={origenId}
                  onChange={(e) => setOrigenId(e.target.value)}
                  className="w-full border border-[#C9C4B8] rounded-xl px-3 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] bg-[#FAFAF8]"
                >
                  <option value="">Seleccionar...</option>
                  {activeLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                  Sucursal Destino <span className="text-[#B85450]">*</span>
                </label>
                <select
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full border border-[#C9C4B8] rounded-xl px-3 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] bg-[#FAFAF8]"
                >
                  <option value="">Seleccionar...</option>
                  {activeLocations
                    .filter((l) => l.id !== origenId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
              </div>
            </div>

            {origenId && (
              <div>
                <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                  Guayaberas disponibles en origen
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8FA393]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por modelo, color o SKU..."
                    className="w-full border border-[#C9C4B8] rounded-xl pl-9 pr-4 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] bg-[#FAFAF8]"
                  />
                </div>
                <div className="border border-[#E7E3DA] rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                  {loadingItems ? (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 border-2 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <p className="text-center py-6 text-xs text-[#8FA393] font-[Outfit]">
                      {availableItems.length === 0
                        ? "No hay existencias en esta sucursal."
                        : "Sin resultados para tu búsqueda."}
                    </p>
                  ) : (
                    filteredItems.map((item) => {
                      const alreadyAdded = selectedItems.some((s) => s.item.variantId === item.variantId);
                      return (
                        <div
                          key={item.variantId}
                          className={`flex items-center justify-between px-3 py-2.5 border-b border-[#F0EDE6] last:border-0 hover:bg-[#FAFAF8] transition-colors ${
                            alreadyAdded ? "opacity-40 pointer-events-none" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#26302B] font-[Outfit] truncate">{item.productName}</p>
                            <p className="text-[11px] text-[#8FA393] font-[Outfit]">
                              {[item.colorName, item.sizeName].filter(Boolean).join(" · ")} &nbsp;·&nbsp; SKU {item.sku}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-bold text-[#556B5D] font-[Outfit] bg-[#EEF1EE] px-2 py-0.5 rounded-lg">
                              {item.availableStock} pzas
                            </span>
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              disabled={alreadyAdded}
                              className="p-1.5 rounded-lg bg-[#556B5D] text-white hover:bg-[#455A4D] transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {selectedItems.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                  Detalle de la transferencia ({selectedItems.length} variante{selectedItems.length > 1 ? "s" : ""})
                </label>
                <div className="border border-[#E7E3DA] rounded-xl overflow-hidden">
                  {selectedItems.map((s) => (
                    <div
                      key={s.item.variantId}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-[#F0EDE6] last:border-0"
                    >
                      <Package className="w-4 h-4 text-[#8FA393] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#26302B] font-[Outfit] truncate">{s.item.productName}</p>
                        <p className="text-[11px] text-[#8FA393] font-[Outfit]">
                          {[s.item.colorName, s.item.sizeName].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => updateQty(s.item.variantId, s.qty - 1)} className="w-6 h-6 rounded-lg bg-[#F0EDE6] flex items-center justify-center font-bold text-[#556B5D] hover:bg-[#E0DDD6] text-sm">-</button>
                        <span className="w-8 text-center text-sm font-bold text-[#26302B] font-[Outfit]">{s.qty}</span>
                        <button type="button" onClick={() => updateQty(s.item.variantId, s.qty + 1)} className="w-6 h-6 rounded-lg bg-[#F0EDE6] flex items-center justify-center font-bold text-[#556B5D] hover:bg-[#E0DDD6] text-sm">+</button>
                        <button type="button" onClick={() => removeItem(s.item.variantId)} className="p-1 rounded-lg hover:bg-red-50 ml-1">
                          <Trash2 className="w-3.5 h-3.5 text-[#B85450]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#26302B] mb-1.5 font-[Outfit]">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej. Mercancía para surtir Tienda Centro"
                className="w-full border border-[#C9C4B8] rounded-xl px-4 py-2.5 text-sm font-[Outfit] text-[#26302B] focus:outline-none focus:border-[#556B5D] resize-none bg-[#FAFAF8]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#B85450] font-[Outfit] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-[#F0EDE6] flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#C9C4B8] rounded-xl py-2.5 text-sm font-semibold font-[Outfit] text-[#556B5D] hover:bg-[#F0EDE6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || selectedItems.length === 0}
              className="flex-1 bg-[#556B5D] hover:bg-[#455A4D] text-white rounded-xl py-2.5 text-sm font-semibold font-[Outfit] transition-colors disabled:opacity-60"
            >
              {saving ? "Procesando..." : "Confirmar transferencia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// TARJETA DE TRANSFERENCIA
// ==========================================
function TransferCard({ transfer }: { transfer: TransferRecord }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[transfer.status] || statusConfig.pendiente;

  return (
    <div className="bg-white rounded-2xl border border-[#E7E3DA] shadow-sm overflow-hidden">
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer hover:bg-[#FAFAF8] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-[#EEF1EE] shrink-0">
            <ArrowLeftRight className="w-4 h-4 text-[#556B5D]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-[Outfit] font-bold text-sm text-[#26302B]">{transfer.origenLocationName}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8FA393] shrink-0" />
              <span className="font-[Outfit] font-bold text-sm text-[#26302B]">{transfer.destinoLocationName}</span>
            </div>
            <p className="text-[11px] text-[#8FA393] font-[Outfit] mt-0.5">
              {transfer.folio} · {new Date(transfer.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
              {" · "}{transfer.items.reduce((a, i) => a + i.quantity, 0)} pzas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold font-[Outfit] px-2.5 py-1 rounded-full border ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#8FA393]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8FA393]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#F0EDE6] px-4 pb-4 pt-3">
          {transfer.notes && (
            <p className="text-xs text-[#6B7A71] font-[Outfit] mb-3 italic">Nota: {transfer.notes}</p>
          )}
          <div className="space-y-2">
            {transfer.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs font-[Outfit]">
                <span className="text-[#26302B]">
                  {item.productName}
                  {item.colorName ? ` · ${item.colorName}` : ""}
                  {item.sizeName ? ` · ${item.sizeName}` : ""}
                </span>
                <span className="font-bold text-[#556B5D] bg-[#EEF1EE] px-2 py-0.5 rounded-lg">
                  {item.quantity} pzas
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// PÁGINA CONSOLIDADA DE SUCURSALES Y TRASPASOS
// ==========================================
export default function SucursalesUnificadasPage() {
  const session = useAuthStore((s) => s.session);
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"sucursales" | "transferencias">(
    activeTabParam === "transferencias" ? "transferencias" : "sucursales"
  );

  // Estados Sucursales
  const [locations, setLocations] = useState<LocationDetail[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationDetail | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Estados Transferencias
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);

  async function fetchLocations() {
    if (!session?.tenantId) return;
    try {
      const data = await locationsService.getLocations(session.tenantId);
      setLocations(data);
    } catch (err) {
      console.error("Error al cargar sucursales:", err);
    } finally {
      setLoadingLocations(false);
    }
  }

  async function fetchTransfers() {
    if (!session?.tenantId) return;
    try {
      const trs = await transfersService.getTransfers(session.tenantId);
      setTransfers(trs);
    } catch (err) {
      console.error("Error al cargar transferencias:", err);
    } finally {
      setLoadingTransfers(false);
    }
  }

  useEffect(() => {
    fetchLocations();
    fetchTransfers();
  }, [session?.tenantId]);

  function handleTabChange(tab: "sucursales" | "transferencias") {
    setActiveTab(tab);
    router.replace(`/sucursales?tab=${tab}`);
  }

  async function handleToggleActive(loc: LocationDetail) {
    setTogglingId(loc.id);
    try {
      await locationsService.updateLocation(loc.id, { isActive: !loc.isActive });
      await fetchLocations();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount = locations.filter((l) => l.isActive).length;
  const totalStock = locations.reduce((acc, l) => acc + (l.totalStock || 0), 0);
  const totalPiezasTrasladadas = transfers
    .filter((t) => t.status === "completada")
    .reduce((acc, t) => acc + t.items.reduce((a, i) => a + i.quantity, 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-[Outfit]">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl text-[#26302B]">Sucursales & Traspasos</h1>
          <p className="text-sm text-[#6B7A71]">
            Gestión de tiendas físicas, taller y transferencias de inventario
          </p>
        </div>

        {/* Botón según la pestaña activa */}
        {activeTab === "sucursales" ? (
          <button
            onClick={() => {
              setEditingLocation(null);
              setShowLocationModal(true);
            }}
            className="flex items-center gap-2 bg-[#556B5D] hover:bg-[#455A4D] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva sucursal
          </button>
        ) : (
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 bg-[#556B5D] hover:bg-[#455A4D] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva transferencia
          </button>
        )}
      </div>

      {/* Pestañas de Selector */}
      <div className="flex border-b border-[#E7E3DA] gap-6">
        <button
          onClick={() => handleTabChange("sucursales")}
          className={`flex items-center gap-2 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === "sucursales"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#8FA393] hover:text-[#26302B]"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Mis Sucursales ({locations.length})
        </button>
        <button
          onClick={() => handleTabChange("transferencias")}
          className={`flex items-center gap-2 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === "transferencias"
              ? "border-[#556B5D] text-[#556B5D]"
              : "border-transparent text-[#8FA393] hover:text-[#26302B]"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Transferencias de Stock ({transfers.length})
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: SUCURSALES */}
      {activeTab === "sucursales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#8FA393] uppercase tracking-wide">Sucursales activas</p>
              <p className="text-3xl font-bold text-[#556B5D] mt-1">{activeCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#8FA393] uppercase tracking-wide">Total sucursales</p>
              <p className="text-3xl font-bold text-[#26302B] mt-1">{locations.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-4 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold text-[#8FA393] uppercase tracking-wide">Stock total empresa</p>
              <p className="text-3xl font-bold text-[#C49A5A] mt-1">{totalStock.toLocaleString()}</p>
              <p className="text-[10px] text-[#8FA393] mt-0.5">piezas en todas las sucursales</p>
            </div>
          </div>

          {loadingLocations ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : locations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-12 text-center shadow-sm">
              <Building2 className="w-12 h-12 text-[#C9C4B8] mx-auto mb-3" />
              <p className="font-bold text-[#26302B] text-lg">Sin sucursales registradas</p>
              <p className="text-sm text-[#8FA393] mt-1 mb-4">
                Agrega tu primera sucursal o tienda para empezar a gestionar tu inventario por ubicación.
              </p>
              <button
                onClick={() => setShowLocationModal(true)}
                className="inline-flex items-center gap-2 bg-[#556B5D] text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                Crear primera sucursal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className={`bg-white rounded-2xl border shadow-sm transition-all ${
                    loc.isActive ? "border-[#E7E3DA]" : "border-[#E7E3DA] opacity-60"
                  }`}
                >
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${loc.isActive ? "bg-[#EEF1EE]" : "bg-[#F0EDE6]"}`}>
                        <Building2 className={`w-5 h-5 ${loc.isActive ? "text-[#556B5D]" : "text-[#8FA393]"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#26302B] text-base">{loc.name}</span>
                          {!loc.isActive && (
                            <span className="text-[10px] bg-[#F0EDE6] text-[#8FA393] font-semibold px-2 py-0.5 rounded-full">
                              Inactiva
                            </span>
                          )}
                        </div>
                        {loc.description && (
                          <p className="text-xs text-[#6B7A71] mt-0.5">{loc.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {loc.phone && (
                            <span className="flex items-center gap-1 text-xs text-[#6B7A71]">
                              <Phone className="w-3 h-3" />
                              {loc.phone}
                            </span>
                          )}
                          {loc.address && (
                            <span className="flex items-center gap-1 text-xs text-[#6B7A71]">
                              <MapPin className="w-3 h-3" />
                              {loc.address}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs font-semibold text-[#556B5D]">
                            <Package className="w-3 h-3" />
                            {(loc.totalStock || 0).toLocaleString()} pzas en stock
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingLocation(loc);
                          setShowLocationModal(true);
                        }}
                        className="p-2 rounded-xl border border-[#C9C4B8] bg-[#F8F6F1] hover:bg-[#E7E3DA] transition-colors"
                        title="Editar sucursal"
                      >
                        <Pencil className="w-4 h-4 text-[#556B5D]" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(loc)}
                        disabled={togglingId === loc.id}
                        className={`p-2 rounded-xl border transition-colors disabled:opacity-50 ${
                          loc.isActive
                            ? "border-[#556B5D] bg-[#EEF1EE] hover:bg-[#D5E0D7]"
                            : "border-[#C9C4B8] bg-[#F8F6F1] hover:bg-[#E7E3DA]"
                        }`}
                        title={loc.isActive ? "Desactivar sucursal" : "Activar sucursal"}
                      >
                        {loc.isActive ? (
                          <ToggleRight className="w-4 h-4 text-[#556B5D]" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-[#8FA393]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: TRANSFERENCIAS */}
      {activeTab === "transferencias" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#8FA393] uppercase tracking-wide">Total Traspasos</p>
              <p className="text-3xl font-bold text-[#26302B] mt-1">{transfers.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#8FA393] uppercase tracking-wide">Completados</p>
              <p className="text-3xl font-bold text-[#3F7D58] mt-1">
                {transfers.filter((t) => t.status === "completada").length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#8FA393] uppercase tracking-wide">Piezas Trasladadas</p>
              <p className="text-3xl font-bold text-[#C49A5A] mt-1">{totalPiezasTrasladadas.toLocaleString()}</p>
            </div>
          </div>

          {loadingTransfers ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E7E3DA] p-12 text-center shadow-sm">
              <ArrowLeftRight className="w-12 h-12 text-[#C9C4B8] mx-auto mb-3" />
              <p className="font-bold text-[#26302B] text-lg">Sin transferencias registradas</p>
              <p className="text-sm text-[#8FA393] mt-1 mb-4">
                Crea tu primera transferencia para mover mercancía entre tus sucursales.
              </p>
              <button
                onClick={() => setShowTransferModal(true)}
                className="inline-flex items-center gap-2 bg-[#556B5D] text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                Nueva transferencia
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => (
                <TransferCard key={t.id} transfer={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {showLocationModal && (
        <LocationModal
          location={editingLocation}
          onClose={() => setShowLocationModal(false)}
          onSave={fetchLocations}
        />
      )}

      {showTransferModal && (
        <NewTransferModal
          locations={locations}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            fetchTransfers();
            fetchLocations();
          }}
        />
      )}
    </div>
  );
}
