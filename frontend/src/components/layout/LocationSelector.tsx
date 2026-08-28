"use client";

import { useEffect, useState, useRef } from "react";
import { MapPin, ChevronDown, Check, Building2 } from "lucide-react";
import { locationsService } from "@/services/locations.service";
import { useLocationStore } from "@/stores/location.store";
import { useAuthStore } from "@/stores/auth.store";

export function LocationSelector({ isSidebar = false }: { isSidebar?: boolean }) {
  const session = useAuthStore((s) => s.session);
  const { activeLocation, setActiveLocation } = useLocationStore();
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isLockedToBranch = session?.role === "seller" && !!session?.locationId;

  useEffect(() => {
    if (!session?.tenantId) return;
    locationsService
      .getLocations(session.tenantId)
      .then((locs) => {
        const active = locs.filter((l) => l.isActive);
        setLocations(active);

        // Si el usuario tiene una sucursal asignada fija
        if (session?.locationId) {
          const userLoc = active.find((l) => l.id === session.locationId);
          if (userLoc) {
            setActiveLocation({ id: userLoc.id, name: userLoc.name });
            return;
          }
        }

        // Si no hay sucursal activa seleccionada, seleccionar la primera
        if (!activeLocation && active.length > 0) {
          setActiveLocation({ id: active[0].id, name: active[0].name });
        }
      })
      .catch(console.error);
  }, [session?.tenantId, session?.locationId]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => {
          if (!isLockedToBranch) setOpen((v) => !v);
        }}
        disabled={isLockedToBranch}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-[Outfit] shadow-xs ${
          isSidebar
            ? "border-[#38463F] bg-[#1E2622] text-[#E7E3DA] hover:bg-[#2A342F]"
            : "border-[#C9C4B8] bg-white text-[#26302B] hover:bg-[#F0EDE6]"
        } ${isLockedToBranch ? "cursor-default opacity-90" : ""}`}
        title={isLockedToBranch ? "Sucursal asignada fija" : "Cambiar sucursal activa"}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSidebar ? "text-[#8FA393]" : "text-[#556B5D]"}`} />
          <div className="flex flex-col text-left min-w-0">
            <span className={`text-[10px] uppercase font-semibold tracking-wider ${isSidebar ? "text-[#8FA393]" : "text-[#8FA393]"}`}>
              {isLockedToBranch ? "Tu Sucursal Asignada" : "Sucursal Activa"}
            </span>
            <span className="truncate font-bold">
              {activeLocation?.name || "Seleccionar..."}
            </span>
          </div>
        </div>
        {!isLockedToBranch && (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSidebar ? "text-[#8FA393]" : "text-[#8FA393]"} ${open ? "rotate-180" : ""}`} />
        )}
      </button>


      {open && (
        <div className={`absolute bottom-full left-0 mb-2 w-full rounded-xl shadow-xl z-50 overflow-hidden py-1 border font-[Outfit] ${
          isSidebar ? "bg-[#1E2622] border-[#38463F] text-white" : "bg-white border-[#E7E3DA] text-[#26302B]"
        }`}>
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8FA393]">
            Cambiar de tienda / ubicación
          </p>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setActiveLocation({ id: loc.id, name: loc.name });
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                isSidebar
                  ? activeLocation?.id === loc.id
                    ? "bg-[#556B5D] text-white font-semibold"
                    : "text-[#E7E3DA] hover:bg-[#2A342F]"
                  : activeLocation?.id === loc.id
                    ? "bg-[#F0EDE6] text-[#556B5D] font-semibold"
                    : "text-[#26302B] hover:bg-[#F0EDE6]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-[#8FA393]" />
              <span className="flex-1 text-left truncate">{loc.name}</span>
              {activeLocation?.id === loc.id && (
                <Check className="w-3.5 h-3.5 text-[#8FA393] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
