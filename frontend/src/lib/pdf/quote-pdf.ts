// ================================================================
// lib/pdf/quote-pdf.ts — Guayabera Manager
// Genera un PDF membretado profesional de una cotizacion.
// Importacion dinamica (client-only).
// ================================================================
import type { QuoteRecord } from "@/services/quotes.service";

export async function downloadQuotePDF(quote: QuoteRecord): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const COLOR_DARK   = [38, 48, 43]   as [number, number, number];
  const COLOR_GREEN  = [85, 107, 93]  as [number, number, number];
  const COLOR_GOLD   = [196, 154, 90] as [number, number, number];
  const COLOR_ACCENT = [63, 125, 88]  as [number, number, number];
  const COLOR_BG     = [248, 246, 241] as [number, number, number];
  const COLOR_MUTED  = [107, 122, 113] as [number, number, number];
  const COLOR_LINE   = [221, 217, 208] as [number, number, number];
  const COLOR_WHITE  = [255, 255, 255] as [number, number, number];

  const PAGE_W = 215.9;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ENCABEZADO
  doc.setFillColor(...COLOR_DARK);
  doc.roundedRect(MARGIN, 12, CONTENT_W, 36, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_WHITE);
  doc.text(quote.tenantInfo?.name || "Guayabera Manager", MARGIN + 5, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GOLD);
  doc.text("Confeccion & Mayoreo de Guayaberas Finas", MARGIN + 5, 32);

  doc.setTextColor(180, 200, 185);
  doc.setFontSize(7.5);
  let contactY = 37.5;
  if (quote.tenantInfo?.phone) {
    doc.text(`Tel: ${quote.tenantInfo.phone}`, MARGIN + 5, contactY);
    contactY += 4;
  }
  if (quote.tenantInfo?.email) {
    doc.text(`Email: ${quote.tenantInfo.email}`, MARGIN + 5, contactY);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_GOLD);
  doc.text(quote.quoteNumber, PAGE_W - MARGIN - 5, 26, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 185);
  const emitDate = new Date(quote.createdAt).toLocaleDateString("es-MX");
  const validUntil = new Date(
    new Date(quote.createdAt).getTime() + quote.validDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString("es-MX");
  doc.text(`Emision: ${emitDate}`, PAGE_W - MARGIN - 5, 33, { align: "right" });
  doc.text(`Valido hasta: ${validUntil}`, PAGE_W - MARGIN - 5, 38, { align: "right" });

  // DATOS DEL CLIENTE
  let cursorY = 56;
  doc.setFillColor(...COLOR_BG);
  doc.roundedRect(MARGIN, cursorY - 4, CONTENT_W, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("CLIENTE / EMPRESA ATENDIDA", MARGIN + 4, cursorY + 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_DARK);
  doc.text(quote.clientName, MARGIN + 4, cursorY + 7);

  if (quote.clientPhone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`WhatsApp / Tel: ${quote.clientPhone}`, MARGIN + 4, cursorY + 12);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("VOLUMEN SOLICITADO", PAGE_W - MARGIN - 4, cursorY + 1, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text(`${quote.totalPieces} guayaberas`, PAGE_W - MARGIN - 4, cursorY + 8, { align: "right" });

  if (quote.discountAmount > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_ACCENT);
    doc.text("Descuento de Mayoreo Aplicado", PAGE_W - MARGIN - 4, cursorY + 13, { align: "right" });
  }

  // TABLA DE PRENDAS
  cursorY += 22;
  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Modelo / Guayabera", "Detalle / Talla", "Cant.", "Precio Reg.", "P. Mayoreo", "Subtotal"]],
    body: quote.details.map((d) => [
      `${d.productName}\nSKU: ${d.sku}`,
      `${d.colorName || ""}${d.sizeName ? ` (Talla ${d.sizeName})` : ""}`,
      `${d.quantity} pzas`,
      `$${d.unitPrice.toFixed(2)}`,
      `$${d.finalUnitPrice.toFixed(2)}`,
      `$${d.subtotal.toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: COLOR_DARK,
      textColor: COLOR_WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 8, textColor: COLOR_DARK, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold" },
      1: { cellWidth: 38, halign: "center" },
      2: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [250, 247, 242] as [number, number, number] },
  });

  // RESUMEN FINANCIERO
  const afterTableY = (doc as any).lastAutoTable.finalY + 6;
  const boxX = PAGE_W - MARGIN - 72;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Subtotal Regular (${quote.totalPieces} pzas):`, boxX, afterTableY + 4);
  doc.text(`$${quote.subtotal.toFixed(2)}`, PAGE_W - MARGIN, afterTableY + 4, { align: "right" });

  let financialY = afterTableY + 4;
  if (quote.discountAmount > 0) {
    financialY += 7;
    doc.setFillColor(235, 245, 240);
    doc.roundedRect(boxX - 2, financialY - 4, 74, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_ACCENT);
    doc.text("Ahorro Total por Mayoreo:", boxX, financialY + 1);
    doc.text(`-$${quote.discountAmount.toFixed(2)}`, PAGE_W - MARGIN, financialY + 1, { align: "right" });
  }

  financialY += 8;
  doc.setDrawColor(...COLOR_DARK);
  doc.setLineWidth(0.5);
  doc.line(boxX - 2, financialY, PAGE_W - MARGIN, financialY);

  financialY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  doc.text("TOTAL ESTIMADO:", boxX, financialY);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text(`$${quote.totalAmount.toFixed(2)} MXN`, PAGE_W - MARGIN, financialY, { align: "right" });

  // NOTAS
  financialY += 12;
  doc.setFillColor(...COLOR_BG);
  doc.roundedRect(MARGIN, financialY, CONTENT_W, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("NOTAS & CONDICIONES DE ENTREGA:", MARGIN + 4, financialY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  const notesText = quote.notes ||
    "El costo de envio no esta incluido en el precio final y corre por cuenta del cliente. Cotizacion sujeta a disponibilidad de inventario o tiempo de confeccion en taller.";
  const splitNotes = doc.splitTextToSize(notesText, CONTENT_W - 8);
  doc.text(splitNotes, MARGIN + 4, financialY + 11);

  // PIE DE PAGINA
  const footerY = financialY + 28;
  doc.setDrawColor(...COLOR_LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, PAGE_W - MARGIN, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GREEN);
  doc.text("Gracias por su confianza y preferencia!", PAGE_W / 2, footerY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    `Cotizacion generada por el Sistema Guayabera Manager - ${emitDate}`,
    PAGE_W / 2,
    footerY + 10,
    { align: "center" }
  );

  const fileName = `Cotizacion_${quote.quoteNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
  doc.save(fileName);
}
