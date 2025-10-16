# Interface Theming and Auth Guard

## Tema claro e escuro
- O aplicativo agora possui temas claro e escuro.
- O tema claro é aplicado por padrão. Usuários podem alternar entre os temas pelo botão com ícones de sol e lua localizado na Topbar.
- A escolha do tema é persistida localmente no navegador (`localStorage`) e respeita mudanças de preferência do sistema quando não houver uma seleção explícita.
- A logomarca exibida na Topbar respeita o tema ativo, utilizando as versões claras e escuras disponibilizadas em `/public/brand`.

## Esquema de cores do painel
- O painel financeiro replica o visual navy + mint da referência: fundo claro `--cc-bg` (`#f5f7fb`), superfícies elevadas `--cc-bg-elev` (`#ffffff`) e destaque principal em verde `--brand` (`#7cc46e`). Tokens derivados (`--ring`, `--brand-soft-*`, `--chart-grid`) foram ajustados para manter brilho controlado e contraste alto.
- O tema escuro usa contrapartes azul-marinho profundas (`--cc-bg` `#0b1220`, `--cc-bg-elev` `#0f172a`, `--cc-surface` `#111827`) com o mesmo verde de destaque, preservando a hierarquia luminosa do layout.
- A barra lateral permanece com fundo marinho fixo `#0b1220` em ambos os temas e aplica foregrounds semitransparentes (`--sidebar-foreground`, `--sidebar-muted`) para maximizar o contraste de texto e ícones, além de bordas suaves (`--sidebar-border`).
- Estados positivos dos componentes (ex.: métricas, transações concluídas) continuam a reaproveitar os tokens suaves `--brand-soft-*`, agora com opacidades revisadas para que badges e gráficos tenham presença visual semelhante nos dois temas.

## Proteção de acesso
- Todas as rotas internas dependem de autenticação. Usuários não autenticados são redirecionados para `/login` antes de qualquer conteúdo do app ser renderizado.
- Durante a checagem da sessão é exibido apenas um estado de carregamento, evitando o vazamento de conteúdo sensível.
- O gerenciamento de sessão evita o uso de hooks condicionais, garantindo que os builds de produção concluam sem erros de lint.
- Quando variáveis de ambiente do Supabase não estiverem presentes, o cliente de autenticação entra em modo de simulação para permitir builds locais sem falhas.

## Menu global do usuário
- O avatar na Topbar agora abre um menu suspenso com o e-mail da conta e a ação de sair (com ícone).
- O botão de sair utiliza a API do Supabase e também está disponível dentro do menu, em vez de exposto diretamente na Topbar.

## Layout da Topbar
- A Topbar foi dividida em três áreas principais: branding com largura fixa igual a `var(--dynamic-sidebar-w)`, um espaço central que agora recebe o título da página (renderizado como `<h1>` e alinhado com a coluna principal) e a área de ações do usuário (alternância de tema, notificações e menu do avatar). Com isso, o conteúdo principal fica livre de cabeçalhos volumosos.

## Painel financeiro
- A nova rota `/dashboard` reúne o gráfico de saldo, cartões de métricas e uma tabela responsiva de transações recentes seguindo a composição de colunas 2fr/1fr em telas grandes.
- A rota raiz `/` agora redireciona imediatamente para `/dashboard`, evitando conflitos de build entre páginas do grupo `(app)` e garantindo que o painel seja sempre exibido primeiro.
- O tema inclui novos tokens globais para cartões e widgets (`--card-bg-light`, `--card-bg-dark`, `--muted`, `--ring`, `--shadow`, `--radius`, `--sidebar-dark`, `--sidebar-foreground`, `--sidebar-hover`, `--sidebar-border` e `--brand`) que podem ser reutilizados em futuros componentes.
- Tokens adicionais para o painel (`--brand-rgb`, `--brand-soft-bg`, `--brand-soft-fill`, `--brand-soft-fill-strong`, `--chart-grid` e `--chart-point-border`) mantêm o contraste adequado do gráfico e dos ícones em ambos os temas.
- O gráfico utiliza Chart.js com carregamento dinâmico no cliente, respeitando a preferência de movimento reduzido do sistema.
- As cores do gráfico são resolvidas a partir dos tokens CSS em tempo de execução, garantindo que o preenchimento da linha e as fontes do eixo sigam o tema ativo mesmo quando variáveis CSS não estão disponíveis durante o build.
- Os fallbacks do gráfico são tipados como strings amplas, permitindo que as leituras dinâmicas das variáveis CSS mantenham compatibilidade com o compilador de tipos mesmo quando retornam valores personalizados.
- Os cards de estatísticas empregam botões de overflow acessíveis com foco visível (`ring-[var(--ring)]`) e usam o brand como destaque de ícones.
- A lógica do painel agora vive em um hook client-side dedicado que tenta carregar dados reais do Supabase; em caso de indisponibilidade, o painel recorre automaticamente aos mocks sem quebrar o layout.
- Quando não há transações no período selecionado, apresentamos um estado vazio textual acessível em vez de exibir a tabela vazia.
