// Testes do telefone. Rodar: node tests/telefone.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
eval(fs.readFileSync(path.join(__dirname, '../js/core/telefone.js'), 'utf8'));

const T = SPX.telefone;
let ok = 0;
function teste(nome, fn) {
  try { fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}

teste('só números: letras e símbolos são ignorados', () => {
  assert.strictEqual(T.somenteDigitos('(71) 98888-7777'), '71988887777');
  assert.strictEqual(T.somenteDigitos('abc71x9'), '719');
  assert.strictEqual(T.somenteDigitos(null), '');
});

teste('vale com 10 ou 11 dígitos, e só com isso', () => {
  assert.ok(T.valido('(71) 3333-4444'));
  assert.ok(T.valido('71988887777'));
  assert.ok(!T.valido('3333-4444'));
  assert.ok(!T.valido('123'));
  assert.ok(!T.valido(''));
  assert.ok(!T.valido('719888877770'));
});

teste('formata enquanto digita', () => {
  assert.strictEqual(T.formatar(''), '');
  assert.strictEqual(T.formatar('7'), '(7');
  assert.strictEqual(T.formatar('71'), '(71');
  assert.strictEqual(T.formatar('719'), '(71) 9');
  assert.strictEqual(T.formatar('719888'), '(71) 9888');
  assert.strictEqual(T.formatar('7198888'), '(71) 9888-8');
  assert.strictEqual(T.formatar('7133334444'), '(71) 3333-4444');
  assert.strictEqual(T.formatar('71988887777'), '(71) 98888-7777');
});

teste('formatar ignora o que não é número e corta o excesso', () => {
  assert.strictEqual(T.formatar('(71) 98888-7777 ramal 12'), '(71) 98888-7777');
  assert.strictEqual(T.formatar('abc'), '');
  assert.strictEqual(T.formatar('+55 71 98888-7777'), '(55) 71988-8877');
});

teste('formatar de novo não muda o resultado', () => {
  assert.strictEqual(T.formatar(T.formatar('71988887777')), '(71) 98888-7777');
  assert.strictEqual(T.formatar(T.formatar('7133334444')), '(71) 3333-4444');
});

console.log('\n' + ok + ' testes ok');
