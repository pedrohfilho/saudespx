// Aba Colaboradores: todos os cadastrados, em ordem alfabética, com o total e filtro por nome,
// turno e líder. Mostra só nome, turno e líder (nada de saúde nem CPF).
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.colaboradores = (function () {
  const { esc, normalizar } = SPX.util;
  const { opcoes } = SPX.ui;

  function itemLista(c) {
    const turno = c.turno ? 'Turno ' + c.turno : 'Sem turno';
    const lider = c.lider ? 'Líder: ' + c.lider : 'Sem líder informado';
    return '<li><a class="resultado" href="#/ficha/' + c.id_colaborador + '">' +
      '<span class="resultado-nome">' + esc(c.nome) + '</span>' +
      '<span class="resultado-info">' + esc(turno) + ' · ' + esc(lider) + '</span>' +
    '</a></li>';
  }

  // Monta a lista agrupada pela primeira letra (A, B, C...), já na ordem que veio do banco.
  function listaAgrupada(lista) {
    let atual = '';
    return lista.map(function (c) {
      const inicial = (normalizar(c.nome).charAt(0) || '#').toUpperCase();
      const cabecalho = inicial !== atual ? '<li class="letra" aria-hidden="true">' + esc(inicial) + '</li>' : '';
      atual = inicial;
      return cabecalho + itemLista(c);
    }).join('');
  }

  function textoTotal(n) {
    if (n === 0) return 'Nenhum colaborador cadastrado ainda.';
    return n === 1 ? '1 colaborador cadastrado' : n + ' colaboradores cadastrados';
  }

  function desenhar(raiz, todos) {
    const lideres = Array.from(new Set(todos.map(c => c.lider).filter(Boolean)))
      .sort((a, b) => normalizar(a).localeCompare(normalizar(b), 'pt-BR'));

    raiz.innerHTML =
      '<section class="tela-colaboradores">' +
        '<h2>Colaboradores</h2>' +
        '<p id="colab-total" class="colab-total">' + esc(textoTotal(todos.length)) + '</p>' +
        '<form id="colab-filtros" class="colab-filtros" autocomplete="off" onsubmit="return false">' +
          '<div><label class="campo-rotulo" for="colab-nome">Filtrar pelo nome</label>' +
            '<input id="colab-nome" class="campo" type="search" placeholder="Digite parte do nome"></div>' +
          '<div><label class="campo-rotulo" for="colab-turno">Turno</label>' +
            '<select id="colab-turno" class="campo">' + opcoes(SPX.regras.TURNOS, '', 'Todos') + '</select></div>' +
          '<div><label class="campo-rotulo" for="colab-lider">Líder</label>' +
            '<select id="colab-lider" class="campo">' + opcoes(lideres, '', 'Todos') + '</select></div>' +
        '</form>' +
        '<p id="colab-dica" class="dica" aria-live="polite"></p>' +
        '<ul id="colab-lista" class="colab-lista"></ul>' +
      '</section>';

    const campoNome = raiz.querySelector('#colab-nome');
    const campoTurno = raiz.querySelector('#colab-turno');
    const campoLider = raiz.querySelector('#colab-lider');
    const dica = raiz.querySelector('#colab-dica');
    const lista = raiz.querySelector('#colab-lista');

    function filtrar() {
      const nome = normalizar(campoNome.value);
      const turno = campoTurno.value;
      const lider = campoLider.value;
      const achados = todos.filter(c =>
        (!nome || normalizar(c.nome).indexOf(nome) >= 0) &&
        (!turno || c.turno === turno) &&
        (!lider || c.lider === lider)
      );
      lista.innerHTML = listaAgrupada(achados);
      const filtrando = nome || turno || lider;
      if (!todos.length) dica.textContent = '';
      else if (!achados.length) dica.textContent = 'Nenhum colaborador com esse filtro.';
      else if (filtrando) dica.textContent = 'Mostrando ' + achados.length + ' de ' + todos.length + '.';
      else dica.textContent = '';
    }

    raiz.querySelector('#colab-filtros').addEventListener('input', filtrar);
    raiz.querySelector('#colab-filtros').addEventListener('change', filtrar);
    filtrar();
  }

  function abrir(raiz) {
    raiz.innerHTML = SPX.ui.mensagemInfo('Carregando colaboradores…');
    SPX.data.listarColaboradores()
      .then(todos => desenhar(raiz, todos))
      .catch(erro => { raiz.innerHTML = SPX.ui.mensagemErro(erro.message); });
  }

  return abrir;
})();
