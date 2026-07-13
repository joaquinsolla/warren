-- Precio manual por activo, para estimar la rentabilidad latente sin fuente de
-- precios en vivo. Es un CACHÉ editable a mano (no reconstruible desde el
-- histórico): el usuario lo actualiza cuando quiere para ver "cómo le va".
--   manual_price     -> último precio unitario introducido (en la moneda con la
--                       que opera ese activo; null = sin estimación).
--   manual_price_at  -> cuándo se introdujo, para avisar de datos antiguos.
-- No afecta a compras/ventas ni al patrimonio a coste; solo alimenta la vista
-- de valor estimado y plusvalía latente.
alter table public.assets
  add column manual_price numeric,
  add column manual_price_at timestamptz;
