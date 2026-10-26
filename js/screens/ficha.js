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

  // O CPF aparece com o começo e o fim escondidos; só mostra inteiro quando a pessoa pede.
  function blocoCpf(colaborador) {
    if (!colaborador.cpf) {
      return '<section class="bloco"><h3>CPF</h3><p class="dica">Não informado.</p></section>';
    }
    // O CPF inteiro não vai para o HTML: fica só na memória do código (ver ligarBotoes).
    // Copiar o CPF é só para o responsável; os demais podem apenas ver.
    const mascara = SPX.cpf.mascarar(colaborador.cpf);
    const botaoCopiar = SPX.pode('responsavel')
      ? '<button class="botao botao-secundario" type="button" data-cpf-copiar>Copiar</button>'
      : '';
    return '<section class="bloco">' +
      '<h3>CPF</h3>' +
      '<div class="contato">' +
        '<span id="cpf-valor" class="cpf-valor">' + esc(mascara) + '</span>' +
        '<div class="contato-acoes">' +
          '<button class="botao botao-secundario" type="button" data-cpf-alternar aria-pressed="false">Mostrar</button>' +
          botaoCopiar +
        '</div>' +
      '</div>' +
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
          '<div class="ficha-acoes">' +
            (SPX.pode('edicao')
              ? '<a class="ficha-editar" href="#/editar/' + colaborador.id_colaborador + '">Editar dados</a>'
              : '') +
            (SPX.pode('responsavel')
              ? '<button class="ficha-excluir" type="button" data-excluir>Excluir colaborador</button>'
              : '') +
          '</div>' +
          '<div id="ficha-retorno" aria-live="polite"></div>' +
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
        blocoCpf(colaborador) +
        blocoContatos(contatos) +
        '<div id="ficha-atendimento"></div>' +
      '</article>';

    ligarBotoes(raiz, colaborador, colaborador.cpf ? SPX.cpf.formatar(colaborador.cpf) : '');
    SPX.screens.atendimento(raiz.querySelector('#ficha-atendimento'), colaborador.id_colaborador);
  }

  // Botões da ficha: "Copiar" (avisa no próprio botão por um instante), "Mostrar/Ocultar" do CPF
  // e "Excluir colaborador" (só para responsável, com confirmação).
  // cpfCompleto (já formatado) fica só aqui, na memória, e não no HTML da página.
  function ligarBotoes(raiz, colaborador, cpfCompleto) {
    const ficha = raiz.querySelector('.ficha');
    const mascara = cpfCompleto ? SPX.cpf.mascarar(cpfCompleto) : '';

    function copiar(botao, texto) {
      const original = botao.textContent;
      copiarTexto(texto).then(function (copiou) {
        botao.textContent = copiou ? 'Copiado!' : 'Não copiou';
        setTimeout(function () { botao.textContent = original; }, 1600);
      });
    }

    ficha.addEventListener('click', function (evento) {
      const excluir = evento.target.closest('[data-excluir]');
      if (excluir) {
        if (!confirm('Apagar ' + colaborador.nome + ' e todo o histórico dele? Isso não tem volta.')) return;
        excluir.disabled = true;
        SPX.data.excluirColaborador(colaborador.id_colaborador)
          .then(function () { location.hash = '#/'; })
          .catch(function (erro) {
            excluir.disabled = false;
            ficha.querySelector('#ficha-retorno').innerHTML = SPX.ui.mensagemErro(erro.message);
          });
        return;
      }

      const alternar = evento.target.closest('[data-cpf-alternar]');
      if (alternar) {
        const valor = ficha.querySelector('#cpf-valor');
        const mostrando = alternar.getAttribute('aria-pressed') === 'true';
        valor.textContent = mostrando ? mascara : cpfCompleto;
        alternar.textContent = mostrando ? 'Mostrar' : 'Ocultar';
        alternar.setAttribute('aria-pressed', String(!mostrando));
        return;
      }

      const copiarCpf = evento.target.closest('[data-cpf-copiar]');
      if (copiarCpf && SPX.pode('responsavel')) return copiar(copiarCpf, cpfCompleto);

      const copiarNumero = evento.target.closest('[data-copiar]');
      if (copiarNumero) copiar(copiarNumero, copiarNumero.dataset.copiar);
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
