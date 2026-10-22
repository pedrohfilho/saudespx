// Cadastro e edição de colaborador (a mesma tela serve para os dois).
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.cadastro = (function () {
  const { esc } = SPX.util;
  const NOVO_LIDER = '__novo__';

  function opcoes(valores, selecionado, textoVazio) {
    const vazio = '<option value="">' + esc(textoVazio) + '</option>';
    return vazio + valores.map(v =>
      '<option value="' + esc(v) + '"' + (v === selecionado ? ' selected' : '') + '>' + esc(v) + '</option>'
    ).join('');
  }

  function opcoesLider(lideres, selecionado) {
    const itens = lideres.map(l =>
      '<option value="' + l.id_lider + '"' + (l.id_lider === selecionado ? ' selected' : '') + '>' +
        esc(l.nome) + (l.turno ? ' (' + esc(l.turno) + ')' : '') +
      '</option>'
    ).join('');
    return '<option value="">Sem líder</option>' + itens +
      '<option value="' + NOVO_LIDER + '">Cadastrar novo líder…</option>';
  }

  function linhaContato(contato) {
    const c = contato || { nome: '', telefone: '' };
    return '<div class="contato-linha">' +
      '<input class="campo" name="contato_nome" placeholder="Nome do contato" autocomplete="off" value="' + esc(c.nome) + '" aria-label="Nome do contato">' +
      '<input class="campo" name="contato_telefone" type="tel" inputmode="tel" placeholder="Telefone" autocomplete="off" value="' + esc(c.telefone) + '" aria-label="Telefone do contato">' +
      '<button class="botao botao-secundario" type="button" data-remover>Remover</button>' +
    '</div>';
  }

  function desenhar(raiz, lideres, ficha) {
    const edicao = !!ficha;
    const c = edicao ? ficha.colaborador : {
      nome: '', turno: '', tipo_sanguineo: '', alergia_remedio: false, alergia_qual: '', comorbidades: '', id_lider: null
    };
    const contatos = edicao && ficha.contatos.length ? ficha.contatos : [null, null];
    const voltar = edicao ? '#/ficha/' + c.id_colaborador : '#/';

    raiz.innerHTML =
      '<a class="voltar" href="' + voltar + '">← Cancelar</a>' +
      '<h2>' + (edicao ? 'Editar colaborador' : 'Novo colaborador') + '</h2>' +
      '<form id="cad-form" novalidate>' +
        '<section class="bloco">' +
          '<div class="campo-grupo">' +
            '<label class="campo-rotulo" for="cad-nome">Nome do colaborador</label>' +
            '<input id="cad-nome" class="campo" name="nome" autocomplete="off" value="' + esc(c.nome) + '">' +
          '</div>' +
          '<div class="form-linha">' +
            '<div class="campo-grupo">' +
              '<label class="campo-rotulo" for="cad-turno">Turno</label>' +
              '<select id="cad-turno" class="campo" name="turno">' + opcoes(SPX.regras.TURNOS, c.turno, 'Não informado') + '</select>' +
            '</div>' +
            '<div class="campo-grupo">' +
              '<label class="campo-rotulo" for="cad-sangue">Tipo sanguíneo</label>' +
              '<select id="cad-sangue" class="campo" name="tipo_sanguineo">' + opcoes(SPX.regras.TIPOS_SANGUINEOS, c.tipo_sanguineo, 'Não informado') + '</select>' +
            '</div>' +
          '</div>' +
          '<div class="campo-grupo">' +
            '<label class="campo-rotulo" for="cad-lider">Líder</label>' +
            '<select id="cad-lider" class="campo" name="id_lider">' + opcoesLider(lideres, c.id_lider) + '</select>' +
          '</div>' +
          '<div id="cad-novo-lider" class="form-linha oculto">' +
            '<div class="campo-grupo">' +
              '<label class="campo-rotulo" for="cad-lider-nome">Nome do novo líder</label>' +
              '<input id="cad-lider-nome" class="campo" name="lider_nome" autocomplete="off">' +
            '</div>' +
            '<div class="campo-grupo">' +
              '<label class="campo-rotulo" for="cad-lider-turno">Turno do líder</label>' +
              '<select id="cad-lider-turno" class="campo" name="lider_turno">' + opcoes(SPX.regras.TURNOS, '', 'Não informado') + '</select>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="bloco">' +
          '<h3>Saúde</h3>' +
          '<label class="campo-check">' +
            '<input type="checkbox" name="alergia_remedio"' + (c.alergia_remedio ? ' checked' : '') + '>' +
            '<span>Tem alergia a algum remédio</span>' +
          '</label>' +
          '<div id="cad-alergia" class="campo-grupo' + (c.alergia_remedio ? '' : ' oculto') + '">' +
            '<label class="campo-rotulo" for="cad-alergia-qual">Qual remédio?</label>' +
            '<input id="cad-alergia-qual" class="campo" name="alergia_qual" autocomplete="off" value="' + esc(c.alergia_qual) + '">' +
          '</div>' +
          '<div class="campo-grupo">' +
            '<label class="campo-rotulo" for="cad-comorbidades">Comorbidades</label>' +
            '<textarea id="cad-comorbidades" class="campo" name="comorbidades" rows="2">' + esc(c.comorbidades) + '</textarea>' +
          '</div>' +
        '</section>' +
        '<section class="bloco">' +
          '<h3>Contatos de emergência</h3>' +
          '<div id="cad-contatos">' + contatos.map(linhaContato).join('') + '</div>' +
          '<button id="cad-add-contato" class="botao botao-secundario" type="button">Adicionar contato</button>' +
        '</section>' +
        '<div id="cad-retorno" aria-live="polite"></div>' +
        '<button class="botao botao-largo" type="submit">' + (edicao ? 'Salvar alterações' : 'Cadastrar colaborador') + '</button>' +
      '</form>';

    ligar(raiz, ficha);
  }

  function ligar(raiz, ficha) {
    const form = raiz.querySelector('#cad-form');
    const retorno = raiz.querySelector('#cad-retorno');
    const botao = form.querySelector('button[type="submit"]');
    const listaContatos = raiz.querySelector('#cad-contatos');

    form.elements.id_lider.addEventListener('change', function () {
      raiz.querySelector('#cad-novo-lider').classList.toggle('oculto', this.value !== NOVO_LIDER);
    });

    form.elements.alergia_remedio.addEventListener('change', function () {
      raiz.querySelector('#cad-alergia').classList.toggle('oculto', !this.checked);
    });

    raiz.querySelector('#cad-add-contato').addEventListener('click', function () {
      listaContatos.insertAdjacentHTML('beforeend', linhaContato());
      listaContatos.lastElementChild.querySelector('input').focus();
    });

    listaContatos.addEventListener('click', function (evento) {
      const remover = evento.target.closest('[data-remover]');
      if (remover) remover.closest('.contato-linha').remove();
    });

    function lerContatos() {
      return Array.from(listaContatos.querySelectorAll('.contato-linha')).map(linha => ({
        nome: linha.querySelector('[name="contato_nome"]').value,
        telefone: linha.querySelector('[name="contato_telefone"]').value
      }));
    }

    // Se escolheu "novo líder", cadastra o líder antes e devolve o id dele.
    function resolverLider() {
      const escolhido = form.elements.id_lider.value;
      if (escolhido !== NOVO_LIDER) return Promise.resolve(escolhido);
      return SPX.data.cadastrarLider({
        nome: form.elements.lider_nome.value,
        turno: form.elements.lider_turno.value
      }).then(lider => lider.id_lider);
    }

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      botao.disabled = true;
      retorno.innerHTML = '';

      resolverLider()
        .then(idLider => {
          const dados = {
            nome: form.elements.nome.value,
            turno: form.elements.turno.value,
            tipo_sanguineo: form.elements.tipo_sanguineo.value,
            alergia_remedio: form.elements.alergia_remedio.checked,
            alergia_qual: form.elements.alergia_qual.value,
            comorbidades: form.elements.comorbidades.value,
            id_lider: idLider,
            contatos: lerContatos()
          };
          return ficha
            ? SPX.data.atualizarColaborador(ficha.colaborador.id_colaborador, dados)
            : SPX.data.cadastrarColaborador(dados);
        })
        .then(colaborador => { location.hash = '#/ficha/' + colaborador.id_colaborador; })
        .catch(erro => {
          retorno.innerHTML = SPX.ui.mensagemErro(erro.message);
          botao.disabled = false;
        });
    });

    form.elements.nome.focus();
  }

  function abrir(raiz, idColaborador) {
    raiz.innerHTML = SPX.ui.mensagemInfo('Carregando…');

    Promise.all([
      SPX.data.listarLideres(),
      idColaborador ? SPX.data.obterFicha(idColaborador) : Promise.resolve(null)
    ])
      .then(([lideres, ficha]) => desenhar(raiz, lideres, ficha))
      .catch(erro => {
        raiz.innerHTML =
          '<a class="voltar" href="#/">← Voltar à busca</a>' +
          SPX.ui.mensagemErro(erro.message);
      });
  }

  return abrir;
})();
