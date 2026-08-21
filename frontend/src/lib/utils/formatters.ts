// Funciones de formato para presentacion de datos

/**
 * Formatea un numero como moneda en pesos mexicanos
 */
export function formatCurrency(amount: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style:    "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha en formato legible en espanol
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  }).format(new Date(date));
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    year:   "numeric",
    month:  "2-digit",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Formatea un numero con separadores de miles
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

/**
 * Formatea un porcentaje
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Trunca un texto largo agregando puntos suspensivos
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
