-- =============================================================================
-- Warren — Esquema inicial
-- Modelo contable: todo el estado se reconstruye desde el histórico de
-- movimientos (cash_transactions + investment_transactions). Los campos *_cache
-- y la tabla holdings son SOLO optimizaciones, nunca la fuente de verdad.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- Postgres permite tipos enumerados. Los usamos para restringir valores válidos.
-- -----------------------------------------------------------------------------
create type public.entity_type as enum ('BANK', 'BROKER');

create type public.asset_type as enum (
  'STOCK', 'ETF', 'INDEX', 'CRYPTO', 'BOND',
  'FUND', 'COMMODITY', 'FOREX', 'OTHER'
);

create type public.cash_transaction_type as enum (
  'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'
);

create type public.investment_transaction_type as enum ('BUY', 'SELL');

-- -----------------------------------------------------------------------------
-- 2. FUNCIÓN AUXILIAR: updated_at
-- Trigger genérico para mantener updated_at actualizado en cada UPDATE.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. TABLAS
-- -----------------------------------------------------------------------------

-- profiles: datos extra del usuario. id = auth.users.id (relación 1:1 con Auth).
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  avatar_url    text,
  base_currency text not null default 'EUR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- portfolios: un usuario puede tener varios patrimonios independientes.
create table public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- entities: lugares donde existe patrimonio (banco / broker).
create table public.entities (
  id                 uuid primary key default gen_random_uuid(),
  portfolio_id       uuid not null references public.portfolios (id) on delete cascade,
  name               text not null,
  type               public.entity_type not null,
  currency           text not null,
  cash_balance_cache numeric not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- assets: catálogo GLOBAL de activos. No pertenece a ningún usuario.
create table public.assets (
  id         uuid primary key default gen_random_uuid(),
  symbol     text not null,
  isin       text,
  name       text not null,
  asset_type public.asset_type not null,
  currency   text not null,
  exchange   text,
  created_at timestamptz not null default now()
);

-- holdings: posición abierta actual (Entity + Asset). Tabla DERIVADA / caché.
create table public.holdings (
  id                      uuid primary key default gen_random_uuid(),
  entity_id               uuid not null references public.entities (id) on delete cascade,
  asset_id                uuid not null references public.assets (id) on delete restrict,
  quantity                numeric not null default 0,
  invested_amount         numeric not null default 0,
  average_price           numeric not null default 0,
  market_value_cache      numeric not null default 0,
  unrealized_profit_cache numeric not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (entity_id, asset_id)
);

-- cash_transactions: TODO movimiento de efectivo pasa por aquí.
create table public.cash_transactions (
  id                    uuid primary key default gen_random_uuid(),
  portfolio_id          uuid not null references public.portfolios (id) on delete cascade,
  from_entity_id        uuid references public.entities (id) on delete restrict,
  to_entity_id          uuid references public.entities (id) on delete restrict,
  transaction_type      public.cash_transaction_type not null,
  amount                numeric not null,
  currency              text not null,
  exchange_rate_to_base numeric not null default 1,
  notes                 text,
  executed_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- investment_transactions: histórico completo de compras/ventas. Nunca se borra.
create table public.investment_transactions (
  id                    uuid primary key default gen_random_uuid(),
  entity_id             uuid not null references public.entities (id) on delete restrict,
  asset_id              uuid not null references public.assets (id) on delete restrict,
  transaction_type      public.investment_transaction_type not null,
  quantity              numeric not null,
  price_per_unit        numeric not null,
  gross_amount          numeric not null,
  fees                  numeric not null default 0,
  taxes                 numeric not null default 0,
  currency              text not null,
  exchange_rate_to_base numeric not null default 1,
  remaining_quantity    numeric,  -- solo para BUY (FIFO); NULL en SELL
  executed_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  notes                 text
);

-- exchange_rates: histórico GLOBAL de tipos de cambio.
create table public.exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  from_currency text not null,
  to_currency   text not null,
  rate          numeric not null,
  obtained_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. ÍNDICES
-- Aceleran los filtros/joins más habituales (claves foráneas y búsquedas).
-- -----------------------------------------------------------------------------
create index idx_portfolios_user_id              on public.portfolios (user_id);
create index idx_entities_portfolio_id           on public.entities (portfolio_id);
create index idx_holdings_entity_id              on public.holdings (entity_id);
create index idx_holdings_asset_id               on public.holdings (asset_id);
create index idx_cash_tx_portfolio_id            on public.cash_transactions (portfolio_id);
create index idx_cash_tx_from_entity             on public.cash_transactions (from_entity_id);
create index idx_cash_tx_to_entity               on public.cash_transactions (to_entity_id);
create index idx_cash_tx_executed_at             on public.cash_transactions (executed_at);
create index idx_inv_tx_entity_id                on public.investment_transactions (entity_id);
create index idx_inv_tx_asset_id                 on public.investment_transactions (asset_id);
create index idx_inv_tx_executed_at              on public.investment_transactions (executed_at);
create index idx_inv_tx_fifo                     on public.investment_transactions (entity_id, asset_id, executed_at)
  where remaining_quantity is not null and remaining_quantity > 0;
create index idx_assets_symbol                   on public.assets (symbol);
create index idx_exchange_rates_pair             on public.exchange_rates (from_currency, to_currency, obtained_at);

-- -----------------------------------------------------------------------------
-- 5. TRIGGERS updated_at
-- -----------------------------------------------------------------------------
create trigger trg_profiles_updated_at   before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_portfolios_updated_at before update on public.portfolios
  for each row execute function public.set_updated_at();
create trigger trg_entities_updated_at   before update on public.entities
  for each row execute function public.set_updated_at();
create trigger trg_holdings_updated_at   before update on public.holdings
  for each row execute function public.set_updated_at();
create trigger trg_cash_tx_updated_at    before update on public.cash_transactions
  for each row execute function public.set_updated_at();
create trigger trg_inv_tx_updated_at     before update on public.investment_transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. ALTA AUTOMÁTICA DE PROFILE
-- Cuando Auth crea un usuario (auth.users), se crea su profile automáticamente.
-- SECURITY DEFINER: la función se ejecuta con permisos del owner para poder
-- insertar en public.profiles desde el esquema auth.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 7. HELPERS DE PROPIEDAD (para RLS)
-- Funciones SECURITY DEFINER que comprueban si el usuario actual es dueño de un
-- portfolio o de una entity. Se usan en las políticas para evitar repetir joins
-- y prevenir recursión de RLS.
-- -----------------------------------------------------------------------------
create or replace function public.user_owns_portfolio(p_portfolio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.portfolios p
    where p.id = p_portfolio_id and p.user_id = auth.uid()
  );
$$;

create or replace function public.user_owns_entity(p_entity_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.entities e
    join public.portfolios p on p.id = e.portfolio_id
    where e.id = p_entity_id and p.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- Se activa RLS en cada tabla y se definen políticas. Sin una política que lo
-- permita, el acceso queda DENEGADO por defecto (importante).
-- -----------------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.portfolios              enable row level security;
alter table public.entities                enable row level security;
alter table public.holdings                enable row level security;
alter table public.cash_transactions       enable row level security;
alter table public.investment_transactions enable row level security;
alter table public.assets                  enable row level security;
alter table public.exchange_rates          enable row level security;

-- profiles: cada usuario gestiona únicamente su propia fila.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- portfolios: acceso completo solo a los propios.
create policy "portfolios_select_own" on public.portfolios
  for select using (user_id = auth.uid());
create policy "portfolios_insert_own" on public.portfolios
  for insert with check (user_id = auth.uid());
create policy "portfolios_update_own" on public.portfolios
  for update using (user_id = auth.uid());
create policy "portfolios_delete_own" on public.portfolios
  for delete using (user_id = auth.uid());

-- entities: pertenecen a un portfolio propio.
create policy "entities_select_own" on public.entities
  for select using (public.user_owns_portfolio(portfolio_id));
create policy "entities_insert_own" on public.entities
  for insert with check (public.user_owns_portfolio(portfolio_id));
create policy "entities_update_own" on public.entities
  for update using (public.user_owns_portfolio(portfolio_id));
create policy "entities_delete_own" on public.entities
  for delete using (public.user_owns_portfolio(portfolio_id));

-- holdings: pertenecen a una entity propia.
create policy "holdings_select_own" on public.holdings
  for select using (public.user_owns_entity(entity_id));
create policy "holdings_insert_own" on public.holdings
  for insert with check (public.user_owns_entity(entity_id));
create policy "holdings_update_own" on public.holdings
  for update using (public.user_owns_entity(entity_id));
create policy "holdings_delete_own" on public.holdings
  for delete using (public.user_owns_entity(entity_id));

-- cash_transactions: pertenecen a un portfolio propio.
create policy "cash_tx_select_own" on public.cash_transactions
  for select using (public.user_owns_portfolio(portfolio_id));
create policy "cash_tx_insert_own" on public.cash_transactions
  for insert with check (public.user_owns_portfolio(portfolio_id));
create policy "cash_tx_update_own" on public.cash_transactions
  for update using (public.user_owns_portfolio(portfolio_id));
create policy "cash_tx_delete_own" on public.cash_transactions
  for delete using (public.user_owns_portfolio(portfolio_id));

-- investment_transactions: pertenecen a una entity propia.
create policy "inv_tx_select_own" on public.investment_transactions
  for select using (public.user_owns_entity(entity_id));
create policy "inv_tx_insert_own" on public.investment_transactions
  for insert with check (public.user_owns_entity(entity_id));
create policy "inv_tx_update_own" on public.investment_transactions
  for update using (public.user_owns_entity(entity_id));
create policy "inv_tx_delete_own" on public.investment_transactions
  for delete using (public.user_owns_entity(entity_id));

-- assets: catálogo global. Cualquier usuario autenticado puede leerlo y añadir.
create policy "assets_select_authenticated" on public.assets
  for select to authenticated using (true);
create policy "assets_insert_authenticated" on public.assets
  for insert to authenticated with check (true);

-- exchange_rates: histórico global. Lectura e inserción para autenticados.
create policy "rates_select_authenticated" on public.exchange_rates
  for select to authenticated using (true);
create policy "rates_insert_authenticated" on public.exchange_rates
  for insert to authenticated with check (true);
