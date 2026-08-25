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
  ShieldCheck,
  Share2,
  ShoppingBag,
  Layers,
  FileText,
  X,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

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
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: "POS / Ventas",
    href: "/pos",
    icon: <ShoppingCart className="w-4 h-4" />,
  },
  {
    label: "Inventario",
    href: "/inventario",
    icon: <Boxes className="w-4 h-4" />,
  },
  {
    label: "Productos",
    href: "/productos",
    icon: <Package className="w-4 h-4" />,
  },
  {
    label: "Historial Ventas",
    href: "/ventas",
    icon: <Receipt className="w-4 h-4" />,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: "Catálogo Público",
    href: "/catalogo",
    icon: <Share2 className="w-4 h-4" />,
  },
  {
    label: "Producción",
    href: "/produccion",
    icon: <Factory className="w-4 h-4" />,
    roles: ["admin", "production"],
  },
  {
    label: "Compras",
    href: "/compras",
    icon: <ShoppingBag className="w-4 h-4" />,
    roles: ["admin"],
  },
  {
    label: "Materias Primas",
    href: "/insumos",
    icon: <Layers className="w-4 h-4" />,
    roles: ["admin", "production"],
  },
  {
    label: "Cotizaciones",
    href: "/cotizaciones",
    icon: <FileText className="w-4 h-4" />,
    roles: ["admin", "seller"],
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["admin"],
  },
  {
    label: "Auditoría",
    href: "/auditoria",
    icon: <ShieldCheck className="w-4 h-4" />,
    roles: ["admin"],
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: <Settings className="w-4 h-4" />,
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
    <div className="flex flex-col justify-between h-full">
      {/* Branding Superior */}
      <div>
        <div className="p-5 border-b border-[#38463F] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#556B5D] flex items-center justify-center text-white font-bold font-[Outfit] text-lg shadow-sm shrink-0">
              G
            </div>
            <div className="min-w-0">
              <h1 className="font-[Outfit] font-bold text-base text-white truncate tracking-tight">
                {session?.companyName || "Guayabera Manager"}
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

        {/* Navegacion Principal */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
          {filteredNavItems.map((item) => {
            const targetHref = item.href === "/catalogo" ? `/catalogo/${tenantSlug}` : item.href;
            const isActive =
              pathname === targetHref || pathname.startsWith(`${targetHref}/`);

            return (
              <Link
                key={item.href}
                href={targetHref}
                onClick={onCloseMobile}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#556B5D] text-white shadow-sm font-semibold"
                    : "text-[#D0C9BD] hover:bg-[#323F38] hover:text-white",
                ].join(" ")}
              >
                <span className={isActive ? "text-white" : "text-[#8FA393]"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Perfil del Usuario al Pie */}
      <div className="p-4 border-t border-[#38463F] bg-[#1E2622]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8FA393] text-[#26302B] font-bold text-xs flex items-center justify-center font-[Outfit] shrink-0">
            {session?.fullName ? session.fullName.slice(0, 2).toUpperCase() : "US"}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-white truncate">
              {session?.fullName || "Usuario"}
            </span>
            <span className="block text-[11px] text-[#8FA393] uppercase tracking-wider font-medium">
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
      {/* 1. Sidebar Fijo en Escritorio (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-[#26302B] text-[#E7E3DA] flex-col justify-between flex-shrink-0 h-screen sticky top-0 border-r border-[#38463F] z-20">
        {sidebarContent}
      </aside>

      {/* 2. Drawer Deslizante Móvil (Mobile / Tablet) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop con desenfoque suave */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer Sidebar */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#26302B] text-[#E7E3DA] flex flex-col justify-between shadow-2xl border-r border-[#38463F] animate-slide-right">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
