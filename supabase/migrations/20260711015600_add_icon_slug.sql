-- =============================================================================
-- Warren — Iconos opcionales de marca para entidades y activos
-- icon_slug guarda el slug de Simple Icons (ej. 'nvidia', 'bbva', 'zara').
-- Si es NULL o el slug no existe, el frontend muestra la inicial del nombre.
-- =============================================================================

alter table public.entities add column icon_slug text;
alter table public.assets add column icon_slug text;
