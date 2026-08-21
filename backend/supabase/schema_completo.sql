-- ============================================================
-- SCRIPT COMPLETO DE BASE DE DATOS — GUAYABERA MANAGER
-- Ejecutar en el SQL Editor de Supabase Cloud
-- ============================================================

-- Extension para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CREACION DE TODAS LAS TABLAS DEL SISTEMA
-- ============================================================

-- 1.1 Tenants (Empresas)
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  rfc           TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  logo_url      TEXT,
  whatsapp      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Planes por empresa
CREATE TABLE IF NOT EXISTS tenant_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_type     TEXT NOT NULL DEFAULT 'trial'
                CHECK (plan_type IN ('trial', 'basic', 'pro', 'enterprise')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Configuracion por empresa
CREATE TABLE IF NOT EXISTS tenant_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  currency            TEXT NOT NULL DEFAULT 'MXN',
  timezone            TEXT NOT NULL DEFAULT 'America/Merida',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  ticket_header       TEXT,
  ticket_footer       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Perfiles de Usuario (Vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'seller'
                CHECK (role IN ('admin', 'seller', 'production')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Colores
CREATE TABLE IF NOT EXISTS colores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  hex_code      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.7 Tallas
CREATE TABLE IF NOT EXISTS tallas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.8 Tipos de Manga
CREATE TABLE IF NOT EXISTS tipos_manga (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.9 Productos (Modelos)
CREATE TABLE IF NOT EXISTS productos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  category_id   UUID REFERENCES categorias(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.10 Variantes de Producto
CREATE TABLE IF NOT EXISTS variantes_producto (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  color_id      UUID REFERENCES colores(id) ON DELETE SET NULL,
  size_id       UUID REFERENCES tallas(id) ON DELETE SET NULL,
  sleeve_type_id UUID REFERENCES tipos_manga(id) ON DELETE SET NULL,
  sku           TEXT NOT NULL,
  cost_price    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sale_price    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  min_stock     INTEGER NOT NULL DEFAULT 5,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_variant_sku_per_tenant UNIQUE (tenant_id, sku)
);

-- 1.11 Imagenes de Variante
CREATE TABLE IF NOT EXISTS imagenes_variante (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id    UUID NOT NULL REFERENCES variantes_producto(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant_id ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_categorias_tenant ON categorias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_colores_tenant ON colores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tallas_tenant ON tallas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_tenant ON productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_category ON productos(category_id);
CREATE INDEX IF NOT EXISTS idx_variantes_tenant ON variantes_producto(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variantes_product ON variantes_producto(product_id);
CREATE INDEX IF NOT EXISTS idx_variantes_sku ON variantes_producto(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_imagenes_variant ON imagenes_variante(variant_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tenant_plans_updated_at ON tenant_plans;
CREATE TRIGGER trigger_tenant_plans_updated_at BEFORE UPDATE ON tenant_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER trigger_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_productos_updated_at ON productos;
CREATE TRIGGER trigger_productos_updated_at BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_variantes_updated_at ON variantes_producto;
CREATE TRIGGER trigger_variantes_updated_at BEFORE UPDATE ON variantes_producto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. FUNCIONES DE AYUDA Y SEGURIDAD RLS
-- (Se crean AHORA que las tablas ya existen)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM user_profiles WHERE id = auth.uid();
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. HABILITAR RLS Y DEFINIR POLITICAS DE SEGURIDAD
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_manga ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_variante ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own" ON tenants;
DROP POLICY IF EXISTS "tenant_update_own_admin" ON tenants;
DROP POLICY IF EXISTS "tenant_settings_select_own" ON tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_update_admin" ON tenant_settings;
DROP POLICY IF EXISTS "user_profiles_select_same_tenant" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_manage_admin" ON user_profiles;
DROP POLICY IF EXISTS "categorias_tenant_isolation" ON categorias;
DROP POLICY IF EXISTS "colores_tenant_isolation" ON colores;
DROP POLICY IF EXISTS "tallas_tenant_isolation" ON tallas;
DROP POLICY IF EXISTS "tipos_manga_tenant_isolation" ON tipos_manga;
DROP POLICY IF EXISTS "productos_tenant_isolation" ON productos;
DROP POLICY IF EXISTS "variantes_tenant_isolation" ON variantes_producto;
DROP POLICY IF EXISTS "imagenes_tenant_isolation" ON imagenes_variante;

CREATE POLICY "tenant_select_own" ON tenants FOR SELECT USING (id = get_current_tenant_id());
CREATE POLICY "tenant_update_own_admin" ON tenants FOR UPDATE USING (id = get_current_tenant_id() AND get_current_user_role() = 'admin');

CREATE POLICY "tenant_settings_select_own" ON tenant_settings FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_settings_update_admin" ON tenant_settings FOR ALL USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'admin');

CREATE POLICY "user_profiles_select_same_tenant" ON user_profiles FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "user_profiles_manage_admin" ON user_profiles FOR ALL USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'admin');

CREATE POLICY "categorias_tenant_isolation" ON categorias FOR ALL USING (tenant_id = get_current_tenant_id());
CREATE POLICY "colores_tenant_isolation" ON colores FOR ALL USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tallas_tenant_isolation" ON tallas FOR ALL USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tipos_manga_tenant_isolation" ON tipos_manga FOR ALL USING (tenant_id = get_current_tenant_id());
CREATE POLICY "productos_tenant_isolation" ON productos FOR ALL USING (tenant_id = get_current_tenant_id());
CREATE POLICY "variantes_tenant_isolation" ON variantes_producto FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY "imagenes_tenant_isolation" ON imagenes_variante FOR ALL USING (
  EXISTS (
    SELECT 1 FROM variantes_producto v
    WHERE v.id = imagenes_variante.variant_id
    AND v.tenant_id = get_current_tenant_id()
  )
);

-- Politicas de lectura publica para el catalogo
DROP POLICY IF EXISTS "public_catalog_read_productos" ON productos;
DROP POLICY IF EXISTS "public_catalog_read_variantes" ON variantes_producto;
DROP POLICY IF EXISTS "public_catalog_read_categorias" ON categorias;
DROP POLICY IF EXISTS "public_catalog_read_colores" ON colores;
DROP POLICY IF EXISTS "public_catalog_read_tallas" ON tallas;
DROP POLICY IF EXISTS "public_catalog_read_tipos_manga" ON tipos_manga;
DROP POLICY IF EXISTS "public_catalog_read_imagenes" ON imagenes_variante;

CREATE POLICY "public_catalog_read_productos" ON productos FOR SELECT USING (is_active = true);
CREATE POLICY "public_catalog_read_variantes" ON variantes_producto FOR SELECT USING (is_active = true);
CREATE POLICY "public_catalog_read_categorias" ON categorias FOR SELECT USING (is_active = true);
CREATE POLICY "public_catalog_read_colores" ON colores FOR SELECT USING (is_active = true);
CREATE POLICY "public_catalog_read_tallas" ON tallas FOR SELECT USING (is_active = true);
CREATE POLICY "public_catalog_read_tipos_manga" ON tipos_manga FOR SELECT USING (is_active = true);
CREATE POLICY "public_catalog_read_imagenes" ON imagenes_variante FOR SELECT USING (true);

-- ============================================================
-- 5. DATOS INICIALES DE PRUEBA (SEED)
-- ============================================================
INSERT INTO tenants (id, name, slug, phone, email, whatsapp) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Guayaberas El Yucateco',
    'el-yucateco',
    '9991234567',
    'admin@elyucateco.com',
    '529991234567'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_plans (tenant_id, plan_type, status, trial_ends_at) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'trial',
    'active',
    NOW() + INTERVAL '30 days'
  )
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, currency, timezone, low_stock_threshold) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'MXN',
    'America/Merida',
    5
  )
ON CONFLICT DO NOTHING;

INSERT INTO categorias (id, tenant_id, name) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Guayabera Clásica'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Guayabera Presidencial'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Guayabera Bordada')
ON CONFLICT DO NOTHING;

INSERT INTO colores (id, tenant_id, name, hex_code) VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Blanco', '#FFFFFF'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Beige', '#F5F5DC'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Azul Marino', '#000080')
ON CONFLICT DO NOTHING;

INSERT INTO tallas (id, tenant_id, name, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '38', 1),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '40', 2),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '42', 3)
ON CONFLICT DO NOTHING;

INSERT INTO tipos_manga (id, tenant_id, name) VALUES
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'Manga Corta'),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'Manga Larga')
ON CONFLICT DO NOTHING;
