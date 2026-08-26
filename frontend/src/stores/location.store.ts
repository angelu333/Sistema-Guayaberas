import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveLocation {
  id: string;
  name: string;
}

interface LocationStore {
  activeLocation: ActiveLocation | null;
  setActiveLocation: (location: ActiveLocation | null) => void;
  clearLocation: () => void;
}

/**
 * Store de Zustand para gestionar la sucursal/ubicación activa de trabajo.
 * Se persiste en localStorage para mantener la selección entre recargas.
 */
export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      activeLocation: null,
      setActiveLocation: (location) => set({ activeLocation: location }),
      clearLocation: () => set({ activeLocation: null }),
    }),
    {
      name: "guayabera-active-location",
    }
  )
);
