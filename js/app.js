// Etapa 0 — ponto de entrada.
// Objetivo: confirmar que o app conversa com o Supabase e avisar na tela (#status).
//
// Passos:
//  1. pegar o elemento #status
//  2. fazer uma consulta simples só para testar a conexão, por exemplo:
//       SPX.db.from('lideres').select('id_lider', { count: 'exact', head: true })
//     (com a RLS ligada e sem política, a resposta vem vazia, e isso é o esperado;
//      o que importa é NÃO vir erro)
//  3. se vier erro: mostrar a mensagem no #status com a classe "erro"
//  4. se não vier: escrever "Conectado ao Supabase" com a classe "ok"
//  5. rodar tudo quando a página terminar de carregar (DOMContentLoaded)
