-- ============================================================
-- Migracion 022: Nuevo rol "buyer" (Comprador)
-- Permite crear cuentas para clientes que solo acceden
-- al catalogo digital de la empresa, sin ver datos internos.
-- ============================================================

-- 1. Eliminar el CHECK constraint existente del rol y recrearlo con 'buyer'
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'seller', 'production', 'buyer'));
