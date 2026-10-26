// Chamada às funções do banco (RPC) com tratamento de erro padrão.
// Erros viram Error com mensagem pronta para mostrar na tela.
window.SPX = window.SPX || {};

SPX.rpc = (function () {
  function traduzir(erro) {
    if (!erro) return 'Erro desconhecido.';
    if (erro.code === '42501') return 'Sem permissão para esta ação.';
    return erro.message || 'Erro desconhecido.';
  }

  return function (nome, args) {
    return SPX.db.rpc(nome, args || {}).then(
      function (resposta) {
        if (resposta.error) throw new Error(traduzir(resposta.error));
        return resposta.data;
      },
      function () { throw new Error('Não foi possível falar com o servidor. Confira a internet.'); }
    );
  };
})();
