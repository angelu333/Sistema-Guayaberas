-- ============================================================
-- Migracion 010: Modulo de Insumos, Materias Primas y Recetas (BOM)
-- ============================================================

-- 1. Tabla de Insumos y Materias Primas
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

-- 2. Tabla de Recetas de Confección (BOM - Bill of Materials)
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
