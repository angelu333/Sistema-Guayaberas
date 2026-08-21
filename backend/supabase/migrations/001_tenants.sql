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
