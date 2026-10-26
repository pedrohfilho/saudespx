-- SaúdeSPX — 02: CPF do colaborador
--
-- O CPF fica CIFRADO na coluna "cpf". Para achar uma pessoa pelo CPF e impedir CPF repetido sem
-- precisar decifrar tudo, guardamos também um "índice cego": cpf_hash = HMAC-SHA256 do CPF (só os
-- 11 dígitos) com a chave do Vault. Do hash não dá para voltar ao CPF.
--
-- Depende de: o segredo "chave_ficha" no Vault e das funções private.cifrar / private.decifrar
-- (script da criptografia). Rodar no SQL Editor do Supabase. Pode rodar de novo sem problema.

alter table public.colaboradores add column if not exists cpf bytea;
alter table public.colaboradores add column if not exists cpf_hash text;

-- Dois colaboradores não podem ter o mesmo CPF. Vários sem CPF (null) são permitidos.
create unique index if not exists colaboradores_cpf_hash_unico
  on public.colaboradores (cpf_hash) where cpf_hash is not null;

-- Só os dígitos de um texto.
create or replace function private.cpf_digitos(valor text)
returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(coalesce(valor, ''), '\D', '', 'g')
$$;

-- Confere o tamanho, os dígitos repetidos e os dois dígitos verificadores.
create or replace function private.cpf_valido(valor text)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  c text := private.cpf_digitos(valor);
  soma int;
  resto int;
  i int;
begin
  if length(c) <> 11 or c ~ '^(\d)\1{10}$' then
    return false;
  end if;

  soma := 0;
  for i in 1..9 loop
    soma := soma + substr(c, i, 1)::int * (11 - i);
  end loop;
  resto := (soma * 10) % 11;
  if resto = 10 then resto := 0; end if;
  if resto <> substr(c, 10, 1)::int then
    return false;
  end if;

  soma := 0;
  for i in 1..10 loop
    soma := soma + substr(c, i, 1)::int * (12 - i);
  end loop;
  resto := (soma * 10) % 11;
  if resto = 10 then resto := 0; end if;
  return resto = substr(c, 11, 1)::int;
end
$$;

-- Índice cego do CPF (64 caracteres). O mesmo CPF dá sempre o mesmo valor, com ou sem pontuação.
create or replace function private.cpf_hash(valor text)
returns text
language sql stable security definer set search_path = ''
as $$
  select encode(
    extensions.hmac(
      private.cpf_digitos(valor),
      (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'chave_ficha') || ':cpf',
      'sha256'
    ),
    'hex'
  )
$$;

revoke all on function private.cpf_digitos(text) from public, anon, authenticated;
revoke all on function private.cpf_valido(text) from public, anon, authenticated;
revoke all on function private.cpf_hash(text) from public, anon, authenticated;
