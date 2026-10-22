// Testes das regras de cadastro e da camada de dados local. Rodar: node tests/local.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
const mem = {};
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};
['core/colaborador', 'data/local'].forEach((n) => {
  eval(fs.readFileSync(path.join(__dirname, '../js/' + n + '.js'), 'utf8'));
});

const D = SPX.dataLocal;
let ok = 0;
async function teste(nome, fn) {
  try { await fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}
async function nega(p, trecho) {
  try { await p; } catch (e) { assert.ok(e.message.indexOf(trecho) >= 0, 'mensagem: ' + e.message); return; }
  assert.fail('devia ter dado erro com "' + trecho + '"');
}

(async () => {
  await D.resetar();

  await teste('busca ignora acento e maiúscula', async () => {
    const r = await D.buscar('JOSE');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].nome, 'José Antônio Reis');
  });

  await teste('busca com menos de 2 letras devolve vazio', async () => {
    assert.deepStrictEqual(await D.buscar('a'), []);
    assert.deepStrictEqual(await D.buscar('  '), []);
  });

  await teste('busca vem em ordem alfabética', async () => {
    const r = await D.buscar('ana');
    assert.deepStrictEqual(r.map(x => x.nome), ['Ana Souza', 'Anabela Rocha']);
  });

  await teste('lista da busca não traz dado de saúde', async () => {
    const [primeiro] = await D.buscar('ana');
    assert.deepStrictEqual(Object.keys(primeiro).sort(), ['id_colaborador', 'lider', 'nome', 'turno']);
  });

  await teste('abrir a ficha devolve contatos e líder e grava a consulta', async () => {
    const f = await D.obterFicha(1);
    assert.strictEqual(f.colaborador.nome, 'Ana Souza');
    assert.strictEqual(f.lider.nome, 'Carla Mendes');
    assert.strictEqual(f.contatos.length, 2);
    const consultas = JSON.parse(mem.spx_local_v1).consultas;
    assert.strictEqual(consultas.length, 1);
    assert.strictEqual(consultas[0].id_colaborador, 1);
  });

  await teste('ficha de colaborador sem líder não quebra', async () => {
    const f = await D.obterFicha(5);
    assert.strictEqual(f.lider, null);
  });

  await teste('ficha inexistente dá erro', async () => {
    await nega(D.obterFicha(999), 'não encontrado');
  });

  await teste('atendimento exige quem levou', async () => {
    await nega(D.registrarAtendimento({ id_colaborador: 1, levado_por: '  ', observacao: 'x' }), 'quem está levando');
  });

  await teste('atendimento em colaborador inexistente dá erro', async () => {
    await nega(D.registrarAtendimento({ id_colaborador: 999, levado_por: 'Fulano' }), 'não encontrado');
  });

  await teste('histórico vem do mais novo para o mais antigo', async () => {
    await D.registrarAtendimento({ id_colaborador: 1, levado_por: 'Bia', observacao: 'tontura' });
    await D.registrarAtendimento({ id_colaborador: 1, levado_por: 'Caio', observacao: '' });
    const h = await D.listarAtendimentos(1);
    assert.deepStrictEqual(h.map(a => a.levado_por), ['Caio', 'Bia']);
    assert.strictEqual(h[1].observacao, 'tontura');
    assert.deepStrictEqual(await D.listarAtendimentos(2), []);
  });

  await teste('cadastro valida nome, alergia e contatos', async () => {
    await nega(D.cadastrarColaborador({ nome: '  ' }), 'nome do colaborador');
    await nega(D.cadastrarColaborador({ nome: 'X', turno: 'T9' }), 'Turno inválido');
    await nega(D.cadastrarColaborador({ nome: 'X', tipo_sanguineo: 'Z+' }), 'Tipo sanguíneo');
    await nega(D.cadastrarColaborador({ nome: 'X', alergia_remedio: true, alergia_qual: ' ' }), 'qual remédio');
    await nega(D.cadastrarColaborador({ nome: 'X', contatos: [{ nome: 'Mãe', telefone: '' }] }), 'nome e telefone');
    await nega(D.cadastrarColaborador({ nome: 'X', contatos: [{ nome: 'Mãe', telefone: '123' }] }), 'Telefone');
  });

  await teste('cadastro guarda o colaborador e aparece na busca', async () => {
    const c = await D.cadastrarColaborador({
      nome: '  Rita   de Souza ', turno: 'T4', tipo_sanguineo: 'a+', alergia_remedio: true, alergia_qual: 'Ibuprofeno',
      comorbidades: 'Rinite', id_lider: '2',
      contatos: [{ nome: 'João', telefone: '(71) 98888-7777' }, { nome: '', telefone: '' }]
    });
    assert.strictEqual(c.id_colaborador, 6);
    const f = await D.obterFicha(6);
    assert.strictEqual(f.colaborador.nome, 'Rita de Souza');
    assert.strictEqual(f.colaborador.tipo_sanguineo, 'A+');
    assert.strictEqual(f.lider.nome, 'Roberto Lima');
    assert.strictEqual(f.contatos.length, 1);
    assert.strictEqual((await D.buscar('rita')).length, 1);
  });

  await teste('sem alergia, o "qual" é apagado', async () => {
    const c = await D.cadastrarColaborador({ nome: 'Sem Alergia', alergia_remedio: false, alergia_qual: 'texto antigo' });
    assert.strictEqual(c.alergia_qual, '');
  });

  await teste('atualizar troca dados e contatos', async () => {
    await D.atualizarColaborador(1, { nome: 'Ana Souza Lima', turno: 'T2', alergia_remedio: false, contatos: [{ nome: 'Novo', telefone: '71 99999-0000' }] });
    const f = await D.obterFicha(1);
    assert.strictEqual(f.colaborador.nome, 'Ana Souza Lima');
    assert.strictEqual(f.colaborador.turno, 'T2');
    assert.strictEqual(f.colaborador.alergia_qual, '');
    assert.deepStrictEqual(f.contatos.map(c => c.nome), ['Novo']);
    await nega(D.atualizarColaborador(999, { nome: 'Z' }), 'não encontrado');
  });

  await teste('líder novo entra na lista em ordem', async () => {
    await D.cadastrarLider({ nome: 'Aline Prado', turno: 'T3' });
    const l = await D.listarLideres();
    assert.strictEqual(l[0].nome, 'Aline Prado');
    await nega(D.cadastrarLider({ nome: '' }), 'nome do líder');
  });

  await teste('os dados continuam depois de "recarregar"', async () => {
    const guardado = JSON.parse(mem.spx_local_v1);
    assert.ok(guardado.colaboradores.length >= 7);
    await D.resetar();
    assert.strictEqual((await D.buscar('rita')).length, 0);
  });

  console.log('\n' + ok + ' testes ok');
})();
