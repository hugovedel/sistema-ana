-- Tabla de decisiones por IA (una fila por IA, por tema/ticker, por diagnóstico)
create table if not exists decisiones_ia (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,                 -- fecha de Chicago del diagnóstico
  tema varchar(30) not null,           -- id del tema (nasdaq, semis...) o ticker en modo acción
  ia varchar(20) not null,             -- claude | gpt | gemini | grok
  modo varchar(10) not null,           -- activa | sombra
  decision varchar(12) not null,       -- alcista | inverso | no_operar
  etf_elegido varchar(10),
  confianza decimal,
  razon text,
  tokens_in int,
  tokens_out int,
  costo_usd decimal(8,5),
  resultado varchar(20) default 'pendiente', -- pendiente | correcto | incorrecto | oportunidad_perdida
  rendimiento_pct decimal(6,2),
  creado_en timestamp default now()
);
