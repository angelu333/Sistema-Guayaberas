"use client";

import { useState } from "react";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface NewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierCreated: (supplier: {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    type: "taller" | "telas" | "insumos" | "bordado" | "otro";
    city?: string;
    notes?: string;
  }) => Promise<void>;
}

export function NewSupplierModal({
  isOpen,
  onClose,
  onSupplierCreated,
}: NewSupplierModalProps) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"taller" | "telas" | "insumos" | "bordado" | "otro">("telas");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    await onSupplierCreated({
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      type,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Nuevo Proveedor / Taller</h2>
              <p className="text-xs text-[#6B7A71]">Registro de proveedor de telas, insumos o taller</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Nombre de la Empresa / Proveedor *
            </label>
            <input
              type="text"
              placeholder="Ej. Telería Textil Mérida S.A."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] font-semibold focus:outline-none focus:border-[#556B5D]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Tipo de Proveedor
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              >
                <option value="telas">Telas / Textil</option>
                <option value="insumos">Insumos (Botones/Hilos)</option>
                <option value="taller">Taller / Sastre</option>
                <option value="bordado">Bordados</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Contacto Principal
              </label>
              <input
                type="text"
                placeholder="Don José López"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                placeholder="999 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
                Ciudad / Ubicación
              </label>
              <input
                type="text"
                placeholder="Mérida, Yucatán"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="contacto@teleriamerida.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Notas u Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Descuento del 5% en compras superiores a $10,000 MXN..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-white text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Proveedor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
