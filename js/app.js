// Ponto de entrada: escolhe a tela pelo endereço (#/...) e desenha na área principal.
window.SPX = window.SPX || {};

(function () {
  // Cada rota: nome (para marcar o menu), padrão do endereço e a tela que abre.
  const ROTAS = [
    { nome: 'busca', padrao: /^\/?$/, abrir: (raiz) => SPX.screens.busca(raiz) },
    { nome: 'busca', padrao: /^\/ficha\/(\d+)$/, abrir: (raiz, id) => SPX.screens.ficha(raiz, Number(id)) },
    { nome: 'novo', padrao: /^\/novo$/, abrir: (raiz) => SPX.screens.cadastro(raiz) },
    { nome: 'busca', padrao: /^\/editar\/(\d+)$/, abrir: (raiz, id) => SPX.screens.cadastro(raiz, Number(id)) }
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
    // O botão de restaurar só aparece enquanto os dados forem os locais.
    document.getElementById('rodape-teste').classList.toggle('oculto', SPX.data !== SPX.dataLocal);
    document.getElementById('restaurar-teste').addEventListener('click', function () {
      if (!confirm('Voltar aos dados de teste originais? O que foi cadastrado neste navegador será apagado.')) return;
      SPX.data.resetar().then(function () {
        location.hash = '#/';
        location.reload();
      });
    });
    window.addEventListener('hashchange', abrirTela);
    abrirTela();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
