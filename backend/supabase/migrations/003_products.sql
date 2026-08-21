-- ============================================================
-- Migracion 003: Catalogo de Productos, Variantes e Imagenes
-- Incluye tablas maestras (categorias, colores, tallas, mangas)
-- y politicas de seguridad RLS por tenant.
-- ============================================================

-- 1. Categorias de producto
CREATE TABLE categorias (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Colores disponibles
CREATE TABLE colores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  hex_code      TEXT,                          -- Codigo hexadecimal ej: #FFFFFF
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tallas de guayaberas / prendas
CREATE TABLE tallas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                  -- Ej: 38, 40, 42, S, M, L
  sort_order    INTEGER NOT NULL DEFAULT 0,     -- Para ordenamiento visual
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tipos de manga
CREATE TABLE tipos_manga (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                  -- Ej: Manga corta, Manga larga
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Productos (Modelos base)
CREATE TABLE productos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                  -- Ej: "Valladolid", "Presidencial"
  description   TEXT,
  category_id   UUID REFERENCES categorias(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Variantes de producto (Combinacion unica de modelo + color + talla + manga)
CREATE TABLE variantes_producto (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  color_id      UUID REFERENCES colores(id) ON DELETE SET NULL,
  size_id       UUID REFERENCES tallas(id) ON DELETE SET NULL,
  sleeve_type_id UUID REFERENCES tipos_manga(id) ON DELETE SET NULL,
  sku           TEXT NOT NULL,                  -- SKU unico por tenant
  cost_price    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sale_price    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  min_stock     INTEGER NOT NULL DEFAULT 5,     -- Alerta de bajo stock por variante
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Restriccion de SKU unico por tenant
  CONSTRAINT uq_variant_sku_per_tenant UNIQUE (tenant_id, sku)
);

-- 7. Imagenes de variantes
CREATE TABLE imagenes_variante (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id    UUID NOT NULL REFERENCES variantes_producto(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,                  -- URL en Supabase Storage
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDICES PARA OPTIMIZAR BUSQUEDAS Y FILTROS RAPIDOS
-- ============================================================
CREATE INDEX idx_categorias_tenant ON categorias(tenant_id);
CREATE INDEX idx_colores_tenant ON colores(tenant_id);
CREATE INDEX idx_tallas_tenant ON tallas(tenant_id);
CREATE INDEX idx_productos_tenant ON productos(tenant_id);
CREATE INDEX idx_productos_category ON productos(category_id);
CREATE INDEX idx_variantes_tenant ON variantes_producto(tenant_id);
CREATE INDEX idx_variantes_product ON variantes_producto(product_id);
CREATE INDEX idx_variantes_sku ON variantes_producto(tenant_id, sku);
CREATE INDEX idx_imagenes_variant ON imagenes_variante(variant_id);

-- Triggers de updated_at
CREATE TRIGGER trigger_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_variantes_updated_at
  BEFORE UPDATE ON variantes_producto
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- POLITICAS DE SEGURIDAD RLS PARA MULTI-TENANCY
-- ============================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_manga ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_variante ENABLE ROW LEVEL SECURITY;

-- Politicas para categorias
CREATE POLICY "categorias_tenant_isolation" ON categorias
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Politicas para colores
CREATE POLICY "colores_tenant_isolation" ON colores
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Politicas para tallas
CREATE POLICY "tallas_tenant_isolation" ON tallas
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Politicas para tipos_manga
CREATE POLICY "tipos_manga_tenant_isolation" ON tipos_manga
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Politicas para productos
CREATE POLICY "productos_tenant_isolation" ON productos
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Politicas para variantes_producto
CREATE POLICY "variantes_tenant_isolation" ON variantes_producto
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Politicas para imagenes_variante (a traves de la variante del tenant)
CREATE POLICY "imagenes_tenant_isolation" ON imagenes_variante
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM variantes_producto v
      WHERE v.id = imagenes_variante.variant_id
      AND v.tenant_id = get_current_tenant_id()
    )
  );

-- Politica publica de lectura para el catalogo publico
CREATE POLICY "public_catalog_read_productos" ON productos
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_catalog_read_variantes" ON variantes_producto
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_catalog_read_categorias" ON categorias
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_catalog_read_colores" ON colores
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_catalog_read_tallas" ON tallas
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_catalog_read_tipos_manga" ON tipos_manga
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_catalog_read_imagenes" ON imagenes_variante
  FOR SELECT USING (true);
