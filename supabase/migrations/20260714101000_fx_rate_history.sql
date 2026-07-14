-- =============================================================================
-- Warren — Tipos de cambio históricos
--
-- `fx_rates` guarda el tipo ACTUAL de cada divisa (usado para el patrimonio de
-- hoy, formularios y valoraciones en vivo). Esta tabla añade puntos DATADOS:
-- el tipo de una divisa que estuvo vigente a partir de una fecha concreta.
--
-- Con estos puntos, la reconstrucción del patrimonio en el tiempo puede usar el
-- tipo de cambio vigente en cada fecha, en lugar del tipo actual para todo el
-- histórico. Si un usuario no registra ningún punto, el comportamiento es el
-- mismo que antes (se usa el tipo actual en todas las fechas).
--
-- Regla de vigencia: para valorar en la fecha D se usa el punto con la mayor
-- effective_date <= D; si D es anterior a todos los puntos, se usa el más
-- antiguo; el tipo actual (fx_rates) aplica desde el último punto en adelante.
-- =============================================================================

create table public.fx_rate_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  currency      text not null,
  rate_to_base  numeric not null check (rate_to_base > 0),
  effective_date date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, currency, effective_date)
);

create index idx_fx_rate_history_lookup
  on public.fx_rate_history (user_id, currency, effective_date);

create trigger trg_fx_rate_history_updated_at before update
  on public.fx_rate_history
  for each row execute function public.set_updated_at();

alter table public.fx_rate_history enable row level security;

create policy "fx_rate_history_select_own" on public.fx_rate_history
  for select using (user_id = auth.uid());
create policy "fx_rate_history_insert_own" on public.fx_rate_history
  for insert with check (user_id = auth.uid());
create policy "fx_rate_history_update_own" on public.fx_rate_history
  for update using (user_id = auth.uid());
create policy "fx_rate_history_delete_own" on public.fx_rate_history
  for delete using (user_id = auth.uid());
