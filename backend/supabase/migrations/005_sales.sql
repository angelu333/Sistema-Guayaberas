-- ============================================================
-- Migracion 005: Punto de Venta — Ventas, Detalle y Pagos
-- ============================================================

-- 0. Tabla de clientes (necesaria para relacionar ventas a clientes)
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

-- 3. Pagos registrados por venta (puede haber varios metodos)
CREATE TABLE IF NOT EXISTS public.pagos_venta (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    method          TEXT NOT NULL CHECK (method IN ('cash', 'card', 'transfer')),
    amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_ventas_tenant       ON public.ventas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ventas_created      ON public.ventas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_client       ON public.ventas(client_id);
CREATE INDEX IF NOT EXISTS idx_detalle_sale        ON public.detalle_ventas(sale_id);
CREATE INDEX IF NOT EXISTS idx_detalle_tenant      ON public.detalle_ventas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_sale          ON public.pagos_venta(sale_id);
CREATE INDEX IF NOT EXISTS idx_pagos_tenant        ON public.pagos_venta(tenant_id);

-- ============================================================
-- Funcion para generar numero de ticket automatico
-- Formato: TK-YYYYMMDD-XXXX (ej: TK-20260822-0001)
-- ============================================================
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

-- ============================================================
-- RLS: Politicas de seguridad para tablas de ventas
-- ============================================================

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

-- Detalle ventas
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detalle_ventas_select_own" ON public.detalle_ventas
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "detalle_ventas_insert_own" ON public.detalle_ventas
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Pagos venta
ALTER TABLE public.pagos_venta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_venta_select_own" ON public.pagos_venta
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "pagos_venta_insert_own" ON public.pagos_venta
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
