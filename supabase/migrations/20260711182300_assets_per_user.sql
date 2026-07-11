-- =============================================================================
-- Warren — assets pasan de catálogo GLOBAL a catálogo POR USUARIO
-- Cada usuario mantiene su propio catálogo de activos: tu "NVDA" es distinto
-- del "NVDA" de otro usuario. Se comparten entre todos los portfolios del mismo
-- usuario (scope = user_id, igual que portfolios).
-- =============================================================================

-- 1. Limpiar catálogo global previo (datos de prueba sin propietario).
--    En este punto del proyecto no hay inversiones registradas que dependan de
--    estos activos, por lo que es seguro vaciarlo antes de exigir propietario.
delete from public.assets;

-- 2. Añadir propietario. on delete cascade: si se borra el usuario, se borran
--    sus activos (y en cascada sus holdings/transacciones).
alter table public.assets
  add column user_id uuid not null references auth.users (id) on delete cascade;

-- 3. Índice para búsquedas por usuario (catálogo del usuario / autocompletar).
create index idx_assets_user_symbol on public.assets (user_id, symbol);

-- 4. Reemplazar las políticas globales por políticas de propietario.
drop policy if exists "assets_select_authenticated" on public.assets;
drop policy if exists "assets_insert_authenticated" on public.assets;

create policy "assets_select_own" on public.assets
  for select using (user_id = auth.uid());
create policy "assets_insert_own" on public.assets
  for insert with check (user_id = auth.uid());
create policy "assets_update_own" on public.assets
  for update using (user_id = auth.uid());
create policy "assets_delete_own" on public.assets
  for delete using (user_id = auth.uid());
