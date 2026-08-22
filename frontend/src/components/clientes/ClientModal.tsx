"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, AlertCircle, Percent, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { clientsService } from "@/services/clients.service";
import type { Client, ClientType } from "@/types/domain.types";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
}

export function ClientModal({
  isOpen,
  onClose,
  onSuccess,
  clientToEdit,
}: ClientModalProps) {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<ClientType>("regular");
  const [company, setCompany] = useState("");
  const [rfc, setRfc] = useState("");
  const [address, setAddress] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (clientToEdit) {
      setFullName(clientToEdit.fullName || "");
      setPhone(clientToEdit.phone || "");
      setEmail(clientToEdit.email || "");
      setType(clientToEdit.type || "regular");
      setCompany(clientToEdit.company || "");
      setRfc(clientToEdit.rfc || "");
      setAddress(clientToEdit.address || "");
      setDiscountPercent(clientToEdit.discountPercent || 0);
      setNotes(clientToEdit.notes || "");
    } else {
      setFullName("");
      setPhone("");
      setEmail("");
      setType("regular");
      setCompany("");
      setRfc("");
      setAddress("");
      setDiscountPercent(0);
      setNotes("");
    }
    setErrorMsg(null);
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTenantId) {
      setErrorMsg("Sesión no válida.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg("El nombre del cliente es obligatorio.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    let res;
    if (clientToEdit) {
      res = await clientsService.updateClient({
        id: clientToEdit.id,
        tenantId: effectiveTenantId,
        fullName,
        phone,
        email,
        type,
        company,
        rfc,
        address,
        discountPercent,
        notes,
      });
    } else {
      res = await clientsService.createClient({
        tenantId: effectiveTenantId,
        fullName,
        phone,
        email,
        type,
        company,
        rfc,
        address,
        discountPercent,
        notes,
      });
    }

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || "Ocurrió un error al guardar el cliente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#DDD9D0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#26302B]">
                {clientToEdit ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <p className="text-xs text-[#6B7A71]">
                {clientToEdit ? "Actualiza la información del cliente" : "Registra un nuevo cliente regular o mayorista"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-[#B85450] bg-[#FAEAEA] border border-[#B85450]/20 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tipo de cliente */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-2">
              Tipo de Cliente
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType("regular");
                  if (!clientToEdit) setDiscountPercent(0);
                }}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  type === "regular"
                    ? "bg-[#EBF5F0] border-[#3F7D58] text-[#3F7D58] shadow-xs"
                    : "bg-white border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
                }`}
              >
                Cliente Regular
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("wholesale");
                  if (!clientToEdit && discountPercent === 0) setDiscountPercent(10);
                }}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  type === "wholesale"
                    ? "bg-[#FDF5E4] border-[#D89B2B] text-[#D89B2B] shadow-xs"
                    : "bg-white border-[#DDD9D0] text-[#6B7A71] hover:bg-[#F8F6F1]"
                }`}
              >
                Cliente Mayorista ⭐
              </button>
            </div>
          </div>

          {/* Nombre Completo */}
          <Input
            label="Nombre Completo *"
            placeholder="Ej. Juan Pérez López"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          {/* Teléfono y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Teléfono"
              placeholder="Ej. 999 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="cliente@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Empresa y RFC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Empresa / Negocio"
              placeholder="Ej. Guayaberas del Mayab"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Input
              label="RFC"
              placeholder="Ej. GUM900101XXX"
              value={rfc}
              onChange={(e) => setRfc(e.target.value)}
            />
          </div>

          {/* Descuento por defecto */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Porcentaje de Descuento (%)</span>
              {type === "wholesale" && (
                <span className="text-[#D89B2B] text-[11px]">Se aplicará auto en POS</span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="0"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#DDD9D0] rounded-lg bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
              <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5">
              Dirección Fiscal / Entrega
            </label>
            <input
              type="text"
              placeholder="Calle, número, colonia, ciudad..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#DDD9D0] rounded-lg bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Preferencias de compra, condiciones de crédito, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#DDD9D0] rounded-lg bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDD9D0]">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {clientToEdit ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
