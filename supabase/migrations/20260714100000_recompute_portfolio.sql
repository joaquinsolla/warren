-- Reconciliación completa de un portfolio desde el histórico.
--
-- La filosofía de la app es que ningún balance es la fuente de verdad: tanto
-- `entities.cash_balance_cache` como los `holdings` (cantidad e invertido) son
-- caché derivada de los movimientos y siempre pueden reconstruirse.
--
-- Ya existían dos reconstructores parciales:
--   - recompute_cash_balances(portfolio_id): rehace el efectivo del portfolio.
--   - recompute_holding(entity_id, asset_id): rehace un holding (FIFO).
--
-- Esta función los orquesta en una sola llamada RPC para poder ofrecer un
-- botón "Recalcular saldos" en la interfaz.
create or replace function public.recompute_portfolio(p_portfolio_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  r record;
begin
  -- Solo el dueño del portfolio puede recalcularlo.
  if not public.user_owns_portfolio(p_portfolio_id) then
    raise exception 'No autorizado';
  end if;

  -- 1. Efectivo de todas las entidades del portfolio.
  perform public.recompute_cash_balances(p_portfolio_id);

  -- 2. Cada holding (entidad + activo) con movimientos de inversión.
  for r in
    select distinct it.entity_id, it.asset_id
    from public.investment_transactions it
    join public.entities e on e.id = it.entity_id
    where e.portfolio_id = p_portfolio_id
  loop
    perform public.recompute_holding(r.entity_id, r.asset_id);
  end loop;
end;
$$;
