-- ============================================================
-- Migracion 015: Seguridad, Blindaje RLS y Usuarios por Sucursal
-- ============================================================

-- 1. Agregar columna location_id a la tabla user_profiles
--    para vincular empleados/vendedores a su sucursal específica.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON public.user_profiles(location_id);

-- 2. BLINDAJE RLS PARA USER_PROFILES
--    Evita que un usuario modifique su propio rol a 'admin' o cambie de tenant.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_same_tenant" ON public.user_profiles;
CREATE POLICY "user_profiles_select_same_tenant" ON public.user_profiles
  FOR SELECT USING (tenant_id = public.get_current_tenant_id() OR id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "user_profiles_manage_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_manage_admin" ON public.user_profiles
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "user_profiles_update_self" ON public.user_profiles;
CREATE POLICY "user_profiles_update_self" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND tenant_id = public.get_current_tenant_id()
  );

-- 3. BLINDAJE RLS PARA COTIZACIONES
--    Evita la fuga masiva de cotizaciones entre empresas.
DROP POLICY IF EXISTS "cotizaciones_select_public" ON public.cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_all_own" ON public.cotizaciones;

-- Lectura para usuarios autenticados del tenant
CREATE POLICY "cotizaciones_tenant_isolation" ON public.cotizaciones
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Lectura pública para clientes que tienen el enlace directo de cotización (unauthenticated)
CREATE POLICY "cotizaciones_public_link_read" ON public.cotizaciones
  FOR SELECT USING (
    auth.uid() IS NULL
  );

-- Detalle de cotizaciones
DROP POLICY IF EXISTS "detalle_cotizaciones_select_public" ON public.detalle_cotizaciones;
DROP POLICY IF EXISTS "detalle_cotizaciones_all_own" ON public.detalle_cotizaciones;

CREATE POLICY "detalle_cotizaciones_tenant_isolation" ON public.detalle_cotizaciones
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "detalle_cotizaciones_public_link_read" ON public.detalle_cotizaciones
  FOR SELECT USING (
    auth.uid() IS NULL
  );

-- 4. RESTRICCIÓN DE ACCESO RBAC EN TALLER, INSUMOS Y COMPRAS
--    Solo 'admin' y 'production' pueden ver/gestionar producción e insumos.
DROP POLICY IF EXISTS "etapas_select_own" ON public.etapas_produccion;
CREATE POLICY "etapas_select_own" ON public.etapas_produccion
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('admin', 'production')
  );

DROP POLICY IF EXISTS "ordenes_select_own" ON public.ordenes_produccion;
CREATE POLICY "ordenes_select_own" ON public.ordenes_produccion
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('admin', 'production')
  );

DROP POLICY IF EXISTS "insumos_select_own" ON public.insumos;
CREATE POLICY "insumos_select_own" ON public.insumos
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('admin', 'production')
  );

DROP POLICY IF EXISTS "recetas_select_own" ON public.recetas_produccion;
CREATE POLICY "recetas_select_own" ON public.recetas_produccion
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('admin', 'production')
  );

DROP POLICY IF EXISTS "compras_select_own" ON public.compras;
CREATE POLICY "compras_select_own" ON public.compras
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "proveedores_select_own" ON public.proveedores;
CREATE POLICY "proveedores_select_own" ON public.proveedores
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('admin', 'production')
  );
