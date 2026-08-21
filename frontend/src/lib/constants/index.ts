// Constantes globales del sistema

export const APP_NAME = "Guayabera Manager";
export const APP_VERSION = "1.0.0";

// Roles de usuario
export const ROLES = {
  ADMIN:      "admin",
  SELLER:     "seller",
  PRODUCTION: "production",
} as const;

// Tipos de movimiento de inventario
export const MOVEMENT_TYPES = {
  ENTRADA_PRODUCCION:    "entrada_produccion",
  ENTRADA_COMPRA:        "entrada_compra",
  SALIDA_VENTA:          "salida_venta",
  AJUSTE_POSITIVO:       "ajuste_positivo",
  AJUSTE_NEGATIVO:       "ajuste_negativo",
  MERMA:                 "merma",
  DANADO:                "danado",
  TRANSFERENCIA_ENTRADA: "transferencia_entrada",
  TRANSFERENCIA_SALIDA:  "transferencia_salida",
} as const;

// Etiquetas legibles de movimientos
export const MOVEMENT_LABELS: Record<string, string> = {
  entrada_produccion:    "Entrada por produccion",
  entrada_compra:        "Entrada por compra",
  salida_venta:          "Salida por venta",
  ajuste_positivo:       "Ajuste positivo",
  ajuste_negativo:       "Ajuste negativo",
  merma:                 "Merma",
  danado:                "Producto danado",
  transferencia_entrada: "Transferencia recibida",
  transferencia_salida:  "Transferencia enviada",
};

// Metodos de pago
export const PAYMENT_METHODS = {
  CASH:     "cash",
  CARD:     "card",
  TRANSFER: "transfer",
} as const;

export const PAYMENT_LABELS: Record<string, string> = {
  cash:     "Efectivo",
  card:     "Tarjeta",
  transfer: "Transferencia",
};

// Tipos de plan
export const PLAN_TYPES = {
  TRIAL:      "trial",
  BASIC:      "basic",
  PRO:        "pro",
  ENTERPRISE: "enterprise",
} as const;

// Paginas del sistema (para breadcrumbs y navegacion)
export const ROUTES = {
  HOME:          "/",
  LOGIN:         "/login",
  REGISTER:      "/register",
  DASHBOARD:     "/dashboard",
  PRODUCTS:      "/productos",
  INVENTORY:     "/inventario",
  POS:           "/pos",
  SALES:         "/ventas",
  CLIENTS:       "/clientes",
  PRODUCTION:    "/produccion",
  REPORTS:       "/reportes",
  SETTINGS:      "/configuracion",
  CATALOG:       "/catalogo",
  AUDIT:         "/auditoria",
} as const;
