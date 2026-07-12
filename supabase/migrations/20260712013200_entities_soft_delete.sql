-- Borrado lógico de entidades ("lápida").
-- Una entidad con movimientos no se puede borrar físicamente sin perder el
-- histórico contable. En su lugar se marca con deleted_at: desaparece de la UI
-- (selectores, listas, patrimonio) pero sus movimientos siguen en el histórico,
-- mostrados como pertenecientes a una entidad eliminada.

alter table public.entities
  add column if not exists deleted_at timestamptz;

-- Índice parcial para las consultas del caso común (entidades activas).
create index if not exists entities_portfolio_active_idx
  on public.entities (portfolio_id)
  where deleted_at is null;
