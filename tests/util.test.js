// Testes das funções de apoio. Rodar: node tests/util.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
eval(fs.readFileSync(path.join(__dirname, '../js/core/util.js'), 'utf8'));

const U = SPX.util;
let ok = 0;
function teste(nome, fn) {
  try { fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}

teste('número com DDD vira número do WhatsApp com 55', () => {
  assert.strictEqual(U.telefoneParaWhatsApp('(71) 98888-7777'), '5571988887777');
  assert.strictEqual(U.telefoneParaWhatsApp('71 3333-4444'), '557133334444');
  assert.strictEqual(U.telefoneParaWhatsApp('71988887777'), '5571988887777');
});

teste('número que já traz o 55 não é duplicado', () => {
  assert.strictEqual(U.telefoneParaWhatsApp('+55 71 98888-7777'), '5571988887777');
  assert.strictEqual(U.telefoneParaWhatsApp('557133334444'), '557133334444');
});

teste('número curto, vazio ou estranho não vira link do WhatsApp', () => {
  assert.strictEqual(U.telefoneParaWhatsApp('3333-4444'), null);
  assert.strictEqual(U.telefoneParaWhatsApp(''), null);
  assert.strictEqual(U.telefoneParaWhatsApp(null), null);
  assert.strictEqual(U.telefoneParaWhatsApp('1234567890123456'), null);
});

teste('link de ligação mantém só dígitos e o +', () => {
  assert.strictEqual(U.telefoneParaLink('(71) 98888-7777'), '71988887777');
  assert.strictEqual(U.telefoneParaLink('+55 (71) 98888-7777'), '+5571988887777');
});

teste('esc protege o HTML', () => {
  assert.strictEqual(U.esc('<b onclick="x">&\''), '&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;');
});

console.log('\n' + ok + ' testes ok');
