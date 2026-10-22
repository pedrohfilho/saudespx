# SaúdeSPX

Ficha de emergência dos colaboradores para uso no atendimento. Quem presta o primeiro atendimento (cipistas, jovens aprendizes, líderes e analistas) busca o colaborador pelo nome, vê na hora alergias, tipo sanguíneo, comorbidades e contatos de emergência, e registra quem o levou ao atendimento e o que aconteceu.

Substitui a "Planilha de Emergência": os mesmos dados, mas com busca rápida no celular, acesso controlado e dados criptografados.

## O que o sistema faz

- **Busca** do colaborador por nome.
- **Ficha** com nome, turno, líder, alergia a remédio (e qual), tipo sanguíneo, comorbidades e contatos de emergência.
- **Registro de atendimento**: quem levou, observação do que houve, data e hora.
- **Histórico** de atendimentos por colaborador.
- **Registro de consultas**: guarda quem abriu a ficha de quem e quando.
- **Cadastro e edição** de colaboradores, líderes e contatos.
- **Acesso restrito** a uma lista de pessoas autorizadas, com administrador.

## Segurança e LGPD

Alergia, comorbidade e tipo sanguíneo são dados de saúde, ou seja, dados pessoais sensíveis. Por isso:

- **Login por código enviado ao e-mail da empresa**, sem senha. A sessão fica salva no aparelho. O cadastro é bloqueado para e-mails de outros domínios.
- **Lista de autorizados**: ter e-mail da empresa não basta, só vê as fichas quem está na lista.
- **Criptografia no banco** (pgcrypto, chave guardada no Supabase Vault): nome, contatos, saúde e observações ficam ilegíveis até no painel do banco.
- **RLS ligada em todas as tabelas.** O app não lê as tabelas direto; usa funções (RPC) no servidor.
- **Registro de consultas**: toda abertura de ficha deixa rastro de quem a abriu.
- **PIN opcional** por aparelho, como bloqueio rápido do app.
- Nenhum dado real vai para o repositório. A chave pública do Supabase no código é pública por desenho; `service_role`, senha do banco e chave do Vault nunca entram aqui.

## Tecnologias

- HTML, CSS e JavaScript puro, sem build. Scripts clássicos, tudo no objeto global `SPX`.
- [Supabase](https://supabase.com): Postgres, Auth (código por e-mail), Vault.
- `@supabase/supabase-js` 2.45.4 por CDN.
- Mobile-first, conferido em 375, 768, 1024 e ~1900 px.

## Estrutura

```
saudespx/
├── index.html
├── css/
│   ├── main.css      importa todos os módulos (a ordem importa)
│   ├── base/         variáveis, reset, tipografia, utilitários
│   ├── layout/       topo, área de conteúdo, responsivo
│   ├── components/   peças reutilizáveis
│   └── sections/     estilos de cada tela
├── js/
│   ├── config/   dados de conexão (públicos)
│   ├── data/     acesso ao Supabase
│   ├── core/     regras sem tela
│   ├── screens/  telas
│   ├── ui/       peças de interface
│   └── app.js    ponto de entrada
└── tests/        testes das regras
```

## Modelo de dados

| Tabela | Para que serve |
|---|---|
| `lideres` | Líderes e o turno deles |
| `colaboradores` | Dados da ficha. Cada colaborador tem um líder |
| `contatos_emergencia` | Contatos de cada colaborador (vários por pessoa) |
| `atendimentos` | Histórico de atendimentos: quem levou, observação, data e hora |
| `consultas` | Registro de quem abriu a ficha de quem |
| `usuarios_autorizados` | E-mails com acesso ao sistema e quem é administrador |

Nome, tipo sanguíneo, alergia, comorbidades, contatos e observações ficam criptografados (`bytea`). Turno e a marcação "tem alergia" ficam em texto, para filtro.

## Como rodar local

1. Crie um projeto no Supabase e preencha `js/config/supabase.js` com a Project URL e a chave pública (*Project Settings > API*).
2. No Vault do Supabase, crie o segredo `chave_ficha` com uma chave longa e aleatória, e guarde uma cópia fora do Supabase. Sem ela os dados não podem ser recuperados.
3. Rode o SQL das tabelas, das funções de criptografia e do bloqueio de domínio (scripts em `supabase/`, a partir da etapa 2).
4. Sirva a pasta com um servidor estático, por exemplo:

```
npx serve .
```

e abra o endereço que ele mostrar.

## Estado atual

| Etapa | Conteúdo | Situação |
|---|---|---|
| 0 | Esqueleto e conexão com o Supabase | em andamento |
| 1 | Login por código no e-mail, sessão fixa, sair/trocar de usuário | |
| 2 | Funções do servidor (buscar, abrir ficha, cadastrar, registrar atendimento) | |
| 3 | Tela de busca e ficha | |
| 4 | Registro de atendimento e histórico | |
| 5 | Cadastro e edição, gerenciar autorizados | |
| 6 | PIN opcional e troca de usuário | |
| 7 | Testes de tela, envio de e-mail próprio, publicação | |

## Observações

- O envio de e-mail padrão do Supabase só entrega para a equipe do projeto e tem limite baixo. Para uso real é preciso configurar um serviço de envio próprio (SMTP).
- Em computador compartilhado, cada pessoa deve usar **Trocar de usuário**, porque o registro de consultas grava quem está logado.
