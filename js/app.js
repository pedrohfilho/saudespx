// Ponto de entrada: escolhe a tela pelo endereço (#/...) e desenha na área principal.
window.SPX = window.SPX || {};

(function () {
  // Cada rota: nome (para marcar o menu), padrão do endereço e a tela que abre.
  const ROTAS = [
    { nome: 'busca', padrao: /^\/?$/, abrir: (raiz) => SPX.screens.busca(raiz) }
  ];

  function rotaAtual() {
    const caminho = location.hash.replace(/^#/, '');
    for (const rota of ROTAS) {
      const achou = caminho.match(rota.padrao);
      if (achou) return { rota, params: achou.slice(1) };
    }
    return { rota: ROTAS[0], params: [] };
  }

  function marcarMenu(nome) {
    document.querySelectorAll('[data-rota]').forEach(function (link) {
      if (link.dataset.rota === nome) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function abrirTela() {
    const raiz = document.getElementById('app');
    const { rota, params } = rotaAtual();
    marcarMenu(rota.nome);
    raiz.innerHTML = '';
    rota.abrir(raiz, ...params);
    window.scrollTo(0, 0);
  }

  function iniciar() {
    // O aviso de teste só aparece enquanto os dados forem os locais.
    document.getElementById('aviso-teste').classList.toggle('oculto', SPX.data !== SPX.dataLocal);
    window.addEventListener('hashchange', abrirTela);
    abrirTela();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
