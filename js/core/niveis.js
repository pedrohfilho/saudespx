// Níveis de acesso: leitura < edição < responsável.
// A regra de verdade fica no banco; aqui é só para decidir o que mostrar na tela.
window.SPX = window.SPX || {};

SPX.niveis = (function () {
  const ORDEM = ['leitura', 'edicao', 'responsavel'];

  const ROTULOS = {
    leitura: 'Leitura',
    edicao: 'Edição',
    responsavel: 'Responsável'
  };

  const DESCRICOES = {
    leitura: 'Busca, vê a ficha e registra atendimento.',
    edicao: 'Também cadastra e edita colaboradores.',
    responsavel: 'Também gerencia quem tem acesso.'
  };

  // true se o nível atual alcança o mínimo exigido. Sem nível (null) nunca alcança.
  function pode(atual, minimo) {
    const a = ORDEM.indexOf(atual);
    const m = ORDEM.indexOf(minimo);
    return a >= 0 && m >= 0 && a >= m;
  }

  function valido(nivel) {
    return ORDEM.indexOf(nivel) >= 0;
  }

  return { ORDEM, ROTULOS, DESCRICOES, pode, valido };
})();
