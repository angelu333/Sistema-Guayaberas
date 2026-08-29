import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthSessionData } from "@/services/auth.service";

interface AuthState {
  session: AuthSessionData | null;
  isLoading: boolean;
  setSession: (session: AuthSessionData | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: false,
      setSession: (session) => set({ session, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        set({ session: null, isLoading: false });
        if (typeof window !== "undefined") {
          localStorage.removeItem("guayabera-auth-storage");
        }
      },
    }),
    {
      name: "guayabera-auth-storage",
    }
  )
);

