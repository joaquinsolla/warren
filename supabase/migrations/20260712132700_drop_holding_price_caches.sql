-- Elimina los cachés de precio de mercado de holdings.
--
-- Estos campos nunca se rellenan: no existe fuente de precios de mercado y, a
-- diferencia de los demás cachés (cash_balance_cache, quantity, invested_amount,
-- average_price), NO son reconstruibles a partir del histórico de operaciones,
-- por lo que rompen la filosofía "todo se deriva del historial".
--
-- Cuando se integre una fuente de cotizaciones, el valor de mercado y la
-- plusvalía latente se calcularán en vivo a partir de los precios, no como
-- columnas persistidas.

alter table public.holdings
  drop column if exists market_value_cache,
  drop column if exists unrealized_profit_cache;
