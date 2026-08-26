"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  Factory,
  BarChart3,
  Settings,
  Share2,
  X,
  Building2,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { LocationSelector } from "@/components/layout/LocationSelector";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
  },
  {
    label: "Punto de Venta (POS)",
    href: "/pos",
    icon: <ShoppingCart className="w-[18px] h-[18px]" />,
  },
  {
    label: "Inventario & Productos",
    href: "/inventario",
    icon: <Boxes className="w-[18px] h-[18px]" />,
  },
  {
    label: "Sucursales & Traspasos",
    href: "/sucursales",
    icon: <Building2 className="w-[18px] h-[18px]" />,
    roles: ["admin"],
  },
  {
    label: "Ventas & Cotizaciones",
    href: "/ventas",
    icon: <Receipt className="w-[18px] h-[18px]" />,
  },
  {
    label: "Taller & Producción",
    href: "/produccion",
    icon: <Factory className="w-[18px] h-[18px]" />,
    roles: ["admin", "production"],
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: <Users className="w-[18px] h-[18px]" />,
  },
  {
    label: "Catálogo Digital",
    href: "/catalogo",
    icon: <Share2 className="w-[18px] h-[18px]" />,
  },
  {
    label: "Reportes & Auditoría",
    href: "/reportes",
    icon: <BarChart3 className="w-[18px] h-[18px]" />,
    roles: ["admin"],
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: <Settings className="w-[18px] h-[18px]" />,
    roles: ["admin"],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { session } = useAuthStore();
  const { tenant } = useTenantStore();
  const userRole = session?.role || "seller";

  const tenantSlug =
    tenant?.slug ||
    session?.companyName?.toLowerCase().replace(/\s+/g, "-") ||
    "guayabera-test";

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full font-[Outfit]">
      {/* Branding Superior */}
      <div>
        <div className="p-4 border-b border-[#38463F] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#556B5D] flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 overflow-hidden p-1 border border-[#38463F]">
              {tenant?.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span>{tenant?.name?.slice(0, 1).toUpperCase() || session?.companyName?.slice(0, 1).toUpperCase() || "G"}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-white truncate tracking-tight">
                {tenant?.name || session?.companyName || "Guayabera Manager"}
              </h1>
              <span className="block text-xs text-[#8FA393] truncate font-medium">
                Plataforma de Gestión
              </span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-[#8FA393] hover:text-white rounded-lg hover:bg-[#323F38] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navegación Principal Confortable */}
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
          {filteredNavItems.map((item) => {
            const targetHref = item.href === "/catalogo" ? `/catalogo/${tenantSlug}` : item.href;
            const isActive =
              pathname === targetHref || (item.href !== "/" && pathname.startsWith(`${item.href}`));

            return (
              <Link
                key={item.href}
                href={targetHref}
                onClick={onCloseMobile}
                className={[
                  "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-[#556B5D] text-white shadow-sm font-bold"
                    : "text-[#D0C9BD] hover:bg-[#323F38] hover:text-white",
                ].join(" ")}
              >
                <span className={isActive ? "text-white" : "text-[#8FA393]"}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pie del Sidebar: Selector de Sucursal + Perfil de Usuario */}
      <div className="border-t border-[#38463F] bg-[#1E2622] p-3.5 space-y-3">
        {/* Selector de Sucursal Integrado */}
        <LocationSelector isSidebar />

        {/* Perfil del Usuario */}
        <div className="flex items-center gap-3 pt-1 border-t border-[#38463F]/50">
          <div className="w-8 h-8 rounded-full bg-[#8FA393] text-[#26302B] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {session?.fullName ? session.fullName.slice(0, 2).toUpperCase() : "US"}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-white truncate">
              {session?.fullName || "Usuario"}
            </span>
            <span className="block text-[10px] text-[#8FA393] uppercase tracking-wider font-semibold">
              {session?.role === "admin"
                ? "Administrador"
                : session?.role === "production"
                ? "Producción"
                : "Vendedor"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Sidebar Fijo en Escritorio (Desktop ampliado) */}
      <aside className="hidden lg:flex w-64 bg-[#26302B] text-[#E7E3DA] flex-col justify-between flex-shrink-0 h-screen sticky top-0 border-r border-[#38463F] z-20">
        {sidebarContent}
      </aside>

      {/* 2. Drawer Deslizante Móvil (Mobile / Tablet) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#26302B] text-[#E7E3DA] flex flex-col justify-between shadow-2xl border-r border-[#38463F] animate-slide-right">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
