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

  return { mensagemErro, mensagemInfo, opcoes };
})();
