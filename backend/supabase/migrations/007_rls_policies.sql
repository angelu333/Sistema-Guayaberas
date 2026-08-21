-- ============================================================
-- Migracion 007: Row Level Security (RLS) - Aislamiento multi-tenant
-- CRITICO: Estas politicas garantizan que cada empresa
-- solo acceda a sus propios datos.
-- ============================================================

-- Funcion de ayuda: obtiene el tenant_id del usuario autenticado
-- Se usa en todas las politicas RLS para comparar registros
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Funcion de ayuda: obtiene el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS para: tenants
-- Solo el admin de un tenant puede ver y editar su propio tenant
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_own" ON tenants
  FOR SELECT USING (
    id = get_current_tenant_id()
  );

CREATE POLICY "tenant_update_own_admin" ON tenants
  FOR UPDATE USING (
    id = get_current_tenant_id()
    AND get_current_user_role() = 'admin'
  );

-- ============================================================
-- RLS para: tenant_settings
-- ============================================================
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_settings_select_own" ON tenant_settings
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_settings_update_admin" ON tenant_settings
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = 'admin'
  );

-- ============================================================
-- RLS para: user_profiles
-- Un usuario puede ver perfiles de su mismo tenant
-- Solo el admin puede crear/editar/desactivar usuarios
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_same_tenant" ON user_profiles
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "user_profiles_manage_admin" ON user_profiles
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = 'admin'
  );

-- Nota: Las politicas para las tablas de productos, inventario,
-- ventas, clientes y auditoria se agregan en sus migraciones
-- correspondientes (003 al 008), siguiendo el mismo patron:
--
--   tenant_id = get_current_tenant_id()
--
-- Esto garantiza aislamiento total entre empresas a nivel
-- del motor de base de datos PostgreSQL.
