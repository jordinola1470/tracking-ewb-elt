-- =====================================================================
-- Roles de mínimo privilegio para tracking-ewb-elt en Supabase.
-- Se ejecuta UNA vez en cada entorno (entorno_staging y entorno_prod),
-- conectado como `postgres` (administrador). Es seguro volver a ejecutarlo.
--
-- NO contiene contraseñas. Después de ejecutarlo, en psql:
--     \password ewb_pipeline
--     \password ewb_tablero
-- (\password envía la contraseña cifrada; no queda en el historial de consultas)
-- =====================================================================

-- 1. Crear los roles (sin contraseña todavía)
do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'ewb_pipeline') then
        create role ewb_pipeline login;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'ewb_tablero') then
        create role ewb_tablero login;
    end if;
end
$$;

-- 1b. En Supabase (PostgreSQL 16+) el administrador `postgres` no es superusuario:
--     para transferir propiedad o fijar permisos "en nombre de" ewb_pipeline,
--     primero debe ser miembro de ese rol.
grant ewb_pipeline to postgres;

-- 2. ewb_pipeline: carga raw y construye staging, marts y public.
--    Es dueño de sus esquemas porque `cargar` recrea tablas raw y elimina en cascada
--    las vistas de staging que dependen de ellas (solo el dueño puede hacerlo).
create schema if not exists raw;
create schema if not exists staging;
create schema if not exists marts;
alter schema raw     owner to ewb_pipeline;
alter schema staging owner to ewb_pipeline;
alter schema marts   owner to ewb_pipeline;
grant usage, create on schema public to ewb_pipeline;

-- 3. ewb_tablero: SOLO lectura de `public` (las tablas finales).
--    No puede ver raw, staging ni marts, y toda transacción suya es de solo lectura.
grant usage on schema public to ewb_tablero;
alter default privileges for role ewb_pipeline in schema public
    grant select on tables to ewb_tablero;
alter role ewb_tablero set default_transaction_read_only = on;

-- 4. Nadie más hereda acceso a los esquemas internos
revoke all on schema raw, staging, marts from public;
