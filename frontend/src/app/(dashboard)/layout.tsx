"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const setTenant = useTenantStore((state) => state.setTenant);
  // Si ya tenemos sesión persistida, no bloquear la pantalla con spinner
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            logoUrl: currentSession.logoUrl || null,
            whatsapp: null,
            isActive: true,
            createdAt: "",
          });

          // Control de acceso por rol (RBAC)
          const role = currentSession.role;
          if (role === "seller") {
            const adminOnlyPaths = [
              "/dashboard",
              "/produccion",
              "/insumos",
              "/reportes",
              "/configuracion",
              "/sucursales",
              "/auditoria",
              "/compras",
            ];
            if (adminOnlyPaths.some((p) => pathname.startsWith(p))) {
              router.push("/pos");
            }
          } else if (role === "production") {
            const sellerOrAdminPaths = [
              "/pos",
              "/ventas",
              "/cotizaciones",
              "/clientes",
              "/sucursales",
              "/configuracion",
              "/reportes",
            ];
            if (sellerOrAdminPaths.some((p) => pathname.startsWith(p))) {
              router.push("/produccion");
            }
          }
        } else if (!session) {
          // Si no hay sesión ni local ni remota, redirigir al login
          router.push("/login");
        }
      } catch (err) {
        console.error("Error al verificar autenticación:", err);
        if (!session && isMounted) router.push("/login");
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);


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
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col lg:flex-row">
      {/* 1. Sidebar (Desktop fijo / Mobile off-canvas drawer) */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Contenedor de contenido y Barra Móvil Superior */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior solo en celulares y tablets */}
        <header className="lg:hidden bg-[#26302B] text-white px-4 py-3 flex items-center justify-between border-b border-[#38463F] sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-[#E7E3DA] hover:bg-[#323F38] transition-colors flex items-center justify-center"
            title="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#556B5D] flex items-center justify-center text-white font-bold text-xs font-[Outfit]">
              G
            </div>
            <span className="font-[Outfit] font-bold text-sm text-white tracking-tight truncate max-w-[180px]">
              {session?.companyName || "Guayabera Manager"}
            </span>
          </div>

          <div className="w-7 h-7 rounded-full bg-[#8FA393] text-[#26302B] font-bold text-xs flex items-center justify-center font-[Outfit]">
            {session?.fullName ? session.fullName.slice(0, 2).toUpperCase() : "US"}
          </div>
        </header>

        {/* Contenido principal de la página */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
