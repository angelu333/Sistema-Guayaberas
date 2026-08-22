-- ============================================================
-- Migracion 008: Modulo de Produccion y Taller Dinamico
-- ============================================================

-- 1. Tabla de Etapas de Produccion (Personalizable por Tenant)
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

-- 2. Tabla Principal de Ordenes de Produccion
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

CREATE POLICY "ordenes_select_own" ON public.ordenes_produccion
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "ordenes_all_own" ON public.ordenes_produccion
    FOR ALL USING (tenant_id = public.get_current_tenant_id());
