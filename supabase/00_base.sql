-- SaúdeSPX — 00: base do banco (tabelas e criptografia)
--
-- Este arquivo documenta o que já foi rodado na criação do projeto. Nome, contatos, dados de saúde e
-- observações ficam CIFRADOS (coluna bytea); só turno, quem é o líder e "tem alergia" ficam em texto.
-- Depende do segredo "chave_ficha" no Vault (criado pelo painel, nunca neste arquivo).
-- Pode rodar de novo sem problema (não apaga nada).

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create or replace function private.cifrar(valor text)
returns bytea
language sql security definer set search_path = ''
as $$
  select extensions.pgp_sym_encrypt(
    valor,
    (select decrypted_secret from vault.decrypted_secrets where name = 'chave_ficha')
  )
$$;

create or replace function private.decifrar(valor bytea)
returns text
language sql security definer set search_path = ''
as $$
  select extensions.pgp_sym_decrypt(
    valor,
    (select decrypted_secret from vault.decrypted_secrets where name = 'chave_ficha')
  )
$$;

revoke all on function private.cifrar(text) from public, anon, authenticated;
revoke all on function private.decifrar(bytea) from public, anon, authenticated;

create table if not exists public.lideres (
  id_lider bigint generated always as identity primary key,
  nome bytea not null,
  turno text check (turno in ('T1','T2','T3','T4'))
);

create table if not exists public.colaboradores (
  id_colaborador bigint generated always as identity primary key,
  nome bytea not null,
  turno text check (turno in ('T1','T2','T3','T4')),
  tipo_sanguineo bytea,
  alergia_remedio boolean not null default false,
  alergia_qual bytea,
  comorbidades bytea,
  id_lider bigint references public.lideres(id_lider)
);

create table if not exists public.contatos_emergencia (
  id_contato bigint generated always as identity primary key,
  id_colaborador bigint not null references public.colaboradores(id_colaborador) on delete cascade,
  nome bytea not null,
  telefone bytea not null
);

create table if not exists public.atendimentos (
  id_atendimento bigint generated always as identity primary key,
  id_colaborador bigint not null references public.colaboradores(id_colaborador),
  levado_por text not null,
  observacao bytea,
  data_hora timestamptz not null default now()
);

create table if not exists public.consultas (
  id_consulta bigint generated always as identity primary key,
  id_colaborador bigint not null references public.colaboradores(id_colaborador),
  id_usuario uuid references auth.users(id) on delete set null,
  email_usuario text,
  data_hora timestamptz not null default now()
);

create index if not exists colaboradores_id_lider_idx on public.colaboradores (id_lider);
create index if not exists contatos_emergencia_colaborador_idx on public.contatos_emergencia (id_colaborador);
create index if not exists atendimentos_colaborador_idx on public.atendimentos (id_colaborador);
create index if not exists consultas_colaborador_idx on public.consultas (id_colaborador);
create index if not exists consultas_data_idx on public.consultas (data_hora desc);

-- RLS ligada e sem política: ninguém lê nem escreve direto; tudo passa pelas funções (05_dados.sql).
alter table public.lideres enable row level security;
alter table public.colaboradores enable row level security;
alter table public.contatos_emergencia enable row level security;
alter table public.atendimentos enable row level security;
alter table public.consultas enable row level security;
