import { create } from "zustand";
import { AuthSessionData } from "@/services/auth.service";

interface AuthState {
  session: AuthSessionData | null;
  isLoading: boolean;
  setSession: (session: AuthSessionData | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ session: null, isLoading: false }),
}));
