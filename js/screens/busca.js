// Tela inicial: busca do colaborador pelo nome.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.busca = (function () {
  const { esc, atrasar } = SPX.util;
  const MINIMO_LETRAS = 2;

  // Guarda o último termo (só na memória da página) para a busca voltar como estava
  // quando a pessoa abre uma ficha e retorna.
  let ultimoTermo = '';

  function itemResultado(c) {
    const lider = c.lider ? 'Líder: ' + c.lider : 'Sem líder informado';
    const turno = c.turno ? 'Turno ' + c.turno : 'Sem turno';
    return '<li>' +
      '<a class="resultado" href="#/ficha/' + c.id_colaborador + '">' +
        '<span class="resultado-nome">' + esc(c.nome) + '</span>' +
        '<span class="resultado-info">' + esc(turno) + ' · ' + esc(lider) + '</span>' +
      '</a></li>';
  }

  function abrir(raiz) {
    raiz.innerHTML =
      '<section class="tela-busca">' +
        '<form id="busca-form" role="search" autocomplete="off">' +
          '<label class="campo-rotulo" for="busca-termo">Buscar colaborador</label>' +
          '<input id="busca-termo" class="campo" type="search" name="termo" ' +
            'placeholder="Digite o nome" autocapitalize="words" spellcheck="false">' +
        '</form>' +
        '<p id="busca-dica" class="dica" aria-live="polite"></p>' +
        '<ul id="busca-lista" class="lista-resultados"></ul>' +
      '</section>';

    const form = raiz.querySelector('#busca-form');
    const campo = raiz.querySelector('#busca-termo');
    const dica = raiz.querySelector('#busca-dica');
    const lista = raiz.querySelector('#busca-lista');
    let pedido = 0; // descarta respostas antigas se a pessoa continuou digitando

    function mostrar(achados, termo) {
      lista.innerHTML = achados.map(itemResultado).join('');
      if (!achados.length) dica.textContent = 'Nenhum colaborador encontrado para “' + termo + '”.';
      else dica.textContent = achados.length === 1 ? '1 resultado' : achados.length + ' resultados';
    }

    function buscar() {
      const termo = campo.value.trim();
      ultimoTermo = campo.value;
      const numero = ++pedido;

      if (termo.length < MINIMO_LETRAS) {
        lista.innerHTML = '';
        dica.textContent = 'Digite pelo menos ' + MINIMO_LETRAS + ' letras.';
        return;
      }

      SPX.data.buscar(termo)
        .then(achados => { if (numero === pedido) mostrar(achados, termo); })
        .catch(erro => {
          if (numero !== pedido) return;
          lista.innerHTML = '';
          dica.textContent = 'Não foi possível buscar: ' + erro.message;
        });
    }

    campo.addEventListener('input', atrasar(buscar, 150));

    // Enter abre direto se só houver um resultado.
    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const unico = lista.querySelectorAll('a.resultado');
      if (unico.length === 1) location.hash = unico[0].getAttribute('href');
    });

    campo.value = ultimoTermo;
    buscar();
    campo.focus();
  }

  return abrir;
})();
