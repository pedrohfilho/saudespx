// Ficha do colaborador: dados de saúde e contatos de emergência.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.ficha = (function () {
  const { esc, telefoneParaLink, telefoneParaWhatsApp, copiarTexto } = SPX.util;

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
    const itens = contatos.map(function (c) {
      const zap = telefoneParaWhatsApp(c.telefone);
      const botaoZap = zap
        ? '<a class="botao botao-secundario" href="https://wa.me/' + zap + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>'
        : '';
      return '<li class="contato">' +
        '<div class="contato-dados">' +
          '<span class="contato-nome">' + esc(c.nome) + '</span>' +
          '<span class="contato-telefone">' + esc(c.telefone) + '</span>' +
        '</div>' +
        '<div class="contato-acoes">' +
          '<a class="botao botao-secundario" href="tel:' + esc(telefoneParaLink(c.telefone)) + '">Ligar</a>' +
          botaoZap +
          '<button class="botao botao-secundario" type="button" data-copiar="' + esc(c.telefone) + '">Copiar</button>' +
        '</div>' +
      '</li>';
    }).join('');
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
          (SPX.pode('edicao')
            ? '<a class="ficha-editar" href="#/editar/' + colaborador.id_colaborador + '">Editar dados</a>'
            : '') +
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

    ligarBotoesDeCopiar(raiz);
    SPX.screens.atendimento(raiz.querySelector('#ficha-atendimento'), colaborador.id_colaborador);
  }

  // Botão "Copiar": copia o número e avisa no próprio botão por um instante.
  function ligarBotoesDeCopiar(raiz) {
    const lista = raiz.querySelector('.contatos');
    if (!lista) return;
    lista.addEventListener('click', function (evento) {
      const botao = evento.target.closest('[data-copiar]');
      if (!botao) return;
      const original = botao.textContent;
      copiarTexto(botao.dataset.copiar).then(function (copiou) {
        botao.textContent = copiou ? 'Copiado!' : 'Não copiou';
        setTimeout(function () { botao.textContent = original; }, 1600);
      });
    });
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
