-- ============================================================
-- Migración 017: Compatibilidad del POS con bases creadas desde
-- schema_completo.sql legado.
-- No elimina tablas ni ventas existentes.
-- ============================================================

BEGIN;

-- Clientes: el frontend actual usa full_name y datos comerciales.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS rfc TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  -- Las bases antiguas guardaban el nombre en "name". Se conserva y se copia
  -- a full_name antes de permitir altas desde el frontend actual.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'name'
  ) THEN
    EXECUTE $update$
      UPDATE public.clientes
      SET full_name = COALESCE(NULLIF(BTRIM(full_name), ''), name)
      WHERE full_name IS NULL OR BTRIM(full_name) = ''
    $update$;
    EXECUTE 'ALTER TABLE public.clientes ALTER COLUMN name DROP NOT NULL';
  END IF;
END $$;

-- Ventas: se mantienen los campos antiguos (folio, user_id, discount) para
-- auditoría, pero se agregan los nombres que utiliza el sistema actual.
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ventas' AND column_name = 'folio'
  ) THEN
    EXECUTE '
      UPDATE public.ventas
      SET ticket_number = folio
      WHERE ticket_number IS NULL AND folio IS NOT NULL';
    ALTER TABLE public.ventas ALTER COLUMN folio DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ventas' AND column_name = 'user_id'
  ) THEN
    UPDATE public.ventas v
    SET seller_id = p.id
    FROM public.user_profiles p
    WHERE v.seller_id IS NULL AND p.id = v.user_id;
  END IF;
END $$;

-- El POS actual registra completed/cancelled/refunded. Se permite conservar
-- también estados antiguos para no bloquear registros históricos.
DO $$
DECLARE constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.ventas'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS %I', constraint_row.conname);
  END LOOP;
END $$;

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_status_check
  CHECK (status IN ('completed', 'cancelled', 'refunded', 'completada', 'cancelada', 'pendiente'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_tenant_ticket_number
  ON public.ventas(tenant_id, ticket_number)
  WHERE ticket_number IS NOT NULL;

-- Detalles: los nombres nuevos permiten guardar descuentos por porcentaje y
-- subtotales, sin alterar las columnas antiguas discount/total.
ALTER TABLE public.detalle_ventas
  ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE public.detalle_ventas
SET subtotal = total
WHERE subtotal = 0 AND total IS NOT NULL;

-- Pagos por venta: tarjeta, efectivo y transferencia quedan registrados sin
-- ninguna pasarela o conexión con terminal bancaria.
CREATE TABLE IF NOT EXISTS public.pagos_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'transfer')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_venta_sale ON public.pagos_venta(sale_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_tenant ON public.pagos_venta(tenant_id);

ALTER TABLE public.pagos_venta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pagos_venta_isolation" ON public.pagos_venta;
CREATE POLICY "pagos_venta_isolation" ON public.pagos_venta
  FOR ALL
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Folio nuevo del ticket. El POS lo solicita antes de crear la venta.
CREATE OR REPLACE FUNCTION public.generate_ticket_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date TEXT;
  v_count INTEGER;
BEGIN
  v_date := TO_CHAR(now(), 'YYYYMMDD');

  SELECT COUNT(*) + 1
    INTO v_count
    FROM public.ventas
   WHERE tenant_id = p_tenant_id
     AND created_at::DATE = CURRENT_DATE;

  RETURN 'TK-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ticket_number(UUID) TO authenticated;

COMMIT;
