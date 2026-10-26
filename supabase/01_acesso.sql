-- SaúdeSPX — 01: controle de acesso
--
-- Níveis (do menor para o maior): leitura < edicao < responsavel
--   leitura      busca, vê a ficha e registra atendimento
--   edicao       o de leitura + cadastra e edita colaboradores
--   responsavel  o de edição + gerencia quem tem acesso
--
-- Como funciona: quem entra com a conta Google mas não está em "acessos" não vê nada e só consegue
-- pedir acesso. Os responsáveis aprovam o pedido escolhendo o nível, e podem alterar ou remover depois.
-- As tabelas ficam fechadas (RLS sem política): tudo passa pelas funções abaixo, que conferem o nível.
--
-- Rodar no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Os e-mails dos primeiros responsáveis NÃO ficam neste arquivo (repositório público): veja o fim.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.acessos (
  email text primary key check (email = lower(email)),
  nome text,
  nivel text not null check (nivel in ('leitura', 'edicao', 'responsavel')),
  concedido_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.pedidos_acesso (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(email)),
  nome text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'negado')),
  criado_em timestamptz not null default now(),
  resolvido_por text,
  resolvido_em timestamptz,
  nivel_concedido text check (nivel_concedido in ('leitura', 'edicao', 'responsavel'))
);

-- Cada pessoa só pode ter um pedido pendente por vez.
create unique index if not exists pedidos_acesso_um_pendente
  on public.pedidos_acesso (email) where status = 'pendente';

alter table public.acessos enable row level security;
alter table public.pedidos_acesso enable row level security;

-- ---------------------------------------------------------------------------
-- Funções internas (schema private: não ficam expostas pela API)
-- ---------------------------------------------------------------------------
create or replace function private.email_atual()
returns text
language sql stable security definer set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function private.nivel_atual()
returns text
language sql stable security definer set search_path = ''
as $$
  select a.nivel from public.acessos a where a.email = private.email_atual()
$$;

-- Para a função se o nível de quem chamou for menor que o mínimo. Devolve o nível atual.
create or replace function private.exigir_nivel(minimo text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  ordem text[] := array['leitura', 'edicao', 'responsavel'];
  atual text := private.nivel_atual();
begin
  if atual is null or array_position(ordem, atual) < array_position(ordem, minimo) then
    raise exception 'Sem permissão para esta ação.' using errcode = '42501';
  end if;
  return atual;
end
$$;

-- Garante que sempre sobre ao menos um responsável.
create or replace function private.garantir_outro_responsavel(email_afetado text)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.acessos a where a.email = email_afetado and a.nivel = 'responsavel')
     and not exists (select 1 from public.acessos a where a.nivel = 'responsavel' and a.email <> email_afetado) then
    raise exception 'Precisa existir pelo menos um responsável.';
  end if;
end
$$;

create or replace function private.limpar_email(valor text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  e text := lower(btrim(coalesce(valor, '')));
begin
  if position('@' in e) < 2 or position('.' in split_part(e, '@', 2)) < 2 then
    raise exception 'E-mail inválido.';
  end if;
  return e;
end
$$;

-- ---------------------------------------------------------------------------
-- Funções que o app chama
-- ---------------------------------------------------------------------------

-- Quem sou eu: e-mail, nível (null se não tem acesso) e situação do último pedido.
create or replace function public.meu_acesso()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  e text := private.email_atual();
  pedido text;
begin
  if e = '' then
    raise exception 'Faça login.' using errcode = '28000';
  end if;
  select p.status into pedido from public.pedidos_acesso p
   where p.email = e order by p.criado_em desc, p.id desc limit 1;
  return jsonb_build_object('email', e, 'nivel', private.nivel_atual(), 'pedido', pedido);
end
$$;

create or replace function public.pedir_acesso(p_nome text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.email_atual();
begin
  if e = '' then
    raise exception 'Faça login para pedir acesso.' using errcode = '28000';
  end if;
  if private.nivel_atual() is not null then
    raise exception 'Você já tem acesso.';
  end if;
  insert into public.pedidos_acesso (email, nome)
  values (e, nullif(btrim(p_nome), ''))
  on conflict (email) where status = 'pendente' do nothing;
end
$$;

create or replace function public.listar_pedidos()
returns table (id bigint, email text, nome text, criado_em timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('responsavel');
  return query
    select p.id, p.email, p.nome, p.criado_em
      from public.pedidos_acesso p
     where p.status = 'pendente'
     order by p.criado_em, p.id;
end
$$;

create or replace function public.listar_acessos()
returns table (email text, nome text, nivel text, criado_em timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('responsavel');
  return query
    select a.email, a.nome, a.nivel, a.criado_em
      from public.acessos a
     order by a.nivel desc, a.email;
end
$$;

create or replace function public.responder_pedido(p_id bigint, p_nivel text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  quem text := private.email_atual();
  ped public.pedidos_acesso%rowtype;
begin
  perform private.exigir_nivel('responsavel');
  if p_nivel not in ('leitura', 'edicao', 'responsavel') then
    raise exception 'Nível inválido.';
  end if;
  select * into ped from public.pedidos_acesso p where p.id = p_id and p.status = 'pendente' for update;
  if not found then
    raise exception 'Pedido não encontrado ou já respondido.';
  end if;
  insert into public.acessos (email, nome, nivel, concedido_por)
  values (ped.email, ped.nome, p_nivel, quem)
  on conflict (email) do update
    set nivel = excluded.nivel,
        nome = coalesce(excluded.nome, public.acessos.nome),
        concedido_por = excluded.concedido_por,
        atualizado_em = now();
  update public.pedidos_acesso
     set status = 'aprovado', resolvido_por = quem, resolvido_em = now(), nivel_concedido = p_nivel
   where id = p_id;
end
$$;

create or replace function public.negar_pedido(p_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('responsavel');
  update public.pedidos_acesso
     set status = 'negado', resolvido_por = private.email_atual(), resolvido_em = now()
   where id = p_id and status = 'pendente';
  if not found then
    raise exception 'Pedido não encontrado ou já respondido.';
  end if;
end
$$;

-- Adiciona alguém direto, ou muda o nível de quem já tem acesso.
create or replace function public.definir_acesso(p_email text, p_nivel text, p_nome text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.limpar_email(p_email);
begin
  perform private.exigir_nivel('responsavel');
  if p_nivel not in ('leitura', 'edicao', 'responsavel') then
    raise exception 'Nível inválido.';
  end if;
  if p_nivel <> 'responsavel' then
    perform private.garantir_outro_responsavel(e);
  end if;
  insert into public.acessos (email, nome, nivel, concedido_por)
  values (e, nullif(btrim(p_nome), ''), p_nivel, private.email_atual())
  on conflict (email) do update
    set nivel = excluded.nivel,
        nome = coalesce(excluded.nome, public.acessos.nome),
        concedido_por = excluded.concedido_por,
        atualizado_em = now();
end
$$;

create or replace function public.remover_acesso(p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.limpar_email(p_email);
begin
  perform private.exigir_nivel('responsavel');
  perform private.garantir_outro_responsavel(e);
  delete from public.acessos a where a.email = e;
end
$$;

-- ---------------------------------------------------------------------------
-- Permissões: só quem está logado chama as funções do app; as internas ficam fechadas.
-- ---------------------------------------------------------------------------
revoke all on function private.email_atual() from public, anon, authenticated;
revoke all on function private.nivel_atual() from public, anon, authenticated;
revoke all on function private.exigir_nivel(text) from public, anon, authenticated;
revoke all on function private.garantir_outro_responsavel(text) from public, anon, authenticated;
revoke all on function private.limpar_email(text) from public, anon, authenticated;

revoke all on function public.meu_acesso() from public, anon;
revoke all on function public.pedir_acesso(text) from public, anon;
revoke all on function public.listar_pedidos() from public, anon;
revoke all on function public.listar_acessos() from public, anon;
revoke all on function public.responder_pedido(bigint, text) from public, anon;
revoke all on function public.negar_pedido(bigint) from public, anon;
revoke all on function public.definir_acesso(text, text, text) from public, anon;
revoke all on function public.remover_acesso(text) from public, anon;

grant execute on function public.meu_acesso() to authenticated;
grant execute on function public.pedir_acesso(text) to authenticated;
grant execute on function public.listar_pedidos() to authenticated;
grant execute on function public.listar_acessos() to authenticated;
grant execute on function public.responder_pedido(bigint, text) to authenticated;
grant execute on function public.negar_pedido(bigint) to authenticated;
grant execute on function public.definir_acesso(text, text, text) to authenticated;
grant execute on function public.remover_acesso(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Primeiros responsáveis (rodar UMA vez, no painel, trocando pelos e-mails reais).
-- Não salve os e-mails reais neste arquivo.
-- ---------------------------------------------------------------------------
-- insert into public.acessos (email, nome, nivel, concedido_por) values
--   ('responsavel1@exemplo.com', 'Nome do responsável 1', 'responsavel', 'inicio'),
--   ('responsavel2@exemplo.com', 'Nome do responsável 2', 'responsavel', 'inicio');

-- A tabela antiga usuarios_autorizados não é mais usada. Quando quiser, pode apagar:
-- drop table if exists public.usuarios_autorizados;
