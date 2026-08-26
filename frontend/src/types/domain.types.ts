// ============================================================
// Tipos del dominio de negocio — Guayabera Manager
// Estos tipos representan las entidades del sistema.
// NO dependen de la base de datos directamente.
// ============================================================

// --- Multi-tenant ---

export type PlanType = "trial" | "basic" | "pro" | "enterprise";
export type PlanStatus = "active" | "suspended" | "cancelled";
export type UserRole = "admin" | "seller" | "production";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  allowNegativeStock: boolean;
  ticketHeader: string | null;
  ticketFooter: string | null;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// --- Productos ---

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
}

export interface Color {
  id: string;
  tenantId: string;
  name: string;
  hexCode: string | null;
  isActive: boolean;
}

export interface Size {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SleeveType {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
  imageUrl?: string | null;
  images?: ProductImage[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  tenantId: string;
  productId: string;
  product: Product | null;
  colorId: string | null;
  color: Color | null;
  sizeId: string | null;
  size: Size | null;
  sleeveTypeId: string | null;
  sleeveType: SleeveType | null;
  sku: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  isActive: boolean;
  images: ProductImage[];
  // Existencias calculadas (join con tabla existencias)
  totalStock?: number;
  stockByLocation?: StockByLocation[];
}

export interface ProductImage {
  id: string;
  variantId?: string;
  productId?: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

// --- Inventario ---

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Stock {
  id: string;
  tenantId: string;
  variantId: string;
  locationId: string;
  location: Location | null;
  quantity: number;
  updatedAt: string;
}

export interface StockByLocation {
  locationId: string;
  locationName: string;
  quantity: number;
}

export type MovementType =
  | "entrada_produccion"
  | "entrada_compra"
  | "salida_venta"
  | "ajuste_positivo"
  | "ajuste_negativo"
  | "merma"
  | "danado"
  | "transferencia_entrada"
  | "transferencia_salida";

export interface InventoryMovement {
  id: string;
  tenantId: string;
  variantId: string;
  variant: ProductVariant | null;
  locationId: string;
  location: Location | null;
  type: MovementType;
  quantity: number;                // Positivo = entrada, Negativo = salida
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  referenceId: string | null;      // ID de venta, orden de produccion, etc.
  userId: string;
  user: UserProfile | null;
  createdAt: string;
}

// --- Clientes ---

export type ClientType = "regular" | "wholesale";

export interface Client {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  type: ClientType;
  company: string | null;
  rfc: string | null;
  address: string | null;
  discountPercent: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

// --- Ventas ---

export type PaymentMethod = "cash" | "card" | "transfer";
export type SaleStatus = "completed" | "cancelled" | "refunded";

export interface Sale {
  id: string;
  tenantId: string;
  ticketNumber: string;
  clientId: string | null;
  client: Client | null;
  sellerId: string;
  seller: UserProfile | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  status: SaleStatus;
  notes: string | null;
  items: SaleItem[];
  payments: SalePayment[];
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  variant: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
}

// --- Carrito POS (estado local, no va a la BD) ---

export interface CartItem {
  variantId: string;
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

// --- Dashboard ---

export interface DashboardMetrics {
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  totalInventoryUnits: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingOrdersCount: number;
}

// --- Alertas ---

export interface StockAlert {
  variantId: string;
  sku: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  currentStock: number;
  minStock: number;
  isOutOfStock: boolean;
}
