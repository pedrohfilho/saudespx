// Ponto de entrada: confere o login e o nível de acesso e escolhe a tela pelo endereço (#/...).
window.SPX = window.SPX || {};

(function () {
  // Cada rota: menu que fica marcado, padrão do endereço, nível mínimo e a tela que abre.
  const ROTAS = [
    { nome: 'busca', padrao: /^\/?$/, minimo: 'leitura', abrir: (raiz) => SPX.screens.busca(raiz) },
    { nome: 'busca', padrao: /^\/ficha\/(\d+)$/, minimo: 'leitura', abrir: (raiz, id) => SPX.screens.ficha(raiz, Number(id)) },
    { nome: 'novo', padrao: /^\/novo$/, minimo: 'edicao', abrir: (raiz) => SPX.screens.cadastro(raiz) },
    { nome: 'busca', padrao: /^\/editar\/(\d+)$/, minimo: 'edicao', abrir: (raiz, id) => SPX.screens.cadastro(raiz, Number(id)) },
    { nome: 'colaboradores', padrao: /^\/colaboradores$/, minimo: 'leitura', abrir: (raiz) => SPX.screens.colaboradores(raiz) },
    { nome: 'emergencia', padrao: /^\/emergencia$/, minimo: 'leitura', abrir: (raiz) => SPX.screens.emergencia(raiz) },
    { nome: 'acessos', padrao: /^\/acessos$/, minimo: 'responsavel', abrir: (raiz) => SPX.screens.acessos(raiz) }
  ];

  const porId = (id) => document.getElementById(id);

  // true se a pessoa logada alcança o nível mínimo. As telas usam para esconder o que não é dela.
  SPX.pode = function (minimo) {
    return !!SPX.sessao && SPX.niveis.pode(SPX.sessao.nivel, minimo);
  };

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
    if (!SPX.sessao || !SPX.sessao.nivel) return;
    const raiz = porId('app');
    const { rota, params } = rotaAtual();

    if (!SPX.pode(rota.minimo)) {
      marcarMenu('');
      raiz.innerHTML = '<a class="voltar" href="#/">← Voltar à busca</a>' +
        SPX.ui.mensagemErro('O seu nível de acesso não permite abrir esta página.');
      return;
    }

    marcarMenu(rota.nome);
    desenharAvisoDePedidos();
    raiz.innerHTML = '';
    rota.abrir(raiz, ...params);
    window.scrollTo(0, 0);
  }

  // Menu e dados da pessoa só aparecem depois de entrar com acesso.
  function mostrarTopo(sim) {
    porId('topo-nav').classList.toggle('oculto', !sim);
    porId('topo-usuario').classList.toggle('oculto', !sim);
    if (!sim) {
      pedidosEsperando = 0;
      desenharAvisoDePedidos();
      return;
    }
    porId('topo-email').textContent = SPX.sessao.email;
    document.querySelectorAll('[data-minimo]').forEach(function (link) {
      link.classList.toggle('oculto', !SPX.pode(link.dataset.minimo));
    });
    atualizarPedidos();
    vigiarPedidos();
  }

  // Pedidos de acesso esperando: só os responsáveis veem. Aparece no menu (número) e numa faixa
  // chamativa no topo, que some quando não há pedido ou quando a pessoa já está na tela de acessos.
  let pedidosEsperando = 0;

  function desenharAvisoDePedidos() {
    const selo = porId('selo-pedidos');
    const faixa = porId('aviso-pedidos');
    const vale = SPX.pode('responsavel') && pedidosEsperando > 0;
    selo.textContent = pedidosEsperando;
    selo.classList.toggle('oculto', !vale);
    const naTelaDeAcessos = rotaAtual().rota.nome === 'acessos';
    faixa.classList.toggle('oculto', !vale || naTelaDeAcessos);
    if (vale) {
      porId('aviso-pedidos-texto').textContent = pedidosEsperando === 1
        ? '1 pessoa pediu acesso e está esperando.'
        : pedidosEsperando + ' pessoas pediram acesso e estão esperando.';
    }
  }

  function atualizarPedidos() {
    if (!SPX.pode('responsavel')) { pedidosEsperando = 0; desenharAvisoDePedidos(); return Promise.resolve(); }
    return SPX.acesso.listarPedidos().then(function (pedidos) {
      pedidosEsperando = pedidos.length;
      desenharAvisoDePedidos();
    }).catch(function () { /* se falhar, mantém o que já estava na tela */ });
  }

  // Enquanto o app está aberto, olha de novo a cada minuto e quando a pessoa volta para a aba.
  let vigiando = false;
  function vigiarPedidos() {
    if (vigiando) return;
    vigiando = true;
    setInterval(function () { if (!document.hidden) atualizarPedidos(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizarPedidos(); });
  }

  function lerErroDoRetorno() {
    const p = new URLSearchParams(location.search);
    return p.get('error_description') || p.get('error') || '';
  }

  // Tira ?code=... e ?error=... do endereço, depois que o Supabase já usou.
  function limparEndereco() {
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }

  function mostrarFalha(erro) {
    mostrarTopo(false);
    porId('app').innerHTML =
      '<section class="bloco entrada">' +
        '<h2>Não foi possível entrar</h2>' +
        SPX.ui.mensagemErro(erro.message || String(erro)) +
        '<button id="tentar-de-novo" class="botao botao-largo" type="button">Tentar de novo</button>' +
      '</section>';
    porId('tentar-de-novo').addEventListener('click', entrar);
  }

  // Descobre quem é a pessoa e o que ela pode ver, e abre a tela certa.
  function entrar() {
    mostrarTopo(false);
    porId('app').innerHTML = SPX.ui.mensagemInfo('Entrando…');

    if (!SPX.db) {
      return mostrarFalha(new Error('Não foi possível carregar o login. Confira a internet e recarregue a página.'));
    }

    const erroDoRetorno = lerErroDoRetorno();
    return SPX.acesso.sessao().then(function (sessao) {
      limparEndereco();
      if (!sessao) {
        SPX.sessao = null;
        SPX.usuario = null;
        return SPX.screens.login(porId('app'), { erro: erroDoRetorno });
      }
      return SPX.acesso.meuAcesso().then(function (estado) {
        SPX.sessao = { email: estado.email, nivel: estado.nivel };
        SPX.usuario = { email: estado.email };
        if (!estado.nivel) return SPX.screens.pedido(porId('app'), estado, entrar);
        mostrarTopo(true);
        abrirTela();
      });
    }).catch(mostrarFalha);
  }

  function iniciar() {
    Credito.montar({ nome: 'Pedro Henrique', url: 'https://www.linkedin.com/in/pedro-henrique-211b70346' });
    SPX.app = { atualizarPedidos };
    porId('topo-sair').addEventListener('click', function () { SPX.acesso.sair(); });
    window.addEventListener('hashchange', abrirTela);
    if (SPX.db) SPX.acesso.aoSair(entrar);
    entrar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
