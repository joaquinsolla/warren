-- =============================================================================
-- Warren — Color de marca opcional para entidades y activos
-- color guarda un color hex (ej. '#00D9A3') que el frontend usa como accent
-- para esa entidad/activo (estilo Trade Republic). Si es NULL, la interfaz usa
-- el tema monocromo por defecto.
-- =============================================================================

alter table public.entities add column color text;
alter table public.assets add column color text;
