// Crédito animado: café quente que troca para "Desenvolvido por <nome>". Sem dependências.
//
// Uso (depois de carregar credito.css e este arquivo):
//   Credito.montar({ nome: 'Fulano de Tal', url: 'https://www.linkedin.com/in/...' });
//
// Opções:
//   nome    texto depois de "Desenvolvido por"        (obrigatório)
//   url     endereço aberto ao tocar                  (obrigatório)
//   texto   início da frase                           (padrão: "Desenvolvido por")
//   rotulo  texto lido por leitor de tela             (padrão: "<texto> <nome> (abre em outra aba)")
(function (global) {
  const SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path class="credito-vapor" d="M8.5 7.5c-.9-1 .9-2 0-3.2"/>' +
      '<path class="credito-vapor" d="M12 7.5c-.9-1 .9-2 0-3.2"/>' +
      '<path class="credito-vapor" d="M15.5 7.5c-.9-1 .9-2 0-3.2"/>' +
      '<path class="credito-xicara" d="M5 10h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/>' +
      '<path stroke="currentColor" d="M16 11.5h1.2a2.3 2.3 0 0 1 0 4.6H16"/>' +
      '<path stroke="currentColor" d="M4 21.5h13"/>' +
    '</svg>';

  function montar(opcoes) {
    const o = opcoes || {};
    if (!o.nome || !o.url) throw new Error('Credito.montar: informe "nome" e "url".');
    const texto = o.texto || 'Desenvolvido por';

    const link = document.createElement('a');
    link.className = 'credito';
    link.href = o.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', o.rotulo || (texto + ' ' + o.nome + ' (abre em outra aba)'));

    const cafe = document.createElement('span');
    cafe.className = 'credito-cafe';
    cafe.setAttribute('aria-hidden', 'true');
    cafe.innerHTML = SVG; // conteúdo fixo, sem texto de fora

    const frase = document.createElement('span');
    frase.className = 'credito-texto';
    frase.textContent = texto + ' ' + o.nome; // textContent: nunca interpreta HTML

    link.appendChild(cafe);
    link.appendChild(frase);
    document.body.appendChild(link);
    return link;
  }

  global.Credito = { montar: montar };
})(window);
