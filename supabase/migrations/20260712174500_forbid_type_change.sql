-- El tipo de una entidad (BANK/BROKER) y el tipo de un activo (asset_type)
-- son INMUTABLES: una vez creado, no pueden cambiar. Un banco no puede
-- convertirse en bróker ni una acción en ETF, etc.
--
-- El frontend ya no envía estos campos en los updates, pero se refuerza a
-- nivel de base de datos para que sea imposible por cualquier vía.

create or replace function public.forbid_entity_type_change()
returns trigger
language plpgsql
as $$
begin
  if new.type is distinct from old.type then
    raise exception 'El tipo de una entidad no se puede cambiar (BANK/BROKER es inmutable).';
  end if;
  return new;
end;
$$;

create or replace function public.forbid_asset_type_change()
returns trigger
language plpgsql
as $$
begin
  if new.asset_type is distinct from old.asset_type then
    raise exception 'El tipo de un activo no se puede cambiar (asset_type es inmutable).';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_forbid_entity_type_change on public.entities;
create trigger trg_forbid_entity_type_change
  before update on public.entities
  for each row
  execute function public.forbid_entity_type_change();

drop trigger if exists trg_forbid_asset_type_change on public.assets;
create trigger trg_forbid_asset_type_change
  before update on public.assets
  for each row
  execute function public.forbid_asset_type_change();
