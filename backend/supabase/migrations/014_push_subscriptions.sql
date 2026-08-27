-- ================================================================
-- 014_push_subscriptions.sql — Guayabera Manager
-- Tabla para almacenar suscripciones Web Push por dispositivo/tenant
-- ================================================================

-- Tabla principal de suscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para consultas rápidas por tenant y por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_id
  ON public.push_subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados del mismo tenant pueden gestionar sus suscripciones
CREATE POLICY "push_subscriptions_tenant_isolation"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- El service role (API server) puede insertar y leer sin restricciones
-- (manejado automáticamente por supabaseAdmin con service_role key)

-- ================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscription_timestamp();

-- ================================================================
-- COMENTARIOS
-- ================================================================
COMMENT ON TABLE public.push_subscriptions IS
  'Suscripciones Web Push por dispositivo para notificaciones en tiempo real (ventas y alertas de stock)';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS
  'URL única del endpoint del servidor push del navegador';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS
  'Clave pública P-256 de cifrado del cliente';
COMMENT ON COLUMN public.push_subscriptions.auth IS
  'Secret de autenticación para cifrado del mensaje push';
