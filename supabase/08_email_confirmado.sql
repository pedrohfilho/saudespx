-- SaúdeSPX — 08: e-mail corporativo e confirmado
--
-- O sistema não consegue saber se um e-mail digitado existe de verdade (um erro de digitação, como
-- "adrano" no lugar de "adriano", cria um acesso que ninguém vai conseguir usar). O que prova que o
-- e-mail é real é a própria pessoa entrar com a conta Google dele. Por isso:
--   * só dá para ADICIONAR à mão um e-mail de domínio liberado (tabela dominios_permitidos, 04_dominios.sql);
--   * todo acesso tem "confirmado_em": fica vazio até a pessoa entrar pela primeira vez com aquele e-mail;
--     quem veio de um pedido aprovado (o e-mail veio do Google) ou é conta fixa já nasce confirmado;
--   * a tela de Acessos mostra "ainda não entrou" nos que não foram confirmados, para dar para
--     perceber um e-mail digitado errado e corrigir.
--
-- Depende de: 01, 03, 04 e 07. Rodar no SQL Editor. Pode rodar de novo.

alter table public.acessos add column if not exists confirmado_em timestamptz;

-- Quem já tinha entrado por pedido aprovado, e as contas fixas, contam como confirmados.
update public.acessos a
   set confirmado_em = a.atualizado_em
 where a.confirmado_em is null
   and (a.protegido
        or exists (select 1 from public.pedidos_acesso p where p.email = a.email and p.status = 'aprovado'));

-- true se o domínio do e-mail está na lista de domínios liberados.
create or replace function private.dominio_liberado(p_email text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.dominios_permitidos d where d.dominio = split_part(p_email, '@', 2)
  )
$$;

revoke all on function private.dominio_liberado(text) from public, anon, authenticated;

-- Ao entrar, quem tem acesso e ainda não estava confirmado passa a estar (o Google provou o e-mail).
create or replace function public.meu_acesso()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.email_atual();
  pedido text;
  atual text;
begin
  if e = '' then
    raise exception 'Faça login.' using errcode = '28000';
  end if;
  atual := private.nivel_atual();
  if atual is not null then
    update public.acessos a set confirmado_em = now() where a.email = e and a.confirmado_em is null;
  end if;
  select p.status into pedido from public.pedidos_acesso p
   where p.email = e order by p.criado_em desc, p.id desc limit 1;
  return jsonb_build_object(
    'email', e,
    'nivel', atual,
    'pedido', pedido,
    'pode_pedir', private.pode_pedir_acesso()
  );
end
$$;

revoke all on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated;

-- A lista passa a devolver se o e-mail já foi confirmado (o tipo de retorno muda, então recria).
drop function if exists public.listar_acessos();

create function public.listar_acessos()
returns table (email text, nome text, nivel text, protegido boolean, criado_em timestamptz, confirmado_em timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('responsavel');
  return query
    select a.email, a.nome, a.nivel, a.protegido, a.criado_em, a.confirmado_em
      from public.acessos a
     order by a.protegido desc, a.nivel desc, a.email;
end
$$;

revoke all on function public.listar_acessos() from public, anon;
grant execute on function public.listar_acessos() to authenticated;

-- Aprovar pedido: o e-mail veio do login do Google, então já fica confirmado.
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
  if ped.nome is null or btrim(ped.nome) = '' then
    raise exception 'Este pedido veio sem nome. Negue e peça para a pessoa pedir de novo, com o nome.';
  end if;
  if private.nome_em_uso(ped.nome, ped.email) then
    raise exception 'Já existe um acesso com este nome em outro e-mail. Confira na lista antes de aprovar.';
  end if;
  insert into public.acessos (email, nome, nivel, concedido_por, confirmado_em)
  values (ped.email, private.limpar_nome(ped.nome), p_nivel, quem, now())
  on conflict (email) do update
    set nivel = excluded.nivel,
        nome = coalesce(excluded.nome, public.acessos.nome),
        concedido_por = excluded.concedido_por,
        confirmado_em = coalesce(public.acessos.confirmado_em, excluded.confirmado_em),
        atualizado_em = now();
  update public.pedidos_acesso
     set status = 'aprovado', resolvido_por = quem, resolvido_em = now(), nivel_concedido = p_nivel
   where id = p_id;
end
$$;

revoke all on function public.responder_pedido(bigint, text) from public, anon;
grant execute on function public.responder_pedido(bigint, text) to authenticated;

-- Adicionar à mão: só e-mail de domínio liberado (pessoa nova). Quem já está na lista só muda de nível.
create or replace function public.definir_acesso(p_email text, p_nivel text, p_nome text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.limpar_email(p_email);
  ordem text[] := array['leitura', 'edicao', 'responsavel'];
  atual public.acessos%rowtype;
  tem_atual boolean;
  n text;
begin
  perform private.exigir_nivel('responsavel');
  if p_nivel not in ('leitura', 'edicao', 'responsavel') then
    raise exception 'Nível inválido.';
  end if;

  select * into atual from public.acessos a where a.email = e;
  tem_atual := found;
  if tem_atual and atual.protegido and array_position(ordem, p_nivel) < array_position(ordem, atual.nivel) then
    raise exception 'Esta conta é fixa e não pode ter o nível reduzido.';
  end if;

  if not tem_atual and not private.dominio_liberado(e) then
    raise exception 'Só dá para adicionar e-mail corporativo (de domínio liberado). Confira o e-mail digitado.';
  end if;

  if nullif(btrim(p_nome), '') is not null then
    n := private.limpar_nome(p_nome);
  elsif tem_atual and nullif(btrim(atual.nome), '') is not null then
    n := atual.nome;
  else
    raise exception 'Informe o nome da pessoa (obrigatório).';
  end if;

  if (not tem_atual or private.chave_nome(n) <> private.chave_nome(atual.nome))
     and private.nome_em_uso(n, e) then
    raise exception 'Já existe um acesso com este nome em outro e-mail. Confira a lista de acessos antes de adicionar.';
  end if;

  if p_nivel <> 'responsavel' then
    perform private.garantir_outro_responsavel(e);
  end if;

  insert into public.acessos (email, nome, nivel, concedido_por)
  values (e, n, p_nivel, private.email_atual())
  on conflict (email) do update
    set nivel = excluded.nivel,
        nome = excluded.nome,
        concedido_por = excluded.concedido_por,
        atualizado_em = now();
end
$$;

revoke all on function public.definir_acesso(text, text, text) from public, anon;
grant execute on function public.definir_acesso(text, text, text) to authenticated;
