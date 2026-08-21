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
} from "lucide-react";

import { useAuthStore } from "@/stores/auth.store";

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
    label: "Producción",
    href: "/produccion",
    icon: <Factory className="w-4 h-4" />,
    roles: ["admin", "production"],
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

export function Sidebar() {
  const pathname = usePathname();
  const session = useAuthStore((state) => state.session);
  const userRole = session?.role || "seller";

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 bg-[#26302B] text-[#E7E3DA] flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 border-r border-[#38463F]">
      {/* Branding Superior */}
      <div>
        <div className="p-5 border-b border-[#38463F] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#556B5D] flex items-center justify-center text-white font-bold font-[Outfit] text-lg shadow-sm">
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

        {/* Navegacion Principal */}
        <nav className="p-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
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
          <div className="w-8 h-8 rounded-full bg-[#8FA393] text-[#26302B] font-bold text-xs flex items-center justify-center font-[Outfit]">
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
    </aside>
  );
}
