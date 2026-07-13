-- Un activo nunca puede estar sin precio manual. Antes era opcional (null =
-- sin estimación); ahora es obligatorio y positivo. Blindamos la regla en BBDD:
--   1. Rellenamos los precios que falten con el mejor coste disponible.
--   2. Forzamos NOT NULL y CHECK (> 0) sobre manual_price y NOT NULL sobre su
--      fecha para que siempre haya un precio con su marca temporal.

-- 1a. Backfill desde el coste medio de las posiciones abiertas.
update public.assets a
set manual_price = sub.avg_cost,
    manual_price_at = coalesce(a.manual_price_at, now())
from (
  select asset_id, sum(invested_amount) / nullif(sum(quantity), 0) as avg_cost
  from public.holdings
  group by asset_id
) sub
where a.manual_price is null
  and sub.asset_id = a.id
  and sub.avg_cost is not null
  and sub.avg_cost > 0;

-- 1b. Para los que aún falten, usamos el último precio de compra registrado.
update public.assets a
set manual_price = sub.price_per_unit,
    manual_price_at = coalesce(a.manual_price_at, now())
from (
  select distinct on (asset_id) asset_id, price_per_unit
  from public.investment_transactions
  where transaction_type = 'BUY' and price_per_unit > 0
  order by asset_id, executed_at desc
) sub
where a.manual_price is null
  and sub.asset_id = a.id;

-- 2. Restricciones definitivas.
alter table public.assets
  alter column manual_price set not null,
  alter column manual_price_at set not null,
  add constraint assets_manual_price_positive check (manual_price > 0);
