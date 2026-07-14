-- =============================================================================
-- Warren — Tolerancia de redondeo en la comprobación de fondos de inversión
-- Problema: el coste de una compra (cantidad × precio) puede tener más precisión
-- que el céntimo (p. ej. 6.14263 × 192.61 = 1183.1319643), mientras que el
-- efectivo se mantiene en la unidad mínima de la moneda (céntimos). La app ya
-- redondea el importe monetario al guardarlo, pero añadimos aquí media unidad de
-- tolerancia como red de seguridad para que un residuo de coma flotante no
-- bloquee nunca una compra legítima.
-- =============================================================================

create or replace function public.check_investment_funds()
returns trigger
language plpgsql
as $$
declare
  v_available numeric;
  v_held numeric;
begin
  if new.transaction_type = 'BUY' then
    select cash_balance_cache into v_available
      from public.entities where id = new.entity_id;
    -- Tolerancia de medio céntimo para absorber residuos de redondeo.
    if (new.gross_amount + new.fees + new.taxes)
       > coalesce(v_available, 0) + 0.005 then
      raise exception
        'Fondos insuficientes para la compra (disponible %, necesario %)',
        coalesce(v_available, 0), (new.gross_amount + new.fees + new.taxes)
        using errcode = 'check_violation';
    end if;
  else
    select quantity into v_held
      from public.holdings
      where entity_id = new.entity_id and asset_id = new.asset_id;
    if new.quantity > coalesce(v_held, 0) then
      raise exception
        'Participaciones insuficientes para la venta (disponible %, solicitado %)',
        coalesce(v_held, 0), new.quantity
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
