"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Package,
  Layers,
  AlertTriangle,
  XCircle,
  History,
  Plus,
  Search,
  RefreshCw,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Tag,
  CheckCircle,
  Image as ImageIcon,
  Shirt,
  PackagePlus,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  inventoryService,
  type StockItemView,
  type InventoryMovementRecord,
} from "@/services/inventory.service";
import { productsService } from "@/services/products.service";
import type { StockAlert, ProductVariant, Category, Product, Location } from "@/types/domain.types";
import { InventoryAdjustmentModal } from "@/components/inventario/InventoryAdjustmentModal";
import { ProductModal } from "@/components/productos/ProductModal";
import { EditProductModal } from "@/components/productos/EditProductModal";
import { formatCurrency } from "@/lib/utils/formatters";

type ActiveTab = "existencias" | "productos" | "historial" | "alertas";

function InventarioYProductosContent() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determinar rol y sucursal del usuario
  const isSeller = session?.role === "seller";
  const isAdmin = session?.role === "admin";
  // El vendedor filtra por su locationId asignado
  const sellerLocationId = isSeller ? (session?.locationId ?? undefined) : undefined;

  const tabParam = searchParams.get("tab");
  // Los sellers solo pueden ver existencias, historial y alertas (no catálogo de modelos)
  const validTabs: ActiveTab[] = isSeller ? ["existencias", "historial", "alertas"] : ["existencias", "productos", "historial", "alertas"];
  const initialTab = (validTabs.includes(tabParam as ActiveTab) ? tabParam : "existencias") as ActiveTab;
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  // Estado para modal de entrada rápida de mercancía (para sellers)
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);

  // Estado de Sucursales para el Administrador
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Estados Inventario
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

  // Estados Catálogo de Productos (solo admin)
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  const loadInventoryData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingInventory(true);
    try {
      // Determinar ubicación activa: para seller es la suya, para admin es la seleccionada o undefined (todas)
      const activeLocId = isSeller ? sellerLocationId : (selectedLocationId || undefined);

      const [itemsData, movementsData, alertsData, locsData] = await Promise.all([
        inventoryService.getStockByLocation(effectiveTenantId, activeLocId),
        inventoryService.getMovementHistory(effectiveTenantId, 50),
        inventoryService.getStockAlerts(effectiveTenantId, activeLocId),
        isAdmin && locations.length === 0 ? inventoryService.getLocations(effectiveTenantId) : Promise.resolve(locations),
      ]);

      setStockItems(itemsData);
      setMovements(movementsData);
      setAlerts(alertsData);
      if (locsData && locsData.length > 0 && locations.length === 0) {
        setLocations(locsData);
      }
    } catch (err) {
      console.error("Error al cargar datos de inventario:", err);
    } finally {
      setLoadingInventory(false);
    }
  }, [effectiveTenantId, isSeller, sellerLocationId, selectedLocationId, isAdmin, locations]);

  const loadProductsData = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prods, cats] = await Promise.all([
        productsService.getProducts({
          search: productSearch || undefined,
          categoryId: selectedCategory || undefined,
        }),
        productsService.getCategories(),
      ]);
      setVariants(prods);
      setCategories(cats);
    } catch (err) {
      console.error("Error al cargar catálogo de productos:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [productSearch, selectedCategory]);

  useEffect(() => {
    loadInventoryData();
    loadProductsData();
  }, [loadInventoryData, loadProductsData]);

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    router.replace(`/inventario?tab=${tab}`);
  }

  const handleDeleteVariant = async (item: StockItemView) => {
    if (!confirm(`¿Deseas ELIMINAR la variante "${item.productName}" (SKU: ${item.sku}) de forma permanente?`)) {
      return;
    }
    try {
      await productsService.deleteVariant(item.variantId);
      await loadInventoryData();
    } catch (err: any) {
      alert(err.message || "Error al eliminar variante.");
    }
  };

  const handleToggleVariantStatus = async (variantId: string, currentStatus: boolean) => {
    try {
      await productsService.toggleVariantStatus(variantId, !currentStatus);
      await loadProductsData();
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`¿Eliminar el modelo "${productName}" y todas sus variantes de forma permanente?`)) return;
    try {
      await productsService.deleteProduct(productId);
      await Promise.all([loadProductsData(), loadInventoryData()]);
    } catch (err: any) {
      alert(err.message || "Error al eliminar modelo.");
    }
  };

  const totalUnits = stockItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalValue = stockItems.reduce((acc, curr) => acc + curr.quantity * curr.salePrice, 0);
  const outOfStockCount = alerts.filter((a) => a.isOutOfStock).length;
  const lowStockCount = alerts.length - outOfStockCount;

  const filteredStock = stockItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.sku.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      (item.colorName && item.colorName.toLowerCase().includes(q)) ||
      (item.sizeName && item.sizeName.toLowerCase().includes(q)) ||
      (item.sleeveTypeName && item.sleeveTypeName.toLowerCase().includes(q))
    );
  });

  const filteredVariants = variants.filter((v) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      v.sku.toLowerCase().includes(q) ||
      (v.product?.name || "").toLowerCase().includes(q) ||
      (v.color?.name || "").toLowerCase().includes(q) ||
      (v.size?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 font-[Outfit]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight flex items-center gap-2">
            {isSeller ? <Store className="w-6 h-6 text-[#556B5D]" /> : null}
            {isSeller ? "Inventario de Mi Sucursal" : "Inventario & Productos"}
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            {isSeller
              ? "Existencias en tu punto de venta — puedes registrar entradas de mercancía recibida"
              : "Control de existencias físicas por tienda, catálogo de guayaberas y movimientos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Sucursal para Administrador */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#DDD9D0] shadow-xs">
              <Building2 className="w-4 h-4 text-[#556B5D] shrink-0" />
              <span className="text-xs font-semibold text-[#6B7A71] hidden sm:inline">Filtrar por:</span>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="text-xs font-bold text-[#26302B] bg-transparent outline-none cursor-pointer pr-1"
              >
                <option value="">🌐 Todas las Sucursales (Global)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    🏬 {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button variant="outline" onClick={() => { loadInventoryData(); loadProductsData(); }}>
            <RefreshCw className={`w-4 h-4 ${(loadingInventory || loadingProducts) ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          {/* Botón de Entrada de Mercancía — visible solo para sellers */}
          {isSeller && (
            <Button
              onClick={() => { setSelectedVariantId(undefined); setIsAdjustmentModalOpen(true); }}
              className="bg-[#3F7D58] hover:bg-[#2d6040] text-white"
            >
              <PackagePlus className="w-4 h-4 mr-1.5" />
              Registrar Entrada
            </Button>
          )}

          {/* Botones de admin */}
          {isAdmin && (
            <>
              {activeTab === "productos" ? (
                <Button onClick={() => setShowProductModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nuevo Producto
                </Button>
              ) : (
                <Button onClick={() => { setSelectedVariantId(undefined); setIsAdjustmentModalOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Movimiento Stock
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Selector de Pestañas — filtrado por rol */}
      <div className="flex border-b border-[#DDD9D0] bg-white rounded-xl p-1 shadow-xs max-w-fit flex-wrap">
        <button
          onClick={() => handleTabChange("existencias")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "existencias" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <Layers className="w-4 h-4" />
          {isSeller ? "Mi Stock" : "Existencias"} ({stockItems.length})
        </button>

        {/* Catálogo de Modelos — solo admin/producción */}
        {isAdmin && (
          <button
            onClick={() => handleTabChange("productos")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "productos" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
            }`}
          >
            <Package className="w-4 h-4" />
            Catálogo Modelos ({variants.length})
          </button>
        )}

        <button
          onClick={() => handleTabChange("historial")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "historial" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <History className="w-4 h-4" />
          Historial ({movements.length})
        </button>

        <button
          onClick={() => handleTabChange("alertas")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "alertas" ? "bg-[#556B5D] text-white shadow-xs" : "text-[#6B7A71] hover:text-[#26302B]"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Alertas ({alerts.length})
        </button>
      </div>

      {/* PESTAÑA 1: EXISTENCIAS */}
      {activeTab === "existencias" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#556B5D]">
              <div>
                <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Total Unidades</p>
                <p className="text-2xl font-bold text-[#26302B] mt-1">{loadingInventory ? "..." : totalUnits.toLocaleString()}</p>
                <p className="text-xs text-[#8FA393] mt-0.5">${totalValue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-3 bg-[#EBF0EC] text-[#556B5D] rounded-xl"><Package className="w-6 h-6" /></div>
            </Card>

            <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#D89B2B]">
              <div>
                <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Bajo Stock</p>
                <p className="text-2xl font-bold text-[#D89B2B] mt-1">{loadingInventory ? "..." : lowStockCount}</p>
              </div>
              <div className="p-3 bg-[#FDF5E4] text-[#D89B2B] rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
            </Card>

            <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#B85450]">
              <div>
                <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Agotadas</p>
                <p className="text-2xl font-bold text-[#B85450] mt-1">{loadingInventory ? "..." : outOfStockCount}</p>
              </div>
              <div className="p-3 bg-[#FAEAEA] text-[#B85450] rounded-xl"><XCircle className="w-6 h-6" /></div>
            </Card>

            <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#8FA393]">
              <div>
                <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">Movimientos</p>
                <p className="text-2xl font-bold text-[#26302B] mt-1">{loadingInventory ? "..." : movements.length}</p>
              </div>
              <div className="p-3 bg-[#F0F4F1] text-[#8FA393] rounded-xl"><History className="w-6 h-6" /></div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
                <input
                  type="text"
                  placeholder="Buscar por SKU, modelo o color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Producto / Modelo</th>
                    <th className="py-3 px-4">Variante</th>
                    {isAdmin && <th className="py-3 px-4">Ubicación</th>}
                    <th className="py-3 px-4 text-right">Precio Venta</th>
                    <th className="py-3 px-4 text-center">Stock Actual</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                  {loadingInventory ? (
                    <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#6B7A71]">Cargando...</td></tr>
                  ) : filteredStock.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#6B7A71]">No hay existencias registradas en tu sucursal.</td></tr>
                  ) : filteredStock.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#556B5D]">{item.sku}</td>
                      <td className="py-3 px-4 font-medium">{item.productName}</td>
                      <td className="py-3 px-4 text-xs text-[#6B7A71]">
                        {[
                          item.colorName,
                          item.sizeName ? `Talla ${item.sizeName}` : null,
                          item.sleeveTypeName,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </td>
                      {isAdmin && <td className="py-3 px-4 text-xs">{item.locationName}</td>}
                      <td className="py-3 px-4 text-right font-medium">${item.salePrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center font-bold text-base">{item.quantity}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={item.quantity === 0 ? "error" : item.quantity <= item.minStock ? "warning" : "success"}>
                          {item.quantity === 0 ? "Agotado" : item.quantity <= item.minStock ? "Bajo Stock" : "Disponible"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Seller: solo puede registrar entrada de mercancía */}
                          {isSeller && (
                            <button
                              onClick={() => { setSelectedVariantId(item.variantId); setIsAdjustmentModalOpen(true); }}
                              className="text-xs font-semibold text-[#3F7D58] hover:underline"
                            >
                              + Entrada
                            </button>
                          )}
                          {/* Admin: ajuste y eliminar */}
                          {isAdmin && (
                            <>
                              <button onClick={() => { setSelectedVariantId(item.variantId); setIsAdjustmentModalOpen(true); }} className="text-xs font-semibold text-[#556B5D] hover:underline">+ Ajustar</button>
                              <button onClick={() => handleDeleteVariant(item)} className="p-1 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 2: CATÁLOGO PRODUCTOS */}
      {activeTab === "productos" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
              <input
                type="text"
                placeholder="Buscar por modelo, SKU o color..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#DDD9D0] rounded-lg"
            >
              <option value="">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F6F1] border-b border-[#DDD9D0] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="p-4">Foto</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Modelo / Guayabera</th>
                  <th className="p-4">Color</th>
                  <th className="p-4">Talla</th>
                  <th className="p-4">Precio Venta</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-xs text-[#26302B]">
                {filteredVariants.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                    <td className="p-4 w-14">
                      <div
                        onClick={() => v.product && setSelectedProductForEdit(v.product)}
                        className="w-10 h-10 rounded-xl overflow-hidden bg-[#F8F6F1] border border-[#DDD9D0] flex items-center justify-center cursor-pointer"
                      >
                        {v.product?.imageUrl ? (
                          <img src={v.product.imageUrl} alt={v.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Shirt className="w-4 h-4 text-[#8FA393]" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-[#556B5D]">{v.sku}</td>
                    <td className="p-4 font-medium"><span className="font-semibold text-sm block">{v.product?.name}</span></td>
                    <td className="p-4">{v.color?.name || "—"}</td>
                    <td className="p-4">{v.size?.name ? <Badge variant="neutral">{v.size.name}</Badge> : "—"}</td>
                    <td className="p-4 font-semibold text-sm">${v.salePrice.toFixed(2)}</td>
                    <td className="p-4"><Badge variant={v.isActive ? "success" : "error"}>{v.isActive ? "Activo" : "Inactivo"}</Badge></td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.product && (
                          <button onClick={() => setSelectedProductForEdit(v.product)} className="p-1 text-[#556B5D] hover:bg-[#EEF1EE] rounded">
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleToggleVariantStatus(v.id, v.isActive)} className="p-1 text-[#6B7A71] hover:bg-[#F0EDE6] rounded">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        {v.product && (
                          <button onClick={() => handleDeleteProduct(v.product!.id, v.product!.name)} className="p-1 text-[#B85450] hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PESTAÑA 3: HISTORIAL */}
      {activeTab === "historial" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">SKU / Producto</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Operación</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-[#6B7A71]">{new Date(m.createdAt).toLocaleString("es-MX")}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#556B5D]">{m.sku} - {m.productName}</td>
                    <td className="py-3 px-4 text-xs">{m.locationName}</td>
                    <td className="py-3 px-4"><Badge variant="neutral">{m.type}</Badge></td>
                    <td className="py-3 px-4 text-center font-bold">{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PESTAÑA 4: ALERTAS */}
      {activeTab === "alertas" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Estado Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                {alerts.map((a) => (
                  <tr key={a.variantId} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#556B5D]">{a.sku}</td>
                    <td className="py-3 px-4 font-medium">{a.productName}</td>
                    <td className="py-3 px-4 text-center font-bold text-[#B85450]">{a.currentStock}</td>
                    <td className="py-3 px-4 text-center"><Badge variant={a.isOutOfStock ? "error" : "warning"}>{a.isOutOfStock ? "AGOTADO" : "BAJO STOCK"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modales */}
      <InventoryAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={loadInventoryData}
        preselectedVariantId={selectedVariantId}
      />

      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={() => { loadProductsData(); loadInventoryData(); }}
      />

      <EditProductModal
        isOpen={!!selectedProductForEdit}
        onClose={() => setSelectedProductForEdit(null)}
        product={selectedProductForEdit}
        categories={categories}
        onSuccess={() => { loadProductsData(); loadInventoryData(); }}
      />
    </div>
  );
}

export default function InventarioYProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InventarioYProductosContent />
    </Suspense>
  );
}
