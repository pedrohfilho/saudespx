// Tela inicial: busca do colaborador pelo nome, com filtros.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.busca = (function () {
  const { esc, atrasar } = SPX.util;
  const { opcoes } = SPX.ui;
  const MINIMO_LETRAS = 2;
  const LIMITE_LISTA = 50;

  // Guarda a última busca (só na memória da página) para ela voltar como estava
  // quando a pessoa abre uma ficha e retorna.
  let ultima = { termo: '', filtros: {} };

  function itemResultado(c) {
    const lider = c.lider ? 'Líder: ' + c.lider : 'Sem líder informado';
    const turno = c.turno ? 'Turno ' + c.turno : 'Sem turno';
    return '<li>' +
      '<a class="resultado" href="#/ficha/' + c.id_colaborador + '">' +
        '<span class="resultado-nome">' + esc(c.nome) + '</span>' +
        '<span class="resultado-info">' + esc(turno) + ' · ' + esc(lider) + '</span>' +
      '</a></li>';
  }

  function campoFiltro(id, rotulo, nome, html) {
    return '<div class="campo-grupo">' +
      '<label class="campo-rotulo" for="' + id + '">' + rotulo + '</label>' +
      '<select id="' + id + '" class="campo" name="' + nome + '">' + html + '</select>' +
    '</div>';
  }

  function painelFiltros(lideres, f) {
    const listaLideres = [{ valor: 'sem', texto: 'Sem líder' }].concat(
      lideres.map(l => ({ valor: l.id_lider, texto: l.nome + (l.turno ? ' (' + l.turno + ')' : '') }))
    );
    const abertos = Object.keys(f).length > 0;
    return '<details id="busca-filtros" class="filtros"' + (abertos ? ' open' : '') + '>' +
      '<summary id="busca-filtros-resumo">Filtros</summary>' +
      '<div class="filtros-corpo">' +
        '<div class="filtros-grade">' +
          campoFiltro('f-turno', 'Turno', 'turno', opcoes(SPX.regras.TURNOS, f.turno, 'Todos')) +
          campoFiltro('f-lider', 'Líder', 'id_lider', opcoes(listaLideres, f.id_lider, 'Todos')) +
          campoFiltro('f-sangue', 'Tipo sanguíneo', 'tipo_sanguineo', opcoes(SPX.regras.TIPOS_SANGUINEOS, f.tipo_sanguineo, 'Todos')) +
          campoFiltro('f-alergia', 'Alergia a remédio', 'alergia', opcoes([
            { valor: 'sim', texto: 'Com alergia' }, { valor: 'nao', texto: 'Sem alergia informada' }
          ], f.alergia, 'Todos')) +
          campoFiltro('f-comorbidade', 'Comorbidades', 'comorbidade', opcoes([
            { valor: 'sim', texto: 'Com comorbidade' }, { valor: 'nao', texto: 'Sem comorbidade informada' }
          ], f.comorbidade, 'Todos')) +
        '</div>' +
        '<button id="filtros-limpar" class="botao botao-secundario" type="button">Limpar filtros</button>' +
      '</div>' +
    '</details>';
  }

  function desenhar(raiz, lideres) {
    raiz.innerHTML =
      '<section class="tela-busca">' +
        '<form id="busca-form" role="search" autocomplete="off">' +
          '<label class="campo-rotulo" for="busca-termo">Buscar colaborador</label>' +
          '<input id="busca-termo" class="campo" type="search" name="termo" ' +
            'placeholder="Digite o nome ou o CPF" autocapitalize="words" spellcheck="false">' +
          painelFiltros(lideres, ultima.filtros) +
        '</form>' +
        '<p id="busca-dica" class="dica" aria-live="polite"></p>' +
        '<ul id="busca-lista" class="lista-resultados"></ul>' +
      '</section>';

    const form = raiz.querySelector('#busca-form');
    const campo = raiz.querySelector('#busca-termo');
    const resumo = raiz.querySelector('#busca-filtros-resumo');
    const dica = raiz.querySelector('#busca-dica');
    const lista = raiz.querySelector('#busca-lista');
    let pedido = 0; // descarta respostas antigas se a pessoa continuou digitando

    function lerFiltros() {
      const e = form.elements;
      return SPX.regras.normalizarFiltros({
        turno: e.turno.value,
        id_lider: e.id_lider.value,
        tipo_sanguineo: e.tipo_sanguineo.value,
        alergia: e.alergia.value,
        comorbidade: e.comorbidade.value
      });
    }

    function textoNenhum(termo, filtros) {
      let texto = 'Nenhum colaborador encontrado';
      if (termo.length >= MINIMO_LETRAS) texto += ' para “' + termo + '”';
      if (Object.keys(filtros).length) texto += ' com os filtros escolhidos';
      return texto + '.';
    }

    function mostrar(achados, termo, filtros) {
      const total = achados.length;
      lista.innerHTML = achados.slice(0, LIMITE_LISTA).map(itemResultado).join('');
      // O banco marca como "parecido" o nome achado por semelhança (letra trocada ou faltando).
      const soParecidos = total > 0 && achados.every(a => a.parecido);
      if (!total) dica.textContent = textoNenhum(termo, filtros);
      else if (soParecidos) {
        dica.textContent = 'Nenhum nome igual a “' + termo + '”. Mostrando ' + (total === 1 ? '1 nome parecido' : total + ' nomes parecidos') + '.';
      } else if (total > LIMITE_LISTA) {
        dica.textContent = 'Mostrando ' + LIMITE_LISTA + ' de ' + total + '. Digite mais letras ou use os filtros para refinar.';
      } else dica.textContent = total === 1 ? '1 resultado' : total + ' resultados';
    }

    function buscar() {
      const termo = campo.value.trim();
      const filtros = lerFiltros();
      const quantosFiltros = Object.keys(filtros).length;
      ultima = { termo: campo.value, filtros };
      resumo.textContent = quantosFiltros ? 'Filtros (' + quantosFiltros + ')' : 'Filtros';
      const numero = ++pedido;

      if (termo.length < MINIMO_LETRAS && !quantosFiltros) {
        lista.innerHTML = '';
        dica.textContent = 'Digite pelo menos ' + MINIMO_LETRAS + ' letras ou escolha um filtro.';
        return;
      }

      SPX.data.buscar(termo, filtros)
        .then(achados => { if (numero === pedido) mostrar(achados, termo, filtros); })
        .catch(erro => {
          if (numero !== pedido) return;
          lista.innerHTML = '';
          dica.textContent = 'Não foi possível buscar: ' + erro.message;
        });
    }

    campo.addEventListener('input', atrasar(buscar, 150));
    form.addEventListener('change', function (evento) {
      if (evento.target !== campo) buscar();
    });

    raiz.querySelector('#filtros-limpar').addEventListener('click', function () {
      Array.from(form.querySelectorAll('select')).forEach(s => { s.value = ''; });
      buscar();
    });

    // Enter abre direto se só houver um resultado.
    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const unico = lista.querySelectorAll('a.resultado');
      if (unico.length === 1) location.hash = unico[0].getAttribute('href');
    });

    campo.value = ultima.termo;
    buscar();
    campo.focus();
  }

  function abrir(raiz) {
    // A lista de líderes alimenta o filtro; se falhar, a tela abre sem eles.
    SPX.data.listarLideres()
      .catch(() => [])
      .then(lideres => desenhar(raiz, lideres));
  }

  return abrir;
})();
