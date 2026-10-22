// Painel de atendimento dentro da ficha: formulário de registro e histórico.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.atendimento = (function () {
  const { esc, formatarDataHora } = SPX.util;

  function itemHistorico(a) {
    const observacao = a.observacao
      ? '<p class="historico-obs">' + esc(a.observacao) + '</p>'
      : '';
    return '<li class="historico-item">' +
      '<span class="historico-data">' + esc(formatarDataHora(a.data_hora)) + '</span>' +
      '<span class="historico-quem">Levado por ' + esc(a.levado_por) + '</span>' +
      observacao +
    '</li>';
  }

  function abrir(raiz, idColaborador) {
    raiz.innerHTML =
      '<section class="bloco">' +
        '<h3>Registrar atendimento</h3>' +
        '<form id="atend-form" novalidate>' +
          '<div class="campo-grupo">' +
            '<label class="campo-rotulo" for="atend-quem">Quem está levando ao atendimento</label>' +
            '<input id="atend-quem" class="campo" name="levado_por" autocomplete="off" ' +
              'placeholder="Nome do brigadista ou cipista">' +
          '</div>' +
          '<div class="campo-grupo">' +
            '<label class="campo-rotulo" for="atend-obs">Observação (o que houve)</label>' +
            '<textarea id="atend-obs" class="campo" name="observacao" rows="3" ' +
              'maxlength="' + SPX.regras.LIMITE_OBSERVACAO + '"></textarea>' +
          '</div>' +
          '<div id="atend-retorno" aria-live="polite"></div>' +
          '<button class="botao" type="submit">Registrar atendimento</button>' +
        '</form>' +
      '</section>' +
      '<section class="bloco">' +
        '<h3>Histórico de atendimentos</h3>' +
        '<ul id="atend-lista" class="historico"></ul>' +
      '</section>';

    const form = raiz.querySelector('#atend-form');
    const retorno = raiz.querySelector('#atend-retorno');
    const lista = raiz.querySelector('#atend-lista');
    const botao = form.querySelector('button');

    function carregarHistorico() {
      return SPX.data.listarAtendimentos(idColaborador).then(atendimentos => {
        lista.innerHTML = atendimentos.length
          ? atendimentos.map(itemHistorico).join('')
          : '<li class="dica">Nenhum atendimento registrado.</li>';
      });
    }

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      botao.disabled = true;
      retorno.innerHTML = '';

      SPX.data.registrarAtendimento({
        id_colaborador: idColaborador,
        levado_por: form.levado_por.value,
        observacao: form.observacao.value
      })
        .then(() => {
          form.reset();
          retorno.innerHTML = '<p class="status ok" role="status">Atendimento registrado.</p>';
          return carregarHistorico();
        })
        .catch(erro => { retorno.innerHTML = SPX.ui.mensagemErro(erro.message); })
        .then(() => { botao.disabled = false; });
    });

    carregarHistorico().catch(erro => {
      lista.innerHTML = '<li>' + SPX.ui.mensagemErro(erro.message) + '</li>';
    });
  }

  return abrir;
})();
