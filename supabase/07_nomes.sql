-- SaúdeSPX — 07: nome obrigatório e uma pessoa só uma vez
--
-- Antes, o nome era opcional ao pedir acesso e ao adicionar alguém, e a mesma pessoa podia aparecer
-- duas vezes com e-mails diferentes (uma delas sem nome). Agora:
--   * pedir acesso, adicionar uma pessoa e aprovar um pedido exigem o NOME (mínimo 2 letras, sem "@");
--   * o e-mail já era único (um e-mail = uma linha); passa a ser barrado também o MESMO NOME com outro
--     e-mail (sem diferenciar acento, maiúscula ou espaço sobrando);
--   * o e-mail digitado não pode ter espaço (um e-mail com espaço foi gravado e a pessoa não conseguiria entrar);
--   * o banco recusa gravar acesso sem nome. Linhas antigas sem nome continuam lá até alguém informar
--     o nome pela tela de Acessos (a regra vale para o que for gravado daqui para frente).
--
-- Depende de: 01_acesso.sql, 03_acesso_fixo.sql, 04_dominios.sql. Rodar no SQL Editor. Pode rodar de novo.

-- Igual à função do 05_dados.sql (se já existir, só é recriada igual).
create or replace function private.norm(valor text)
returns text
language sql immutable set search_path = ''
as $$
  select translate(lower(coalesce(valor, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn')
$$;

-- E-mail: sem espaço em lugar nenhum, com texto antes e depois do "@" e um ponto no domínio.
-- (Antes só olhava a posição do "@" e do ponto, e deixou passar "nome@empresa. com", com espaço.)
create or replace function private.limpar_email(valor text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  e text := lower(btrim(coalesce(valor, '')));
begin
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail inválido.';
  end if;
  return e;
end
$$;

revoke all on function private.limpar_email(text) from public, anon, authenticated;

-- Nome limpo (espaços repetidos viram um só). Recusa nome vazio, curto ou que pareça e-mail.
create or replace function private.limpar_nome(valor text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  n text := regexp_replace(btrim(coalesce(valor, '')), '\s+', ' ', 'g');
begin
  if char_length(n) < 2 or position('@' in n) > 0 then
    raise exception 'Informe o nome da pessoa (obrigatório).';
  end if;
  return n;
end
$$;

-- Forma usada para comparar nomes: sem acento, sem maiúscula e sem espaço sobrando.
create or replace function private.chave_nome(valor text)
returns text
language sql immutable set search_path = ''
as $$
  select private.norm(regexp_replace(btrim(coalesce(valor, '')), '\s+', ' ', 'g'))
$$;

-- true se OUTRO e-mail já tem acesso com este nome.
create or replace function private.nome_em_uso(p_nome text, p_email_ignorar text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.acessos a
     where a.email <> p_email_ignorar
       and private.chave_nome(a.nome) = private.chave_nome(p_nome)
  )
$$;

revoke all on function private.norm(text) from public, anon, authenticated;
revoke all on function private.limpar_nome(text) from public, anon, authenticated;
revoke all on function private.chave_nome(text) from public, anon, authenticated;
revoke all on function private.nome_em_uso(text, text) from public, anon, authenticated;

-- Banco recusa acesso ou pedido pendente sem nome (NOT VALID: não mexe nas linhas antigas).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'acessos_nome_obrigatorio') then
    alter table public.acessos
      add constraint acessos_nome_obrigatorio check (nome is not null and btrim(nome) <> '') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedidos_nome_obrigatorio') then
    alter table public.pedidos_acesso
      add constraint pedidos_nome_obrigatorio
      check (status <> 'pendente' or (nome is not null and btrim(nome) <> '')) not valid;
  end if;
end
$$;

-- Pedir acesso: nome obrigatório e sem repetir quem já tem acesso.
create or replace function public.pedir_acesso(p_nome text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.email_atual();
  n text;
begin
  if e = '' then
    raise exception 'Faça login para pedir acesso.' using errcode = '28000';
  end if;
  if private.nivel_atual() is not null then
    raise exception 'Você já tem acesso.';
  end if;
  if not private.pode_pedir_acesso() then
    raise exception 'Este e-mail não pode pedir acesso. Peça a um responsável para adicionar você.';
  end if;
  n := private.limpar_nome(p_nome);
  if private.nome_em_uso(n, e) then
    raise exception 'Já existe um acesso com este nome. Se é você, entre com o e-mail que foi liberado ou fale com um responsável.';
  end if;
  insert into public.pedidos_acesso (email, nome)
  values (e, n)
  on conflict (email) where status = 'pendente' do nothing;
end
$$;

-- Aprovar pedido: precisa ter nome e o nome não pode já ser de outra conta.
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
  insert into public.acessos (email, nome, nivel, concedido_por)
  values (ped.email, private.limpar_nome(ped.nome), p_nivel, quem)
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

-- Adicionar ou mudar o nível: nome obrigatório (se a pessoa já tem nome, não precisa mandar de novo).
-- Conta fixa pode subir de nível, mas nunca descer (igual ao 03_acesso_fixo.sql).
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

revoke all on function public.pedir_acesso(text) from public, anon;
revoke all on function public.responder_pedido(bigint, text) from public, anon;
revoke all on function public.definir_acesso(text, text, text) from public, anon;
grant execute on function public.pedir_acesso(text) to authenticated;
grant execute on function public.responder_pedido(bigint, text) to authenticated;
grant execute on function public.definir_acesso(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Para ver quem está sem nome ou repetido (rodar no painel):
-- ---------------------------------------------------------------------------
-- select email, nome, nivel, protegido, criado_em from public.acessos order by private.chave_nome(nome), email;
