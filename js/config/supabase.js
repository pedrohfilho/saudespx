// Dados PÚBLICOS do projeto no Supabase (Project Settings > API).
// A chave "publishable" pode ficar no código: quem protege os dados são a RLS e a criptografia.
// NUNCA colocar aqui: chave de serviço (service_role) nem senha do banco.
// Este arquivo ainda não é carregado pelo index.html (fase 3).
window.SPX = window.SPX || {};

SPX.config = {
  url: 'COLE_AQUI_A_PROJECT_URL',
  chave: 'COLE_AQUI_A_CHAVE_PUBLICA'
};
