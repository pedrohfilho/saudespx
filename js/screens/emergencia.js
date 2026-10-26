// Aba Emergência: telefones importantes, hospital ou UPA perto (minha localização, base ou outro lugar)
// e quem cuida do sistema. Nenhum dado de pessoa é enviado: só se abre o mapa.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.emergencia = (function () {
  const { esc, telefoneParaLink } = SPX.util;

  const TELEFONES = [
    { nome: 'SAMU', numero: '192', descricao: 'Ambulância e atendimento médico de urgência' },
    { nome: 'Bombeiros', numero: '193', descricao: 'Incêndio, resgate e salvamento' },
    { nome: 'Polícia', numero: '190', descricao: 'Polícia Militar' },
    { nome: 'Defesa Civil', numero: '199', descricao: 'Desabamento, alagamento e queda de árvore' },
    { nome: 'Disque-Intoxicação', numero: '0800 722 6001', descricao: 'Intoxicação e envenenamento (24 horas, gratuito)' },
    { nome: 'Polícia Rodoviária Federal', numero: '191', descricao: 'Acidentes em rodovia federal' }
  ];

  function linkMapa(texto, url) {
    return '<a class="botao botao-secundario" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(texto) + '</a>';
  }

  function itemTelefone(t) {
    return '<li class="telefone">' +
      '<div class="telefone-dados">' +
        '<span class="telefone-nome">' + esc(t.nome) + '</span>' +
        '<span class="telefone-desc">' + esc(t.descricao) + '</span>' +
      '</div>' +
      '<a class="botao" href="tel:' + esc(telefoneParaLink(t.numero)) + '">Ligar ' + esc(t.numero) + '</a>' +
    '</li>';
  }

  function blocoMapa() {
    const base = SPX.base.nome;
    return '<section class="bloco">' +
      '<h3>Hospital ou UPA perto</h3>' +
      '<p class="dica">Abre o mapa já procurando. A localização só é usada para abrir o mapa e não fica guardada no sistema.</p>' +
      '<div class="mapa-opcao">' +
        '<h4>Onde eu estou</h4>' +
        '<button id="mapa-localizar" class="botao botao-secundario" type="button">Usar minha localização</button>' +
        '<div id="mapa-localizacao" class="mapa-retorno" aria-live="polite"></div>' +
      '</div>' +
      '<div class="mapa-opcao">' +
        '<h4>Perto da base (' + esc(base) + ')</h4>' +
        '<div class="mapa-links">' +
          linkMapa('Hospital perto da base', SPX.mapa.porLugar('hospital', base)) +
          linkMapa('UPA perto da base', SPX.mapa.porLugar('UPA 24 horas', base)) +
        '</div>' +
      '</div>' +
      '<div class="mapa-opcao">' +
        '<h4>Outro lugar</h4>' +
        '<label class="campo-rotulo" for="mapa-lugar">Bairro ou endereço</label>' +
        '<input id="mapa-lugar" class="campo" placeholder="Ex.: Brotas, Salvador" autocomplete="off">' +
        '<div class="mapa-links">' +
          '<button id="mapa-lugar-hospital" class="botao botao-secundario" type="button">Hospital nesse lugar</button>' +
          '<button id="mapa-lugar-upa" class="botao botao-secundario" type="button">UPA nesse lugar</button>' +
        '</div>' +
        '<div id="mapa-lugar-aviso" class="mapa-retorno" aria-live="polite"></div>' +
      '</div>' +
    '</section>';
  }

  function ligarMapa(raiz) {
    const aviso = raiz.querySelector('#mapa-localizacao');
    const botao = raiz.querySelector('#mapa-localizar');

    botao.addEventListener('click', function () {
      if (!navigator.geolocation) {
        aviso.innerHTML = SPX.ui.mensagemErro('Este aparelho não informa a localização. Use a base ou digite o lugar.');
        return;
      }
      botao.disabled = true;
      aviso.innerHTML = SPX.ui.mensagemInfo('Procurando a sua localização…');
      navigator.geolocation.getCurrentPosition(function (posicao) {
        botao.disabled = false;
        const { latitude, longitude } = posicao.coords;
        aviso.innerHTML = '<div class="mapa-links">' +
          linkMapa('Hospital perto de mim', SPX.mapa.porCoordenadas('hospital', latitude, longitude)) +
          linkMapa('UPA perto de mim', SPX.mapa.porCoordenadas('UPA 24 horas', latitude, longitude)) +
        '</div>';
      }, function (erro) {
        botao.disabled = false;
        const motivo = erro && erro.code === 1
          ? 'A localização foi bloqueada. Libere nas permissões do navegador, ou use a base ou digite o lugar.'
          : 'Não deu para pegar a localização agora. Use a base ou digite o lugar.';
        aviso.innerHTML = SPX.ui.mensagemErro(motivo);
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    });

    function abrirNoLugar(procurar) {
      const lugar = raiz.querySelector('#mapa-lugar').value.trim();
      const retorno = raiz.querySelector('#mapa-lugar-aviso');
      if (!lugar) {
        retorno.innerHTML = SPX.ui.mensagemErro('Digite o bairro ou o endereço.');
        return;
      }
      retorno.innerHTML = '';
      window.open(SPX.mapa.porLugar(procurar, lugar), '_blank', 'noopener');
    }

    raiz.querySelector('#mapa-lugar-hospital').addEventListener('click', function () { abrirNoLugar('hospital'); });
    raiz.querySelector('#mapa-lugar-upa').addEventListener('click', function () { abrirNoLugar('UPA 24 horas'); });
  }

  function listaEquipe(titulo, pessoas) {
    if (!pessoas.length) return '';
    return '<h4>' + esc(titulo) + '</h4>' +
      '<ul class="equipe-lista">' + pessoas.map(p => '<li>' + esc(p.nome) + '</li>').join('') + '</ul>';
  }

  // Quem pode ajudar: responsáveis e quem edita. Se a lista não carregar, o resto da aba continua valendo.
  function carregarEquipe(raiz) {
    SPX.data.listarEquipe().then(function (equipe) {
      const responsaveis = equipe.filter(p => p.nivel === 'responsavel');
      const editores = equipe.filter(p => p.nivel === 'edicao');
      if (!responsaveis.length && !editores.length) return;
      raiz.querySelector('#equipe-bloco').innerHTML =
        '<h3>Quem cuida do sistema</h3>' +
        '<p class="dica">Para pedir acesso, corrigir um cadastro ou tirar uma dúvida, fale com um deles.</p>' +
        listaEquipe('Responsáveis (editam, apagam e liberam acessos)', responsaveis) +
        listaEquipe('Também podem editar', editores);
      raiz.querySelector('#equipe-bloco').classList.remove('oculto');
    }).catch(function () { /* sem a lista, a aba segue funcionando */ });
  }

  function abrir(raiz) {
    raiz.innerHTML =
      '<section class="tela-emergencia">' +
        '<h2>Emergência</h2>' +
        '<section class="bloco">' +
          '<h3>Telefones</h3>' +
          '<ul class="telefones">' + TELEFONES.map(itemTelefone).join('') + '</ul>' +
        '</section>' +
        blocoMapa() +
        '<section id="equipe-bloco" class="bloco oculto"></section>' +
      '</section>';

    ligarMapa(raiz);
    carregarEquipe(raiz);
  }

  return abrir;
})();
