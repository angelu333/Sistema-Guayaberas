import { inventoryService } from "@/services/inventory.service";

// Mock de Supabase client
jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: jest.fn(() => ({
      from: jest.fn((table: string) => {
        if (table === "ubicaciones") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "loc-1",
                  tenant_id: "tenant-123",
                  name: "Tienda Principal",
                  description: "Almacén Central",
                  is_active: true,
                },
              ],
              error: null,
            }),
          };
        }

        if (table === "existencias") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "exist-1",
                  quantity: 15,
                  updated_at: "2026-08-21T12:00:00Z",
                  location_id: "loc-1",
                  ubicaciones: { name: "Tienda Principal" },
                  variant_id: "var-1",
                  variantes_producto: {
                    id: "var-1",
                    sku: "GUA-BLA-M",
                    sale_price: 750,
                    min_stock: 5,
                    productos: {
                      name: "Guayabera Presidencial",
                      categorias: { name: "Manga Larga" },
                    },
                    colores: { name: "Blanco" },
                    tallas: { name: "Mediana (M)" },
                    tipos_manga: { name: "Larga" },
                  },
                },
              ],
              error: null,
            }),
          };
        }

        if (table === "movimientos_inventario") {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "mov-1",
                  tenant_id: "tenant-123",
                  variant_id: "var-1",
                  location_id: "loc-1",
                  type: "ENTRADA",
                  quantity: 10,
                  quantity_before: 5,
                  quantity_after: 15,
                  reason: "Reabastecimiento",
                  user_id: "user-1",
                  created_at: "2026-08-21T12:00:00Z",
                  ubicaciones: { name: "Tienda Principal" },
                  variantes_producto: {
                    sku: "GUA-BLA-M",
                    productos: { name: "Guayabera Presidencial" },
                    colores: { name: "Blanco" },
                    tallas: { name: "Mediana (M)" },
                  },
                },
              ],
              error: null,
            }),
          };
        }

        if (table === "variantes_producto") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "var-1",
                  sku: "GUA-BLA-M",
                  min_stock: 5,
                  productos: { name: "Guayabera Presidencial" },
                  colores: { name: "Blanco" },
                  tallas: { name: "Mediana (M)" },
                  existencias: [{ quantity: 2 }],
                },
              ],
              error: null,
            }),
          };
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    })),
  };
});

describe("inventoryService", () => {
  it("debe obtener la lista de ubicaciones activas", async () => {
    const locs = await inventoryService.getLocations("tenant-123");
    expect(locs).toHaveLength(1);
    expect(locs[0].name).toBe("Tienda Principal");
  });

  it("debe obtener existencias por ubicación con detalles de variante", async () => {
    const items = await inventoryService.getStockByLocation("tenant-123");
    expect(items).toHaveLength(1);
    expect(items[0].sku).toBe("GUA-BLA-M");
    expect(items[0].quantity).toBe(15);
  });

  it("debe registrar un movimiento de inventario con éxito", async () => {
    const res = await inventoryService.registerMovement({
      tenantId: "tenant-123",
      variantId: "var-1",
      locationId: "loc-1",
      type: "ENTRADA",
      quantity: 10,
      reason: "Reabastecimiento de taller",
    });
    expect(res.success).toBe(true);
  });

  it("debe identificar correctamente variantes con bajo stock en alertas", async () => {
    const alerts = await inventoryService.getStockAlerts("tenant-123");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].currentStock).toBe(2);
    expect(alerts[0].minStock).toBe(5);
    expect(alerts[0].isOutOfStock).toBe(false);
  });
});
