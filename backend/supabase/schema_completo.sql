-- ==============================================================================
-- SISTEMA GUAYABERAS — SCHEMA MAESTRO COMPLETO Y ACTUALIZADO
-- Ejecutar este archivo completo en el SQL Editor de un nuevo proyecto de Supabase
-- Incluye: 32 Tablas, Triggers, RLS, Storage Bucket 'product-images' y Funciones
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLAS BASE MULTI-TENANT
-- ==============================================================================

-- 2.1 Empresas (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,          -- URL del catalogo: /catalogo/[slug]
  rfc           TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  logo_url      TEXT,
  whatsapp      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Planes de Suscripción
CREATE TABLE IF NOT EXISTS public.tenant_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_type            TEXT NOT NULL DEFAULT 'trial' CHECK (plan_type IN ('trial', 'basic', 'pro', 'enterprise')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Configuraciones por Empresa
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  currency             TEXT NOT NULL DEFAULT 'MXN',
  timezone             TEXT NOT NULL DEFAULT 'America/Merida',
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  ticket_header        TEXT,
  ticket_footer        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. SUCURSALES / UBICACIONES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ubicaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  phone       TEXT,
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. PERFILES DE USUARIO (Vinculados a auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller', 'production')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. CATÁLOGO BASE: CATEGORÍAS, COLORES, TALLAS, TIPOS DE MANGA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.categorias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.colores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  hex_code    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tallas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipos_manga (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. PRODUCTOS, VARIANTES Y GALERÍAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.productos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.imagenes_producto (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.variantes_producto (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  color_id       UUID REFERENCES public.colores(id) ON DELETE SET NULL,
  size_id        UUID REFERENCES public.tallas(id) ON DELETE SET NULL,
  sleeve_type_id UUID REFERENCES public.tipos_manga(id) ON DELETE SET NULL,
  sku            TEXT NOT NULL,
  cost_price     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sale_price     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  min_stock      INTEGER NOT NULL DEFAULT 5,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_variant_sku_per_tenant UNIQUE (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS public.imagenes_variante (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. INVENTARIO, STOCK Y MOVIMIENTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.existencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_id  UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_existencias_variante_ubicacion UNIQUE (variant_id, location_id)
);

CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  location_id     UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'DEVOLUCION')),
  quantity        INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL DEFAULT 0,
  quantity_after  INTEGER NOT NULL DEFAULT 0,
  reason          TEXT,
  reference_id    UUID,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transferencias entre sucursales
CREATE TABLE IF NOT EXISTS public.transferencias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folio               TEXT NOT NULL,
  origen_location_id  UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE RESTRICT,
  destino_location_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_transito', 'completada', 'cancelada')),
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_folio_per_tenant UNIQUE (tenant_id, folio),
  CONSTRAINT chk_different_locations CHECK (origen_location_id <> destino_location_id)
);

CREATE TABLE IF NOT EXISTS public.detalle_transferencias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transferencia_id  UUID NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
  variant_id        UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. CLIENTES, VENTAS Y PUNTO DE VENTA (POS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ventas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id    UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  folio          TEXT NOT NULL,
  client_id      UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subtotal       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'mixto')),
  status         TEXT NOT NULL DEFAULT 'completada' CHECK (status IN ('completada', 'cancelada', 'pendiente')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sale_folio_per_tenant UNIQUE (tenant_id, folio)
);

CREATE TABLE IF NOT EXISTS public.detalle_ventas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id     UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  variant_id  UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cost_price  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. COTIZACIONES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folio       TEXT NOT NULL,
  client_id   UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subtotal    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status      TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'rechazada', 'vencida')),
  notes       TEXT,
  valid_until DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quote_folio_per_tenant UNIQUE (tenant_id, folio)
);

CREATE TABLE IF NOT EXISTS public.detalle_cotizaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  quote_id    UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  variant_id  UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 10. PRODUCCIÓN, TALLER, INSUMOS Y COMPRAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  contact     TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insumos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'metro',
  stock       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  min_stock   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cost_unit   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recetas_produccion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  input_id    UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  quantity    NUMERIC(12, 4) NOT NULL DEFAULT 1.0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.etapas_produccion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ordenes_produccion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folio       TEXT NOT NULL,
  variant_id  UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
  stage_id    UUID REFERENCES public.etapas_produccion(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  status      TEXT NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('pendiente', 'en_proceso', 'terminada', 'cancelada')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT uq_order_folio_per_tenant UNIQUE (tenant_id, folio)
);

CREATE TABLE IF NOT EXISTS public.compras (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  folio       TEXT NOT NULL,
  total       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status      TEXT NOT NULL DEFAULT 'completada' CHECK (status IN ('pendiente', 'completada', 'cancelada')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_purchase_folio_per_tenant UNIQUE (tenant_id, folio)
);

CREATE TABLE IF NOT EXISTS public.detalle_compras (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  input_id    UUID REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantity    NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 11. AUDITORÍA Y SUSCRIPCIONES PUSH WEB
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auditoria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  module      TEXT NOT NULL,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 12. STORAGE BUCKET: product-images (Público para Catálogo y POS)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB máximo por imagen
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acceso a Storage
DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
CREATE POLICY "Public Access product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow Uploads product-images" ON storage.objects;
CREATE POLICY "Allow Uploads product-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow Updates product-images" ON storage.objects;
CREATE POLICY "Allow Updates product-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow Deletes product-images" ON storage.objects;
CREATE POLICY "Allow Deletes product-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images');

-- ==============================================================================
-- 13. FUNCIONES AUXILIARES Y TRIGGERS
-- ==============================================================================

-- Función para obtener el tenant_id del usuario logueado
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para obtener el rol del usuario logueado
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar folios de transferencia
CREATE OR REPLACE FUNCTION public.generate_transfer_folio(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_count INTEGER;
  v_folio TEXT;
BEGIN
  v_date := TO_CHAR(now(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.transferencias
  WHERE tenant_id = p_tenant_id AND created_at::DATE = CURRENT_DATE;
  v_folio := 'TRF-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_folio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger automático para descontar/sumar existencias por movimiento de inventario
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_current_qty INTEGER := 0;
  v_new_qty INTEGER := 0;
BEGIN
  SELECT quantity INTO v_current_qty
  FROM public.existencias
  WHERE variant_id = NEW.variant_id AND location_id = NEW.location_id;

  IF v_current_qty IS NULL THEN
    v_current_qty := 0;
  END IF;

  IF NEW.type IN ('ENTRADA', 'DEVOLUCION') THEN
    v_new_qty := v_current_qty + NEW.quantity;
  ELSIF NEW.type IN ('SALIDA', 'VENTA') THEN
    v_new_qty := v_current_qty - NEW.quantity;
    IF v_new_qty < 0 THEN
      v_new_qty := 0;
    END IF;
  ELSIF NEW.type = 'AJUSTE' THEN
    v_new_qty := NEW.quantity;
  ELSE
    v_new_qty := v_current_qty + NEW.quantity;
  END IF;

  NEW.quantity_before := v_current_qty;
  NEW.quantity_after := v_new_qty;

  INSERT INTO public.existencias (tenant_id, variant_id, location_id, quantity, updated_at)
  VALUES (NEW.tenant_id, NEW.variant_id, NEW.location_id, v_new_qty, now())
  ON CONFLICT (variant_id, location_id)
  DO UPDATE SET quantity = v_new_qty, updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_stock_on_movement ON public.movimientos_inventario;
CREATE TRIGGER trg_update_stock_on_movement
  BEFORE INSERT ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_movement();

-- Función y trigger: Al registrar una nueva empresa (tenant),
-- inicializar automáticamente su sucursal Matriz, categoría, tipos de manga, tallas y colores base.
CREATE OR REPLACE FUNCTION public.initialize_tenant_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Crear Sucursal Matriz
  INSERT INTO public.ubicaciones (tenant_id, name, description, is_active)
  VALUES (NEW.id, 'Sucursal Matriz', 'Tienda principal y bodega', true)
  ON CONFLICT DO NOTHING;

  -- 2. Crear Categoría inicial
  INSERT INTO public.categorias (tenant_id, name, is_active)
  VALUES (NEW.id, 'Guayaberas', true)
  ON CONFLICT DO NOTHING;

  -- 3. Crear Tipos de Manga estándar
  INSERT INTO public.tipos_manga (tenant_id, name, is_active) VALUES
    (NEW.id, 'Manga Corta', true),
    (NEW.id, 'Manga Larga', true)
  ON CONFLICT DO NOTHING;

  -- 4. Crear Tallas estándar de Guayaberas
  INSERT INTO public.tallas (tenant_id, name, sort_order, is_active) VALUES
    (NEW.id, '36', 1, true),
    (NEW.id, '38', 2, true),
    (NEW.id, '40', 3, true),
    (NEW.id, '42', 4, true),
    (NEW.id, '44', 5, true),
    (NEW.id, '46', 6, true),
    (NEW.id, '48', 7, true),
    (NEW.id, 'CH', 8, true),
    (NEW.id, 'M',  9, true),
    (NEW.id, 'G',  10, true),
    (NEW.id, 'XL', 11, true),
    (NEW.id, 'XXL',12, true)
  ON CONFLICT DO NOTHING;

  -- 5. Crear Colores estándar
  INSERT INTO public.colores (tenant_id, name, hex_code, is_active) VALUES
    (NEW.id, 'Blanco', '#FFFFFF', true),
    (NEW.id, 'Hueso', '#F5F5DC', true),
    (NEW.id, 'Negro', '#1C1C1C', true),
    (NEW.id, 'Azul Cielo', '#87CEEB', true),
    (NEW.id, 'Azul Marino', '#000080', true),
    (NEW.id, 'Beige', '#D4C4A8', true),
    (NEW.id, 'Palo de Rosa', '#DDA0DD', true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_initialize_tenant_defaults ON public.tenants;
CREATE TRIGGER trg_initialize_tenant_defaults
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.initialize_tenant_defaults();

-- ==============================================================================
-- 14. POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
-- ==============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_manga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagenes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variantes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagenes_variante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento por Tenant
CREATE POLICY "tenants_all" ON public.tenants FOR ALL USING (true);
CREATE POLICY "tenant_settings_all" ON public.tenant_settings FOR ALL USING (true);
CREATE POLICY "tenant_plans_all" ON public.tenant_plans FOR ALL USING (true);

CREATE POLICY "user_profiles_isolation" ON public.user_profiles
  FOR ALL USING (tenant_id = public.get_current_tenant_id() OR id = auth.uid());

CREATE POLICY "ubicaciones_isolation" ON public.ubicaciones
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Catálogo Público (Lectura pública para que funcione el catálogo por WhatsApp)
CREATE POLICY "categorias_public" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "categorias_own" ON public.categorias FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "colores_public" ON public.colores FOR SELECT USING (true);
CREATE POLICY "colores_own" ON public.colores FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "tallas_public" ON public.tallas FOR SELECT USING (true);
CREATE POLICY "tallas_own" ON public.tallas FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "tipos_manga_public" ON public.tipos_manga FOR SELECT USING (true);
CREATE POLICY "tipos_manga_own" ON public.tipos_manga FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "productos_public" ON public.productos FOR SELECT USING (true);
CREATE POLICY "productos_own" ON public.productos FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "imagenes_producto_public" ON public.imagenes_producto FOR SELECT USING (true);
CREATE POLICY "imagenes_producto_own" ON public.imagenes_producto FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "variantes_public" ON public.variantes_producto FOR SELECT USING (true);
CREATE POLICY "variantes_own" ON public.variantes_producto FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "imagenes_variante_public" ON public.imagenes_variante FOR SELECT USING (true);
CREATE POLICY "imagenes_variante_own" ON public.imagenes_variante FOR ALL USING (
  EXISTS (SELECT 1 FROM public.variantes_producto v WHERE v.id = imagenes_variante.variant_id AND v.tenant_id = public.get_current_tenant_id())
);

CREATE POLICY "existencias_public" ON public.existencias FOR SELECT USING (true);
CREATE POLICY "existencias_own" ON public.existencias FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "movimientos_isolation" ON public.movimientos_inventario FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "transferencias_isolation" ON public.transferencias FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "detalle_transf_isolation" ON public.detalle_transferencias FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "clientes_isolation" ON public.clientes FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "ventas_isolation" ON public.ventas FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "detalle_ventas_isolation" ON public.detalle_ventas FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "cotizaciones_public" ON public.cotizaciones FOR SELECT USING (true);
CREATE POLICY "cotizaciones_own" ON public.cotizaciones FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "detalle_cotizaciones_public" ON public.detalle_cotizaciones FOR SELECT USING (true);
CREATE POLICY "detalle_cotizaciones_own" ON public.detalle_cotizaciones FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "proveedores_isolation" ON public.proveedores FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "insumos_isolation" ON public.insumos FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "recetas_isolation" ON public.recetas_produccion FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "etapas_isolation" ON public.etapas_produccion FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "ordenes_isolation" ON public.ordenes_produccion FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "compras_isolation" ON public.compras FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "detalle_compras_isolation" ON public.detalle_compras FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "auditoria_isolation" ON public.auditoria FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "push_subscriptions_isolation" ON public.push_subscriptions FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- ==============================================================================
-- 15. ÍNDICES DE ALTO RENDIMIENTO
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_productos_tenant ON public.productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_category ON public.productos(category_id);
CREATE INDEX IF NOT EXISTS idx_variantes_tenant ON public.variantes_producto(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variantes_product ON public.variantes_producto(product_id);
CREATE INDEX IF NOT EXISTS idx_variantes_sku ON public.variantes_producto(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_existencias_tenant ON public.existencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_existencias_variant ON public.existencias(variant_id);
CREATE INDEX IF NOT EXISTS idx_existencias_location ON public.existencias(location_id);
CREATE INDEX IF NOT EXISTS idx_ventas_tenant ON public.ventas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ventas_created ON public.ventas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_sale ON public.detalle_ventas(sale_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_tenant ON public.cotizaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_created ON public.movimientos_inventario(created_at DESC);

-- ==============================================================================
-- FIN DEL SCHEMA MAESTRO
-- ==============================================================================
