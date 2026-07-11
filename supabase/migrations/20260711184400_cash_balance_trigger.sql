-- =============================================================================
-- Warren — Saldo de efectivo mantenido por trigger + reconciliación
-- Filosofía: el histórico (cash_transactions) es la ÚNICA fuente de verdad.
-- entities.cash_balance_cache es solo una caché para lecturas O(1); siempre se
-- puede reconstruir con recompute_cash_balances().
--
-- Semántica uniforme de entidades (from/to):
--   TRANSFER   : from_entity y to_entity → -amount a from, +amount a to
--   DEPOSIT    : to_entity (desde el exterior)      → +amount a to
--   WITHDRAWAL : from_entity (hacia el exterior)    → -amount a from
--   ADJUSTMENT : corrección; sube el saldo si usa to_entity (+amount),
--                lo baja si usa from_entity (-amount)
-- amount es SIEMPRE positivo. La caché está en la moneda de la entidad, por lo
-- que la moneda del movimiento debe coincidir con la de las entidades implicadas
-- (se valida en la aplicación).
-- =============================================================================

-- 1. Integridad de datos: qué entidades exige cada tipo + amount positivo.
alter table public.cash_transactions
  add constraint cash_tx_amount_positive check (amount > 0);

alter table public.cash_transactions
  add constraint cash_tx_entities_by_type check (
    case transaction_type
      when 'TRANSFER' then
        from_entity_id is not null
        and to_entity_id is not null
        and from_entity_id <> to_entity_id
      when 'DEPOSIT' then
        from_entity_id is null and to_entity_id is not null
      when 'WITHDRAWAL' then
        from_entity_id is not null and to_entity_id is null
      when 'ADJUSTMENT' then
        (from_entity_id is not null) <> (to_entity_id is not null)
      else false
    end
  );

-- 2. Trigger que mantiene la caché en cada INSERT / UPDATE / DELETE.
create or replace function public.apply_cash_tx_to_balance()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.to_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache + new.amount
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
        set cash_balance_cache = cash_balance_cache - old.amount
        where id = old.to_entity_id;
    end if;
    if old.from_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache + old.amount
        where id = old.from_entity_id;
    end if;
    return old;

  else -- UPDATE: revierte el efecto antiguo y aplica el nuevo.
    if old.to_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache - old.amount
        where id = old.to_entity_id;
    end if;
    if old.from_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache + old.amount
        where id = old.from_entity_id;
    end if;
    if new.to_entity_id is not null then
      update public.entities
        set cash_balance_cache = cash_balance_cache + new.amount
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

create trigger trg_cash_tx_balance
  after insert or update or delete on public.cash_transactions
  for each row execute function public.apply_cash_tx_to_balance();

-- 3. Reconciliación: reconstruye la caché de un portfolio desde el histórico.
--    Fuente de verdad = cash_transactions. Llamable como RPC.
create or replace function public.recompute_cash_balances(p_portfolio_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.entities e
    set cash_balance_cache = coalesce((
      select
        coalesce(sum(ct.amount) filter (where ct.to_entity_id = e.id), 0)
        - coalesce(sum(ct.amount) filter (where ct.from_entity_id = e.id), 0)
      from public.cash_transactions ct
      where ct.portfolio_id = e.portfolio_id
        and (ct.to_entity_id = e.id or ct.from_entity_id = e.id)
    ), 0)
    where e.portfolio_id = p_portfolio_id;
end;
$$;
