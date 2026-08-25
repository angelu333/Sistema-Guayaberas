"use client";

import { useState } from "react";
import { X, Sliders, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { WholesaleTier } from "@/services/quotes.service";

interface WholesaleTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiers: WholesaleTier[];
}

export function WholesaleTierModal({
  isOpen,
  onClose,
  tiers,
}: WholesaleTierModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#556B5D]" />
            <div>
              <h2 className="text-base font-bold text-[#26302B]">Escalas de Mayoreo y Descuentos</h2>
              <p className="text-xs text-[#6B7A71]">Descuentos por volumen de guayaberas solicitadas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#3F7D58] shrink-0 mt-0.5" />
            <p className="text-[#26302B] text-xs leading-relaxed">
              El sistema detecta automáticamente la cantidad total de guayaberas en la cotización y aplica el descuento correspondiente a todas las piezas.
            </p>
          </div>

          <div className="space-y-2">
            {tiers.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 bg-[#F8F6F1] rounded-xl border border-[#DDD9D0]"
              >
                <div>
                  <span className="font-bold text-[#26302B] text-sm block">{t.name}</span>
                  <span className="text-[#6B7A71] text-xs">
                    Rango: <strong>{t.minQuantity}</strong> a{" "}
                    <strong>{t.maxQuantity ? `${t.maxQuantity} pzas` : "o más piezas"}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold font-mono text-[#3F7D58]">
                    {t.discountPercent}% OFF
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#DDD9D0] flex justify-end">
            <Button onClick={onClose}>Entendido</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
