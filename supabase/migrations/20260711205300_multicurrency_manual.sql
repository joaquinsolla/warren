-- =============================================================================
-- Warren — Multidivisa manual
--   1. fx_rates: tipos de cambio ACTUALES por usuario (manuales) hacia la
--      moneda base. Sirven para el total agregado del patrimonio.
--   2. cash_transactions.to_amount: importe que LLEGA al destino en su moneda,
--      para transferencias entre monedas distintas. Si es null, el destino
--      recibe el mismo `amount` (transferencia de misma moneda / resto de tipos).
-- =============================================================================

-- 1. Tipos de cambio manuales por usuario.
--    rate_to_base: 1 unidad de `currency` = rate_to_base unidades de la moneda
--    base del usuario (profiles.base_currency).
create table public.fx_rates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  currency     text not null,
  rate_to_base numeric not null check (rate_to_base > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, currency)
);

create index idx_fx_rates_user on public.fx_rates (user_id);

create trigger trg_fx_rates_updated_at before update on public.fx_rates
  for each row execute function public.set_updated_at();

alter table public.fx_rates enable row level security;

create policy "fx_rates_select_own" on public.fx_rates
  for select using (user_id = auth.uid());
create policy "fx_rates_insert_own" on public.fx_rates
  for insert with check (user_id = auth.uid());
create policy "fx_rates_update_own" on public.fx_rates
  for update using (user_id = auth.uid());
create policy "fx_rates_delete_own" on public.fx_rates
  for delete using (user_id = auth.uid());

-- 2. Importe recibido en el destino (solo transferencias entre monedas).
alter table public.cash_transactions
  add column to_amount numeric;

alter table public.cash_transactions
  add constraint cash_tx_to_amount_valid check (
    to_amount is null
    or (to_amount > 0 and transaction_type = 'TRANSFER')
  );

-- 3. Trigger de saldo: el destino recibe coalesce(to_amount, amount).
create or replace function public.apply_cash_tx_to_balance()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.to_entity_id is not null then
      update public.entities
        set cash_balance_cache =
          cash_balance_cache + coalesce(new.to_amount, new.amount)
        where id = new.to_entity_id;
    end if;
    if new.from_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache - new.amount
        where id = new.from_entity_id;
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    if old.to_entity_id is not null then
      update public.entities
        set cash_balance_cache =
          cash_balance_cache - coalesce(old.to_amount, old.amount)
        where id = old.to_entity_id;
    end if;
    if old.from_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache + old.amount
        where id = old.from_entity_id;
    end if;
    return old;

  else -- UPDATE: revierte lo antiguo y aplica lo nuevo.
    if old.to_entity_id is not null then
      update public.entities
        set cash_balance_cache =
          cash_balance_cache - coalesce(old.to_amount, old.amount)
        where id = old.to_entity_id;
    end if;
    if old.from_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache + old.amount
        where id = old.from_entity_id;
    end if;
    if new.to_entity_id is not null then
      update public.entities
        set cash_balance_cache =
          cash_balance_cache + coalesce(new.to_amount, new.amount)
        where id = new.to_entity_id;
    end if;
    if new.from_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache - new.amount
        where id = new.from_entity_id;
    end if;
    return new;
  end if;
end;
$$;

-- 4. Reconciliación de efectivo: el destino usa coalesce(to_amount, amount).
create or replace function public.recompute_cash_balances(p_portfolio_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.entities e
    set cash_balance_cache =
      coalesce((
        select
          coalesce(
            sum(coalesce(ct.to_amount, ct.amount))
              filter (where ct.to_entity_id = e.id),
            0
          )
          - coalesce(sum(ct.amount) filter (where ct.from_entity_id = e.id), 0)
        from public.cash_transactions ct
        where ct.portfolio_id = e.portfolio_id
          and (ct.to_entity_id = e.id or ct.from_entity_id = e.id)
      ), 0)
      + coalesce((
        select sum(case when it.transaction_type = 'BUY'
                        then -(it.gross_amount + it.fees + it.taxes)
                        else (it.gross_amount - it.fees - it.taxes) end)
        from public.investment_transactions it
        where it.entity_id = e.id
      ), 0)
    where e.portfolio_id = p_portfolio_id;
end;
$$;
