-- SaúdeSPX — 05: funções de dados (buscar, ficha, cadastro, atendimentos)
--
-- O app NUNCA lê nem grava as tabelas direto. Tudo passa por estas funções, que:
--   1. conferem o nível de quem chamou (leitura, edição ou responsável);
--   2. cifram na gravação e decifram na leitura, com a chave do Vault;
--   3. validam os dados (o app também valida, mas a regra de verdade é a daqui);
--   4. gravam quem abriu cada ficha (tabela consultas).
--
-- Níveis: leitura = buscar, ver ficha, registrar atendimento.
--         edição  = o de leitura + cadastrar e editar colaboradores e líderes.
--
-- Depende de: 00_base.sql, 01_acesso.sql, 02_cpf.sql. Rodar no SQL Editor. Pode rodar de novo.

-- ---------------------------------------------------------------------------
-- Apoio (schema private: não fica exposto pela API)
-- ---------------------------------------------------------------------------

-- Tira acento e maiúscula, para a busca achar "jose" em "José".
create or replace function private.norm(valor text)
returns text
language sql immutable set search_path = ''
as $$
  select translate(lower(coalesce(valor, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn')
$$;

-- Os dados de um colaborador, já decifrados.
create or replace function private.colaborador_json(p_id bigint)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id_colaborador', c.id_colaborador,
    'nome', private.decifrar(c.nome),
    'turno', c.turno,
    'tipo_sanguineo', private.decifrar(c.tipo_sanguineo),
    'alergia_remedio', c.alergia_remedio,
    'alergia_qual', coalesce(private.decifrar(c.alergia_qual), ''),
    'comorbidades', coalesce(private.decifrar(c.comorbidades), ''),
    'id_lider', c.id_lider,
    'cpf', private.decifrar(c.cpf)
  )
  from public.colaboradores c
  where c.id_colaborador = p_id
$$;

-- Confere e limpa os dados enviados pelo app. Devolve o jsonb limpo ou levanta erro com a mensagem.
create or replace function private.validar_colaborador(p_dados jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  nome text := regexp_replace(btrim(coalesce(p_dados->>'nome', '')), '\s+', ' ', 'g');
  turno text := nullif(btrim(coalesce(p_dados->>'turno', '')), '');
  tipo text := nullif(upper(btrim(coalesce(p_dados->>'tipo_sanguineo', ''))), '');
  cpf text := nullif(private.cpf_digitos(p_dados->>'cpf'), '');
  alergia boolean := coalesce((p_dados->>'alergia_remedio') in ('true', 'sim'), false);
  alergia_qual text := btrim(coalesce(p_dados->>'alergia_qual', ''));
  comorbidades text := btrim(coalesce(p_dados->>'comorbidades', ''));
  lider text := nullif(btrim(coalesce(p_dados->>'id_lider', '')), '');
  contatos jsonb := '[]'::jsonb;
  item jsonb;
  nome_contato text;
  telefone text;
begin
  if nome = '' then raise exception 'Informe o nome do colaborador.'; end if;
  if turno is not null and turno not in ('T1', 'T2', 'T3', 'T4') then raise exception 'Turno inválido.'; end if;
  if tipo is not null and tipo not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') then
    raise exception 'Tipo sanguíneo inválido.';
  end if;
  if cpf is not null and not private.cpf_valido(cpf) then raise exception 'CPF inválido. Confira os números.'; end if;
  if alergia and alergia_qual = '' then raise exception 'Informe a qual remédio a pessoa tem alergia.'; end if;
  if not alergia then alergia_qual := ''; end if;
  if lider is not null and (lider !~ '^\d+$' or not exists (select 1 from public.lideres l where l.id_lider = lider::bigint)) then
    raise exception 'Líder não encontrado.';
  end if;

  for item in select * from jsonb_array_elements(coalesce(p_dados->'contatos', '[]'::jsonb)) loop
    nome_contato := btrim(coalesce(item->>'nome', ''));
    telefone := btrim(coalesce(item->>'telefone', ''));
    if nome_contato = '' and telefone = '' then continue; end if;
    if nome_contato = '' or telefone = '' then raise exception 'Cada contato precisa de nome e telefone.'; end if;
    if length(private.cpf_digitos(telefone)) < 8 then raise exception 'Telefone do contato inválido: %', telefone; end if;
    contatos := contatos || jsonb_build_array(jsonb_build_object('nome', nome_contato, 'telefone', telefone));
  end loop;

  return jsonb_build_object(
    'nome', nome, 'turno', turno, 'tipo_sanguineo', tipo, 'cpf', cpf,
    'alergia_remedio', alergia, 'alergia_qual', alergia_qual, 'comorbidades', comorbidades,
    'id_lider', lider, 'contatos', contatos
  );
end
$$;

-- Barra CPF repetido, dizendo com quem ele já está.
create or replace function private.checar_cpf_repetido(p_cpf text, p_ignorar bigint)
returns void
language plpgsql stable security definer set search_path = ''
as $$
declare
  dono text;
begin
  if p_cpf is null then return; end if;
  select private.decifrar(c.nome) into dono
    from public.colaboradores c
   where c.cpf_hash = private.cpf_hash(p_cpf)
     and (p_ignorar is null or c.id_colaborador <> p_ignorar)
   limit 1;
  if found then raise exception 'Já existe um colaborador com este CPF: %.', dono; end if;
end
$$;

-- Troca os contatos de um colaborador pelos novos (já validados e limpos).
create or replace function private.gravar_contatos(p_id bigint, p_contatos jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  item jsonb;
begin
  delete from public.contatos_emergencia where id_colaborador = p_id;
  for item in select * from jsonb_array_elements(p_contatos) loop
    insert into public.contatos_emergencia (id_colaborador, nome, telefone)
    values (p_id, private.cifrar(item->>'nome'), private.cifrar(item->>'telefone'));
  end loop;
end
$$;

revoke all on function private.norm(text) from public, anon, authenticated;
revoke all on function private.colaborador_json(bigint) from public, anon, authenticated;
revoke all on function private.validar_colaborador(jsonb) from public, anon, authenticated;
revoke all on function private.checar_cpf_repetido(text, bigint) from public, anon, authenticated;
revoke all on function private.gravar_contatos(bigint, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leitura (nível leitura ou maior)
-- ---------------------------------------------------------------------------

-- Lista da busca: só nome, turno e líder (sem dado de saúde). Precisa de 2 letras do nome,
-- de um CPF completo ou de algum filtro. Filtros: turno, id_lider ("sem" = sem líder),
-- tipo_sanguineo, alergia ("sim"/"nao"), comorbidade ("sim"/"nao").
create or replace function public.buscar_colaboradores(p_termo text default '', p_filtros jsonb default '{}'::jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  termo text := private.norm(btrim(coalesce(p_termo, '')));
  hash_cpf text := case when length(private.cpf_digitos(p_termo)) = 11 then private.cpf_hash(p_termo) else null end;
  f_turno text := nullif(p_filtros->>'turno', '');
  f_lider text := nullif(p_filtros->>'id_lider', '');
  f_tipo text := nullif(p_filtros->>'tipo_sanguineo', '');
  f_alergia text := nullif(p_filtros->>'alergia', '');
  f_comorb text := nullif(p_filtros->>'comorbidade', '');
  resultado jsonb;
begin
  perform private.exigir_nivel('leitura');

  if length(termo) < 2 and coalesce(f_turno, f_lider, f_tipo, f_alergia, f_comorb) is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object('id_colaborador', t.id_colaborador, 'nome', t.nome, 'turno', t.turno, 'lider', t.lider)
           order by t.chave, t.id_colaborador), '[]'::jsonb)
    into resultado
    from (
      select c.id_colaborador, c.turno, c.id_lider, c.alergia_remedio, c.tipo_sanguineo, c.comorbidades, c.cpf_hash,
             private.decifrar(c.nome) as nome,
             private.norm(private.decifrar(c.nome)) as chave,
             (select private.decifrar(l.nome) from public.lideres l where l.id_lider = c.id_lider) as lider
        from public.colaboradores c
    ) t
   where (length(termo) < 2 or position(termo in t.chave) > 0 or (hash_cpf is not null and t.cpf_hash = hash_cpf))
     and (f_turno is null or t.turno = f_turno)
     and (f_lider is null or (f_lider = 'sem' and t.id_lider is null) or (f_lider <> 'sem' and t.id_lider::text = f_lider))
     and (f_tipo is null or private.decifrar(t.tipo_sanguineo) = f_tipo)
     and (f_alergia is null or (f_alergia = 'sim' and t.alergia_remedio) or (f_alergia = 'nao' and not t.alergia_remedio))
     and (f_comorb is null
          or (f_comorb = 'sim' and coalesce(private.decifrar(t.comorbidades), '') <> '')
          or (f_comorb = 'nao' and coalesce(private.decifrar(t.comorbidades), '') = ''));

  return resultado;
end
$$;

-- Abre a ficha completa e grava quem consultou.
create or replace function public.obter_ficha(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  colaborador jsonb;
  lider jsonb;
  contatos jsonb;
begin
  perform private.exigir_nivel('leitura');

  colaborador := private.colaborador_json(p_id);
  if colaborador is null then raise exception 'Colaborador não encontrado.'; end if;

  insert into public.consultas (id_colaborador, id_usuario, email_usuario)
  values (p_id, auth.uid(), private.email_atual());

  select jsonb_build_object('id_lider', l.id_lider, 'nome', private.decifrar(l.nome), 'turno', l.turno)
    into lider
    from public.lideres l
   where l.id_lider = (colaborador->>'id_lider')::bigint;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id_contato', k.id_contato, 'id_colaborador', k.id_colaborador,
           'nome', private.decifrar(k.nome), 'telefone', private.decifrar(k.telefone))
           order by k.id_contato), '[]'::jsonb)
    into contatos
    from public.contatos_emergencia k
   where k.id_colaborador = p_id;

  return jsonb_build_object('colaborador', colaborador, 'lider', lider, 'contatos', contatos);
end
$$;

create or replace function public.listar_lideres()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('leitura');
  return coalesce((
    select jsonb_agg(x.j order by x.chave, x.id)
      from (
        select l.id_lider as id,
               private.norm(private.decifrar(l.nome)) as chave,
               jsonb_build_object('id_lider', l.id_lider, 'nome', private.decifrar(l.nome), 'turno', l.turno) as j
          from public.lideres l
      ) x
  ), '[]'::jsonb);
end
$$;

create or replace function public.registrar_atendimento(p_id_colaborador bigint, p_levado_por text, p_observacao text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  levado text := regexp_replace(btrim(coalesce(p_levado_por, '')), '\s+', ' ', 'g');
  obs text := btrim(coalesce(p_observacao, ''));
  novo public.atendimentos%rowtype;
begin
  perform private.exigir_nivel('leitura');
  if levado = '' then raise exception 'Informe quem está levando ao atendimento.'; end if;
  if length(obs) > 500 then raise exception 'A observação pode ter até 500 caracteres.'; end if;
  if not exists (select 1 from public.colaboradores c where c.id_colaborador = p_id_colaborador) then
    raise exception 'Colaborador não encontrado.';
  end if;

  insert into public.atendimentos (id_colaborador, levado_por, observacao)
  values (p_id_colaborador, levado, private.cifrar(nullif(obs, '')))
  returning * into novo;

  return jsonb_build_object(
    'id_atendimento', novo.id_atendimento, 'id_colaborador', novo.id_colaborador,
    'levado_por', novo.levado_por, 'observacao', obs, 'data_hora', novo.data_hora);
end
$$;

-- Histórico de um colaborador, do mais novo para o mais antigo.
create or replace function public.listar_atendimentos(p_id_colaborador bigint)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('leitura');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id_atendimento', a.id_atendimento, 'id_colaborador', a.id_colaborador,
             'levado_por', a.levado_por, 'observacao', coalesce(private.decifrar(a.observacao), ''),
             'data_hora', a.data_hora)
           order by a.data_hora desc, a.id_atendimento desc)
      from public.atendimentos a
     where a.id_colaborador = p_id_colaborador
  ), '[]'::jsonb);
end
$$;

-- ---------------------------------------------------------------------------
-- Edição (nível edição ou maior)
-- ---------------------------------------------------------------------------

create or replace function public.cadastrar_lider(p_nome text, p_turno text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  nome text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  turno text := nullif(btrim(coalesce(p_turno, '')), '');
  novo bigint;
begin
  perform private.exigir_nivel('edicao');
  if nome = '' then raise exception 'Informe o nome do líder.'; end if;
  if turno is not null and turno not in ('T1', 'T2', 'T3', 'T4') then raise exception 'Turno inválido.'; end if;

  insert into public.lideres (nome, turno) values (private.cifrar(nome), turno) returning id_lider into novo;
  return jsonb_build_object('id_lider', novo, 'nome', nome, 'turno', turno);
end
$$;

create or replace function public.cadastrar_colaborador(p_dados jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v jsonb;
  novo bigint;
begin
  perform private.exigir_nivel('edicao');
  v := private.validar_colaborador(p_dados);
  perform private.checar_cpf_repetido(v->>'cpf', null);

  begin
    insert into public.colaboradores
      (nome, turno, tipo_sanguineo, alergia_remedio, alergia_qual, comorbidades, id_lider, cpf, cpf_hash)
    values (
      private.cifrar(v->>'nome'), v->>'turno', private.cifrar(v->>'tipo_sanguineo'),
      (v->>'alergia_remedio')::boolean, private.cifrar(nullif(v->>'alergia_qual', '')),
      private.cifrar(nullif(v->>'comorbidades', '')), nullif(v->>'id_lider', '')::bigint,
      private.cifrar(v->>'cpf'), case when v->>'cpf' is null then null else private.cpf_hash(v->>'cpf') end
    )
    returning id_colaborador into novo;
  exception when unique_violation then
    raise exception 'Já existe um colaborador com este CPF.';
  end;

  perform private.gravar_contatos(novo, v->'contatos');
  return private.colaborador_json(novo);
end
$$;

create or replace function public.atualizar_colaborador(p_id bigint, p_dados jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.exigir_nivel('edicao');
  if not exists (select 1 from public.colaboradores c where c.id_colaborador = p_id) then
    raise exception 'Colaborador não encontrado.';
  end if;
  v := private.validar_colaborador(p_dados);
  perform private.checar_cpf_repetido(v->>'cpf', p_id);

  begin
    update public.colaboradores set
      nome = private.cifrar(v->>'nome'),
      turno = v->>'turno',
      tipo_sanguineo = private.cifrar(v->>'tipo_sanguineo'),
      alergia_remedio = (v->>'alergia_remedio')::boolean,
      alergia_qual = private.cifrar(nullif(v->>'alergia_qual', '')),
      comorbidades = private.cifrar(nullif(v->>'comorbidades', '')),
      id_lider = nullif(v->>'id_lider', '')::bigint,
      cpf = private.cifrar(v->>'cpf'),
      cpf_hash = case when v->>'cpf' is null then null else private.cpf_hash(v->>'cpf') end
    where id_colaborador = p_id;
  exception when unique_violation then
    raise exception 'Já existe um colaborador com este CPF.';
  end;

  perform private.gravar_contatos(p_id, v->'contatos');
  return private.colaborador_json(p_id);
end
$$;

-- ---------------------------------------------------------------------------
-- Permissões: só quem está logado chama (e cada função confere o nível por dentro).
-- ---------------------------------------------------------------------------
revoke all on function public.buscar_colaboradores(text, jsonb) from public, anon;
revoke all on function public.obter_ficha(bigint) from public, anon;
revoke all on function public.listar_lideres() from public, anon;
revoke all on function public.registrar_atendimento(bigint, text, text) from public, anon;
revoke all on function public.listar_atendimentos(bigint) from public, anon;
revoke all on function public.cadastrar_lider(text, text) from public, anon;
revoke all on function public.cadastrar_colaborador(jsonb) from public, anon;
revoke all on function public.atualizar_colaborador(bigint, jsonb) from public, anon;

grant execute on function public.buscar_colaboradores(text, jsonb) to authenticated;
grant execute on function public.obter_ficha(bigint) to authenticated;
grant execute on function public.listar_lideres() to authenticated;
grant execute on function public.registrar_atendimento(bigint, text, text) to authenticated;
grant execute on function public.listar_atendimentos(bigint) to authenticated;
grant execute on function public.cadastrar_lider(text, text) to authenticated;
grant execute on function public.cadastrar_colaborador(jsonb) to authenticated;
grant execute on function public.atualizar_colaborador(bigint, jsonb) to authenticated;
