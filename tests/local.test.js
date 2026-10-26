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
eval(fs.readFileSync(path.join(__dirname, '../js/core/cpf.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/core/telefone.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/core/colaborador.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'fixtura-minima.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/data/local.js'), 'utf8'));

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

  await teste('sem dados de partida o app começa vazio', async () => {
    const fixtura = SPX.seed;
    SPX.seed = undefined;
    await D.resetar();
    assert.deepStrictEqual(await D.buscar('', { turno: 'T1' }), []);
    assert.deepStrictEqual(await D.listarLideres(), []);
    SPX.seed = fixtura;
    await D.resetar();
  });

  await teste('busca ignora acento e maiúscula', async () => {
    const r = await D.buscar('JOSE');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].nome, 'José Antônio Reis');
  });

  await teste('busca por CPF completo acha a pessoa, com ou sem pontuação', async () => {
    assert.deepStrictEqual((await D.buscar('529.982.247-25')).map(x => x.nome), ['Ana Souza']);
    assert.deepStrictEqual((await D.buscar('11144477735')).map(x => x.nome), ['José Antônio Reis']);
    assert.deepStrictEqual(await D.buscar('123.456.789-09'), []);
    assert.deepStrictEqual(await D.buscar('529.982'), []); // CPF incompleto não busca
  });

  await teste('CPF na ficha vem só com os dígitos; lista da busca não traz o CPF', async () => {
    assert.strictEqual((await D.obterFicha(1)).colaborador.cpf, '52998224725');
    const [primeiro] = await D.buscar('529.982.247-25');
    assert.ok(!('cpf' in primeiro));
  });

  await teste('cadastro valida o CPF e não aceita repetido', async () => {
    await nega(D.cadastrarColaborador({ nome: 'Cpf Ruim', cpf: '123.456.789-10' }), 'CPF inválido');
    await nega(D.cadastrarColaborador({ nome: 'Cpf Repetido', cpf: '529.982.247-25' }), 'Já existe um colaborador com este CPF: Ana Souza');
    const c = await D.cadastrarColaborador({ nome: 'Com Cpf Novo', cpf: '123.456.789-09' });
    assert.strictEqual(c.cpf, '12345678909');
    const sem = await D.cadastrarColaborador({ nome: 'Sem Cpf Um' });
    const sem2 = await D.cadastrarColaborador({ nome: 'Sem Cpf Dois', cpf: '' });
    assert.strictEqual(sem.cpf, null); assert.strictEqual(sem2.cpf, null); // vários sem CPF são permitidos
  });

  await teste('edição pode manter o próprio CPF, mas não pegar o de outra pessoa', async () => {
    await D.atualizarColaborador(1, { nome: 'Ana Souza', cpf: '529.982.247-25' });
    await nega(D.atualizarColaborador(1, { nome: 'Ana Souza', cpf: '111.444.777-35' }), 'Já existe um colaborador com este CPF: José');
    await D.atualizarColaborador(1, { nome: 'Ana Souza', cpf: '' });
    assert.strictEqual((await D.obterFicha(1)).colaborador.cpf, null);
    await D.atualizarColaborador(1, { nome: 'Ana Souza', cpf: '52998224725' }); // volta ao que era
    await D.resetar();
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

  await teste('filtro sozinho lista sem precisar de nome', async () => {
    const t1 = await D.buscar('', { turno: 'T1' });
    assert.deepStrictEqual(t1.map(x => x.nome), ['Ana Souza', 'José Antônio Reis']);
    assert.deepStrictEqual((await D.buscar('a', { turno: 'T3' })).map(x => x.nome), ['Anabela Rocha']);
  });

  await teste('filtros se combinam (todos precisam bater)', async () => {
    assert.deepStrictEqual((await D.buscar('', { turno: 'T2', alergia: 'sim' })).map(x => x.nome), ['Marina Costa']);
    assert.deepStrictEqual((await D.buscar('', { turno: 'T2', alergia: 'nao' })).map(x => x.nome), ['Paulo Henrique Dias']);
    assert.deepStrictEqual(await D.buscar('', { turno: 'T3', alergia: 'sim' }), []);
  });

  await teste('filtros por líder, tipo sanguíneo e comorbidade', async () => {
    assert.deepStrictEqual((await D.buscar('', { id_lider: '2' })).map(x => x.nome), ['Marina Costa', 'Paulo Henrique Dias']);
    assert.deepStrictEqual((await D.buscar('', { id_lider: 'sem' })).map(x => x.nome), ['Anabela Rocha']);
    assert.deepStrictEqual((await D.buscar('', { tipo_sanguineo: 'O-' })).map(x => x.nome), ['Anabela Rocha']);
    assert.deepStrictEqual((await D.buscar('', { comorbidade: 'sim' })).map(x => x.nome), ['Ana Souza', 'Marina Costa', 'Paulo Henrique Dias']);
    assert.deepStrictEqual((await D.buscar('', { comorbidade: 'nao' })).map(x => x.nome), ['Anabela Rocha', 'José Antônio Reis']);
  });

  await teste('nome e filtro juntos; filtro inválido é ignorado', async () => {
    assert.deepStrictEqual((await D.buscar('ana', { turno: 'T1' })).map(x => x.nome), ['Ana Souza']);
    assert.deepStrictEqual(await D.buscar('', { turno: 'T9' }), []);
    assert.strictEqual(SPX.regras.contarFiltros({ turno: 'T1', alergia: 'sim', tipo_sanguineo: 'Z+' }), 2);
  });

  await teste('abrir a ficha devolve contatos e líder e grava a consulta', async () => {
    const f = await D.obterFicha(1);
    assert.strictEqual(f.colaborador.nome, 'Ana Souza');
    assert.strictEqual(f.lider.nome, 'Carla Mendes');
    assert.strictEqual(f.contatos.length, 2);
    const consultas = JSON.parse(mem.spx_local_v3).consultas;
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

  await teste('observação do atendimento tem limite de 500 caracteres', async () => {
    await nega(D.registrarAtendimento({ id_colaborador: 1, levado_por: 'Bia', observacao: 'x'.repeat(501) }), '500 caracteres');
    await D.registrarAtendimento({ id_colaborador: 3, levado_por: 'Bia', observacao: 'x'.repeat(500) });
    await D.resetar();
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

  await teste('telefone do contato: só números (10 ou 11) e é guardado no padrão', async () => {
    await nega(D.cadastrarColaborador({ nome: 'Tel Curto', contatos: [{ nome: 'Mãe', telefone: '3333-4444' }] }), 'Telefone do contato inválido');
    await nega(D.cadastrarColaborador({ nome: 'Tel Longo', contatos: [{ nome: 'Mãe', telefone: '719888877770' }] }), 'Telefone do contato inválido');
    const c = await D.cadastrarColaborador({ nome: 'Tel Bom', contatos: [{ nome: 'Mãe', telefone: '71988887777' }, { nome: 'Pai', telefone: '71 3333.4444' }] });
    const f = await D.obterFicha(c.id_colaborador);
    assert.deepStrictEqual(f.contatos.map(x => x.telefone), ['(71) 98888-7777', '(71) 3333-4444']);
  });

  await teste('excluir apaga o colaborador e tudo dele; o CPF pode ser usado de novo', async () => {
    const c = await D.cadastrarColaborador({ nome: 'Para Apagar', cpf: '123.456.789-09', contatos: [{ nome: 'Mãe', telefone: '71988887777' }] });
    await D.registrarAtendimento({ id_colaborador: c.id_colaborador, levado_por: 'Bia' });
    await D.obterFicha(c.id_colaborador);
    await D.excluirColaborador(c.id_colaborador);
    await nega(D.obterFicha(c.id_colaborador), 'não encontrado');
    await nega(D.excluirColaborador(c.id_colaborador), 'não encontrado');
    assert.deepStrictEqual(await D.listarAtendimentos(c.id_colaborador), []);
    const db = JSON.parse(mem.spx_local_v3);
    assert.ok(!db.contatos.some(x => x.id_colaborador === c.id_colaborador));
    assert.ok(!db.consultas.some(x => x.id_colaborador === c.id_colaborador));
    await D.cadastrarColaborador({ nome: 'Voltou', cpf: '123.456.789-09' });
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
    const guardado = JSON.parse(mem.spx_local_v3);
    assert.ok(guardado.colaboradores.length >= 7);
    await D.resetar();
    assert.strictEqual((await D.buscar('rita')).length, 0);
  });

  console.log('\n' + ok + ' testes ok');
})();
