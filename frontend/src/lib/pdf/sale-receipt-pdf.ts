// ================================================================
// lib/pdf/sale-receipt-pdf.ts — Guayabera Manager
// Genera un comprobante / ticket de venta formal en PDF.
// ================================================================
import type { SaleRecord } from "@/services/sales.service";

export interface SaleReceiptData {
  ticketNumber: string;
  createdAt: string;
  clientName?: string | null;
  sellerName?: string | null;
  locationName?: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  items: {
    sku: string;
    productName: string;
    colorName?: string | null;
    sizeName?: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  payments: {
    method: string;
    amount: number;
  }[];
  change?: number;
}

export async function downloadSaleReceiptPDF(
  sale: SaleReceiptData,
  tenantInfo?: { name?: string; phone?: string | null; email?: string | null; address?: string | null }
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const COLOR_DARK   = [38, 48, 43]   as [number, number, number]; // #26302B
  const COLOR_GREEN  = [85, 107, 93]  as [number, number, number]; // #556B5D
  const COLOR_GOLD   = [196, 154, 90] as [number, number, number]; // #C49A5A
  const COLOR_ACCENT = [63, 125, 88]  as [number, number, number]; // #3F7D58
  const COLOR_BG     = [248, 246, 241] as [number, number, number]; // #F8F6F1
  const COLOR_MUTED  = [107, 122, 113] as [number, number, number]; // #6B7A71
  const COLOR_LINE   = [221, 217, 208] as [number, number, number]; // #DDD9D0
  const COLOR_WHITE  = [255, 255, 255] as [number, number, number];

  const PAGE_W = 215.9;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── ENCABEZADO ────────────────────────────────────────────────
  doc.setFillColor(...COLOR_DARK);
  doc.roundedRect(MARGIN, 12, CONTENT_W, 34, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...COLOR_WHITE);
  doc.text(tenantInfo?.name || "Guayabera Manager", MARGIN + 5, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GOLD);
  doc.text("Comprobante Oficial de Venta / Ticket Digital", MARGIN + 5, 31);

  doc.setTextColor(180, 200, 185);
  doc.setFontSize(7.5);
  let contactText = "";
  if (tenantInfo?.phone) contactText += `Tel: ${tenantInfo.phone}  `;
  if (tenantInfo?.email) contactText += `Email: ${tenantInfo.email}`;
  if (contactText) {
    doc.text(contactText, MARGIN + 5, 37);
  }

  // Folio de Ticket (derecha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_GOLD);
  doc.text(`TICKET #${sale.ticketNumber}`, PAGE_W - MARGIN - 5, 25, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 185);
  const formattedDate = new Date(sale.createdAt).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Fecha: ${formattedDate}`, PAGE_W - MARGIN - 5, 32, { align: "right" });
  if (sale.locationName) {
    doc.text(`Sucursal: ${sale.locationName}`, PAGE_W - MARGIN - 5, 37, { align: "right" });
  }

  // ── DATOS DEL CLIENTE Y VENDEDOR ──────────────────────────────
  let cursorY = 53;
  doc.setFillColor(...COLOR_BG);
  doc.roundedRect(MARGIN, cursorY - 4, CONTENT_W, 16, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("CLIENTE", MARGIN + 4, cursorY + 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text(sale.clientName || "Público General", MARGIN + 4, cursorY + 7);

  if (sale.sellerName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Atendido por: ${sale.sellerName}`, MARGIN + 4, cursorY + 11.5);
  }

  // Total de prendas (derecha)
  const totalQty = sale.items.reduce((acc, i) => acc + i.quantity, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("TOTAL ARTÍCULOS", PAGE_W - MARGIN - 4, cursorY + 1, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text(`${totalQty} prenda${totalQty !== 1 ? "s" : ""}`, PAGE_W - MARGIN - 4, cursorY + 7, { align: "right" });

  // ── TABLA DE PRODUCTOS ─────────────────────────────────────────
  cursorY += 20;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Artículo / Modelo", "Color / Talla", "Cant.", "P. Unitario", "Subtotal"]],
    body: sale.items.map((i) => [
      `${i.productName}\nSKU: ${i.sku}`,
      `${i.colorName || ""} ${i.sizeName ? `(Talla ${i.sizeName})` : ""}`.trim() || "Estándar",
      `${i.quantity} pza${i.quantity > 1 ? "s" : ""}`,
      `$${Number(i.unitPrice).toFixed(2)}`,
      `$${Number(i.subtotal).toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: COLOR_DARK,
      textColor: COLOR_WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLOR_DARK,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: "bold" },
      1: { cellWidth: 45, halign: "center" },
      2: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [250, 247, 242] as [number, number, number] },
  });

  // ── TOTALES Y MÉTODOS DE PAGO ──────────────────────────────────
  const afterTableY = (doc as any).lastAutoTable.finalY + 6;
  const boxX = PAGE_W - MARGIN - 75;

  // Métodos de Pago (izquierda)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("MÉTODO DE PAGO REGISTRADO:", MARGIN + 4, afterTableY + 4);

  let payY = afterTableY + 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);

  const formatMethod = (m: string) => {
    switch (m) {
      case "cash": return "Efectivo";
      case "card": return "Tarjeta (Débito/Crédito)";
      case "transfer": return "Transferencia Electrónica";
      default: return m;
    }
  };

  sale.payments.forEach((p) => {
    doc.text(`• ${formatMethod(p.method)}: $${Number(p.amount).toFixed(2)} MXN`, MARGIN + 4, payY);
    payY += 4.5;
  });

  if (sale.change && sale.change > 0) {
    doc.setTextColor(...COLOR_ACCENT);
    doc.setFont("helvetica", "bold");
    doc.text(`  Cambio entregado: $${Number(sale.change).toFixed(2)} MXN`, MARGIN + 4, payY);
  }

  // Resumen Financiero (derecha)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Subtotal (${totalQty} pzas):`, boxX, afterTableY + 4);
  doc.text(`$${Number(sale.subtotal).toFixed(2)}`, PAGE_W - MARGIN, afterTableY + 4, { align: "right" });

  let financialY = afterTableY + 4;
  if (sale.discountAmount > 0) {
    financialY += 7;
    doc.setFillColor(235, 245, 240);
    doc.roundedRect(boxX - 2, financialY - 4, 77, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_ACCENT);
    doc.text("Descuento Aplicado:", boxX, financialY + 1);
    doc.text(`-$${Number(sale.discountAmount).toFixed(2)}`, PAGE_W - MARGIN, financialY + 1, { align: "right" });
  }

  financialY += 8;
  doc.setDrawColor(...COLOR_DARK);
  doc.setLineWidth(0.5);
  doc.line(boxX - 2, financialY, PAGE_W - MARGIN, financialY);

  financialY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  doc.text("TOTAL PAGADO:", boxX, financialY);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text(`$${Number(sale.total).toFixed(2)} MXN`, PAGE_W - MARGIN, financialY, { align: "right" });

  // ── PIE DE PÁGINA ─────────────────────────────────────────────
  const footerY = Math.max(payY + 12, financialY + 18);
  doc.setDrawColor(...COLOR_LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, PAGE_W - MARGIN, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GREEN);
  doc.text("¡Gracias por su compra!", PAGE_W / 2, footerY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    `Comprobante de compra electrónico emitido el ${formattedDate}`,
    PAGE_W / 2,
    footerY + 10,
    { align: "center" }
  );

  const fileName = `Ticket_${sale.ticketNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
  doc.save(fileName);
}
