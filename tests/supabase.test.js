// Testes da camada de dados do Supabase (sem rede): confere os nomes das funções e dos parâmetros
// enviados ao banco, a validação antes do envio e a tradução dos erros. Rodar: node tests/supabase.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
['core/cpf', 'core/telefone', 'core/colaborador', 'data/rpc', 'data/supabase'].forEach((n) => {
  eval(fs.readFileSync(path.join(__dirname, '../js/' + n + '.js'), 'utf8'));
});

let chamadas = [];
let resposta = { data: null, error: null };
SPX.db = { rpc: (nome, args) => { chamadas.push({ nome, args }); return Promise.resolve(resposta); } };

const D = SPX.dataSupabase;
let ok = 0;
async function teste(nome, fn) {
  chamadas = []; resposta = { data: null, error: null };
  try { await fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}
async function nega(p, trecho) {
  try { await p; } catch (e) { assert.ok(e.message.indexOf(trecho) >= 0, 'mensagem: ' + e.message); return; }
  assert.fail('devia ter dado erro com "' + trecho + '"');
}

(async () => {
  await teste('busca manda termo e filtros limpos', async () => {
    resposta = { data: [{ nome: 'Ana' }], error: null };
    const r = await D.buscar('ana', { turno: 'T1', alergia: 'sim', turnoFalso: 'x', tipo_sanguineo: 'Z+' });
    assert.deepStrictEqual(r, [{ nome: 'Ana' }]);
    assert.deepStrictEqual(chamadas, [{ nome: 'buscar_colaboradores', args: { p_termo: 'ana', p_filtros: { turno: 'T1', alergia: 'sim' } } }]);
    await D.buscar();
    assert.deepStrictEqual(chamadas[1].args, { p_termo: '', p_filtros: {} });
  });

  await teste('ficha, líderes e histórico chamam as funções certas', async () => {
    await D.obterFicha(7); await D.listarLideres(); await D.listarAtendimentos(7);
    assert.deepStrictEqual(chamadas.map(c => c.nome), ['obter_ficha', 'listar_lideres', 'listar_atendimentos']);
    assert.deepStrictEqual(chamadas[0].args, { p_id: 7 });
    assert.deepStrictEqual(chamadas[2].args, { p_id_colaborador: 7 });
  });

  await teste('listas de colaboradores e da equipe chamam as funções certas', async () => {
    chamadas.length = 0;
    await D.listarColaboradores(); await D.listarEquipe();
    assert.deepStrictEqual(chamadas.map(c => c.nome), ['listar_colaboradores', 'listar_equipe']);
  });

  await teste('cadastro envia os dados já limpos (nome, CPF só dígitos, contatos sem linha vazia)', async () => {
    await D.cadastrarColaborador({ nome: '  Ana   Souza ', cpf: '529.982.247-25', tipo_sanguineo: 'o+', alergia_remedio: true, alergia_qual: 'Dipirona',
      id_lider: '2', contatos: [{ nome: 'Marcos', telefone: '(71) 98888-7777' }, { nome: '', telefone: '' }] });
    assert.strictEqual(chamadas[0].nome, 'cadastrar_colaborador');
    assert.deepStrictEqual(chamadas[0].args.p_dados, {
      nome: 'Ana Souza', turno: null, tipo_sanguineo: 'O+', cpf: '52998224725', alergia_remedio: true, alergia_qual: 'Dipirona',
      comorbidades: '', id_lider: 2, contatos: [{ nome: 'Marcos', telefone: '(71) 98888-7777' }]
    });
  });

  await teste('excluir chama a função certa do banco', async () => {
    await D.excluirColaborador(5);
    assert.deepStrictEqual(chamadas, [{ nome: 'excluir_colaborador', args: { p_id: 5 } }]);
  });

  await teste('dado inválido nem chega ao banco', async () => {
    await nega(D.cadastrarColaborador({ nome: ' ' }), 'nome do colaborador');
    await nega(D.cadastrarColaborador({ nome: 'X', cpf: '123.456.789-10' }), 'CPF inválido');
    await nega(D.atualizarColaborador(1, { nome: 'X', alergia_remedio: true, alergia_qual: '' }), 'qual remédio');
    await nega(D.registrarAtendimento({ id_colaborador: 1, levado_por: ' ' }), 'quem está levando');
    await nega(D.cadastrarLider({ nome: '' }), 'nome do líder');
    assert.strictEqual(chamadas.length, 0);
  });

  await teste('atualizar, atendimento e líder usam os nomes de parâmetro do SQL', async () => {
    await D.atualizarColaborador(3, { nome: 'Rita', turno: 'T2' });
    await D.registrarAtendimento({ id_colaborador: 3, levado_por: ' Bia  N ', observacao: 'tontura' });
    await D.cadastrarLider({ nome: ' Carla  M ', turno: 'T1' });
    assert.deepStrictEqual(chamadas.map(c => c.nome), ['atualizar_colaborador', 'registrar_atendimento', 'cadastrar_lider']);
    assert.strictEqual(chamadas[0].args.p_id, 3);
    assert.deepStrictEqual(chamadas[1].args, { p_id_colaborador: 3, p_levado_por: 'Bia N', p_observacao: 'tontura' });
    assert.deepStrictEqual(chamadas[2].args, { p_nome: 'Carla M', p_turno: 'T1' });
  });

  await teste('erro do banco vira Error com a mensagem pronta', async () => {
    resposta = { data: null, error: { code: 'P0001', message: 'Já existe um colaborador com este CPF: Ana Souza.' } };
    await nega(D.cadastrarColaborador({ nome: 'Outra', cpf: '529.982.247-25' }), 'Já existe um colaborador com este CPF: Ana Souza');
    resposta = { data: null, error: { code: '42501', message: 'permission denied for function x' } };
    await nega(D.buscar('ana'), 'Sem permissão para esta ação.');
  });

  await teste('falha de rede vira mensagem clara', async () => {
    SPX.db = { rpc: () => Promise.reject(new TypeError('Failed to fetch')) };
    await nega(D.obterFicha(1), 'Não foi possível falar com o servidor');
  });

  console.log('\n' + ok + ' testes ok');
})();
