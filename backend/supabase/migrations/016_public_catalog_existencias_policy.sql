-- ============================================================
-- Migracion 016: Habilitar lectura publica de la tabla existencias
-- Permite que los visitantes del catalogo publico puedan consultar
-- si las prendas estan disponibles o agotadas sin revelar datos sensibles.
-- ============================================================

DROP POLICY IF EXISTS "public_read_existencias" ON public.existencias;
CREATE POLICY "public_read_existencias" ON public.existencias
  FOR SELECT USING (true);
