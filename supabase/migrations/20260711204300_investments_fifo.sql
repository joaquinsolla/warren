-- =============================================================================
-- Warren — Inversiones: FIFO, holdings y efecto automático en el efectivo
-- Filosofía: investment_transactions es el histórico (fuente de verdad).
-- holdings y entities.cash_balance_cache son cachés reconstruibles.
--
-- Decisiones:
--   * Una COMPRA resta efectivo a la entidad: -(gross + fees + taxes).
--   * Una VENTA suma efectivo a la entidad:   +(gross - fees - taxes).
--   * Coste de la posición INCLUYE comisiones e impuestos (para fiscalidad):
--       coste_unitario_lote = (gross + fees + taxes) / quantity
--   * FIFO: cada compra guarda remaining_quantity; las ventas consumen las
--     compras más antiguas. Todo se reconstruye con recompute_holding().
--   * No se permite comprar por encima del efectivo disponible ni vender más
--     participaciones de las que se poseen (guardas BEFORE INSERT).
-- =============================================================================

-- 1. Integridad de importes.
alter table public.investment_transactions
  add constraint inv_tx_amounts_valid check (
    quantity > 0
    and price_per_unit >= 0
    and gross_amount >= 0
    and fees >= 0
    and taxes >= 0
  );

-- 2. Reconstrucción FIFO de una posición (entity + asset) desde el histórico.
create or replace function public.recompute_holding(
  p_entity_id uuid,
  p_asset_id uuid
)
returns void
language plpgsql
as $$
declare
  v_sell record;
  v_buy record;
  v_to_consume numeric;
  v_consume numeric;
  v_qty numeric;
  v_invested numeric;
  v_avg numeric;
begin
  -- 2a. Reinicia el rastro FIFO: BUY = quantity, SELL = null.
  update public.investment_transactions
    set remaining_quantity = case
      when transaction_type = 'BUY' then quantity
      else null
    end
    where entity_id = p_entity_id and asset_id = p_asset_id;

  -- 2b. Cada venta consume las compras anteriores más antiguas.
  for v_sell in
    select id, quantity, executed_at, created_at
    from public.investment_transactions
    where entity_id = p_entity_id and asset_id = p_asset_id
      and transaction_type = 'SELL'
    order by executed_at, created_at
  loop
    v_to_consume := v_sell.quantity;
    for v_buy in
      select id, remaining_quantity
      from public.investment_transactions
      where entity_id = p_entity_id and asset_id = p_asset_id
        and transaction_type = 'BUY'
        and remaining_quantity > 0
        and (executed_at, created_at) <= (v_sell.executed_at, v_sell.created_at)
      order by executed_at, created_at
    loop
      exit when v_to_consume <= 0;
      v_consume := least(v_buy.remaining_quantity, v_to_consume);
      update public.investment_transactions
        set remaining_quantity = remaining_quantity - v_consume
        where id = v_buy.id;
      v_to_consume := v_to_consume - v_consume;
    end loop;
  end loop;

  -- 2c. Agrega la posición abierta desde las compras con remanente.
  select
    coalesce(sum(remaining_quantity), 0),
    coalesce(
      sum(remaining_quantity * (gross_amount + fees + taxes) / quantity),
      0
    )
    into v_qty, v_invested
    from public.investment_transactions
    where entity_id = p_entity_id and asset_id = p_asset_id
      and transaction_type = 'BUY'
      and remaining_quantity > 0;

  v_avg := case when v_qty > 0 then v_invested / v_qty else 0 end;

  -- 2d. Upsert / borra la caché de holdings.
  if v_qty > 0 then
    insert into public.holdings (
      entity_id, asset_id, quantity, invested_amount, average_price
    )
    values (p_entity_id, p_asset_id, v_qty, v_invested, v_avg)
    on conflict (entity_id, asset_id) do update
      set quantity = excluded.quantity,
          invested_amount = excluded.invested_amount,
          average_price = excluded.average_price;
  else
    delete from public.holdings
      where entity_id = p_entity_id and asset_id = p_asset_id;
  end if;
end;
$$;

-- 3. Guarda BEFORE INSERT: fondos suficientes (BUY) / participaciones (SELL).
create or replace function public.check_investment_funds()
returns trigger
language plpgsql
as $$
declare
  v_available numeric;
  v_held numeric;
begin
  if new.transaction_type = 'BUY' then
    select cash_balance_cache into v_available
      from public.entities where id = new.entity_id;
    if (new.gross_amount + new.fees + new.taxes) > coalesce(v_available, 0) then
      raise exception
        'Fondos insuficientes para la compra (disponible %, necesario %)',
        coalesce(v_available, 0), (new.gross_amount + new.fees + new.taxes)
        using errcode = 'check_violation';
    end if;
  else
    select quantity into v_held
      from public.holdings
      where entity_id = new.entity_id and asset_id = new.asset_id;
    if new.quantity > coalesce(v_held, 0) then
      raise exception
        'Participaciones insuficientes para la venta (disponible %, solicitado %)',
        coalesce(v_held, 0), new.quantity
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_inv_tx_check
  before insert on public.investment_transactions
  for each row execute function public.check_investment_funds();

-- 4. AFTER: mueve el efectivo de la entidad y reconstruye holdings.
--    Guarda pg_trigger_depth: ignora las reescrituras internas de
--    remaining_quantity que hace recompute_holding (evita recursión).
create or replace function public.on_investment_tx_change()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    update public.entities
      set cash_balance_cache = cash_balance_cache
        + case when new.transaction_type = 'BUY'
               then -(new.gross_amount + new.fees + new.taxes)
               else (new.gross_amount - new.fees - new.taxes) end
      where id = new.entity_id;
    perform public.recompute_holding(new.entity_id, new.asset_id);
    return new;

  elsif tg_op = 'DELETE' then
    update public.entities
      set cash_balance_cache = cash_balance_cache
        - case when old.transaction_type = 'BUY'
               then -(old.gross_amount + old.fees + old.taxes)
               else (old.gross_amount - old.fees - old.taxes) end
      where id = old.entity_id;
    perform public.recompute_holding(old.entity_id, old.asset_id);
    return old;

  else
    update public.entities
      set cash_balance_cache = cash_balance_cache
        - case when old.transaction_type = 'BUY'
               then -(old.gross_amount + old.fees + old.taxes)
               else (old.gross_amount - old.fees - old.taxes) end
      where id = old.entity_id;
    update public.entities
      set cash_balance_cache = cash_balance_cache
        + case when new.transaction_type = 'BUY'
               then -(new.gross_amount + new.fees + new.taxes)
               else (new.gross_amount - new.fees - new.taxes) end
      where id = new.entity_id;
    perform public.recompute_holding(old.entity_id, old.asset_id);
    if new.entity_id <> old.entity_id or new.asset_id <> old.asset_id then
      perform public.recompute_holding(new.entity_id, new.asset_id);
    end if;
    return new;
  end if;
end;
$$;

create trigger trg_inv_tx_apply
  after insert or update or delete on public.investment_transactions
  for each row execute function public.on_investment_tx_change();

-- 5. Reconciliación de efectivo: ahora incluye también las inversiones.
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
          coalesce(sum(ct.amount) filter (where ct.to_entity_id = e.id), 0)
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
