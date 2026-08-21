"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Plus,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const session = useAuthStore((state) => state.session);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={`Bienvenido, ${session?.fullName || "Administrador"}`}
        subtitle={`Resumen general de operaciones de ${session?.companyName || "su empresa"}`}
      />

      <div className="page-container space-y-6">
        {/* Fila 1: Tarjetas KPI principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card padding="md" className="border-l-4 border-l-[#556B5D]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Ventas de Hoy
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF0EC] text-[#556B5D] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                {formatCurrency(0)}
              </span>
              <span className="block text-[11px] text-[#3F7D58] font-medium mt-0.5">
                0 ventas registradas hoy
              </span>
            </div>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[#8FA393]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Inventario Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F0F4F1] text-[#8FA393] flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                0
              </span>
              <span className="block text-[11px] text-[#6B7A71] font-medium mt-0.5">
                piezas disponibles
              </span>
            </div>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[#D89B2B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Bajo Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FDF5E4] text-[#D89B2B] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                0
              </span>
              <span className="block text-[11px] text-[#D89B2B] font-medium mt-0.5">
                productos requieren reposición
              </span>
            </div>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[#B85450]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Agotados
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FAEAEA] text-[#B85450] flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                0
              </span>
              <span className="block text-[11px] text-[#B85450] font-medium mt-0.5">
                variantes sin existencia
              </span>
            </div>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Órdenes Pendientes
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FBF4E8] text-[#C49A5A] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#26302B] font-[Outfit]">
                0
              </span>
              <span className="block text-[11px] text-[#6B7A71] font-medium mt-0.5">
                en producción
              </span>
            </div>
          </Card>
        </div>

        {/* Fila 2: Acciones Rápidas */}
        <Card padding="md">
          <CardHeader
            title="Acciones Rápidas"
            subtitle="Accesos directos a los flujos operativos principales"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <Link href="/pos">
              <Button variant="primary" fullWidth size="lg" className="justify-start">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Abrir Punto de Venta (POS)
              </Button>
            </Link>

            <Link href="/productos">
              <Button variant="outline" fullWidth size="lg" className="justify-start">
                <Plus className="w-5 h-5 mr-2" />
                Registrar Nuevo Producto
              </Button>
            </Link>

            <Link href="/ventas">
              <Button variant="ghost" fullWidth size="lg" className="justify-start border border-[#DDD9D0]">
                <Receipt className="w-5 h-5 mr-2" />
                Consultar Ventas del Día
              </Button>
            </Link>
          </div>
        </Card>

        {/* Fila 3: Paneles de información inicial */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="md">
            <CardHeader
              title="Últimas Ventas Registradas"
              subtitle="Historial reciente de transacciones"
            />
            <div className="mt-4 p-8 text-center border-2 border-dashed border-[#E7E3DA] rounded-lg">
              <p className="text-xs text-[#6B7A71]">
                Aún no hay ventas registradas en esta empresa. Realice su primera venta desde el Punto de Venta.
              </p>
            </div>
          </Card>

          <Card padding="md">
            <CardHeader
              title="Alertas de Inventario"
              subtitle="Productos que requieren atención de stock"
            />
            <div className="mt-4 p-8 text-center border-2 border-dashed border-[#E7E3DA] rounded-lg">
              <Badge variant="success">Inventario Saludable</Badge>
              <p className="text-xs text-[#6B7A71] mt-2">
                No hay alertas activas de bajo stock en este momento.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
