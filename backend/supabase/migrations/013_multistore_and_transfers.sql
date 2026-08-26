-- ============================================================
-- Migracion 013: Multi-sucursal y Transferencias de Inventario
-- ============================================================

-- 1. Agregar columna location_id a la tabla ventas
--    para registrar en qué sucursal se realizó cada venta.
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_location ON public.ventas(location_id);

-- 2. Agregar columnas de contacto y dirección a ubicaciones
--    para enriquecer la información de cada sucursal.
ALTER TABLE public.ubicaciones
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. Tabla de Transferencias entre Sucursales
--    Encabezado del traspaso de mercancía entre ubicaciones.
CREATE TABLE IF NOT EXISTS public.transferencias (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    folio                 TEXT NOT NULL,
    origen_location_id    UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE RESTRICT,
    destino_location_id   UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE RESTRICT,
    status                TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (status IN ('pendiente', 'en_transito', 'completada', 'cancelada')),
    notes                 TEXT,
    created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_folio_per_tenant UNIQUE (tenant_id, folio),
    CONSTRAINT chk_different_locations CHECK (origen_location_id <> destino_location_id)
);

CREATE INDEX IF NOT EXISTS idx_transferencias_tenant    ON public.transferencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_status    ON public.transferencias(status);
CREATE INDEX IF NOT EXISTS idx_transferencias_created   ON public.transferencias(created_at DESC);

-- 4. Tabla de Detalle de Transferencias
--    Líneas de variantes y cantidades que se trasladan.
CREATE TABLE IF NOT EXISTS public.detalle_transferencias (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    transferencia_id  UUID NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
    variant_id        UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE RESTRICT,
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detalle_transf_transferencia ON public.detalle_transferencias(transferencia_id);
CREATE INDEX IF NOT EXISTS idx_detalle_transf_tenant        ON public.detalle_transferencias(tenant_id);

-- 5. Función para generar folio de transferencia autoincremental
--    Formato: TRF-YYYYMMDD-XXXX (ej: TRF-20260826-0001)
CREATE OR REPLACE FUNCTION public.generate_transfer_folio(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_date   TEXT;
    v_count  INTEGER;
    v_folio  TEXT;
BEGIN
    v_date := TO_CHAR(now(), 'YYYYMMDD');
    SELECT COUNT(*) + 1
      INTO v_count
      FROM public.transferencias
     WHERE tenant_id = p_tenant_id
       AND created_at::DATE = CURRENT_DATE;
    v_folio := 'TRF-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN v_folio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Habilitar RLS
ALTER TABLE public.transferencias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_transferencias  ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS de aislamiento por tenant
DROP POLICY IF EXISTS "transferencias_tenant_isolation" ON public.transferencias;
CREATE POLICY "transferencias_tenant_isolation" ON public.transferencias
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "detalle_transferencias_tenant_isolation" ON public.detalle_transferencias;
CREATE POLICY "detalle_transferencias_tenant_isolation" ON public.detalle_transferencias
    FOR ALL USING (tenant_id = public.get_current_tenant_id());
