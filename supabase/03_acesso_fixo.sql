-- SaúdeSPX — 03: contas fixas
--
-- Marca algumas contas como "protegidas": ninguém, pela tela, consegue remover nem rebaixar o nível
-- delas (nem elas mesmas). É para os responsáveis principais nunca ficarem de fora por engano.
-- Para proteger uma conta, rode o "update" do fim do arquivo (trocando pelos e-mails reais, que não
-- ficam neste repositório público).
--
-- Rodar depois do 01_acesso.sql, no SQL Editor. Pode rodar de novo sem problema.

alter table public.acessos add column if not exists protegido boolean not null default false;

-- A lista passa a devolver também se a conta é protegida (o tipo de retorno mudou, então recria).
drop function if exists public.listar_acessos();

create function public.listar_acessos()
returns table (email text, nome text, nivel text, protegido boolean, criado_em timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('responsavel');
  return query
    select a.email, a.nome, a.nivel, a.protegido, a.criado_em
      from public.acessos a
     order by a.protegido desc, a.nivel desc, a.email;
end
$$;

revoke all on function public.listar_acessos() from public, anon;
grant execute on function public.listar_acessos() to authenticated;

-- Adiciona alguém ou muda o nível. Conta protegida pode subir de nível, mas nunca descer.
create or replace function public.definir_acesso(p_email text, p_nivel text, p_nome text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := private.limpar_email(p_email);
  ordem text[] := array['leitura', 'edicao', 'responsavel'];
  atual public.acessos%rowtype;
begin
  perform private.exigir_nivel('responsavel');
  if p_nivel not in ('leitura', 'edicao', 'responsavel') then
    raise exception 'Nível inválido.';
  end if;

  select * into atual from public.acessos a where a.email = e;
  if found and atual.protegido and array_position(ordem, p_nivel) < array_position(ordem, atual.nivel) then
    raise exception 'Esta conta é fixa e não pode ter o nível reduzido.';
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
  if exists (select 1 from public.acessos a where a.email = e and a.protegido) then
    raise exception 'Esta conta é fixa e não pode ser removida.';
  end if;
  perform private.garantir_outro_responsavel(e);
  delete from public.acessos a where a.email = e;
end
$$;

-- ---------------------------------------------------------------------------
-- Proteger as contas fixas (rodar no painel, trocando pelos e-mails reais; não salvar aqui):
-- ---------------------------------------------------------------------------
-- insert into public.acessos (email, nome, nivel, concedido_por, protegido) values
--   ('conta1@exemplo.com', 'Nome 1', 'responsavel', 'inicio', true),
--   ('conta2@exemplo.com', 'Nome 2', 'responsavel', 'inicio', true)
-- on conflict (email) do update set nivel = 'responsavel', protegido = true;
--
-- Para proteger sem mudar o nível que a pessoa já tem:
-- update public.acessos set protegido = true where email = 'conta3@exemplo.com';
