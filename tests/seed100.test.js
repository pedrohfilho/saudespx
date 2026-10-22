// Confere os 100 colaboradores de teste. Rodar: node tests/seed100.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
['core/colaborador', 'seed/seed-100'].forEach((n) => {
  eval(fs.readFileSync(path.join(__dirname, '../js/' + n + '.js'), 'utf8'));
});

let ok = 0;
function teste(nome, fn) {
  try { fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}

const dados = SPX.seed();

teste('tem 100 colaboradores e 8 líderes, com ids em sequência', () => {
  assert.strictEqual(dados.colaboradores.length, 100);
  assert.strictEqual(dados.lideres.length, 8);
  dados.colaboradores.forEach((c, i) => assert.strictEqual(c.id_colaborador, i + 1));
});

teste('nomes são únicos', () => {
  const nomes = new Set(dados.colaboradores.map(c => c.nome).concat(dados.lideres.map(l => l.nome)));
  assert.strictEqual(nomes.size, 108);
});

teste('todos passam nas regras de cadastro', () => {
  dados.colaboradores.forEach((c) => {
    const contatos = dados.contatos.filter(x => x.id_colaborador === c.id_colaborador);
    const r = SPX.regras.validarColaborador({ ...c, contatos });
    assert.ok(!r.erro, c.nome + ': ' + r.erro);
  });
});

teste('os 4 turnos e os 8 tipos sanguíneos aparecem', () => {
  assert.strictEqual(new Set(dados.colaboradores.map(c => c.turno)).size, 4);
  assert.strictEqual(new Set(dados.colaboradores.map(c => c.tipo_sanguineo)).size, 8);
});

teste('há variedade para testar filtros', () => {
  const alergicos = dados.colaboradores.filter(c => c.alergia_remedio).length;
  const comorbidades = dados.colaboradores.filter(c => c.comorbidades).length;
  const semLider = dados.colaboradores.filter(c => c.id_lider == null).length;
  assert.ok(alergicos >= 8 && alergicos <= 35, 'alérgicos: ' + alergicos);
  assert.ok(comorbidades >= 15 && comorbidades <= 40, 'comorbidades: ' + comorbidades);
  assert.ok(semLider >= 1 && semLider <= 15, 'sem líder: ' + semLider);
});

teste('o líder é sempre do mesmo turno do colaborador', () => {
  dados.colaboradores.filter(c => c.id_lider != null).forEach((c) => {
    const lider = dados.lideres.find(l => l.id_lider === c.id_lider);
    assert.strictEqual(lider.turno, c.turno, c.nome);
  });
});

teste('todos têm contato e os telefones são claramente falsos', () => {
  dados.colaboradores.forEach((c) => {
    assert.ok(dados.contatos.some(x => x.id_colaborador === c.id_colaborador), c.nome + ' sem contato');
  });
  dados.contatos.forEach(x => assert.ok(x.telefone.startsWith('(00) 90000-'), x.telefone));
});

teste('gerar duas vezes dá os mesmos colaboradores e contatos', () => {
  const outra = SPX.seed();
  assert.deepStrictEqual(outra.colaboradores, dados.colaboradores);
  assert.deepStrictEqual(outra.contatos, dados.contatos);
});

teste('atendimentos de exemplo são de pessoas que existem', () => {
  assert.ok(dados.atendimentos.length >= 12);
  dados.atendimentos.forEach(a => assert.ok(a.id_colaborador >= 1 && a.id_colaborador <= 100));
});

console.log('\n' + ok + ' testes ok');
