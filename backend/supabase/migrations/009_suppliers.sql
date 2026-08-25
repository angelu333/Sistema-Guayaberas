-- ============================================================
-- Migracion 009: Modulo de Proveedores y Compras
-- ============================================================

-- 1. Tabla de Proveedores
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

-- 2. Tabla Principal de Compras
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

-- 3. Tabla de Detalle de Compras (Productos/Variantes)
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
