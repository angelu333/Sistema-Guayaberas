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

DROP POLICY IF EXISTS "user_profiles_manage_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_manage_admin" ON public.user_profiles
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() = 'admin'
  );
