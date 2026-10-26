# SaúdeSPX

Ficha de emergência dos colaboradores para uso no primeiro atendimento. A pessoa que presta o atendimento busca o colaborador pelo nome, vê alergias, tipo sanguíneo, comorbidades e contatos de emergência, e registra quem o acompanhou e o que aconteceu.

Substitui uma planilha de emergência por uma tela de busca rápida, pensada para o celular.

## Funcionalidades

- Busca de colaborador por nome (sem diferenciar acento ou maiúscula) ou por CPF completo. Se não houver nome igual, mostra nomes **parecidos** (letra trocada ou faltando, como "Marya" para "Maria").
- CPF opcional, validado pelos dígitos verificadores, sem repetição entre colaboradores e escondido na ficha até alguém pedir para mostrar (com botão de copiar).
- Filtros por turno, líder, tipo sanguíneo, alergia a remédio e comorbidade, sozinhos ou junto com o nome.
- Ficha com tipo sanguíneo, alergia a remédio, comorbidades, turno, líder e contatos de emergência (cada um com Ligar, WhatsApp e Copiar o número).
- Registro de atendimento: quem acompanhou, observação e data/hora, com histórico por colaborador.
- Cadastro e edição de colaboradores, líderes e contatos. O telefone aceita só números (DDD + número) e é guardado no padrão `(71) 98888-7777`.
- Os responsáveis podem apagar um colaborador (com tudo dele, sem volta) e remover contas de acesso. O banco guarda só o registro de quem apagou, sem os dados.
- Atalhos de emergência: ligar para SAMU (192), Bombeiros (193) e Polícia (190) e abrir o mapa já procurando hospital ou UPA perto de quem está usando. Nenhum dado de pessoa é enviado.
- Registro de cada abertura de ficha (quem consultou e quando).

## Estado atual

| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Aplicação local, com os dados guardados no navegador | pronta |
| 2 | Login com Google e controle de acesso por nível (leitura, edição, responsável), com pedido e aprovação | telas prontas (login, pedido de acesso e acessos); falta publicar o app no Google para o login aceitar qualquer conta |
| 3 | Dados no Supabase, com criptografia e conferência do nível de acesso no banco | pronta no código (); falta rodar no banco |
| 4 | PIN opcional, troca de usuário em aparelho compartilhado, publicação | a fazer |

O app lê e grava os dados sempre pelas funções do banco (fase 3). A camada local (, em texto simples no navegador) existe só para os testes automáticos e nunca é usada com o banco disponível.

## Decisões de arquitetura

- **HTML, CSS e JavaScript puro, sem etapa de build.** Scripts clássicos, tudo no objeto global `SPX`.
- **Camada de dados com dois lados.** `SPX.data` aponta para `SPX.dataSupabase` (funções do banco) ou, só nos testes, para `SPX.dataLocal`. As duas têm as mesmas funções, todas devolvendo Promise, e as telas não sabem a diferença.
- **Regras de cadastro isoladas** em `js/core/colaborador.js`, sem tela e sem armazenamento, cobertas por testes.
- **Todo texto digitado é escapado** antes de entrar no HTML.
- **Mobile-first.** Conferido em 320, 375, 768, 1280 e 1900 px.
- **CSS em módulos** (`base`, `layout`, `components`, `sections`), importados por `css/main.css`.

## Estrutura

```
saudespx/
├── index.html
├── privacidade.html    política de privacidade (linkada na tela de login)
├── componentes/        peças independentes, reutilizáveis em outros sistemas (ver o LEIA-ME de cada uma)
│   └── credito/        selo animado "Desenvolvido por ..."
├── supabase/           scripts SQL do banco (rodar no SQL Editor, na ordem dos números)
├── css/
│   ├── main.css        importa todos os módulos (a ordem importa)
│   ├── base/           variáveis, reset, tipografia, utilitários
│   ├── layout/         topo, área de conteúdo, responsivo
│   ├── components/     peças reutilizáveis (botão, campo, bloco...)
│   └── sections/       estilos de cada tela
├── js/
│   ├── app.js          rotas (#/...) e inicialização
│   ├── config/         dados de conexão (usados na fase 3)
│   ├── core/           regras e funções de apoio
│   ├── data/           cliente do Supabase, chamadas ao banco (rpc), login e acesso, dados (supabase e local)
│   ├── screens/        telas: login, pedido de acesso, acessos, busca, ficha, atendimento, cadastro
│   └── ui/             peças de interface
└── tests/              testes das regras e da camada de dados
```

## Como rodar

Sirva a pasta com um servidor estático, por exemplo:

```
npx serve .
```

e abra o endereço que ele mostrar. O app precisa de internet, porque o login é com o Google (para testar localmente, o endereço `http://localhost:8091` já está cadastrado no Google e no Supabase).

O site fica no Vercel (https://saudespx.vercel.app) e atualiza sozinho a cada push no `main`.

## Controle de acesso

Quem entra com a conta Google mas não tem acesso não vê nenhum dado, só consegue pedir acesso. Os responsáveis aprovam o pedido escolhendo o nível e podem alterar ou remover depois, como no compartilhamento de um documento.

| Nível | O que pode |
|---|---|
| Leitura | Buscar, ver a ficha e registrar atendimento |
| Edição | O de leitura, mais cadastrar e editar colaboradores |
| Responsável | O de edição, mais apagar colaboradores e gerenciar quem tem acesso |

**Pedidos à vista:** quando alguém pede acesso, os responsáveis veem uma faixa no topo ("1 pessoa pediu acesso e está esperando") com o botão **Ver pedidos**, além do número no menu. O app confere de novo a cada minuto e quando a pessoa volta para a aba.

**Quem pode pedir acesso:** qualquer conta Google entra no sistema, mas só consegue **pedir** acesso quem tem e-mail de um domínio liberado (`supabase/04_dominios.sql`). Quem tem e-mail de outro domínio (um Gmail, por exemplo) entra apenas se um responsável adicionar a pessoa na tela de Acessos. Com a lista de domínios vazia ninguém consegue pedir. O domínio da empresa é cadastrado direto no painel do banco e não fica neste repositório.

**Contas fixas:** algumas contas podem ser marcadas como fixas (`supabase/03_acesso_fixo.sql`). Ninguém consegue removê-las nem reduzir o nível delas pela tela, nem elas mesmas; só podem subir de nível. Os e-mails das contas fixas são marcados direto no painel do banco e não ficam neste repositório.

A regra vale no servidor: as tabelas ficam fechadas e todo acesso passa por funções do banco que conferem o nível. Os e-mails dos primeiros responsáveis são inseridos direto no painel do banco e não ficam neste repositório.

## Login com Google (para lembrar)

Fluxo: o app chama o Supabase, que leva a pessoa ao Google; o Google devolve ao Supabase (`.../auth/v1/callback`), que cria a sessão e volta ao app. Entrar com o Google não dá acesso aos dados: quem não foi aprovado só consegue pedir acesso.

**Google Cloud** (console.cloud.google.com, projeto `saudespx`, menu **Google Auth Platform**)
1. **Branding:** nome do app, e-mail de suporte e **e-mail de contato do desenvolvedor** (sem ele o Google não deixa publicar). Página inicial e política de privacidade são opcionais: `/` e `/privacidade.html` do site. Não subir logo (pede verificação do app).
2. **Audience:** `External` (aceita contas de domínios diferentes) e **Publish app**. Em "Testing" só entram e-mails cadastrados como usuários de teste.
3. **Clients > Create client > Web application.**
   - *Authorized JavaScript origins:* o endereço do site no ar e `http://localhost:8091`.
   - *Authorized redirect URIs:* `https://<ref-do-projeto>.supabase.co/auth/v1/callback`.
4. Guardar o **Client ID** e o **Client secret** (o secret só aparece uma vez; se perder, **Add secret** gera outro).

**Supabase** (painel, menu **Authentication**)
1. **Sign In / Providers > Google:** ligar e colar Client ID e Client secret.
2. **URL Configuration:** *Site URL* = endereço do site no ar; *Redirect URLs* = esse endereço com `/**` e `http://localhost:8091/**`.
3. **Providers > Email:** desligar (o login é só pelo Google).

**Se o endereço do site mudar:** acrescentar o novo no Supabase (*Site URL* e *Redirect URLs*) e no Google (*Authorized JavaScript origins*).

**O que é segredo:** o Client secret (só no painel do Supabase), a chave `sb_secret` e a senha do banco. A URL do projeto, a chave `sb_publishable` e o Client ID podem aparecer.

**Erros comuns**
- `redirect_uri_mismatch`: o *redirect URI* no Google não é exatamente o do Supabase.
- `access_denied` ou "app em fase de teste": o app está em Testing; publicar em **Audience**.
- "Acesso bloqueado" em contas de empresa: o administrador do Google da empresa restringiu apps externos.
- Volta ao site mas não fica logado: o endereço não está em *Redirect URLs* (com `/**`).
- Parou para todos: o Client secret mudou ou a conta dona do projeto foi desativada.

**Falta fazer:** desligar o login por e-mail, completar a Branding e publicar o app no Google, e testar com uma conta que não é a dona do projeto.

## Testes

```
node tests/local.test.js
node tests/util.test.js
node tests/niveis.test.js
node tests/cpf.test.js
node tests/supabase.test.js
node tests/telefone.test.js
```

Os testes usam uma fixture de 5 pessoas inventadas (`tests/fixtura-minima.js`); os CPFs dos testes são números que só passam na conta do dígito verificador, não são de pessoas. O app começa vazio.

Os testes do **banco** (segurança por nível, criptografia, CPF, busca e filtros) e o teste ponta a ponta (código do app contra o SQL) rodam num Postgres local (PGlite), fora do repositório, para não exigir instalação.

**CPF no banco:** `supabase/02_cpf.sql` guarda o CPF cifrado e um índice cego (HMAC com a chave do Vault) para achar a pessoa e impedir repetição sem decifrar tudo.

## Observações

- O repositório é público: nenhum dado real, chave secreta ou senha deve ser colocado aqui.
