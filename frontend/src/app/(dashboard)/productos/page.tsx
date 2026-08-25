"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, Button, Input, Badge } from "@/components/ui";
import { ProductModal } from "@/components/productos/ProductModal";
import { EditProductModal } from "@/components/productos/EditProductModal";
import { productsService } from "@/services/products.service";
import { ProductVariant, Category, Product } from "@/types/domain.types";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  Plus,
  Search,
  Filter,
  Package,
  Tag,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Shirt,
  Edit,
  Trash2,
} from "lucide-react";

export default function ProductsPage() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsService.getProducts({
        search: search || undefined,
        categoryId: selectedCategory || undefined,
      });
      setVariants(data);
    } catch (err) {
      console.error("Error al cargar productos", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await productsService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Error al cargar categorias", err);
    }
  };

  const handleToggleStatus = async (variantId: string, currentStatus: boolean) => {
    try {
      await productsService.toggleVariantStatus(variantId, !currentStatus);
      loadProducts();
    } catch (err) {
      console.error("Error al actualizar estado", err);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR el modelo "${productName}"?\n\nEsta acción eliminará el producto base, sus fotografías y todas sus variantes de tallas/colores de forma permanente.`)) {
      return;
    }

    try {
      await productsService.deleteProduct(productId);
      loadProducts();
    } catch (err: any) {
      alert(err.message || "Error al eliminar el producto.");
    }
  };

  const filteredVariants = variants.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.sku.toLowerCase().includes(q) ||
      (v.product?.name || "").toLowerCase().includes(q) ||
      (v.color?.name || "").toLowerCase().includes(q) ||
      (v.size?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Catálogo de Productos y Variantes"
        subtitle="Administre los modelos de guayaberas, fotografías, combinaciones, precios y SKUs"
      />

      <div className="page-container space-y-6">
        {/* Barra Superior de Filtros y Acciones */}
        <Card padding="md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
                <input
                  type="text"
                  placeholder="Buscar por modelo, SKU, color o talla..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DDD9D0] bg-white text-xs text-[#26302B] placeholder:text-[#9DAAA2] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="rounded-lg border border-[#DDD9D0] bg-white px-3 py-2 text-xs text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setShowModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </Card>

        {/* Tabla de Productos y Variantes */}
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#6B7A71] flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
              <span>Cargando productos del catálogo...</span>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EBF0EC] text-[#556B5D] flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#26302B] font-[Outfit]">
                No se encontraron productos
              </h3>
              <p className="text-xs text-[#6B7A71] max-w-sm mx-auto">
                No hay variantes registradas que coincidan con la búsqueda. Haga clic en "Nuevo Producto" para comenzar.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Registrar Producto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F6F1] border-b border-[#DDD9D0] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                    <th className="p-4">Foto</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Modelo / Guayabera</th>
                    <th className="p-4">Color</th>
                    <th className="p-4">Talla</th>
                    <th className="p-4">Manga</th>
                    <th className="p-4">Precio Venta</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0] text-xs text-[#26302B]">
                  {filteredVariants.map((v) => (
                    <tr key={v.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                      {/* Miniatura de Foto de Guayabera */}
                      <td className="p-4 w-14">
                        <div
                          onClick={() => v.product && setSelectedProductForEdit(v.product)}
                          className="w-11 h-11 rounded-xl overflow-hidden bg-[#F8F6F1] border border-[#DDD9D0] flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#556B5D]/40 transition-all group"
                          title="Haga clic para editar fotos del modelo"
                        >
                          {v.product?.imageUrl ? (
                            <img
                              src={v.product.imageUrl}
                              alt={v.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Shirt className="w-5 h-5 text-[#8FA393] group-hover:text-[#556B5D]" />
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-mono font-semibold text-[#556B5D]">
                        {v.sku}
                      </td>
                      <td className="p-4 font-medium">
                        <span className="font-semibold text-sm block">
                          {v.product?.name || "Sin Nombre"}
                        </span>
                        {v.product?.category && (
                          <span className="text-[11px] text-[#6B7A71] inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {v.product.category.name}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {v.color ? (
                          <div className="flex items-center gap-1.5">
                            {v.color.hexCode && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-[#DDD9D0]"
                                style={{ backgroundColor: v.color.hexCode }}
                              />
                            )}
                            <span>{v.color.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#9DAAA2]">&mdash;</span>
                        )}
                      </td>
                      <td className="p-4">
                        {v.size?.name ? (
                          <Badge variant="neutral">{v.size.name}</Badge>
                        ) : (
                          <span className="text-[#9DAAA2]">&mdash;</span>
                        )}
                      </td>
                      <td className="p-4">
                        {v.sleeveType?.name || <span className="text-[#9DAAA2]">&mdash;</span>}
                      </td>
                      <td className="p-4 font-semibold text-sm">
                        {formatCurrency(v.salePrice)}
                      </td>
                      <td className="p-4">
                        {v.isActive ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="error">Inactivo</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.product && (
                            <button
                              onClick={() => setSelectedProductForEdit(v.product)}
                              className="p-1.5 rounded-lg text-xs font-semibold text-[#556B5D] hover:bg-[#EBF0EC] transition-colors inline-flex items-center gap-1"
                              title="Editar fotos y detalles del modelo"
                            >
                              <ImageIcon className="w-4 h-4" />
                              <span className="hidden sm:inline">Fotos</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(v.id, v.isActive)}
                            className={[
                              "p-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1",
                              v.isActive
                                ? "text-[#B85450] hover:bg-[#FAEAEA]"
                                : "text-[#3F7D58] hover:bg-[#EBF5F0]",
                            ].join(" ")}
                            title={v.isActive ? "Desactivar variante" : "Reactivar variante"}
                          >
                            {v.isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>

                          {v.product && (
                            <button
                              onClick={() => handleDeleteProduct(v.product!.id, v.product!.name)}
                              className="p-1.5 rounded-lg text-xs font-medium text-[#B85450] hover:bg-[#FAEAEA] transition-colors inline-flex items-center gap-1"
                              title="Eliminar modelo y todas sus variantes de forma permanente"
                            >
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
          )}
        </Card>
      </div>

      {/* Modal de Creacion de Producto */}
      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          loadProducts();
        }}
      />

      {/* Modal de Edicion de Fotos y Producto */}
      <EditProductModal
        isOpen={!!selectedProductForEdit}
        onClose={() => setSelectedProductForEdit(null)}
        product={selectedProductForEdit}
        categories={categories}
        onSuccess={() => {
          loadProducts();
        }}
      />
    </div>
  );
}
