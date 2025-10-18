# Interface Theming and Auth Guard

## Tema claro e escuro
- O aplicativo possui temas claro e escuro.
- O tema claro é aplicado por padrão. Usuários alternam entre os temas dentro do menu do avatar (item **Mudar Tema**), escolhendo explicitamente as opções **Claro** ou **Escuro**, cada uma acompanhada de ícones de sol e lua.
- A escolha do tema é persistida localmente no navegador (`localStorage`) e respeita mudanças de preferência do sistema quando não houver uma seleção explícita.
- O logotipo exibido no topo da barra lateral respeita o tema ativo, utilizando as versões claras e escuras disponibilizadas em `/public/brand`.

## Esquema de cores do painel
- O painel financeiro replica o visual navy + mint da referência: fundo claro `--cc-bg` (`#f5f7fb`), superfícies elevadas `--cc-bg-elev` (`#ffffff`) e destaque principal em verde `--brand` (`#c2f680`). Tokens derivados (`--ring`, `--brand-soft-*`, `--chart-grid`) foram ajustados para manter brilho controlado e contraste alto.
- O tema escuro usa contrapartes azul-marinho profundas (`--cc-bg` `#0b1220`, `--cc-bg-elev` `#0f172a`, `--cc-surface` `#111827`) com o mesmo verde de destaque suave, preservando a hierarquia luminosa do layout.
- A barra lateral permanece com fundo marinho fixo `#0b1220` em ambos os temas e aplica foregrounds semitransparentes (`--sidebar-foreground`, `--sidebar-muted`) para maximizar o contraste de texto e ícones, além de bordas suaves (`--sidebar-border`).
- Estados positivos dos componentes (ex.: métricas, transações concluídas) continuam a reaproveitar os tokens suaves `--brand-soft-*`, agora com opacidades revisadas para que badges e gráficos tenham presença visual semelhante nos dois temas.

## Proteção de acesso
- Todas as rotas internas dependem de autenticação. Usuários não autenticados são redirecionados para `/login` antes de qualquer conteúdo do app ser renderizado.
- Durante a checagem da sessão é exibido apenas um estado de carregamento, evitando o vazamento de conteúdo sensível.
- O gerenciamento de sessão evita o uso de hooks condicionais, garantindo que os builds de produção concluam sem erros de lint.
- Quando variáveis de ambiente do Supabase não estiverem presentes, o cliente de autenticação entra em modo de simulação para permitir builds locais sem falhas.

## Menu global do usuário
- O avatar posicionado na parte superior da barra lateral abre um menu suspenso compacto com a foto (ou iniciais), o nome exibido e o e-mail da conta.
- O menu agora é multinível: o primeiro nível apresenta **Meu Perfil**, **Mudar Tema** e **Sair**.
- O item **Mudar Tema** expande uma lista aninhada com as opções **Claro** (ícone de sol) e **Escuro** (ícone de lua), evidenciando a seleção atual.
- O item **Sair** permanece no menu e continua delegando para a API do Supabase.

## Layout principal
- A Topbar foi removida: o conteúdo principal ocupa agora toda a altura disponível, reduzindo o ruído visual e privilegiando os painéis.
- O branding e o menu da conta ficaram concentrados na cabeça da barra lateral, mantendo fácil acesso mesmo quando a barra está recolhida.
- O atalho "Contas" na barra lateral agora consulta o `localStorage` (`cc_last_account`) para reabrir a última conta visitada quando disponível, ou volta ao índice `/contas` quando não há histórico, evitando cliques que não produzem navegação.
- Identificadores inválidos armazenados no `localStorage` são ignorados e limpados automaticamente: o link volta a apontar para a primeira conta carregada (quando existir) ou para `/contas`, garantindo que a navegação funcione mesmo após exclusões ou dados corrompidos no navegador.
- A largura da barra lateral é controlada pelo token `--dynamic-sidebar-w`, que alterna entre `--cc-sidebar-w` e `--cc-sidebar-w-collapsed`; o próprio `<nav class="cc-sidebar">` fixa `width`, `min-width` e `max-width` com transição suave para que o colapso funcione mesmo antes do carregamento completo do React.

## Painel financeiro
- A visão de dashboard foi aposentada em favor do orçamento como tela inicial; os componentes aqui documentados servem como referência caso a área volte em futuras iterações.
- A rota raiz `/` agora redireciona imediatamente para `/budgets/<ano-mes>`, evitando conflitos de build entre páginas do grupo `(app)` e garantindo que a experiência do orçamento seja exibida primeiro.
- O tema inclui novos tokens globais para cartões e widgets (`--card-bg-light`, `--card-bg-dark`, `--muted`, `--ring`, `--shadow`, `--radius`, `--sidebar-dark`, `--sidebar-foreground`, `--sidebar-hover`, `--sidebar-border` e `--brand`) que podem ser reutilizados em futuros componentes.
- Tokens adicionais para o painel (`--brand-rgb`, `--brand-soft-bg`, `--brand-soft-fill`, `--brand-soft-fill-strong`, `--chart-grid` e `--chart-point-border`) mantêm o contraste adequado do gráfico e dos ícones em ambos os temas.
- O gráfico utiliza Chart.js com carregamento dinâmico no cliente, respeitando a preferência de movimento reduzido do sistema.
- As cores do gráfico são resolvidas a partir dos tokens CSS em tempo de execução, garantindo que o preenchimento da linha e as fontes do eixo sigam o tema ativo mesmo quando variáveis CSS não estão disponíveis durante o build.
- Os fallbacks do gráfico são tipados como strings amplas, permitindo que as leituras dinâmicas das variáveis CSS mantenham compatibilidade com o compilador de tipos mesmo quando retornam valores personalizados.
- Os cards de estatísticas empregam botões de overflow acessíveis com foco visível (`ring-[var(--ring)]`) e usam o brand como destaque de ícones.
- A lógica do painel agora vive em um hook client-side dedicado que tenta carregar dados reais do Supabase; em caso de indisponibilidade, o painel recorre automaticamente aos mocks sem quebrar o layout.
- Quando não há transações no período selecionado, apresentamos um estado vazio textual acessível em vez de exibir a tabela vazia.

## Orçamento mensal compacto
- O layout da página de orçamento utiliza a grade `.budget-grid`, dividindo o espaço entre a tabela de categorias (coluna flexível) e o painel inspector fixo de 380 px.
- As alturas das linhas são controladas pelos tokens `--row-h` e `--row-h-group` definidos em `globals.css`, garantindo densidade compacta em telas médias e grandes.
- Linhas de categoria aplicam o atributo `data-selected="true"` para destacar a seleção atual (`.row[data-selected]`).
- Barras de progresso dentro das células usam a classe `.progress` com modificadores (`.progress--funded`, `.progress--under`, `.progress--over`, `.progress--neg`) para indicar o estado da meta.
- O painel lateral reutiliza os estilos `.card`, `.btn-link` e `.btn-primary` para manter consistência com o restante da interface.
- A topbar do orçamento posiciona o seletor de mês à esquerda e o cartão "Pronto para atribuir" centralizado em destaque mint (`#bff2d5`), inspirado na paleta do YNAB, enquanto os controles de desfazer/refazer e o atalho de grupos ficam agrupados à direita.
