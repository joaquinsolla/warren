-- =============================================================================
-- Warren — Configuración fiscal por usuario (para estimar impuesto de plusvalías)
-- Solo guarda CONFIGURACIÓN, nunca el impuesto calculado (que es derivado).
--   tax_regime -> país/régimen que selecciona la tabla de tramos en el frontend.
-- =============================================================================

alter table public.profiles
  add column tax_regime text not null default 'ES';
