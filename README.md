# Modelo de Datos - Warren

## Filosofía del modelo

La aplicación sigue una filosofía muy concreta:

> **La aplicación es un libro contable. Ningún balance es la fuente de verdad. Todo el estado de la aplicación puede reconstruirse únicamente a partir de los movimientos registrados.**

Esto hace que la aplicación sea:

- Robusta
- Auditable
- Consistente
- Fácil de mantener
- Fácil de recalcular ante cualquier incidencia

---

# Conceptos principales

Existen tres conceptos completamente independientes:

- **Entidades**: lugares donde existe patrimonio (bancos, brokers, etc.).
- **Dinero (Cash)**: movimientos de efectivo entre entidades o hacia/desde el exterior.
- **Inversiones**: compra y venta de activos financieros.

El patrimonio del usuario siempre se calcula como:

```text
Σ Cash de todas las entidades
+
Σ Valor de mercado de todas las posiciones abiertas
```

Nunca existirá una tabla de balances como fuente de verdad.

Los balances almacenados serán únicamente una **caché** para mejorar el rendimiento y podrán recalcularse completamente en cualquier momento.

---

# Diagrama general

```text
User
│
└── Portfolio
      │
      ├── Entity
      │      │
      │      ├── Cash Transactions
      │      ├── Investment Transactions
      │      └── Holdings
      │
      ├── Assets
      │
      └── Exchange Rates
```

---

# Tabla: profiles

Información adicional del usuario autenticado mediante Supabase Auth.

## Campos

| Campo | Tipo | Descripción |
|--------|------|-------------|
| id | uuid | Igual que auth.users.id |
| display_name | text | Nombre del usuario |
| avatar_url | text | Avatar opcional |
| base_currency | text | Moneda preferida para visualizar el patrimonio |
| tax_regime | text | País/régimen fiscal para estimar plusvalías (default 'ES') |
| created_at | timestamptz | Fecha de creación |
| updated_at | timestamptz | Fecha de actualización |

## Notas

`base_currency` únicamente afecta a la representación visual.

Ejemplos:

- EUR
- USD
- GBP

No modifica ningún dato almacenado.

---

# Tabla: portfolios

Permite que un usuario tenga varios patrimonios independientes.

Ejemplos:

- Personal
- Empresa
- Largo plazo
- Trading

## Campos

| Campo | Tipo |
|--------|------|
| id | uuid |
| user_id | uuid |
| name | text |
| description | text |
| created_at | timestamptz |
| updated_at | timestamptz |

---

# Tabla: entities

Representa cualquier lugar donde existe patrimonio.

Puede ser:

- BANK
- BROKER

## Campos

| Campo | Tipo | Descripción |
|--------|------|-------------|
| id | uuid | |
| portfolio_id | uuid | |
| name | text | Nombre de la entidad |
| type | enum | BANK / BROKER |
| currency | text | Moneda principal del efectivo |
| icon_domain | text | Dominio de la web para el icono (DuckDuckGo), opcional. NULL → inicial del nombre |
| color | text | Color hex de accent (opcional). NULL → tema monocromo |
| cash_balance_cache | numeric | Caché del efectivo |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Notas

La moneda representa únicamente la moneda del efectivo de esa entidad.

Una entidad puede contener inversiones en cualquier otra moneda.

`cash_balance_cache` nunca será la fuente de verdad.

Siempre podrá recalcularse.

---

# Tabla: assets

Catálogo de activos financieros **propio de cada usuario**.

Cada usuario mantiene su propio catálogo: el `AAPL` de un usuario es un
registro distinto del `AAPL` de otro. Se comparte entre todos los portfolios
del mismo usuario (scope = `user_id`, igual que `portfolios`).

## Campos

| Campo | Tipo |
|--------|------|
| id | uuid |
| user_id | uuid |
| symbol | text |
| isin | text |
| name | text |
| asset_type | enum |
| currency | text |
| exchange | text |
| icon_domain | text |
| color | text |
| created_at | timestamptz |

RLS: cada usuario solo puede leer, crear, editar y borrar sus propios activos
(`user_id = auth.uid()`). Un activo no puede borrarse si tiene holdings o
transacciones de inversión asociadas (FK `on delete restrict`).

## asset_type

- STOCK
- ETF
- INDEX
- CRYPTO
- BOND
- FUND
- COMMODITY
- FOREX
- OTHER

Ejemplos:

- AAPL
- BTC
- VWCE
- MSFT
- SPY

---

# Tabla: holdings

Representa la posición abierta actual de un activo dentro de una entidad.

Existe exactamente un registro por cada combinación:

```text
Entity + Asset
```

Es una tabla derivada del histórico de operaciones.

## Campos

| Campo | Tipo | Descripción |
|--------|------|-------------|
| id | uuid | |
| entity_id | uuid | |
| asset_id | uuid | |
| quantity | numeric | Cantidad actualmente poseída |
| invested_amount | numeric | Capital aún invertido |
| average_price | numeric | Precio medio actual |
| market_value_cache | numeric | Caché del valor de mercado |
| unrealized_profit_cache | numeric | Caché del beneficio no realizado |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Notas

`quantity` debe admitir:

- Acciones fraccionadas
- ETF fraccionados
- Criptomonedas

Ejemplos:

```text
0.352817
12.5
100.000001
```

Nunca utilizar enteros.

---

# Tabla: cash_transactions

Representa cualquier movimiento de efectivo.

Todos los movimientos de dinero pasan por esta tabla.

## Campos

| Campo | Tipo |
|--------|------|
| id | uuid |
| portfolio_id | uuid |
| from_entity_id | uuid nullable |
| to_entity_id | uuid nullable |
| transaction_type | enum |
| amount | numeric |
| currency | text |
| exchange_rate_to_base | numeric |
| notes | text |
| executed_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

## transaction_type

- TRANSFER
- DEPOSIT
- WITHDRAWAL
- ADJUSTMENT

---

## TRANSFER

Movimiento entre dos entidades.

Ejemplo:

```text
Banco
↓
Broker
1000€
```

```text
from_entity_id = Banco
to_entity_id = Broker
```

---

## DEPOSIT

Entrada de dinero desde el exterior.

Ejemplos:

- Nómina
- Regalo
- Intereses bancarios

```text
from_entity_id = NULL
to_entity_id = Banco
```

---

## WITHDRAWAL

Salida de dinero hacia el exterior.

```text
from_entity_id = Banco
to_entity_id = NULL
```

---

## ADJUSTMENT

Corrección manual del efectivo.

No representa un movimiento real.

Ejemplo:

```text
Balance real:      10.253€
Balance app:       10.245€

Adjustment: +8€
```

Nunca modifica directamente el balance.

Siempre genera una transacción para mantener el historial.

---

## Saldo de efectivo (derivado)

`entities.cash_balance_cache` es una **caché**, nunca la fuente de verdad. Se
mantiene automáticamente con un trigger sobre `cash_transactions`:

- `+amount` a `to_entity_id` (si existe)
- `-amount` a `from_entity_id` (si existe)

Esto cubre los 4 tipos de forma uniforme (TRANSFER resta al origen y suma al
destino; DEPOSIT suma; WITHDRAWAL resta; ADJUSTMENT suma si usa `to_entity_id`
o resta si usa `from_entity_id`). `amount` es siempre positivo.

Reconciliación: `recompute_cash_balances(portfolio_id)` reconstruye la caché de
todas las entidades del portfolio desde el histórico.

Restricciones (CHECK):

- `amount > 0`
- TRANSFER: origen y destino no nulos y distintos
- DEPOSIT: solo destino · WITHDRAWAL: solo origen · ADJUSTMENT: exactamente uno

Limitación actual: la moneda del movimiento debe coincidir con la de las
entidades implicadas (las transferencias entre monedas distintas se hacen como
retirada + ingreso). Se valida en la aplicación.

---

# Tabla: investment_transactions

Histórico completo de operaciones de inversión.

Nunca se elimina.

Nunca se modifica salvo correcciones excepcionales.

## Campos

| Campo | Tipo |
|--------|------|
| id | uuid |
| entity_id | uuid |
| asset_id | uuid |
| transaction_type | enum |
| quantity | numeric |
| price_per_unit | numeric |
| gross_amount | numeric |
| fees | numeric |
| taxes | numeric |
| currency | text |
| exchange_rate_to_base | numeric |
| remaining_quantity | numeric nullable |
| executed_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |
| notes | text |

## transaction_type

- BUY
- SELL

---

## quantity

Debe admitir fracciones.

Ejemplos:

```text
0.00032 BTC

0.523 Apple

25 ETF
```

---

## gross_amount

Siempre se almacena.

Aunque el usuario introduzca únicamente la cantidad de acciones.

La aplicación calculará automáticamente el dato restante.

---

## price_per_unit

Siempre se almacena.

Nunca debe depender de cálculos posteriores.

---

## fees

Comisiones pagadas.

---

## taxes

Impuestos retenidos.

---

## remaining_quantity

Solo tiene sentido para compras.

Ejemplo:

Compra:

```text
BUY

10 acciones

remaining_quantity = 10
```

Venta posterior de 3:

```text
remaining_quantity = 7
```

Esto permite aplicar FIFO de forma muy eficiente.

En operaciones SELL será NULL.

---

# Tabla: investment_objectives

Objetivos o tesis de inversión asociados a un activo.

Un activo puede tener varios objetivos.

Sirve para anotar el motivo/estrategia de una posición ("holdear Nvidia hasta 250 € o fin de trimestre").

## Campos

| Campo | Tipo |
|--------|------|
| id | uuid |
| portfolio_id | uuid |
| asset_id | uuid |
| entity_id | uuid nullable |
| transaction_id | uuid nullable |
| target_body | text nullable |
| target_price | numeric nullable |
| target_date | date nullable |
| is_active | boolean |
| created_at | timestamptz |
| updated_at | timestamptz |

## Reglas

Debe existir al menos uno de los tres objetivos: `target_body`, `target_price` o `target_date`.

`entity_id` opcional:

- Con valor: objetivo para el activo en un broker concreto.
- NULL: objetivo a nivel de toda la cartera.

`transaction_id` opcional: enlaza el objetivo con la compra concreta que lo motivó.

`is_active`: control manual para pausar/activar una tesis sin borrarla.

## Estado "cumplido"

NO se almacena.

Es un dato derivado que se calcula en el frontend:

- Precio actual ≥ `target_price`.
- Fecha actual ≥ `target_date`.

Es volátil (puede cumplirse y dejar de cumplirse si el precio cae), por eso nunca se persiste.

## Auto-borrado

Al vender toda la posición de un activo en una entidad (posición neta a 0), sus objetivos asociados a ese entity+asset se eliminan automáticamente.

Los objetivos a nivel de cartera (`entity_id` NULL) no se ven afectados.

---

# Tabla: exchange_rates

Histórico de tipos de cambio.

## Campos

| Campo | Tipo |
|--------|------|
| id | uuid |
| from_currency | text |
| to_currency | text |
| rate | numeric |
| obtained_at | timestamptz |

Ejemplo:

```text
USD

↓

EUR

0.9187
```

---

# Relaciones

```text
User

↓

Portfolio

↓

Entities

↓

Cash Transactions

↓

Investment Transactions

↓

(recalcula)

↓

Holdings

↓

Assets
```

---

# Flujo del efectivo

Ejemplo:

Banco:

```text
5000€
```

Transferencia:

```text
↓

Broker

1000€
```

Resultado:

Banco:

```text
4000€
```

Broker (Cash):

```text
1000€
```

---

Compra ETF:

```text
Broker Cash

1000€
```

↓

```text
Compra ETF

700€
```

↓

Resultado:

Broker Cash

300€
```

Holding ETF

700€
```

El patrimonio del broker sigue siendo:

```text
1000€
```

Simplemente cambia de bolsillo.

---

Venta parcial:

```text
Holding ETF

700€
```

↓

Venta por:

```text
200€
```

↓

Resultado:

```text
Broker Cash

500€
```

```text
Holding

500€
```

---

# FIFO

La aplicación utilizará FIFO para calcular beneficios realizados.

No existirá una relación explícita entre compras y ventas.

Cuando se venda un activo:

1. Se localizarán las compras más antiguas con `remaining_quantity > 0`.
2. Se descontará la cantidad vendida.
3. Se actualizará `remaining_quantity`.
4. Se calculará el beneficio realizado.

Ejemplo:

```text
BUY

10

remaining = 10
```

```text
BUY

5

remaining = 5
```

Venta de 12:

Resultado:

```text
BUY 1

remaining = 0
```

```text
BUY 2

remaining = 3
```

---

# Cálculo del patrimonio

## Entidad tipo BANK

```text
Patrimonio = Cash
```

## Entidad tipo BROKER

```text
Patrimonio = Cash
+
Valor de mercado de Holdings
```

## Patrimonio del Portfolio

```text
Σ Patrimonio de todas las entidades
```

## Patrimonio del Usuario

```text
Σ Patrimonio de todos los portfolios
```

---

# Historial

La aplicación mantiene dos históricos completamente independientes.

## Historial de efectivo

Proviene exclusivamente de:

```text
cash_transactions
```

Incluye:

- Ingresos
- Retiradas
- Transferencias
- Ajustes

---

## Historial de inversiones

Proviene exclusivamente de:

```text
investment_transactions
```

Incluye:

- Compras
- Ventas

Nunca mezcla movimientos de efectivo.

---

# Reglas de negocio

## Nunca editar balances

Los balances nunca se modifican directamente.

Siempre se genera una nueva transacción.

---

## Nunca eliminar movimientos

Las operaciones forman parte del historial contable.

Si existe un error:

- Se registra un ajuste.
- O se crea una operación inversa.

Nunca se pierde el historial.

---

## Todo tiene fecha

Todas las operaciones utilizan:

- `executed_at` → Momento real en que ocurrió la operación.
- `created_at` → Momento en que se registró en la aplicación.

Esto permite registrar operaciones antiguas sin perder trazabilidad.

---

## Todas las cantidades son decimales

Nunca utilizar enteros.

Debe soportar:

- Acciones fraccionadas
- ETF fraccionados
- Criptomonedas
- Forex

---

## Todas las operaciones almacenan su moneda

Nunca asumir que una entidad trabaja únicamente en una moneda.

Cada transacción almacena explícitamente:

- Moneda
- Tipo de cambio utilizado

Esto permite reconstruir correctamente balances históricos y calcular rentabilidades en cualquier divisa base.

---

## Los balances son únicamente caché

Los siguientes campos nunca son la fuente de verdad:

- `entities.cash_balance_cache`
- `holdings.market_value_cache`
- `holdings.unrealized_profit_cache`

Todos pueden regenerarse a partir del histórico de operaciones.

---

# Principio fundamental

Toda la aplicación debe poder reconstruirse únicamente leyendo el historial de operaciones.

Las tablas `holdings` y los distintos campos de caché existen exclusivamente para optimizar consultas y mejorar el rendimiento, pero nunca contienen información que no pueda regenerarse a partir de:

- `cash_transactions`
- `investment_transactions`

Este principio garantiza la consistencia del sistema y evita la corrupción de datos a largo plazo.