"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const setTenant = useTenantStore((state) => state.setTenant);
  const [checkingAuth, setCheckingAuth] = useState(!session);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      try {
        const currentSession = await authService.getCurrentSession();
        if (!isMounted) return;

        if (currentSession) {
          setSession(currentSession);
          setTenant({
            id: currentSession.tenantId,
            name: currentSession.companyName,
            slug: currentSession.tenantSlug || "",
            rfc: null,
            phone: null,
            email: currentSession.email,
            address: null,
            logoUrl: null,
            whatsapp: null,
            isActive: true,
            createdAt: "",
          });
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Error al verificar autenticación:", err);
        if (isMounted) router.push("/login");
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Se ejecuta una sola vez al montar el layout principal

  if (checkingAuth && !session) {
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
