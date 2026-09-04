"use client";

import { useEffect, useState, useCallback, useMemo, Suspense, Fragment } from "react";
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
  Pencil,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  inventoryService,
  type StockItemView,
  type InventoryMovementRecord,
} from "@/services/inventory.service";
import { productsService } from "@/services/products.service";
import type { StockAlert, ProductVariant, Category, Product, Location, Color, Size, SleeveType } from "@/types/domain.types";
import { InventoryAdjustmentModal } from "@/components/inventario/InventoryAdjustmentModal";
import { QuickProductModal } from "@/components/productos/QuickProductModal";
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

  // Modo de visualización de Existencias: "matrix" (Matriz por modelo/tallas) o "detailed" (lista por SKU)
  const [stockViewMode, setStockViewMode] = useState<"matrix" | "detailed">("matrix");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleExpandGroup = (key: string) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Estados Catálogo de Productos (solo admin)
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  // Estado para expandir modelos en Catálogo
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const toggleExpandModel = (productId: string) =>
    setExpandedModels((prev) => ({ ...prev, [productId]: !prev[productId] }));

  // Estados de paginación
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixPageSize, setMatrixPageSize] = useState(15);

  const [detailedPage, setDetailedPage] = useState(1);
  const [detailedPageSize, setDetailedPageSize] = useState(25);

  const [modelsPage, setModelsPage] = useState(1);
  const [modelsPageSize, setModelsPageSize] = useState(10);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);

  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsPageSize, setAlertsPageSize] = useState(20);

  // Resetear páginas cuando cambien búsquedas o filtros
  useEffect(() => {
    setMatrixPage(1);
    setDetailedPage(1);
  }, [searchQuery, selectedLocationId]);

  useEffect(() => {
    setModelsPage(1);
  }, [productSearch, selectedCategory]);

  const loadInventoryData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingInventory(true);
    try {
      // Determinar ubicación activa: para seller es la suya, para admin es la seleccionada o undefined (todas)
      const activeLocId = isSeller ? sellerLocationId : (selectedLocationId || undefined);

      const bundle = await inventoryService.getInventoryBundle(effectiveTenantId, activeLocId);

      setStockItems(bundle.stockItems);
      setMovements(bundle.movements);
      setAlerts(bundle.alerts);
      if (bundle.locations && bundle.locations.length > 0) {
        setLocations(bundle.locations);
      }
    } catch (err) {
      console.error("Error al cargar datos de inventario:", err);
    } finally {
      setLoadingInventory(false);
    }
  }, [effectiveTenantId, isSeller, sellerLocationId, selectedLocationId]);

  const loadProductsData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoadingProducts(true);
    try {
      const [prods, cats] = await Promise.all([
        productsService.getProducts({
          tenantId: effectiveTenantId,
        }),
        productsService.getCategories(effectiveTenantId),
      ]);
      setVariants(prods);
      setCategories(cats);
    } catch (err) {
      console.error("Error al cargar catálogo de productos:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [effectiveTenantId]);

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
    if (!confirm(`¿Deseas eliminar/archivar el modelo "${productName}"? Dejará de mostrarse en catálogo y punto de venta.`)) return;
    try {
      await productsService.deleteProduct(productId);
      await Promise.all([loadProductsData(), loadInventoryData()]);
    } catch (err: any) {
      alert(err.message || "Error al procesar modelo.");
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

  // Agrupamiento por Modelo + Color + Manga (+ Ubicación) para la Vista Matriz de Tallas
  interface GroupedStockRow {
    groupKey: string;
    productName: string;
    colorName: string | null;
    sleeveTypeName: string | null;
    locationName: string;
    categoryName: string;
    salePrice: number;
    totalQuantity: number;
    minStock: number;
    sizes: {
      sizeName: string;
      quantity: number;
      variantId: string;
      sku: string;
      minStock: number;
    }[];
  }

  const groupedStock: GroupedStockRow[] = useMemo(() => {
    const map = new Map<string, GroupedStockRow>();

    filteredStock.forEach((item) => {
      const key = `${item.productName}__${item.colorName || ""}__${item.sleeveTypeName || ""}__${item.locationName}`;

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          productName: item.productName,
          colorName: item.colorName,
          sleeveTypeName: item.sleeveTypeName,
          locationName: item.locationName,
          categoryName: item.categoryName,
          salePrice: item.salePrice,
          totalQuantity: 0,
          minStock: item.minStock,
          sizes: [],
        });
      }

      const grp = map.get(key)!;
      grp.totalQuantity += item.quantity;
      if (item.sizeName) {
        grp.sizes.push({
          sizeName: item.sizeName,
          quantity: item.quantity,
          variantId: item.variantId,
          sku: item.sku,
          minStock: item.minStock,
        });
      }
    });

    const result = Array.from(map.values()).map((grp) => {
      grp.sizes.sort((a, b) => {
        const numA = parseFloat(a.sizeName);
        const numB = parseFloat(b.sizeName);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.sizeName.localeCompare(b.sizeName, undefined, { numeric: true });
      });
      return grp;
    });

    return result;
  }, [filteredStock]);

  // Agrupación de variantes por Modelo (Producto) para la pestaña de Catálogo
  interface GroupedProductModel {
    productId: string;
    product: Product;
    name: string;
    description: string | null;
    categoryName: string;
    imageUrl: string | null;
    colors: Color[];
    sleeveTypes: SleeveType[];
    sizes: Size[];
    minPrice: number;
    maxPrice: number;
    totalVariants: number;
    activeVariantsCount: number;
    variants: ProductVariant[];
  }

  const groupedModels: GroupedProductModel[] = useMemo(() => {
    const map = new Map<string, GroupedProductModel>();

    variants.forEach((v) => {
      if (!v.product) return;
      const pId = v.product.id;

      if (!map.has(pId)) {
        map.set(pId, {
          productId: pId,
          product: v.product,
          name: v.product.name,
          description: v.product.description || null,
          categoryName:
            (v.product as any).category?.name ||
            categories.find((c) => c.id === v.product?.categoryId)?.name ||
            "Sin Categoría",
          imageUrl: v.product.imageUrl || v.images?.[0]?.url || null,
          colors: [],
          sleeveTypes: [],
          sizes: [],
          minPrice: v.salePrice,
          maxPrice: v.salePrice,
          totalVariants: 0,
          activeVariantsCount: 0,
          variants: [],
        });
      }

      const model = map.get(pId)!;
      model.totalVariants += 1;
      if (v.isActive) model.activeVariantsCount += 1;
      model.variants.push(v);

      if (v.salePrice < model.minPrice) model.minPrice = v.salePrice;
      if (v.salePrice > model.maxPrice) model.maxPrice = v.salePrice;

      if (v.color && !model.colors.some((c) => c.id === v.color!.id)) {
        model.colors.push(v.color);
      }
      if (v.sleeveType && !model.sleeveTypes.some((s) => s.id === v.sleeveType!.id)) {
        model.sleeveTypes.push(v.sleeveType);
      }
      if (v.size && !model.sizes.some((s) => s.id === v.size!.id)) {
        model.sizes.push(v.size);
      }
    });

    // Ordenar tallas por número
    map.forEach((model) => {
      model.sizes.sort((a, b) => {
        const numA = parseFloat(a.name);
        const numB = parseFloat(b.name);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });

      // Ordenar variantes por manga, color y talla
      model.variants.sort((a, b) => {
        const sleeveA = a.sleeveType?.name || "";
        const sleeveB = b.sleeveType?.name || "";
        if (sleeveA !== sleeveB) return sleeveA.localeCompare(sleeveB);
        const colorA = a.color?.name || "";
        const colorB = b.color?.name || "";
        if (colorA !== colorB) return colorA.localeCompare(colorB);
        const numA = parseFloat(a.size?.name || "0");
        const numB = parseFloat(b.size?.name || "0");
        return numA - numB;
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [variants, categories]);

  const filteredModels = useMemo(() => {
    let list = groupedModels;

    if (selectedCategory) {
      list = list.filter((m) => m.product.categoryId === selectedCategory);
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.categoryName.toLowerCase().includes(q) ||
          m.colors.some((c) => c.name.toLowerCase().includes(q)) ||
          m.sleeveTypes.some((s) => s.name.toLowerCase().includes(q)) ||
          m.variants.some((v) => v.sku.toLowerCase().includes(q))
      );
    }

    return list;
  }, [groupedModels, selectedCategory, productSearch]);

  // Slices de paginación
  // 1. Matriz de Tallas
  const paginatedGroupedStock = useMemo(() => {
    const start = (matrixPage - 1) * matrixPageSize;
    return groupedStock.slice(start, start + matrixPageSize);
  }, [groupedStock, matrixPage, matrixPageSize]);
  const totalMatrixPages = Math.ceil(groupedStock.length / matrixPageSize) || 1;

  // 2. Existencias por SKU
  const paginatedDetailedStock = useMemo(() => {
    const start = (detailedPage - 1) * detailedPageSize;
    return filteredStock.slice(start, start + detailedPageSize);
  }, [filteredStock, detailedPage, detailedPageSize]);
  const totalDetailedPages = Math.ceil(filteredStock.length / detailedPageSize) || 1;

  // 3. Catálogo de Modelos
  const paginatedModels = useMemo(() => {
    const start = (modelsPage - 1) * modelsPageSize;
    return filteredModels.slice(start, start + modelsPageSize);
  }, [filteredModels, modelsPage, modelsPageSize]);
  const totalModelPages = Math.ceil(filteredModels.length / modelsPageSize) || 1;

  // 4. Historial
  const paginatedMovements = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return movements.slice(start, start + historyPageSize);
  }, [movements, historyPage, historyPageSize]);
  const totalHistoryPages = Math.ceil(movements.length / historyPageSize) || 1;

  // 5. Alertas
  const paginatedAlerts = useMemo(() => {
    const start = (alertsPage - 1) * alertsPageSize;
    return alerts.slice(start, start + alertsPageSize);
  }, [alerts, alertsPage, alertsPageSize]);
  const totalAlertPages = Math.ceil(alerts.length / alertsPageSize) || 1;

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
            Catálogo Modelos ({groupedModels.length})
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
            {/* Barra de Filtros y Switch de Vistas */}
            <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
                <input
                  type="text"
                  placeholder="Buscar por SKU, modelo o color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                />
              </div>

              {/* Selector de Modo de Vista */}
              <div className="flex items-center bg-white border border-[#DDD9D0] rounded-xl p-1 shadow-xs shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStockViewMode("matrix")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    stockViewMode === "matrix"
                      ? "bg-[#556B5D] text-white shadow-xs"
                      : "text-[#6B7A71] hover:text-[#26302B]"
                  }`}
                  title="Vista agrupada con matriz de tallas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Matriz de Tallas ({groupedStock.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockViewMode("detailed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    stockViewMode === "detailed"
                      ? "bg-[#556B5D] text-white shadow-xs"
                      : "text-[#6B7A71] hover:text-[#26302B]"
                  }`}
                  title="Vista clásica fila por SKU"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Por SKU ({filteredStock.length})</span>
                </button>
              </div>
            </div>

            {/* ============================================================
                VISTA 1: MATRIZ DE TALLAS AGRUPADA (SOLUCIÓN 2A)
                ============================================================ */}
            {stockViewMode === "matrix" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-4">Modelo / Guayabera</th>
                      <th className="py-3 px-4">Color & Manga</th>
                      {isAdmin && <th className="py-3 px-4">Ubicación</th>}
                      <th className="py-3 px-4">Tallas en Existencia</th>
                      <th className="py-3 px-4 text-right">Precio</th>
                      <th className="py-3 px-4 text-center">Total Piezas</th>
                      <th className="py-3 px-4 text-right">Desglose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
                    {loadingInventory ? (
                      <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#6B7A71]">Cargando existencias...</td></tr>
                    ) : groupedStock.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#6B7A71]">No se encontraron existencias registradas.</td></tr>
                    ) : (
                      paginatedGroupedStock.map((grp) => (
                        <Fragment key={grp.groupKey}>
                          <tr className="hover:bg-[#F8F6F1]/50 transition-colors">
                            {/* Botón expandir */}
                            <td className="py-3 pl-3 pr-1 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandGroup(grp.groupKey)}
                                className="p-1 rounded-md text-[#6B7A71] hover:text-[#26302B] hover:bg-white cursor-pointer"
                                title="Expandir desglose de SKUs"
                              >
                                {expandedGroups[grp.groupKey] ? (
                                  <ChevronDown className="w-4 h-4 text-[#556B5D]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Modelo */}
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-sm text-[#26302B] block">
                                {grp.productName}
                              </span>
                              <span className="text-[11px] text-[#6B7A71] block">
                                {grp.categoryName}
                              </span>
                            </td>

                            {/* Color y Manga */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {grp.colorName && (
                                  <span className="text-xs font-semibold text-[#26302B] bg-white px-2 py-0.5 rounded-md border border-[#DDD9D0]">
                                    {grp.colorName}
                                  </span>
                                )}
                                {grp.sleeveTypeName && (
                                  <span className="text-xs font-bold text-[#556B5D] bg-[#EBF5F0] px-2 py-0.5 rounded-md border border-[#A7D7B9]">
                                    {grp.sleeveTypeName}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Sucursal (si es admin) */}
                            {isAdmin && (
                              <td className="py-3 px-4 text-xs font-medium text-[#6B7A71]">
                                {grp.locationName}
                              </td>
                            )}

                            {/* Matriz de Tallas (cuadrícula interactiva) */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {grp.sizes.map((s) => (
                                  <button
                                    key={s.variantId}
                                    type="button"
                                    onClick={() => {
                                      setSelectedVariantId(s.variantId);
                                      setIsAdjustmentModalOpen(true);
                                    }}
                                    title={`Talla ${s.sizeName} (SKU: ${s.sku}) · Clic para Entrada o Ajuste`}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border shadow-xs cursor-pointer ${
                                      s.quantity === 0
                                        ? "bg-[#FAEAEA] text-[#B85450] border-[#B85450]/30 hover:bg-[#F5D8D8]"
                                        : s.quantity <= s.minStock
                                        ? "bg-[#FEF5E7] text-[#D97706] border-[#D97706]/30 hover:bg-[#FDEED3]"
                                        : "bg-white text-[#26302B] border-[#DDD9D0] hover:border-[#556B5D] hover:bg-[#F8F6F1]"
                                    }`}
                                  >
                                    <span className="text-[#6B7A71] text-[10px] font-medium">T{s.sizeName}:</span>
                                    <span className={s.quantity === 0 ? "text-[#B85450]" : "text-[#26302B]"}>
                                      {s.quantity}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </td>

                            {/* Precio */}
                            <td className="py-3 px-4 text-right font-medium text-xs">
                              ${grp.salePrice.toFixed(2)}
                            </td>

                            {/* Total Stock */}
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black tracking-tight ${
                                  grp.totalQuantity === 0
                                    ? "bg-[#FAEAEA] text-[#B85450]"
                                    : grp.totalQuantity <= grp.minStock
                                    ? "bg-[#FEF5E7] text-[#D97706]"
                                    : "bg-[#EBF5F0] text-[#3F7D58]"
                                }`}
                              >
                                {grp.totalQuantity} pzas
                              </span>
                            </td>

                            {/* Acción / Toggle */}
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => toggleExpandGroup(grp.groupKey)}
                                className="text-xs font-bold text-[#556B5D] hover:underline cursor-pointer"
                              >
                                {expandedGroups[grp.groupKey] ? "Ocultar" : "Ver SKUs"}
                              </button>
                            </td>
                          </tr>

                          {/* Fila expandida con el desglose justo debajo de este modelo */}
                          {expandedGroups[grp.groupKey] && (
                            <tr className="bg-[#FAF7F2] border-b border-[#DDD9D0]">
                              <td colSpan={isAdmin ? 8 : 7} className="p-4">
                                <div className="bg-white rounded-xl border border-[#DDD9D0] p-4 shadow-xs">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold text-[#26302B] uppercase tracking-wider font-[Outfit] flex items-center gap-2">
                                      <Shirt className="w-4 h-4 text-[#556B5D]" />
                                      Detalle de SKUs: {grp.productName} · {grp.colorName} · {grp.sleeveTypeName}
                                    </p>
                                    <span className="text-xs text-[#6B7A71]">
                                      Sucursal: <b>{grp.locationName}</b>
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                    {grp.sizes.map((sz) => (
                                      <div
                                        key={sz.variantId}
                                        className="p-2.5 bg-[#F8F6F1] rounded-xl border border-[#DDD9D0] flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0">
                                          <span className="font-mono text-xs font-bold text-[#556B5D] block truncate">
                                            {sz.sku}
                                          </span>
                                          <span className="text-xs text-[#6B7A71]">
                                            Talla <b>{sz.sizeName}</b> · Stock:{" "}
                                            <b className={sz.quantity === 0 ? "text-[#B85450]" : "text-[#26302B]"}>
                                              {sz.quantity}
                                            </b>
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7 px-2 shrink-0 font-bold text-[#556B5D]"
                                          onClick={() => {
                                            setSelectedVariantId(sz.variantId);
                                            setIsAdjustmentModalOpen(true);
                                          }}
                                        >
                                          {isSeller ? "+ Entrada" : "+ Ajuste"}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={matrixPage}
                  totalPages={totalMatrixPages}
                  totalItems={groupedStock.length}
                  pageSize={matrixPageSize}
                  onPageChange={setMatrixPage}
                  onPageSizeChange={(size) => {
                    setMatrixPageSize(size);
                    setMatrixPage(1);
                  }}
                  pageSizeOptions={[10, 15, 25, 50]}
                  itemLabel="modelos / colores"
                />
              </div>
            )}

            {/* ============================================================
                VISTA 2: LISTA DETALLADA POR SKU (CLÁSICA)
                ============================================================ */}
            {stockViewMode === "detailed" && (
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
                      <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#6B7A71]">Cargando existencias...</td></tr>
                    ) : filteredStock.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#6B7A71]">No hay existencias registradas en tu sucursal.</td></tr>
                    ) : (
                      paginatedDetailedStock.map((item) => (
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
                                  className="text-xs font-semibold text-[#3F7D58] hover:underline cursor-pointer"
                                >
                                  + Entrada
                                </button>
                              )}
                              {/* Admin: ajuste y eliminar */}
                              {isAdmin && (
                                <>
                                  <button onClick={() => { setSelectedVariantId(item.variantId); setIsAdjustmentModalOpen(true); }} className="text-xs font-semibold text-[#556B5D] hover:underline cursor-pointer">+ Ajustar</button>
                                  <button onClick={() => handleDeleteVariant(item)} className="p-1 text-[#B85450] hover:bg-[#FAEAEA] rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={detailedPage}
                  totalPages={totalDetailedPages}
                  totalItems={filteredStock.length}
                  pageSize={detailedPageSize}
                  onPageChange={setDetailedPage}
                  onPageSizeChange={(size) => {
                    setDetailedPageSize(size);
                    setDetailedPage(1);
                  }}
                  pageSizeOptions={[15, 25, 50, 100]}
                  itemLabel="SKUs"
                />
              </div>
            )}
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
                placeholder="Buscar por modelo, SKU, color o manga..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD9D0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#556B5D] cursor-pointer"
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
                  <th className="py-3.5 px-3 w-10 text-center"></th>
                  <th className="py-3.5 px-4">Modelo / Guayabera</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Colores & Mangas</th>
                  <th className="py-3.5 px-4">Tallas</th>
                  <th className="py-3.5 px-4">Rango Precio</th>
                  <th className="py-3.5 px-4 text-center">Variantes</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0] text-xs text-[#26302B]">
                {loadingProducts ? (
                  <tr><td colSpan={8} className="py-10 text-center text-[#6B7A71]">Cargando catálogo de modelos...</td></tr>
                ) : paginatedModels.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-[#6B7A71]">No se encontraron modelos registrados.</td></tr>
                ) : (
                  paginatedModels.map((model) => (
                    <Fragment key={model.productId}>
                      <tr className="hover:bg-[#F8F6F1]/60 transition-colors">
                        {/* Flechita expandir */}
                        <td className="py-3.5 pl-3 pr-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandModel(model.productId)}
                            className="p-1 rounded-md text-[#6B7A71] hover:text-[#26302B] hover:bg-white cursor-pointer transition-colors"
                            title="Ver variantes y SKUs"
                          >
                            {expandedModels[model.productId] ? (
                              <ChevronDown className="w-4 h-4 text-[#556B5D]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Foto y Nombre del modelo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setSelectedProductForEdit(model.product)}
                              className="w-12 h-12 rounded-xl overflow-hidden bg-[#F8F6F1] border border-[#DDD9D0] flex items-center justify-center shrink-0 cursor-pointer shadow-2xs hover:border-[#556B5D] transition-colors"
                              title="Clic para editar fotos y datos"
                            >
                              {model.imageUrl ? (
                                <img src={model.imageUrl} alt={model.name} className="w-full h-full object-cover" />
                              ) : (
                                <Shirt className="w-5 h-5 text-[#8FA393]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setSelectedProductForEdit(model.product)}
                                className="font-bold text-sm text-[#26302B] hover:text-[#556B5D] text-left block truncate cursor-pointer"
                              >
                                {model.name}
                              </button>
                              {model.description && (
                                <p className="text-[11px] text-[#6B7A71] line-clamp-1 mt-0.5">
                                  {model.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="py-3.5 px-4">
                          <Badge variant="neutral">{model.categoryName}</Badge>
                        </td>

                        {/* Colores y Mangas */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            {/* Colores */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {model.colors.slice(0, 4).map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-white px-2 py-0.5 rounded-md border border-[#DDD9D0]"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: c.hexCode || "#ccc" }}
                                  />
                                  {c.name}
                                </span>
                              ))}
                              {model.colors.length > 4 && (
                                <span className="text-[10px] text-[#6B7A71] font-semibold">
                                  +{model.colors.length - 4} más
                                </span>
                              )}
                            </div>

                            {/* Mangas */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {model.sleeveTypes.map((sl) => (
                                <span
                                  key={sl.id}
                                  className="text-[10px] font-bold text-[#556B5D] bg-[#EBF5F0] px-1.5 py-0.5 rounded border border-[#A7D7B9]"
                                >
                                  {sl.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Tallas disponibles */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                            {model.sizes.map((s) => (
                              <span
                                key={s.id}
                                className="text-[11px] font-semibold text-[#26302B] bg-[#F8F6F1] px-1.5 py-0.5 rounded border border-[#DDD9D0]"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Rango de precio */}
                        <td className="py-3.5 px-4 font-bold text-sm text-[#26302B]">
                          {model.minPrice === model.maxPrice
                            ? `$${model.minPrice.toFixed(2)}`
                            : `$${model.minPrice.toFixed(2)} – $${model.maxPrice.toFixed(2)}`}
                        </td>

                        {/* Cantidad de variantes */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandModel(model.productId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F0EDE6] hover:bg-[#E7E3DA] text-[#26302B] transition-colors cursor-pointer"
                            title="Clic para ver desglose de SKUs"
                          >
                            <span>{model.totalVariants} SKUs</span>
                            {expandedModels[model.productId] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#556B5D]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        {/* Acciones del modelo */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedProductForEdit(model.product)}
                              className="p-1.5 text-[#556B5D] hover:bg-[#EEF1EE] rounded-lg transition-colors cursor-pointer"
                              title="Editar modelo, fotos y precios de tallas"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(model.productId, model.name)}
                              className="p-1.5 text-[#B85450] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar / Archivar modelo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Subtabla expandida de variantes */}
                      {expandedModels[model.productId] && (
                        <tr className="bg-[#FAF7F2] border-b border-[#DDD9D0]">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-xl border border-[#DDD9D0] overflow-hidden shadow-xs">
                              <div className="p-3 bg-[#F8F6F1] border-b border-[#DDD9D0] flex items-center justify-between">
                                <p className="text-xs font-bold text-[#26302B] uppercase tracking-wider flex items-center gap-2">
                                  <Shirt className="w-4 h-4 text-[#556B5D]" />
                                  Variantes registradas para: <strong>{model.name}</strong> ({model.activeVariantsCount} activas de {model.totalVariants})
                                </p>
                                <span className="text-xs text-[#6B7A71]">
                                  Haz clic en el estado para activar o pausar un SKU individual
                                </span>
                              </div>

                              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#FAF9F6] border-b border-[#DDD9D0] sticky top-0 text-[#6B7A71] uppercase text-[10px] font-bold">
                                    <tr>
                                      <th className="p-2.5 pl-4">SKU</th>
                                      <th className="p-2.5">Color</th>
                                      <th className="p-2.5">Manga</th>
                                      <th className="p-2.5">Talla</th>
                                      <th className="p-2.5">Precio Venta</th>
                                      <th className="p-2.5 text-center">Estado</th>
                                      <th className="p-2.5 pr-4 text-right">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#DDD9D0]">
                                    {model.variants.map((v) => (
                                      <tr key={v.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                                        <td className="p-2.5 pl-4 font-mono font-bold text-[#556B5D]">{v.sku}</td>
                                        <td className="p-2.5">
                                          <span className="inline-flex items-center gap-1">
                                            <span
                                              className="w-2 h-2 rounded-full border border-black/10"
                                              style={{ backgroundColor: v.color?.hexCode || "#ccc" }}
                                            />
                                            {v.color?.name || "—"}
                                          </span>
                                        </td>
                                        <td className="p-2.5">{v.sleeveType?.name || "—"}</td>
                                        <td className="p-2.5">
                                          <span className="font-semibold bg-[#F0EDE6] px-1.5 py-0.5 rounded">
                                            {v.size?.name || "—"}
                                          </span>
                                        </td>
                                        <td className="p-2.5 font-bold">${v.salePrice.toFixed(2)}</td>
                                        <td className="p-2.5 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleVariantStatus(v.id, v.isActive)}
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                              v.isActive
                                                ? "bg-[#EBF5F0] text-[#3F7D58] hover:bg-[#d8edd1]"
                                                : "bg-[#FAEAEA] text-[#B85450] hover:bg-[#f3d0d0]"
                                            }`}
                                            title="Clic para cambiar estado"
                                          >
                                            {v.isActive ? "● Activo" : "○ Inactivo"}
                                          </button>
                                        </td>
                                        <td className="p-2.5 pr-4 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              onClick={() => {
                                                setSelectedVariantId(v.id);
                                                setIsAdjustmentModalOpen(true);
                                              }}
                                              className="text-xs font-semibold text-[#556B5D] hover:underline cursor-pointer"
                                            >
                                              + Ajuste
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={modelsPage}
            totalPages={totalModelPages}
            totalItems={filteredModels.length}
            pageSize={modelsPageSize}
            onPageChange={setModelsPage}
            onPageSizeChange={(size) => {
              setModelsPageSize(size);
              setModelsPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="modelos"
          />
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
                {movements.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[#6B7A71]">No hay movimientos registrados.</td></tr>
                ) : (
                  paginatedMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-[#6B7A71]">{new Date(m.createdAt).toLocaleString("es-MX")}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#556B5D]">{m.sku} - {m.productName}</td>
                      <td className="py-3 px-4 text-xs">{m.locationName}</td>
                      <td className="py-3 px-4"><Badge variant="neutral">{m.type}</Badge></td>
                      <td className="py-3 px-4 text-center font-bold">{m.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={historyPage}
            totalPages={totalHistoryPages}
            totalItems={movements.length}
            pageSize={historyPageSize}
            onPageChange={setHistoryPage}
            onPageSizeChange={(size) => {
              setHistoryPageSize(size);
              setHistoryPage(1);
            }}
            pageSizeOptions={[15, 25, 50]}
            itemLabel="movimientos"
          />
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
                {alerts.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-[#6B7A71]">No hay alertas de stock pendientes.</td></tr>
                ) : (
                  paginatedAlerts.map((a) => (
                    <tr key={a.variantId} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#556B5D]">{a.sku}</td>
                      <td className="py-3 px-4 font-medium">{a.productName}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#B85450]">{a.currentStock}</td>
                      <td className="py-3 px-4 text-center"><Badge variant={a.isOutOfStock ? "error" : "warning"}>{a.isOutOfStock ? "AGOTADO" : "BAJO STOCK"}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={alertsPage}
            totalPages={totalAlertPages}
            totalItems={alerts.length}
            pageSize={alertsPageSize}
            onPageChange={setAlertsPage}
            onPageSizeChange={(size) => {
              setAlertsPageSize(size);
              setAlertsPage(1);
            }}
            pageSizeOptions={[15, 25, 50]}
            itemLabel="alertas"
          />
        </Card>
      )}

      {/* Modales */}
      <InventoryAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={loadInventoryData}
        preselectedVariantId={selectedVariantId}
      />

      <QuickProductModal
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
