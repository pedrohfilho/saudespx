// Testes do CPF. Rodar: node tests/cpf.test.js
// Os CPFs abaixo são números de teste que passam na conta do dígito verificador (não são de pessoas).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
eval(fs.readFileSync(path.join(__dirname, '../js/core/cpf.js'), 'utf8'));

const C = SPX.cpf;
let ok = 0;
function teste(nome, fn) {
  try { fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}

teste('aceita CPF válido, com ou sem pontuação', () => {
  assert.ok(C.valido('529.982.247-25'));
  assert.ok(C.valido('52998224725'));
  assert.ok(C.valido(' 111.444.777-35 '));
  assert.ok(C.valido('123.456.789-09'));
});

teste('recusa dígito verificador errado', () => {
  assert.ok(!C.valido('529.982.247-24'));
  assert.ok(!C.valido('123.456.789-10'));
  assert.ok(!C.valido('111.444.777-34'));
});

teste('recusa tamanho errado, vazio e dígitos repetidos', () => {
  assert.ok(!C.valido(''));
  assert.ok(!C.valido(null));
  assert.ok(!C.valido('1234567890'));
  assert.ok(!C.valido('123456789012'));
  assert.ok(!C.valido('111.111.111-11'));
  assert.ok(!C.valido('00000000000'));
});

teste('formata enquanto digita', () => {
  assert.strictEqual(C.formatar('5'), '5');
  assert.strictEqual(C.formatar('5299'), '529.9');
  assert.strictEqual(C.formatar('529982'), '529.982');
  assert.strictEqual(C.formatar('5299822'), '529.982.2');
  assert.strictEqual(C.formatar('529982247'), '529.982.247');
  assert.strictEqual(C.formatar('5299822472'), '529.982.247-2');
  assert.strictEqual(C.formatar('52998224725'), '529.982.247-25');
  assert.strictEqual(C.formatar('529.982.247-25999'), '529.982.247-25');
  assert.strictEqual(C.formatar('abc'), '');
});

teste('máscara esconde o começo e o fim', () => {
  assert.strictEqual(C.mascarar('529.982.247-25'), '***.982.247-**');
  assert.strictEqual(C.mascarar('123'), '');
});

console.log('\n' + ok + ' testes ok');
