-- ============================================================
-- Migracion 011: Modulo de Cotizaciones de Mayoreo y Rangos por Volumen
-- ============================================================

-- 1. Tabla de Rangos / Escalas de Mayoreo por Volumen
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

-- 2. Tabla Principal de Cotizaciones
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

-- Permitir lectura publica para que el cliente vea su cotización compartida por enlace
CREATE POLICY "cotizaciones_select_public" ON public.cotizaciones
    FOR SELECT USING (true);

CREATE POLICY "cotizaciones_all_own" ON public.cotizaciones
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 3. Tabla de Detalle de Cotizaciones (Lineas de Guayaberas/Variantes)
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
