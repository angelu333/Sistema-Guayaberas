-- ============================================================
-- Migracion 006: Bitacora de Auditoria e Historial de Cambios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auditoria (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity        TEXT NOT NULL CHECK (entity IN ('PRODUCTO', 'PRECIO', 'INVENTARIO', 'VENTA', 'CLIENTE', 'USUARIO')),
    action        TEXT NOT NULL CHECK (action IN ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'AJUSTE', 'CANCELAR')),
    record_id     UUID,
    details       TEXT NOT NULL,
    old_data      JSONB,
    new_data      JSONB,
    user_id       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_auditoria_tenant   ON public.auditoria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entity   ON public.auditoria(entity);
CREATE INDEX IF NOT EXISTS idx_auditoria_created  ON public.auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_user     ON public.auditoria(user_id);

-- RLS: Seguridad por tenant
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_select_own" ON public.auditoria
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "auditoria_insert_own" ON public.auditoria
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
