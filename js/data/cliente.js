// Cliente do Supabase: login e chamadas ao banco. A biblioteca vem do CDN, no index.html.
// Sem a biblioteca ou sem os dados de conexão, SPX.db fica indefinido e o app não abre.
window.SPX = window.SPX || {};

(function () {
  if (!window.supabase || !SPX.config || !SPX.config.url || !SPX.config.chave) return;

  SPX.db = window.supabase.createClient(SPX.config.url, SPX.config.chave, {
    auth: {
      persistSession: true,      // a pessoa continua logada neste aparelho
      autoRefreshToken: true,
      detectSessionInUrl: true,  // termina o login quando o Google devolve para o app
      flowType: 'pkce'
    }
  });
})();
