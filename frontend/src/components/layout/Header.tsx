"use client";

import { useRouter } from "next/navigation";
import { Search, LogOut, ExternalLink, Shirt } from "lucide-react";

import { Button } from "@/components/ui";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const tenant = useTenantStore((state) => state.tenant);

  const tenantSlug =
    tenant?.slug ||
    session?.companyName?.toLowerCase().replace(/\s+/g, "-") ||
    "guayabera-test";

  const companyName = tenant?.name || session?.companyName || "Guayaberas Ábito & Montejo";

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      router.push("/login");
    } catch (err) {
      console.error("Error al cerrar sesion", err);
    }
  };

  return (
    <header className="bg-white border-b border-[#DDD9D0] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
      {/* 1. Izquierda: Título de la Sección */}
      <div className="min-w-0 flex-1">
        {title && (
          <h1 className="text-lg sm:text-xl font-bold text-[#26302B] font-[Outfit] tracking-tight truncate">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-[#6B7A71] truncate">{subtitle}</p>
        )}
      </div>

      {/* 2. CENTRO: Logo de la Empresa Destacado */}
      <div className="flex items-center justify-center shrink-0 px-3 py-1">
        {tenant?.logoUrl ? (
          <img
            src={tenant.logoUrl}
            alt={companyName}
            className="h-14 sm:h-16 md:h-20 max-w-[260px] sm:max-w-[340px] object-contain drop-shadow-sm transition-transform hover:scale-103"
          />
        ) : (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#FAF7F2] rounded-2xl border border-[#DDD9D0] shadow-sm hover:border-[#556B5D] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#556B5D] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {companyName.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-extrabold text-sm sm:text-base text-[#26302B] font-[Outfit] tracking-tight block leading-tight truncate max-w-[240px]">
                {companyName}
              </span>
              <span className="text-[10px] text-[#556B5D] font-bold uppercase tracking-wider block mt-0.5">
                Plataforma de Gestión
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Derecha: Acciones del Header */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1">
        {/* Buscador global */}
        <div className="relative hidden xl:block w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
          <input
            type="text"
            placeholder="Buscar SKU, cliente..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#DDD9D0] bg-[#F8F6F1] text-xs text-[#26302B] placeholder:text-[#9DAAA2] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 focus:border-[#556B5D]"
          />
        </div>

        {/* Ver Catálogo Público */}
        <a
          href={`/catalogo/${tenantSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8FA393] text-xs font-semibold text-[#556B5D] bg-white hover:bg-[#EBF0EC] transition-all shadow-xs"
        >
          <span>Catálogo Público</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Botón Cerrar Sesión */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-[#B85450] hover:bg-[#FAEAEA] hover:text-[#B85450] rounded-xl text-xs px-2.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline ml-1">Salir</span>
        </Button>
      </div>
    </header>
  );
}
