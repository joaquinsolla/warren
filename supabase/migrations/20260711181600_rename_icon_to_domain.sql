-- =============================================================================
-- Warren — Iconos de marca por dominio (DuckDuckGo)
-- Se abandona Simple Icons (catálogo limitado, sin muchos bancos/empresas) en
-- favor de iconos por dominio vía DuckDuckGo Icons
-- (https://icons.duckduckgo.com/ip3/{dominio}.ico), que resuelve casi cualquier
-- marca. Se renombra icon_slug → icon_domain en entities y assets.
-- =============================================================================

alter table public.entities rename column icon_slug to icon_domain;
alter table public.assets rename column icon_slug to icon_domain;
