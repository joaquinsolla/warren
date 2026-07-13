-- Un objetivo simplemente existe o no; no tiene sentido pausarlo/activarlo.
-- Eliminamos el estado is_active para simplificar el modelo.
alter table public.investment_objectives
  drop column is_active;
