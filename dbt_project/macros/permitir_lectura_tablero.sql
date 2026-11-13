{#
  Se aplica después de construir cada tabla de `public` (capa Diamond).

  En Supabase las tablas de `public` nacen con RLS activo (seguridad por fila): sin una
  política explícita, ningún usuario que no sea el dueño puede leer filas. Esta macro:
    1. Asegura RLS activo en la tabla.
    2. Crea la política que permite SOLO LEER al rol `ewb_tablero`.
    3. Le da permiso de lectura sobre la tabla.

  Si el rol `ewb_tablero` no existe (Docker local o CI), no hace nada.
#}
{% macro permitir_lectura_tablero() %}
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'ewb_tablero') then
        execute 'alter table {{ this }} enable row level security';
        execute 'drop policy if exists tablero_solo_lectura on {{ this }}';
        execute 'create policy tablero_solo_lectura on {{ this }} for select to ewb_tablero using (true)';
        execute 'grant select on {{ this }} to ewb_tablero';
    end if;
end
$$;
{% endmacro %}
