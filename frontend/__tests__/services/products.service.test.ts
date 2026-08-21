import { productsService } from "@/services/products.service";

describe("productsService", () => {
  it("debe estar definido y tener los metodos requeridos", () => {
    expect(productsService).toBeDefined();
    expect(typeof productsService.getProducts).toBe("function");
    expect(typeof productsService.createProduct).toBe("function");
    expect(typeof productsService.toggleVariantStatus).toBe("function");
    expect(typeof productsService.getCategories).toBe("function");
    expect(typeof productsService.getColors).toBe("function");
    expect(typeof productsService.getSizes).toBe("function");
    expect(typeof productsService.getSleeveTypes).toBe("function");
    expect(typeof productsService.generateSKU).toBe("function");
  });

  it("debe generar un SKU valido con formato MODELO-COLOR-TALLA", () => {
    const sku = productsService.generateSKU("Valladolid", "Blanco", "40");
    expect(sku).toBe("VALL-BLA-40");
  });

  it("debe limpiar acentos y caracteres especiales al generar SKU", () => {
    const sku = productsService.generateSKU("Yucatán", "Azul", "38");
    expect(sku).toBe("YUCA-AZU-38");
  });
});
