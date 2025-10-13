# ContaCerta

Layout responsivo e acessível para o aplicativo ContaCerta, construído com Next.js 14 e Tailwind CSS.

## Funcionalidades
- Topbar fixa em três colunas com busca global e menu do usuário.
- Barra lateral fixa com modo recolhido/expandido persistido em `localStorage`.
- Área principal com rolagem independente e componentes demonstrativos.
- Suporte a temas claro/escuro e preferências de movimento reduzido.
- Atalhos de teclado (`/`, `Ctrl/⌘+K`, `[`) e tooltips acessíveis.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Para garantir qualidade execute:

```bash
pnpm lint
pnpm typecheck
```

Os testes end-to-end de layout estão em `e2e/layout.spec.ts` (Playwright).
