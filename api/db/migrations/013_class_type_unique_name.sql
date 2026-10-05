-- Phase 8: one class type per name, per studio.
--
-- Nothing stopped a studio from creating "Salsa" twice, which splits its
-- levels across two identical-looking entries in the class type picker.
-- The Update Classes form now checks for this, and this index backs it
-- up (two admins, or a double-clicked Create). Names compare trimmed and
-- case-insensitively, so "Salsa", "salsa" and " Salsa " all collide.
--
-- Duplicates that already exist have to be merged by hand first — their
-- classes point at the class_type id, so which one to keep is a judgment
-- call. The check below lists them and aborts instead of guessing.

begin;

do $$
declare
    duplicates text;
begin
    select string_agg(format('tenant %s: "%s" (ids %s)', tenant_id, name, ids), E'\n')
    into duplicates
    from (
        select tenant_id, min(name) as name, string_agg(id::text, ', ' order by id) as ids
        from public.class_type
        group by tenant_id, lower(btrim(name))
        having count(*) > 1
    ) d;

    if duplicates is not null then
        raise exception E'Aborting: duplicate class type names. Move each duplicate''s classes (class.class_type) onto the id you keep, delete the rest, then re-run.\n%', duplicates;
    end if;
end $$;

create unique index class_type_tenant_name_key
    on public.class_type (tenant_id, lower(btrim(name)));

commit;
