// Tela de quem entrou mas ainda não tem acesso: pedir acesso ou esperar a resposta.
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.pedido = (function () {
  const { esc } = SPX.util;

  // estado: { email, pedido } vindo de meu_acesso(). aoMudar: pede ao app para ler tudo de novo.
  function abrir(raiz, estado, aoMudar) {
    const pendente = estado.pedido === 'pendente';
    const negado = estado.pedido === 'negado';

    let corpo;
    if (pendente) {
      corpo =
        '<p>Seu pedido já foi enviado. Assim que um responsável aprovar, o sistema libera.</p>' +
        '<button id="pedido-atualizar" class="botao botao-largo" type="button">Verificar de novo</button>';
    } else {
      corpo =
        (negado ? '<p>Seu último pedido não foi aprovado. Se quiser, dá para pedir de novo.</p>' : '') +
        '<div class="campo-grupo">' +
          '<label class="campo-rotulo" for="pedido-nome">Seu nome (ajuda os responsáveis a saber quem é)</label>' +
          '<input id="pedido-nome" class="campo" autocomplete="name" maxlength="80">' +
        '</div>' +
        '<div id="pedido-retorno" aria-live="polite"></div>' +
        '<button id="pedido-enviar" class="botao botao-largo" type="button">Pedir acesso</button>';
    }

    raiz.innerHTML =
      '<section class="bloco entrada">' +
        '<h2>Você ainda não tem acesso</h2>' +
        '<p>Você entrou como <strong>' + esc(estado.email) + '</strong>. Nenhum dado aparece até um responsável liberar.</p>' +
        corpo +
        '<button id="pedido-sair" class="botao botao-secundario botao-largo" type="button">Entrar com outra conta</button>' +
      '</section>';

    raiz.querySelector('#pedido-sair').addEventListener('click', function () {
      SPX.acesso.sair();
    });

    const atualizar = raiz.querySelector('#pedido-atualizar');
    if (atualizar) atualizar.addEventListener('click', aoMudar);

    const enviar = raiz.querySelector('#pedido-enviar');
    if (enviar) {
      enviar.addEventListener('click', function () {
        enviar.disabled = true;
        SPX.acesso.pedirAcesso(raiz.querySelector('#pedido-nome').value)
          .then(aoMudar)
          .catch(function (e) {
            raiz.querySelector('#pedido-retorno').innerHTML = SPX.ui.mensagemErro(e.message);
            enviar.disabled = false;
          });
      });
    }
  }

  return abrir;
})();
