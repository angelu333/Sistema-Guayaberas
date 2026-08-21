"use client";

import { useRouter } from "next/navigation";
import { Search, LogOut, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);

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
    <header className="bg-white border-b border-[#DDD9D0] px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
      {/* Titulo de la Seccion */}
      <div>
        {title && (
          <h1 className="text-xl font-bold text-[#26302B] font-[Outfit] tracking-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-xs text-[#6B7A71] mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Acciones del Header */}
      <div className="flex items-center gap-3">
        {/* Buscador global (Proximamente funcional en Etapa 3) */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
          <input
            type="text"
            placeholder="Buscar modelo, SKU, cliente..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#DDD9D0] bg-[#F8F6F1] text-xs text-[#26302B] placeholder:text-[#9DAAA2] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 focus:border-[#556B5D]"
          />
        </div>

        {/* Ver Catalogo Publico */}
        <a
          href="/catalogo"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#8FA393] text-xs font-medium text-[#556B5D] hover:bg-[#EBF0EC] transition-colors"
        >
          <span>Catálogo Público</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Boton Cerrar Sesion */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-[#B85450] hover:bg-[#FAEAEA] hover:text-[#B85450]"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}
