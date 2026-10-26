-- SaúdeSPX — 04: quem pode PEDIR acesso
--
-- Qualquer conta Google consegue entrar no sistema, mas sem acesso não vê nada. Para desconhecidos
-- não ficarem mandando pedidos, só podem PEDIR acesso as pessoas cujo e-mail termina num domínio
-- da lista "dominios_permitidos". Quem tem e-mail de outro domínio (por exemplo, um Gmail) só entra
-- se um responsável adicionar a pessoa direto, na tela de Acessos.
--
-- Atenção: se a lista estiver vazia, ninguém consegue pedir (o sistema fecha por padrão).
-- O domínio da empresa é cadastrado direto no painel (veja o fim do arquivo) e não fica neste
-- repositório público.
--
-- Rodar depois do 01_acesso.sql, no SQL Editor. Pode rodar de novo sem problema.

create table if not exists public.dominios_permitidos (
  dominio text primary key check (dominio = lower(dominio) and position('@' in dominio) = 0)
);

alter table public.dominios_permitidos enable row level security;

-- true se o e-mail de quem chamou termina num domínio liberado.
create or replace function private.pode_pedir_acesso()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.dominios_permitidos d
     where private.email_atual() <> ''
       and d.dominio = split_part(private.email_atual(), '@', 2)
  )
$$;

revoke all on function private.pode_pedir_acesso() from public, anon, authenticated;

-- meu_acesso agora também diz se a pessoa pode pedir acesso.
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
  return jsonb_build_object(
    'email', e,
    'nivel', private.nivel_atual(),
    'pedido', pedido,
    'pode_pedir', private.pode_pedir_acesso()
  );
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
  if not private.pode_pedir_acesso() then
    raise exception 'Este e-mail não pode pedir acesso. Peça a um responsável para adicionar você.';
  end if;
  insert into public.pedidos_acesso (email, nome)
  values (e, nullif(btrim(p_nome), ''))
  on conflict (email) where status = 'pendente' do nothing;
end
$$;

-- ---------------------------------------------------------------------------
-- Liberar o domínio da empresa (rodar no painel, trocando pelo domínio real; não salvar aqui):
-- ---------------------------------------------------------------------------
-- insert into public.dominios_permitidos (dominio) values ('empresa.com.br')
-- on conflict do nothing;
--
-- Para ver a lista:      select * from public.dominios_permitidos;
-- Para tirar um domínio: delete from public.dominios_permitidos where dominio = 'empresa.com.br';
