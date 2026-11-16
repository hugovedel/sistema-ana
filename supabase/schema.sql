-- Tabla de decisiones por IA (una fila por IA, por tema/ticker, por diagnóstico)
create table if not exists decisiones_ia (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,                 -- fecha de Chicago del diagnóstico
  tema varchar(30) not null,           -- id del tema (nasdaq, semis...) o ticker en modo acción
  ia varchar(20) not null,             -- claude | gpt | gemini | grok
  modo varchar(10) not null,           -- activa | sombra
  modelo varchar(60),                  -- modelo exacto que dio la decisión
  decision varchar(12) not null,       -- alcista | inverso | no_operar
  etf_elegido varchar(10),
  precio_ref decimal(10,4),            -- precio del ETF elegido al momento del diagnóstico
  confianza decimal,
  razon text,
  tokens_in int,
  tokens_out int,
  costo_usd decimal(8,5),
  resultado varchar(20) default 'pendiente', -- pendiente | correcto | incorrecto | oportunidad_perdida
  rendimiento_pct decimal(6,2),
  creado_en timestamp default now()
);

-- Si la tabla ya existía sin la columna modelo:
-- alter table decisiones_ia add column if not exists modelo varchar(60);
-- alter table decisiones_ia add column if not exists precio_ref decimal(10,4);

-- Diario de operaciones reales (lo que compras y cobras)
create table if not exists diario (
  id uuid primary key default gen_random_uuid(),
  fecha_compra date not null,
  etf varchar(10) not null,
  monto_compra decimal(10,2) not null,
  fecha_venta date,
  monto_venta decimal(10,2),
  estado varchar(10) not null default 'abierta',   -- abierta | cerrada
  mantuve boolean not null default false,          -- true si no vendiste en la apertura siguiente
  decision varchar(20) not null default 'mia',     -- segui_veredicto | segui_ia | mia
  ia_seguida varchar(20),
  precio_ref decimal(10,4),                        -- precio del ETF al diagnóstico (referencia)
  precio_compra decimal(10,4),                     -- precio real al que compraste
  precio_venta decimal(10,4),                      -- precio real al que vendiste
  comisiones decimal(8,2) not null default 0,
  notas text,
  creado_en timestamp default now()
);
alter table diario enable row level security;

-- Si la tabla diario ya existía:
-- alter table diario add column if not exists precio_ref decimal(10,4);
-- alter table diario add column if not exists precio_compra decimal(10,4);
-- alter table diario add column if not exists precio_venta decimal(10,4);
