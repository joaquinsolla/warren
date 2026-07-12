-- Borrado lógico de activos ("lápida"), igual que en entities.
-- Un activo con inversiones/holdings asociados no se puede borrar físicamente
-- (las FK son ON DELETE RESTRICT) sin perder el histórico contable. En su lugar
-- se marca con deleted_at: desaparece del catálogo y de los selectores de compra,
-- pero sus movimientos siguen en el histórico, mostrados como pertenecientes a un
-- símbolo eliminado.

alter table public.assets
  add column if not exists deleted_at timestamptz;

-- Índice parcial para el caso común (activos activos del usuario).
create index if not exists assets_user_active_idx
  on public.assets (user_id)
  where deleted_at is null;
