import { create } from "zustand";
import { Tenant, TenantSettings } from "@/types/domain.types";

interface TenantState {
  tenant: Tenant | null;
  settings: TenantSettings | null;
  setTenant: (tenant: Tenant | null) => void;
  setSettings: (settings: TenantSettings | null) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  settings: null,
  setTenant: (tenant) => set({ tenant }),
  setSettings: (settings) => set({ settings }),
}));
