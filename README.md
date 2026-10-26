# SaúdeSPX

Ficha de emergência dos colaboradores para uso no primeiro atendimento. A pessoa que presta o atendimento busca o colaborador pelo nome, vê alergias, tipo sanguíneo, comorbidades e contatos de emergência, e registra quem o acompanhou e o que aconteceu.

Substitui uma planilha de emergência por uma tela de busca rápida, pensada para o celular.

## Funcionalidades

- Busca de colaborador por nome, sem diferenciar acento ou maiúscula.
- Filtros por turno, líder, tipo sanguíneo, alergia a remédio e comorbidade, sozinhos ou junto com o nome.
- Ficha com tipo sanguíneo, alergia a remédio, comorbidades, turno, líder e contatos de emergência (com link para ligar).
- Registro de atendimento: quem acompanhou, observação e data/hora, com histórico por colaborador.
- Cadastro e edição de colaboradores, líderes e contatos.
- Registro de cada abertura de ficha (quem consultou e quando).

## Estado atual

| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Aplicação local, com os dados guardados no navegador | pronta |
| 2 | Login por código enviado ao e-mail, com lista de pessoas autorizadas | a fazer |
| 3 | Banco de dados no Supabase, com criptografia dos dados sensíveis | a fazer |
| 4 | PIN opcional, troca de usuário em aparelho compartilhado, publicação | a fazer |

Na fase 1 os dados ficam em texto simples, só no navegador de quem abre a página, e não são compartilhados. Por isso dados reais de pessoas só entram a partir da fase 3.

## Decisões de arquitetura

- **HTML, CSS e JavaScript puro, sem etapa de build.** Scripts clássicos, tudo no objeto global `SPX`.
- **Camada de dados com dois lados.** `SPX.data` aponta para `SPX.dataLocal` (localStorage). O lado do Supabase terá as mesmas funções, todas devolvendo Promise, e as telas não mudam na troca.
- **Regras de cadastro isoladas** em `js/core/colaborador.js`, sem tela e sem armazenamento, cobertas por testes.
- **Todo texto digitado é escapado** antes de entrar no HTML.
- **Mobile-first.** Conferido em 320, 375, 768, 1280 e 1900 px.
- **CSS em módulos** (`base`, `layout`, `components`, `sections`), importados por `css/main.css`.

## Estrutura

```
saudespx/
├── index.html
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
│   ├── data/           acesso aos dados
│   ├── screens/        telas: busca, ficha, atendimento, cadastro
│   └── ui/             peças de interface
└── tests/              testes das regras e da camada de dados
```

## Como rodar

Sirva a pasta com um servidor estático, por exemplo:

```
npx serve .
```

e abra o endereço que ele mostrar. Também funciona abrindo o `index.html` direto no navegador.

## Testes

```
node tests/local.test.js
```

Os testes usam uma fixture de 5 pessoas inventadas (`tests/fixtura-minima.js`). O app começa vazio.

## Observações

- O repositório é público: nenhum dado real, chave secreta ou senha deve ser colocado aqui.
