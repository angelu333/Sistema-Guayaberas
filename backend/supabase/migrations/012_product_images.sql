-- ============================================================
-- Migracion 012: Galeria de Imagenes de Productos y Fotos de Portada
-- ============================================================

-- 1. Columna de foto principal en la tabla de productos (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'productos' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.productos ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 2. Tabla de Galeria de Fotos por Modelo de Guayabera
CREATE TABLE IF NOT EXISTS public.imagenes_producto (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_primary  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imagenes_producto_tenant  ON public.imagenes_producto(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_producto_product ON public.imagenes_producto(product_id);

ALTER TABLE public.imagenes_producto ENABLE ROW LEVEL SECURITY;

-- Permitir lectura publica para que el catalogo y POS puedan mostrar las fotos
CREATE POLICY "imagenes_producto_select_public" ON public.imagenes_producto
    FOR SELECT USING (true);

CREATE POLICY "imagenes_producto_all_own" ON public.imagenes_producto
    FOR ALL USING (tenant_id = public.get_current_tenant_id());
