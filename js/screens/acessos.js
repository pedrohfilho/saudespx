// Tela dos responsáveis: aprovar pedidos e gerenciar quem tem acesso (nível de cada pessoa).
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.acessos = (function () {
  const { esc, formatarDataHora } = SPX.util;
  const { opcoes } = SPX.ui;
  const N = SPX.niveis;
  const NIVEIS = N.ORDEM.map(function (n) { return { valor: n, texto: N.ROTULOS[n] }; });

  function itemPedido(p) {
    return '<li class="acesso-item" data-pedido="' + p.id + '">' +
      '<div class="acesso-quem">' +
        '<span class="acesso-nome">' + esc(p.nome || p.email) + '</span>' +
        (p.nome ? '<span class="acesso-email">' + esc(p.email) + '</span>' : '') +
        '<span class="acesso-data">Pedido em ' + esc(formatarDataHora(p.criado_em)) + '</span>' +
      '</div>' +
      '<div class="acesso-acoes">' +
        '<select class="campo" data-nivel aria-label="Nível para ' + esc(p.email) + '">' + opcoes(NIVEIS, 'leitura') + '</select>' +
        '<button class="botao" type="button" data-aprovar>Aprovar</button>' +
        '<button class="botao botao-secundario" type="button" data-negar>Negar</button>' +
      '</div>' +
    '</li>';
  }

  // Conta fixa (protegida): não tem botão de remover e o nível só pode subir, nunca descer.
  function itemAcesso(a, eu) {
    const niveisPermitidos = a.protegido ? NIVEIS.filter(function (n) { return N.pode(n.valor, a.nivel); }) : NIVEIS;
    return '<li class="acesso-item" data-email="' + esc(a.email) + '">' +
      '<div class="acesso-quem">' +
        '<span class="acesso-nome">' + esc(a.nome || a.email) +
          (a.email === eu ? ' <span class="selo-voce">você</span>' : '') +
          (a.protegido ? ' <span class="selo-fixo" title="Conta fixa: não pode ser removida nem ter o nível reduzido">fixa</span>' : '') +
        '</span>' +
        (a.nome ? '<span class="acesso-email">' + esc(a.email) + '</span>' : '') +
      '</div>' +
      '<div class="acesso-acoes">' +
        '<select class="campo" data-trocar aria-label="Nível de ' + esc(a.email) + '">' + opcoes(niveisPermitidos, a.nivel) + '</select>' +
        (a.protegido ? '' : '<button class="botao botao-secundario" type="button" data-remover>Remover</button>') +
      '</div>' +
    '</li>';
  }

  function abrir(raiz) {
    raiz.innerHTML =
      '<section class="tela-acessos">' +
        '<h2>Acessos</h2>' +
        '<p class="dica">' + NIVEIS.map(function (n) { return '<strong>' + esc(n.texto) + ':</strong> ' + esc(N.DESCRICOES[n.valor]); }).join(' ') + '</p>' +
        '<div id="acessos-retorno" aria-live="polite"></div>' +
        '<section class="bloco"><h3>Pedidos de acesso</h3><ul id="acessos-pedidos" class="acesso-lista"></ul></section>' +
        '<section class="bloco"><h3>Quem tem acesso</h3><ul id="acessos-lista" class="acesso-lista"></ul></section>' +
        '<section class="bloco">' +
          '<h3>Adicionar uma pessoa</h3>' +
          '<form id="acessos-novo" novalidate>' +
            '<div class="campo-grupo"><label class="campo-rotulo" for="novo-email">E-mail da conta Google</label>' +
              '<input id="novo-email" class="campo" type="email" name="email" autocomplete="off"></div>' +
            '<div class="campo-grupo"><label class="campo-rotulo" for="novo-nome">Nome (opcional)</label>' +
              '<input id="novo-nome" class="campo" name="nome" autocomplete="off"></div>' +
            '<div class="campo-grupo"><label class="campo-rotulo" for="novo-nivel">Nível</label>' +
              '<select id="novo-nivel" class="campo" name="nivel">' + opcoes(NIVEIS, 'leitura') + '</select></div>' +
            '<button class="botao botao-largo" type="submit">Adicionar</button>' +
          '</form>' +
        '</section>' +
      '</section>';

    const tela = raiz.querySelector('.tela-acessos');
    const retorno = tela.querySelector('#acessos-retorno');
    const listaPedidos = tela.querySelector('#acessos-pedidos');
    const listaAcessos = tela.querySelector('#acessos-lista');
    const eu = SPX.sessao.email;

    function avisar(html) { retorno.innerHTML = html; }
    function erro(e) { avisar(SPX.ui.mensagemErro(e.message)); }

    function carregar() {
      return Promise.all([SPX.acesso.listarPedidos(), SPX.acesso.listarAcessos()]).then(function (r) {
        listaPedidos.innerHTML = r[0].length ? r[0].map(itemPedido).join('') : '<li class="dica">Nenhum pedido esperando.</li>';
        listaAcessos.innerHTML = r[1].map(function (a) { return itemAcesso(a, eu); }).join('');
        SPX.app.atualizarPedidos();
      }).catch(erro);
    }

    // Se a pessoa mudou o próprio nível ou saiu da lista, o app precisa reler o acesso.
    function aposMudarEu(email) {
      if (email === eu) location.reload();
    }

    tela.addEventListener('click', function (evento) {
      const linha = evento.target.closest('.acesso-item');
      if (!linha) return;

      if (evento.target.closest('[data-aprovar]')) {
        const nivel = linha.querySelector('[data-nivel]').value;
        SPX.acesso.responderPedido(Number(linha.dataset.pedido), nivel)
          .then(function () { avisar(SPX.ui.mensagemInfo('Acesso liberado.')); return carregar(); })
          .catch(erro);
      } else if (evento.target.closest('[data-negar]')) {
        SPX.acesso.negarPedido(Number(linha.dataset.pedido))
          .then(function () { avisar(SPX.ui.mensagemInfo('Pedido negado.')); return carregar(); })
          .catch(erro);
      } else if (evento.target.closest('[data-remover]')) {
        const email = linha.dataset.email;
        if (!confirm('Tirar o acesso de ' + email + '?')) return;
        SPX.acesso.removerAcesso(email)
          .then(function () { aposMudarEu(email); avisar(SPX.ui.mensagemInfo('Acesso removido.')); return carregar(); })
          .catch(erro);
      }
    });

    tela.addEventListener('change', function (evento) {
      const seletor = evento.target.closest('[data-trocar]');
      if (!seletor) return;
      const email = seletor.closest('.acesso-item').dataset.email;
      SPX.acesso.definirAcesso(email, seletor.value)
        .then(function () { aposMudarEu(email); avisar(SPX.ui.mensagemInfo('Nível atualizado.')); return carregar(); })
        .catch(function (e) { erro(e); return carregar(); });
    });

    tela.querySelector('#acessos-novo').addEventListener('submit', function (evento) {
      evento.preventDefault();
      const f = evento.target;
      SPX.acesso.definirAcesso(f.elements.email.value, f.elements.nivel.value, f.elements.nome.value)
        .then(function () { f.reset(); avisar(SPX.ui.mensagemInfo('Pessoa adicionada.')); return carregar(); })
        .catch(erro);
    });

    carregar();
  }

  return abrir;
})();
