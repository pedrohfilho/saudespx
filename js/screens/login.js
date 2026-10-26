// Tela de entrada: botão "Entrar com Google".
window.SPX = window.SPX || {};
SPX.screens = SPX.screens || {};

SPX.screens.login = (function () {
  // opcoes.erro: mensagem a mostrar (por exemplo, quando o Google recusou o login).
  function abrir(raiz, opcoes) {
    const erro = opcoes && opcoes.erro ? SPX.ui.mensagemErro(opcoes.erro) : '';

    raiz.innerHTML =
      '<section class="bloco entrada">' +
        '<h2>Entrar</h2>' +
        '<p>Use a sua conta Google. Se você ainda não tem acesso, depois de entrar dá para pedir aos responsáveis.</p>' +
        '<div id="login-retorno" aria-live="polite">' + erro + '</div>' +
        '<button id="login-google" class="botao botao-largo" type="button">Entrar com Google</button>' +
        '<p class="dica">Usamos só o seu e-mail e o seu nome para liberar o acesso. <a href="privacidade.html">Política de privacidade</a></p>' +
      '</section>';

    const botao = raiz.querySelector('#login-google');
    botao.addEventListener('click', function () {
      botao.disabled = true;
      SPX.acesso.entrarComGoogle().catch(function (e) {
        raiz.querySelector('#login-retorno').innerHTML = SPX.ui.mensagemErro(e.message);
        botao.disabled = false;
      });
    });
  }

  return abrir;
})();
