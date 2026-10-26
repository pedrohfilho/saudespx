// Testes dos níveis de acesso. Rodar: node tests/niveis.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
eval(fs.readFileSync(path.join(__dirname, '../js/core/niveis.js'), 'utf8'));

const N = SPX.niveis;
let ok = 0;
function teste(nome, fn) {
  try { fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}

teste('cada nível alcança o próprio nível e os menores', () => {
  assert.ok(N.pode('leitura', 'leitura'));
  assert.ok(N.pode('edicao', 'leitura'));
  assert.ok(N.pode('edicao', 'edicao'));
  assert.ok(N.pode('responsavel', 'leitura'));
  assert.ok(N.pode('responsavel', 'edicao'));
  assert.ok(N.pode('responsavel', 'responsavel'));
});

teste('nível menor não alcança o maior', () => {
  assert.ok(!N.pode('leitura', 'edicao'));
  assert.ok(!N.pode('leitura', 'responsavel'));
  assert.ok(!N.pode('edicao', 'responsavel'));
});

teste('sem nível ou com nível desconhecido não alcança nada', () => {
  assert.ok(!N.pode(null, 'leitura'));
  assert.ok(!N.pode(undefined, 'leitura'));
  assert.ok(!N.pode('dono', 'leitura'));
  assert.ok(!N.pode('responsavel', 'dono'));
});

teste('lista de níveis, rótulos e descrições batem', () => {
  assert.deepStrictEqual(N.ORDEM, ['leitura', 'edicao', 'responsavel']);
  N.ORDEM.forEach(n => {
    assert.ok(N.ROTULOS[n], 'rótulo de ' + n);
    assert.ok(N.DESCRICOES[n], 'descrição de ' + n);
    assert.ok(N.valido(n));
  });
  assert.ok(!N.valido('dono'));
});

console.log('\n' + ok + ' testes ok');
