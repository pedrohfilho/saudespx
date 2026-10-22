// Ficha do colaborador: dados de saúde e contatos de emergência.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.ficha = (function () {
  const { esc, telefoneParaLink } = SPX.util;

  function blocoAlergia(colaborador) {
    if (colaborador.alergia_remedio) {
      return '<section class="alerta" aria-label="Alergia a remédio">' +
        '<h3>Alergia a remédio</h3>' +
        '<p class="alerta-destaque">' + esc(colaborador.alergia_qual) + '</p>' +
      '</section>';
    }
    return '<section class="bloco">' +
      '<h3>Alergia a remédio</h3>' +
      '<p>Sem alergia informada.</p>' +
    '</section>';
  }

  function blocoContatos(contatos) {
    if (!contatos.length) {
      return '<section class="bloco">' +
        '<h3>Contatos de emergência</h3>' +
        '<p>Nenhum contato cadastrado.</p>' +
      '</section>';
    }
    const itens = contatos.map(c =>
      '<li class="contato">' +
        '<span class="contato-nome">' + esc(c.nome) + '</span>' +
        '<a class="botao botao-secundario" href="tel:' + esc(telefoneParaLink(c.telefone)) + '">' +
          esc(c.telefone) +
        '</a>' +
      '</li>'
    ).join('');
    return '<section class="bloco">' +
      '<h3>Contatos de emergência</h3>' +
      '<ul class="contatos">' + itens + '</ul>' +
    '</section>';
  }

  function desenhar(raiz, ficha) {
    const { colaborador, lider, contatos } = ficha;
    const turno = colaborador.turno ? 'Turno ' + colaborador.turno : 'Sem turno informado';
    const nomeLider = lider ? 'Líder: ' + lider.nome : 'Sem líder informado';

    raiz.innerHTML =
      '<a class="voltar" href="#/">← Voltar à busca</a>' +
      '<article class="ficha">' +
        '<header class="ficha-topo">' +
          '<h2>' + esc(colaborador.nome) + '</h2>' +
          '<p class="dica">' + esc(turno) + ' · ' + esc(nomeLider) + '</p>' +
          '<a class="ficha-editar" href="#/editar/' + colaborador.id_colaborador + '">Editar dados</a>' +
        '</header>' +
        '<div class="resumo">' +
          '<div class="resumo-item">' +
            '<span class="resumo-rotulo">Tipo sanguíneo</span>' +
            '<span class="resumo-valor">' + esc(colaborador.tipo_sanguineo || 'Não informado') + '</span>' +
          '</div>' +
        '</div>' +
        blocoAlergia(colaborador) +
        '<section class="bloco">' +
          '<h3>Comorbidades</h3>' +
          '<p>' + esc(colaborador.comorbidades || 'Nenhuma informada.') + '</p>' +
        '</section>' +
        blocoContatos(contatos) +
        '<div id="ficha-atendimento"></div>' +
      '</article>';

    SPX.screens.atendimento(raiz.querySelector('#ficha-atendimento'), colaborador.id_colaborador);
  }

  function abrir(raiz, idColaborador) {
    raiz.innerHTML = SPX.ui.mensagemInfo('Carregando ficha…');

    SPX.data.obterFicha(idColaborador)
      .then(ficha => desenhar(raiz, ficha))
      .catch(erro => {
        raiz.innerHTML =
          '<a class="voltar" href="#/">← Voltar à busca</a>' +
          SPX.ui.mensagemErro(erro.message);
      });
  }

  return abrir;
})();
