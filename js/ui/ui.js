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

  return { mensagemErro, mensagemInfo };
})();
