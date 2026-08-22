-- ============================================================
-- Migracion 001: Estructura multi-tenant base
-- Crea las tablas raiz del sistema: tenants, planes y configuracion
-- ============================================================

-- Habilitar extension para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabla: tenants
-- Cada fila representa una empresa registrada en la plataforma
-- ============================================================
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,          -- URL del catalogo publico: /catalogo/[slug]
  rfc           TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  logo_url      TEXT,
  whatsapp      TEXT,                          -- Numero para boton de contacto en catalogo
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabla: tenant_plans
-- Controla el plan de suscripcion activo de cada empresa
-- ============================================================
CREATE TABLE tenant_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_type     TEXT NOT NULL DEFAULT 'trial'  -- 'trial' | 'basic' | 'pro' | 'enterprise'
                CHECK (plan_type IN ('trial', 'basic', 'pro', 'enterprise')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabla: tenant_settings
-- Configuracion personalizada de cada empresa
-- ============================================================
CREATE TABLE tenant_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  currency            TEXT NOT NULL DEFAULT 'MXN',
  timezone            TEXT NOT NULL DEFAULT 'America/Merida',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,   -- Umbral global de alerta bajo stock
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false, -- Permitir ventas sin existencia
  ticket_header       TEXT,                            -- Texto personalizado en tickets
  ticket_footer       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabla de perfiles de usuario extendida
-- Se vincula con auth.users de Supabase (tabla de autenticacion)
-- ============================================================
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'seller'
                CHECK (role IN ('admin', 'seller', 'production')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indices para mejorar rendimiento de consultas frecuentes
-- ============================================================
CREATE INDEX idx_tenant_plans_tenant_id ON tenant_plans(tenant_id);
CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ============================================================
-- Funcion para actualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tenants
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tenant_plans
CREATE TRIGGER trigger_tenant_plans_updated_at
  BEFORE UPDATE ON tenant_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tenant_settings
CREATE TRIGGER trigger_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_profiles
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


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


-- ============================================================
-- Migración 004: Inventario y Movimientos (Multi-ubicación & Auditoría)
-- ============================================================

-- 1. Tabla de Ubicaciones (Bodegas, Tiendas, Almacenes)
CREATE TABLE IF NOT EXISTS public.ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para búsquedas rápidas por tenant
CREATE INDEX IF NOT EXISTS idx_ubicaciones_tenant ON public.ubicaciones(tenant_id);

-- 2. Tabla de Existencias / Stock por Variante y Ubicación
CREATE TABLE IF NOT EXISTS public.existencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_existencias_variante_ubicacion UNIQUE (variant_id, location_id)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_existencias_tenant ON public.existencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_existencias_variant ON public.existencias(variant_id);
CREATE INDEX IF NOT EXISTS idx_existencias_location ON public.existencias(location_id);

-- 3. Tabla de Historial de Movimientos de Inventario (Auditoría)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'DEVOLUCION')),
    quantity INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL DEFAULT 0,
    quantity_after INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    reference_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para reportes e historial
CREATE INDEX IF NOT EXISTS idx_movimientos_tenant ON public.movimientos_inventario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_variant ON public.movimientos_inventario(variant_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON public.movimientos_inventario(created_at DESC);

-- 4. Función Trigger para Actualización Automática de Stock
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty INTEGER := 0;
    v_new_qty INTEGER := 0;
BEGIN
    -- Obtener la cantidad actual existente en la ubicación objetivo
    SELECT quantity INTO v_current_qty
    FROM public.existencias
    WHERE variant_id = NEW.variant_id
      AND location_id = NEW.location_id;

    IF v_current_qty IS NULL THEN
        v_current_qty := 0;
    END IF;

    -- Calcular la nueva cantidad según el tipo de movimiento
    IF NEW.type IN ('ENTRADA', 'DEVOLUCION') THEN
        v_new_qty := v_current_qty + NEW.quantity;
    ELSIF NEW.type IN ('SALIDA', 'VENTA') THEN
        v_new_qty := v_current_qty - NEW.quantity;
        IF v_new_qty < 0 THEN
            v_new_qty := 0; -- Evitar existencias negativas
        END IF;
    ELSIF NEW.type = 'AJUSTE' THEN
        v_new_qty := NEW.quantity;
    ELSE
        v_new_qty := v_current_qty + NEW.quantity;
    END IF;

    -- Actualizar los valores de auditoría en el registro del movimiento
    NEW.quantity_before := v_current_qty;
    NEW.quantity_after := v_new_qty;

    -- Insertar o actualizar la cantidad en la tabla existencias
    INSERT INTO public.existencias (tenant_id, variant_id, location_id, quantity, updated_at)
    VALUES (NEW.tenant_id, NEW.variant_id, NEW.location_id, v_new_qty, now())
    ON CONFLICT (variant_id, location_id)
    DO UPDATE SET
        quantity = v_new_qty,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear Trigger BEFORE INSERT en movimientos_inventario
DROP TRIGGER IF EXISTS trg_update_stock_on_movement ON public.movimientos_inventario;
CREATE TRIGGER trg_update_stock_on_movement
    BEFORE INSERT ON public.movimientos_inventario
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_on_movement();

-- 5. Habilitar RLS en las tablas de inventario
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Tenant isolation policy for ubicaciones" ON public.ubicaciones;
CREATE POLICY "Tenant isolation policy for ubicaciones" ON public.ubicaciones
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation policy for existencias" ON public.existencias;
CREATE POLICY "Tenant isolation policy for existencias" ON public.existencias
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation policy for movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "Tenant isolation policy for movimientos_inventario" ON public.movimientos_inventario
    FOR ALL USING (tenant_id = public.get_current_tenant_id());


-- ============================================================
-- Migracion 007: Row Level Security (RLS) - Aislamiento multi-tenant
-- CRITICO: Estas politicas garantizan que cada empresa
-- solo acceda a sus propios datos.
-- ============================================================

-- Funcion de ayuda: obtiene el tenant_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Funcion de ayuda: obtiene el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS para: tenants
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own" ON public.tenants;
CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT USING (
    id = public.get_current_tenant_id() OR is_active = true
  );

DROP POLICY IF EXISTS "tenants_insert_public" ON public.tenants;
CREATE POLICY "tenants_insert_public" ON public.tenants
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_update_own_admin" ON public.tenants;
CREATE POLICY "tenant_update_own_admin" ON public.tenants
  FOR UPDATE USING (
    id = public.get_current_tenant_id()
    AND public.get_current_user_role() = 'admin'
  );

-- ============================================================
-- RLS para: tenant_plans
-- ============================================================
ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_plans_select_own" ON public.tenant_plans;
CREATE POLICY "tenant_plans_select_own" ON public.tenant_plans
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "tenant_plans_insert_public" ON public.tenant_plans;
CREATE POLICY "tenant_plans_insert_public" ON public.tenant_plans
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- RLS para: tenant_settings
-- ============================================================
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_settings_select_own" ON public.tenant_settings;
CREATE POLICY "tenant_settings_select_own" ON public.tenant_settings
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "tenant_settings_insert_public" ON public.tenant_settings;
CREATE POLICY "tenant_settings_insert_public" ON public.tenant_settings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_settings_update_admin" ON public.tenant_settings;
CREATE POLICY "tenant_settings_update_admin" ON public.tenant_settings
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() = 'admin'
  );

-- ============================================================
-- RLS para: user_profiles
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_same_tenant" ON public.user_profiles;
CREATE POLICY "user_profiles_select_same_tenant" ON public.user_profiles
  FOR SELECT USING (tenant_id = public.get_current_tenant_id() OR id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "user_profiles_manage_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_manage_admin" ON public.user_profiles
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() = 'admin'
  );

