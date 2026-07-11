-- =============================================================================
-- Warren — Objetivos de inversión (theses)
-- Un activo puede tener varios objetivos con al menos un "target": un texto de
-- estrategia (target_body), un precio objetivo (target_price) y/o una fecha
-- límite (target_date). El estado "cumplido" NO se guarda: es derivado y se
-- calcula en el frontend (precio actual >= target_price, fecha pasada, etc.).
-- Solo persistimos is_active (pausar/activar manual).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLA
-- -----------------------------------------------------------------------------
create table public.investment_objectives (
  id             uuid primary key default gen_random_uuid(),
  portfolio_id   uuid not null references public.portfolios (id) on delete cascade,
  asset_id       uuid not null references public.assets (id) on delete cascade,
  entity_id      uuid references public.entities (id) on delete cascade,
  transaction_id uuid references public.investment_transactions (id) on delete set null,
  target_body    text,
  target_price   numeric,
  target_date    date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Debe existir al menos uno de los tres tipos de objetivo.
  constraint investment_objectives_at_least_one_target check (
    target_body is not null
    or target_price is not null
    or target_date is not null
  )
);

-- -----------------------------------------------------------------------------
-- 2. ÍNDICES
-- -----------------------------------------------------------------------------
create index idx_inv_obj_portfolio_id  on public.investment_objectives (portfolio_id);
create index idx_inv_obj_asset_id      on public.investment_objectives (asset_id);
create index idx_inv_obj_entity_id     on public.investment_objectives (entity_id);
create index idx_inv_obj_transaction_id on public.investment_objectives (transaction_id);

-- -----------------------------------------------------------------------------
-- 3. TRIGGER updated_at
-- -----------------------------------------------------------------------------
create trigger trg_inv_obj_updated_at before update on public.investment_objectives
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. AUTO-BORRADO AL VENDER TODA LA POSICIÓN
-- Al insertar una VENTA, se recalcula la posición neta (BUY - SELL) de ese
-- entity+asset directamente desde el histórico (independiente de la caché FIFO).
-- Si queda a 0 o menos, se eliminan los objetivos de ese entity+asset.
-- Los objetivos a nivel de cartera (entity_id NULL) NO se tocan aquí.
-- SECURITY DEFINER para evitar cualquier problema de RLS al borrar.
-- -----------------------------------------------------------------------------
create or replace function public.delete_objectives_on_full_sell()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  net_qty numeric;
begin
  select coalesce(sum(
    case when transaction_type = 'BUY' then quantity else -quantity end
  ), 0)
  into net_qty
  from public.investment_transactions
  where entity_id = new.entity_id
    and asset_id = new.asset_id;

  if net_qty <= 0 then
    delete from public.investment_objectives
    where asset_id = new.asset_id
      and entity_id = new.entity_id;
  end if;

  return new;
end;
$$;

create trigger trg_delete_objectives_on_full_sell
  after insert on public.investment_transactions
  for each row
  when (new.transaction_type = 'SELL')
  execute function public.delete_objectives_on_full_sell();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Los objetivos pertenecen a un portfolio propio.
-- -----------------------------------------------------------------------------
alter table public.investment_objectives enable row level security;

create policy "inv_obj_select_own" on public.investment_objectives
  for select using (public.user_owns_portfolio(portfolio_id));
create policy "inv_obj_insert_own" on public.investment_objectives
  for insert with check (public.user_owns_portfolio(portfolio_id));
create policy "inv_obj_update_own" on public.investment_objectives
  for update using (public.user_owns_portfolio(portfolio_id));
create policy "inv_obj_delete_own" on public.investment_objectives
  for delete using (public.user_owns_portfolio(portfolio_id));
