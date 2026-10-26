# Crédito animado

Pequeno selo fixo no canto inferior direito. Mostra uma xícara de café quente (com fumaça) e, depois de alguns segundos, troca para "Desenvolvido por <nome>", em ciclo. Ao tocar, abre um link em outra aba. Sem dependências.

## Como usar em outro sistema

1. Copie esta pasta (`credito/`) para o projeto.
2. No `index.html`:

```html
<link rel="stylesheet" href="credito/credito.css">
<script src="credito/credito.js"></script>
<script>
  Credito.montar({ nome: 'Fulano de Tal', url: 'https://www.linkedin.com/in/seu-perfil' });
</script>
```

## Opções de `Credito.montar`

| Opção | Para que serve |
|---|---|
| `nome` | Texto depois de "Desenvolvido por" (obrigatório) |
| `url` | Endereço aberto ao tocar (obrigatório) |
| `texto` | Início da frase (padrão: `Desenvolvido por`) |
| `rotulo` | Texto lido por leitor de tela |

## Personalizar

Cores e tempo ficam em variáveis no topo do `credito.css`. Para mudar num sistema, sobrescreva no CSS da página:

```css
:root {
  --credito-cafe: #6f4e37;   /* xícara */
  --credito-azul: #0a66c2;   /* texto */
  --credito-ciclo: 12s;      /* duração de uma volta */
}
```

## Comportamento

- Ao passar o mouse ou focar com o teclado, mostra o texto e para a animação.
- Com `prefers-reduced-motion`, mostra só o texto, parado.
- Some na impressão.
- O rodapé da página deve ter um espaço embaixo (cerca de 64 px) para o selo não cobrir o fim do conteúdo.
