-- Prohíbe registrar COMPRAS con precio unitario 0 (o negativo).
-- Una compra siempre tiene un coste por acción > 0; permitir 0 crearía
-- posiciones "gratis" que distorsionan el precio medio y la fiscalidad.
-- Las VENTAS siguen admitiendo price_per_unit >= 0 (venta sin valor, baja, etc.).
alter table public.investment_transactions
  add constraint inv_tx_buy_price_positive check (
    transaction_type <> 'BUY' or price_per_unit > 0
  );
