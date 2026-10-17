-- Keepalive seguro para proyectos Supabase Free.
-- No lee ni modifica tablas de negocio: ventas, inventario, clientes, imágenes, etc.
-- Se puede ejecutar una vez en cada proyecto de Supabase que se quiera vigilar.

create or replace function public.keepalive()
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', now()
  );
$$;

-- La función sólo es invocable mediante las llaves públicas habituales de Supabase.
-- No usa SECURITY DEFINER ni accede a datos de negocio.
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
