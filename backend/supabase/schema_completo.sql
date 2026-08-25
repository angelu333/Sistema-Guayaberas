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
    id = public.get_current_tenant_id() OR (auth.uid() IS NULL AND is_active = true)
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

-- ============================================================
-- Migracion 005: Punto de Venta — Clientes, Ventas, Detalle y Pagos
-- ============================================================

-- 0. Tabla de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name        TEXT NOT NULL,
    phone            TEXT,
    email            TEXT,
    type             TEXT NOT NULL DEFAULT 'regular' CHECK (type IN ('regular', 'wholesale')),
    company          TEXT,
    rfc              TEXT,
    address          TEXT,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    notes            TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON public.clientes(tenant_id);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_own" ON public.clientes
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "clientes_insert_own" ON public.clientes
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "clientes_update_own" ON public.clientes
    FOR UPDATE USING (tenant_id = public.get_current_tenant_id());

-- 1. Tabla principal de ventas
CREATE TABLE IF NOT EXISTS public.ventas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ticket_number   TEXT NOT NULL,
    client_id       UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    seller_id       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed', 'cancelled', 'refunded')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_per_tenant UNIQUE (tenant_id, ticket_number)
);

-- 2. Detalle de productos por venta
CREATE TABLE IF NOT EXISTS public.detalle_ventas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(10,2) NOT NULL,
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    subtotal        NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Pagos registrados por venta
CREATE TABLE IF NOT EXISTS public.pagos_venta (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    method          TEXT NOT NULL CHECK (method IN ('cash', 'card', 'transfer')),
    amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ventas_tenant       ON public.ventas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ventas_created      ON public.ventas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_client       ON public.ventas(client_id);
CREATE INDEX IF NOT EXISTS idx_detalle_sale        ON public.detalle_ventas(sale_id);
CREATE INDEX IF NOT EXISTS idx_detalle_tenant      ON public.detalle_ventas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_sale          ON public.pagos_venta(sale_id);
CREATE INDEX IF NOT EXISTS idx_pagos_tenant        ON public.pagos_venta(tenant_id);

-- Funcion de ticket automatico
CREATE OR REPLACE FUNCTION public.generate_ticket_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_date      TEXT;
    v_count     INTEGER;
    v_ticket    TEXT;
BEGIN
    v_date  := TO_CHAR(now(), 'YYYYMMDD');
    SELECT COUNT(*) + 1
      INTO v_count
      FROM public.ventas
     WHERE tenant_id = p_tenant_id
       AND created_at::DATE = CURRENT_DATE;
    v_ticket := 'TK-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN v_ticket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Ventas
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ventas_select_own" ON public.ventas
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "ventas_insert_own" ON public.ventas
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "ventas_update_admin" ON public.ventas
    FOR UPDATE USING (
        tenant_id = public.get_current_tenant_id()
        AND public.get_current_user_role() = 'admin'
    );

-- RLS Detalle Ventas
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detalle_ventas_select_own" ON public.detalle_ventas
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "detalle_ventas_insert_own" ON public.detalle_ventas
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ============================================================
-- Migracion 006: Bitacora de Auditoria e Historial de Cambios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auditoria (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity        TEXT NOT NULL CHECK (entity IN ('PRODUCTO', 'PRECIO', 'INVENTARIO', 'VENTA', 'CLIENTE', 'USUARIO')),
    action        TEXT NOT NULL CHECK (action IN ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'AJUSTE', 'CANCELAR')),
    record_id     UUID,
    details       TEXT NOT NULL,
    old_data      JSONB,
    new_data      JSONB,
    user_id       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_auditoria_tenant   ON public.auditoria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entity   ON public.auditoria(entity);
CREATE INDEX IF NOT EXISTS idx_auditoria_created  ON public.auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_user     ON public.auditoria(user_id);

-- ============================================================
-- Migracion 008: Modulo de Produccion y Taller Dinamico
-- ============================================================

CREATE TABLE IF NOT EXISTS public.etapas_produccion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 1,
    is_final    BOOLEAN NOT NULL DEFAULT false,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etapas_tenant ON public.etapas_produccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etapas_sort   ON public.etapas_produccion(sort_order);

ALTER TABLE public.etapas_produccion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etapas_select_own" ON public.etapas_produccion
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "etapas_all_admin" ON public.etapas_produccion
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE TABLE IF NOT EXISTS public.ordenes_produccion (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number       TEXT NOT NULL,
    variant_id         UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
    current_stage_id   UUID REFERENCES public.etapas_produccion(id) ON DELETE SET NULL,
    target_quantity    INTEGER NOT NULL CHECK (target_quantity > 0),
    completed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (completed_quantity >= 0),
    status             TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    assigned_to        TEXT,
    target_location_id UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
    notes              TEXT,
    created_by         UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ordenes_tenant ON public.ordenes_produccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_stage  ON public.ordenes_produccion(current_stage_id);

ALTER TABLE public.ordenes_produccion ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Migracion 009: Modulo de Proveedores y Compras
-- ============================================================

CREATE TABLE IF NOT EXISTS public.proveedores (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    contact_name  TEXT,
    phone         TEXT,
    email         TEXT,
    type          TEXT NOT NULL DEFAULT 'telas' CHECK (type IN ('taller', 'telas', 'insumos', 'bordado', 'otro')),
    city          TEXT,
    notes         TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_tenant ON public.proveedores(tenant_id);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proveedores_select_own" ON public.proveedores
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "proveedores_all_own" ON public.proveedores
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE TABLE IF NOT EXISTS public.compras (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number  TEXT NOT NULL,
    supplier_id   UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
    total_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes         TEXT,
    created_by    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    received_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_tenant ON public.compras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compras_supplier ON public.compras(supplier_id);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_select_own" ON public.compras
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "compras_all_own" ON public.compras
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE TABLE IF NOT EXISTS public.detalle_compras (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    purchase_id   UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
    variant_id    UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost     NUMERIC(10,2) NOT NULL DEFAULT 0,
    location_id   UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detalle_compras_purchase ON public.detalle_compras(purchase_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compras_tenant   ON public.detalle_compras(tenant_id);

ALTER TABLE public.detalle_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detalle_compras_select_own" ON public.detalle_compras
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "detalle_compras_all_own" ON public.detalle_compras
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- ============================================================
-- Migracion 010: Modulo de Insumos, Materias Primas y Recetas (BOM)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.insumos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'tela' CHECK (category IN ('tela', 'boton', 'hilo', 'etiqueta', 'otro')),
    unit           TEXT NOT NULL DEFAULT 'metros' CHECK (unit IN ('metros', 'piezas', 'rollos', 'gramos')),
    current_stock  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    cost_per_unit  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
    supplier_id    UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumos_tenant ON public.insumos(tenant_id);

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos_select_own" ON public.insumos
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "insumos_all_own" ON public.insumos
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE TABLE IF NOT EXISTS public.recetas_produccion (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    insumo_id       UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    quantity_needed NUMERIC(10,2) NOT NULL CHECK (quantity_needed > 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_insumo UNIQUE (product_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_recetas_product ON public.recetas_produccion(product_id);
CREATE INDEX IF NOT EXISTS idx_recetas_tenant  ON public.recetas_produccion(tenant_id);

ALTER TABLE public.recetas_produccion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recetas_select_own" ON public.recetas_produccion
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "recetas_all_own" ON public.recetas_produccion
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- ============================================================
-- Migracion 011: Modulo de Cotizaciones de Mayoreo y Rangos por Volumen
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rangos_mayoreo (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    min_quantity      INTEGER NOT NULL CHECK (min_quantity >= 1),
    max_quantity      INTEGER CHECK (max_quantity >= min_quantity),
    discount_percent  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rangos_mayoreo_tenant ON public.rangos_mayoreo(tenant_id);

ALTER TABLE public.rangos_mayoreo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rangos_mayoreo_select_all" ON public.rangos_mayoreo
    FOR SELECT USING (true);

CREATE POLICY "rangos_mayoreo_all_own" ON public.rangos_mayoreo
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_number     TEXT NOT NULL,
    client_id        UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    client_name      TEXT NOT NULL,
    client_phone     TEXT,
    status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),
    total_pieces     INTEGER NOT NULL DEFAULT 0,
    subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    valid_days       INTEGER NOT NULL DEFAULT 15,
    notes            TEXT,
    created_by       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_tenant ON public.cotizaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_status ON public.cotizaciones(status);

ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotizaciones_select_public" ON public.cotizaciones
    FOR SELECT USING (true);

CREATE POLICY "cotizaciones_all_own" ON public.cotizaciones
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE TABLE IF NOT EXISTS public.detalle_cotizaciones (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_id          UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    variant_id        UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    unit_price        NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
    final_unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detalle_cotizaciones_quote  ON public.detalle_cotizaciones(quote_id);
CREATE INDEX IF NOT EXISTS idx_detalle_cotizaciones_tenant ON public.detalle_cotizaciones(tenant_id);

ALTER TABLE public.detalle_cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detalle_cotizaciones_select_public" ON public.detalle_cotizaciones
    FOR SELECT USING (true);

CREATE POLICY "detalle_cotizaciones_all_own" ON public.detalle_cotizaciones
    FOR ALL USING (tenant_id = public.get_current_tenant_id());






