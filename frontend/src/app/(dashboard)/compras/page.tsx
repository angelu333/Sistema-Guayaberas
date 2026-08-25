"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingBag,
  Building2,
  Plus,
  RefreshCw,
  PackageCheck,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  suppliersService,
  type Supplier,
  type PurchaseRecord,
  type PurchaseItemDTO,
} from "@/services/suppliers.service";
import { NewSupplierModal } from "@/components/compras/NewSupplierModal";
import { NewPurchaseModal } from "@/components/compras/NewPurchaseModal";

export default function ComprasPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [activeTab, setActiveTab] = useState<"purchases" | "suppliers">("purchases");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    try {
      const [supData, purData] = await Promise.all([
        suppliersService.getSuppliers(effectiveTenantId),
        suppliersService.getPurchases(effectiveTenantId),
      ]);
      setSuppliers(supData);
      setPurchases(purData);
    } catch (err) {
      console.error("Error al cargar módulo de compras:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Crear proveedor
  const handleCreateSupplier = async (dto: any) => {
    if (!effectiveTenantId) return;
    const res = await suppliersService.createSupplier(effectiveTenantId, dto);
    if (res.success) {
      await loadData();
    }
  };

  // Crear compra
  const handleCreatePurchase = async (
    supplierId: string | null,
    items: PurchaseItemDTO[],
    notes?: string
  ) => {
    if (!effectiveTenantId) return;
    const res = await suppliersService.createPurchase(
      effectiveTenantId,
      supplierId,
      items,
      notes,
      session?.userId
    );
    if (res.success) {
      await loadData();
    }
  };

  // Recibir compra (Ingreso a stock)
  const handleReceivePurchase = async (purchase: PurchaseRecord) => {
    if (confirm(`¿Confirmar recepción de la compra ${purchase.orderNumber}? Las existencias ingresarán automáticamente al inventario.`)) {
      const res = await suppliersService.receivePurchase(purchase);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Error al recibir la compra.");
      }
    }
  };

  // Métricas
  const totalInvestmentMonth = purchases.reduce((acc, p) => acc + (p.status === "received" ? p.totalCost : 0), 0);
  const pendingPurchases = purchases.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Proveedores y Registro de Compras
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Gestión de abastecimiento con proveedores e ingreso automático a inventario
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsSupplierModalOpen(true)}>
            <Building2 className="w-4 h-4 mr-1.5" />
            Nuevo Proveedor
          </Button>

          <Button onClick={() => setIsPurchaseModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Orden de Compra
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="border-l-4 border-l-[#556B5D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Proveedores Registrados
            </span>
            <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
            {loading ? "..." : suppliers.length}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">Talleres, telerías y bordadores</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-[#C49A5A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Compras Pendientes
            </span>
            <div className="p-2 bg-[#FBF4E8] text-[#C49A5A] rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#26302B] mt-1 font-[Outfit]">
            {loading ? "..." : pendingPurchases}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Por recibir mercancía</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-[#3F7D58]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
              Inversión Recibida del Mes
            </span>
            <div className="p-2 bg-[#EBF5F0] text-[#3F7D58] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#3F7D58] mt-1 font-[Outfit]">
            {loading ? "..." : `$${totalInvestmentMonth.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Ingresadas al inventario</p>
        </Card>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-[#DDD9D0] bg-white rounded-xl p-1 shadow-xs max-w-fit">
        <button
          onClick={() => setActiveTab("purchases")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "purchases"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Órdenes de Compra ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "suppliers"
              ? "bg-[#556B5D] text-white shadow-xs"
              : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Directorio de Proveedores ({suppliers.length})
        </button>
      </div>

      {/* PESTAÑA 1: ÓRDENES DE COMPRA */}
      {activeTab === "purchases" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">Folio Compra</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Costo Total</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6B7A71]">
                      Cargando órdenes de compra...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6B7A71]">
                      No hay compras registradas. Haz clic en "Nueva Orden de Compra" para generar la primera.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#556B5D]">{p.orderNumber}</td>
                      <td className="py-3 px-4 font-medium text-xs">{p.supplierName}</td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71]">
                        {new Date(p.createdAt).toLocaleDateString("es-MX")}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-semibold">
                        {p.details.reduce((acc, d) => acc + d.quantity, 0)} pzas
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={p.status === "received" ? "success" : p.status === "pending" ? "warning" : "error"}>
                          {p.status === "received" ? "Recibida" : p.status === "pending" ? "Pendiente" : "Cancelada"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#3F7D58]">
                        ${p.totalCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handleReceivePurchase(p)}
                            className="bg-[#3F7D58] hover:bg-[#326446] text-xs py-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5 mr-1" />
                            Recibir Mercancía
                          </Button>
                        ) : (
                          <span className="text-xs text-[#8FA393] flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-[#3F7D58]" />
                            Ingresada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PESTAÑA 2: DIRECTORIO DE PROVEEDORES */}
      {activeTab === "suppliers" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Ciudad</th>
                  <th className="py-3 px-4">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6B7A71]">
                      Cargando directorio de proveedores...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#6B7A71]">
                      No hay proveedores registrados.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#26302B]">{s.name}</td>
                      <td className="py-3 px-4 text-xs">
                        <Badge variant="primary">{s.type.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71]">{s.contactName || "-"}</td>
                      <td className="py-3 px-4 text-xs font-mono">{s.phone || "-"}</td>
                      <td className="py-3 px-4 text-xs">{s.city || "-"}</td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71] italic">{s.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modales */}
      <NewSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSupplierCreated={handleCreateSupplier}
      />

      <NewPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        tenantId={effectiveTenantId || ""}
        suppliers={suppliers}
        onPurchaseCreated={handleCreatePurchase}
      />
    </div>
  );
}
