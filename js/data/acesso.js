// Login com Google e controle de acesso (funções do banco em supabase/01_acesso.sql).
// Toda função devolve uma Promise. Erros viram Error com mensagem pronta para mostrar na tela.
window.SPX = window.SPX || {};

SPX.acesso = (function () {
  function traduzir(erro) {
    if (!erro) return 'Erro desconhecido.';
    if (erro.code === '42501') return 'Sem permissão para esta ação.';
    return erro.message || 'Erro desconhecido.';
  }

  function chamar(nome, args) {
    return SPX.db.rpc(nome, args || {}).then(
      function (resposta) {
        if (resposta.error) throw new Error(traduzir(resposta.error));
        return resposta.data;
      },
      function () { throw new Error('Não foi possível falar com o servidor. Confira a internet.'); }
    );
  }

  // Sessão atual (ou null). Espera o Supabase terminar o login quando a pessoa volta do Google.
  function sessao() {
    return SPX.db.auth.getSession().then(function (r) { return r.data.session; });
  }

  function entrarComGoogle() {
    return SPX.db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname, scopes: 'openid email profile' }
    }).then(function (r) {
      if (r.error) throw new Error(traduzir(r.error));
    });
  }

  function sair() {
    return SPX.db.auth.signOut();
  }

  // Avisa quando a sessão termina (inclusive se a pessoa saiu em outra aba).
  function aoSair(funcao) {
    SPX.db.auth.onAuthStateChange(function (evento) {
      if (evento === 'SIGNED_OUT') funcao();
    });
  }

  return {
    sessao: sessao,
    entrarComGoogle: entrarComGoogle,
    sair: sair,
    aoSair: aoSair,
    meuAcesso: function () { return chamar('meu_acesso'); },
    pedirAcesso: function (nome) { return chamar('pedir_acesso', { p_nome: nome || null }); },
    listarPedidos: function () { return chamar('listar_pedidos'); },
    listarAcessos: function () { return chamar('listar_acessos'); },
    responderPedido: function (id, nivel) { return chamar('responder_pedido', { p_id: id, p_nivel: nivel }); },
    negarPedido: function (id) { return chamar('negar_pedido', { p_id: id }); },
    definirAcesso: function (email, nivel, nome) {
      return chamar('definir_acesso', { p_email: email, p_nivel: nivel, p_nome: nome || null });
    },
    removerAcesso: function (email) { return chamar('remover_acesso', { p_email: email }); }
  };
})();
