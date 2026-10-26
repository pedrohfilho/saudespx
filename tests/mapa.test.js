// Testes dos links do mapa. Rodar: node tests/mapa.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
eval(fs.readFileSync(path.join(__dirname, '../js/core/mapa.js'), 'utf8'));

const M = SPX.mapa;
let ok = 0;
function teste(nome, fn) {
  try { fn(); console.log('ok  ' + nome); ok++; } catch (e) { console.log('FALHOU  ' + nome + '\n   ' + e.message); process.exitCode = 1; }
}

teste('busca por lugar escrito: codifica acento, espaço e vírgula', () => {
  const url = M.porLugar('hospital', 'Pirajá, Salvador - BA');
  assert.strictEqual(url, 'https://www.google.com/maps/search/?api=1&query=hospital%20perto%20de%20Piraj%C3%A1%2C%20Salvador%20-%20BA');
  const u = new URL(url);
  assert.strictEqual(u.searchParams.get('query'), 'hospital perto de Pirajá, Salvador - BA');
});

teste('o lugar digitado não consegue sair do parâmetro da busca', () => {
  const url = M.porLugar('UPA', 'Brotas&x=1#fim');
  assert.strictEqual(new URL(url).searchParams.get('query'), 'UPA perto de Brotas&x=1#fim');
  assert.strictEqual(new URL(url).searchParams.get('x'), null);
});

teste('busca por posição: centraliza o mapa nas coordenadas', () => {
  assert.strictEqual(M.porCoordenadas('hospital', -12.9777, -38.5016), 'https://www.google.com/maps/search/hospital/@-12.977700,-38.501600,14z');
  assert.strictEqual(M.porCoordenadas('UPA 24 horas', '-12.9', '-38.4'), 'https://www.google.com/maps/search/UPA%2024%20horas/@-12.900000,-38.400000,14z');
});

teste('posição inválida não gera link', () => {
  assert.strictEqual(M.porCoordenadas('hospital', 'abc', 1), '');
  assert.strictEqual(M.porCoordenadas('hospital', NaN, NaN), '');
});

console.log('\n' + ok + ' testes ok');
