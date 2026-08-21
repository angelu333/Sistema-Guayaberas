-- ============================================================
-- Migración 004: Inventario y Movimientos (Multi-ubicación & Auditoría)
-- ============================================================

-- 1. Tabla de Ubicaciones (Bodegas, Tiendas, Almacenes)
CREATE TABLE IF NOT EXISTS public.ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para búsquedas rápidas por tenant
CREATE INDEX IF NOT EXISTS idx_ubicaciones_tenant ON public.ubicaciones(tenant_id);

-- 2. Tabla de Existencias / Stock por Variante y Ubicación
CREATE TABLE IF NOT EXISTS public.existencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_existencias_variante_ubicacion UNIQUE (variant_id, location_id)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_existencias_tenant ON public.existencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_existencias_variant ON public.existencias(variant_id);
CREATE INDEX IF NOT EXISTS idx_existencias_location ON public.existencias(location_id);

-- 3. Tabla de Historial de Movimientos de Inventario (Auditoría)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'DEVOLUCION')),
    quantity INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL DEFAULT 0,
    quantity_after INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    reference_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para reportes e historial
CREATE INDEX IF NOT EXISTS idx_movimientos_tenant ON public.movimientos_inventario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_variant ON public.movimientos_inventario(variant_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON public.movimientos_inventario(created_at DESC);

-- 4. Función Trigger para Actualización Automática de Stock
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty INTEGER := 0;
    v_new_qty INTEGER := 0;
BEGIN
    -- Obtener la cantidad actual existente en la ubicación objetivo
    SELECT quantity INTO v_current_qty
    FROM public.existencias
    WHERE variant_id = NEW.variant_id
      AND location_id = NEW.location_id;

    IF v_current_qty IS NULL THEN
        v_current_qty := 0;
    END IF;

    -- Calcular la nueva cantidad según el tipo de movimiento
    IF NEW.type IN ('ENTRADA', 'DEVOLUCION') THEN
        v_new_qty := v_current_qty + NEW.quantity;
    ELSIF NEW.type IN ('SALIDA', 'VENTA') THEN
        v_new_qty := v_current_qty - NEW.quantity;
        IF v_new_qty < 0 THEN
            v_new_qty := 0; -- Evitar existencias negativas
        END IF;
    ELSIF NEW.type = 'AJUSTE' THEN
        v_new_qty := NEW.quantity;
    ELSE
        v_new_qty := v_current_qty + NEW.quantity;
    END IF;

    -- Actualizar los valores de auditoría en el registro del movimiento
    NEW.quantity_before := v_current_qty;
    NEW.quantity_after := v_new_qty;

    -- Insertar o actualizar la cantidad en la tabla existencias
    INSERT INTO public.existencias (tenant_id, variant_id, location_id, quantity, updated_at)
    VALUES (NEW.tenant_id, NEW.variant_id, NEW.location_id, v_new_qty, now())
    ON CONFLICT (variant_id, location_id)
    DO UPDATE SET
        quantity = v_new_qty,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear Trigger BEFORE INSERT en movimientos_inventario
DROP TRIGGER IF EXISTS trg_update_stock_on_movement ON public.movimientos_inventario;
CREATE TRIGGER trg_update_stock_on_movement
    BEFORE INSERT ON public.movimientos_inventario
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_on_movement();

-- 5. Habilitar RLS en las tablas de inventario
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Tenant isolation policy for ubicaciones" ON public.ubicaciones;
CREATE POLICY "Tenant isolation policy for ubicaciones" ON public.ubicaciones
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation policy for existencias" ON public.existencias;
CREATE POLICY "Tenant isolation policy for existencias" ON public.existencias
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation policy for movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "Tenant isolation policy for movimientos_inventario" ON public.movimientos_inventario
    FOR ALL USING (tenant_id = public.get_current_tenant_id());
