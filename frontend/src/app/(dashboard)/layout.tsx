"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (!session) {
        try {
          const currentSession = await authService.getCurrentSession();
          if (currentSession) {
            setSession(currentSession);
          } else {
            router.push("/login");
          }
        } catch {
          router.push("/login");
        }
      }
      setCheckingAuth(false);
    }

    verifyAuth();
  }, [session, setSession, router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-[#6B7A71] font-[Outfit]">
          Cargando entorno de trabajo...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar />

      {/* Area de contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
