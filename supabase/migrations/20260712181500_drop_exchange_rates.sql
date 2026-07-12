-- Eliminar la tabla exchange_rates (histórico global de tipos de cambio).
-- Quedó sin uso: la multidivisa se resolvió con tipos de cambio MANUALES por
-- usuario en la tabla fx_rates (ver 20260711205300_multicurrency_manual.sql).
-- No hay datos ni referencias (ninguna FK apunta aquí, ningún código la usa).

drop table if exists public.exchange_rates cascade;
