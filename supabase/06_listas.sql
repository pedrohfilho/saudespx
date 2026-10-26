-- SaúdeSPX — 06: listas (todos os colaboradores e equipe do sistema)
--
-- listar_colaboradores: nome, turno e líder de TODOS os colaboradores, em ordem alfabética (sem acento),
--   para a aba "Colaboradores" mostrar a lista e o total. Não traz nenhum dado de saúde nem CPF.
-- listar_equipe: os NOMES de quem pode editar e de quem é responsável, para qualquer pessoa com acesso
--   saber a quem pedir ajuda. Não traz e-mail.
--
-- Depende de: 00_base.sql, 01_acesso.sql, 05_dados.sql. Rodar no SQL Editor. Pode rodar de novo.

create or replace function public.listar_colaboradores()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('leitura');
  return coalesce((
    select jsonb_agg(x.j order by x.chave, x.id)
      from (
        select c.id_colaborador as id,
               private.norm(private.decifrar(c.nome)) as chave,
               jsonb_build_object(
                 'id_colaborador', c.id_colaborador,
                 'nome', private.decifrar(c.nome),
                 'turno', c.turno,
                 'lider', (select private.decifrar(l.nome) from public.lideres l where l.id_lider = c.id_lider)
               ) as j
          from public.colaboradores c
      ) x
  ), '[]'::jsonb);
end
$$;

create or replace function public.listar_equipe()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_nivel('leitura');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'nome', coalesce(nullif(btrim(a.nome), ''), 'Sem nome cadastrado'),
             'nivel', a.nivel)
           order by case a.nivel when 'responsavel' then 0 else 1 end, private.norm(coalesce(a.nome, '')), a.email)
      from public.acessos a
     where a.nivel in ('edicao', 'responsavel')
  ), '[]'::jsonb);
end
$$;

revoke all on function public.listar_colaboradores() from public, anon;
revoke all on function public.listar_equipe() from public, anon;
grant execute on function public.listar_colaboradores() to authenticated;
grant execute on function public.listar_equipe() to authenticated;
