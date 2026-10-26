// Peças de interface reutilizáveis pelas telas.
window.SPX = window.SPX || {};

SPX.ui = (function () {
  const { esc } = SPX.util;

  function mensagemErro(texto) {
    return '<p class="status erro" role="alert">' + esc(texto) + '</p>';
  }

  function mensagemInfo(texto) {
    return '<p class="status">' + esc(texto) + '</p>';
  }

  // Opções de um <select>. Cada item é um texto ou { valor, texto }.
  // textoVazio cria a primeira opção (valor vazio), por exemplo "Todos".
  function opcoes(itens, selecionado, textoVazio) {
    const vazio = textoVazio == null ? '' : '<option value="">' + esc(textoVazio) + '</option>';
    return vazio + itens.map(function (item) {
      const opcao = typeof item === 'string' ? { valor: item, texto: item } : item;
      const marcada = String(opcao.valor) === String(selecionado) ? ' selected' : '';
      return '<option value="' + esc(opcao.valor) + '"' + marcada + '>' + esc(opcao.texto) + '</option>';
    }).join('');
  }

  // Atalhos de emergência: ligar para o SAMU, Bombeiros e Polícia e achar hospital ou UPA perto
  // (abre o mapa do aparelho já procurando perto de onde a pessoa está; nenhum dado é enviado).
  function atalhosEmergencia() {
    const mapa = 'https://www.google.com/maps/search/';
    return '<section class="bloco emergencia" aria-label="Atalhos de emergência">' +
      '<h3>Emergência</h3>' +
      '<div class="emergencia-grade">' +
        '<a class="botao botao-secundario" href="tel:192">SAMU 192</a>' +
        '<a class="botao botao-secundario" href="tel:193">Bombeiros 193</a>' +
        '<a class="botao botao-secundario" href="tel:190">Polícia 190</a>' +
        '<a class="botao botao-secundario" href="' + mapa + 'hospital+pronto+socorro+perto+de+mim" target="_blank" rel="noopener noreferrer">Hospital mais perto</a>' +
        '<a class="botao botao-secundario" href="' + mapa + 'UPA+24+horas+perto+de+mim" target="_blank" rel="noopener noreferrer">UPA mais perto</a>' +
      '</div>' +
    '</section>';
  }

  return { mensagemErro, mensagemInfo, opcoes, atalhosEmergencia };
})();
