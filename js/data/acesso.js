// Login com Google e controle de acesso (funções do banco em supabase/01_acesso.sql).
// Toda função devolve uma Promise. Erros viram Error com mensagem pronta para mostrar na tela.
window.SPX = window.SPX || {};

SPX.acesso = (function () {
  // Sessão atual (ou null). Espera o Supabase terminar o login quando a pessoa volta do Google.
  function sessao() {
    return SPX.db.auth.getSession().then(function (r) { return r.data.session; });
  }

  function entrarComGoogle() {
    return SPX.db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname, scopes: 'openid email profile' }
    }).then(function (r) {
      if (r.error) throw new Error(r.error.message || 'Erro ao entrar com o Google.');
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
    meuAcesso: function () { return SPX.rpc('meu_acesso'); },
    pedirAcesso: function (nome) { return SPX.rpc('pedir_acesso', { p_nome: nome || null }); },
    listarPedidos: function () { return SPX.rpc('listar_pedidos'); },
    listarAcessos: function () { return SPX.rpc('listar_acessos'); },
    responderPedido: function (id, nivel) { return SPX.rpc('responder_pedido', { p_id: id, p_nivel: nivel }); },
    negarPedido: function (id) { return SPX.rpc('negar_pedido', { p_id: id }); },
    definirAcesso: function (email, nivel, nome) {
      return SPX.rpc('definir_acesso', { p_email: email, p_nivel: nivel, p_nome: nome || null });
    },
    removerAcesso: function (email) { return SPX.rpc('remover_acesso', { p_email: email }); }
  };
})();
