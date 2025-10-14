# Interface Theming and Auth Guard

## Tema claro e escuro
- O aplicativo agora possui temas claro e escuro.
- O tema claro é aplicado por padrão. Usuários podem alternar entre os temas pelo botão com ícones de sol e lua localizado na Topbar.
- A escolha do tema é persistida localmente no navegador (`localStorage`) e respeita mudanças de preferência do sistema quando não houver uma seleção explícita.
- A logomarca exibida na Topbar respeita o tema ativo, utilizando as versões claras e escuras disponibilizadas em `/public/brand`.

## Esquema de cores do painel
- O painel financeiro agora replica a paleta azul-arroxeada do novo layout, com fundo claro `--cc-bg` (`#e7edff`), cartões translúcidos (`--cc-bg-elev`) e um brand principal atualizado (`--brand` `#3b63ff`). Os valores derivados (`--ring`, `--brand-soft-*`, `--chart-grid`) foram reajustados para harmonizar gradientes suaves e destaques fortes.
- O tema escuro recebeu equivalentes azulados profundos (`--cc-bg` `#060b1d`, `--cc-bg-elev` `#0b1430`) para preservar contraste e legibilidade, mantendo a proporção entre superfícies, bordas e sombras observada no mockup.
- A barra lateral usa agora variações dedicadas (`--sidebar-dark`, `--sidebar-foreground`, `--sidebar-hover`, `--sidebar-border`) alinhadas ao novo brand em ambos os temas, garantindo contraste adequado e sensação de profundidade.
- Os estados positivos dos componentes (ex.: métricas, transações concluídas) continuam a reaproveitar os tokens suaves `--brand-soft-*`, porém com opacidades recalibradas para que badges e gráficos tenham presença visual semelhante nos dois temas.

## Proteção de acesso
- Todas as rotas internas dependem de autenticação. Usuários não autenticados são redirecionados para `/login` antes de qualquer conteúdo do app ser renderizado.
- Durante a checagem da sessão é exibido apenas um estado de carregamento, evitando o vazamento de conteúdo sensível.
- O gerenciamento de sessão evita o uso de hooks condicionais, garantindo que os builds de produção concluam sem erros de lint.
- Quando variáveis de ambiente do Supabase não estiverem presentes, o cliente de autenticação entra em modo de simulação para permitir builds locais sem falhas.

## Menu global do usuário
- O avatar na Topbar agora abre um menu suspenso com o e-mail da conta e a ação de sair (com ícone).
- O botão de sair utiliza a API do Supabase e também está disponível dentro do menu, em vez de exposto diretamente na Topbar.

## Layout da Topbar
- A Topbar foi dividida em três áreas principais: branding com largura fixa igual a `var(--cc-sidebar-w)`, um espaço central livre para conteúdo adicional e a área de ações do usuário (alternância de tema, notificações e menu do avatar).

## Painel financeiro
- A nova rota `/dashboard` reúne o gráfico de saldo, cartões de métricas e uma tabela responsiva de transações recentes seguindo a composição de colunas 2fr/1fr em telas grandes.
- A rota raiz `/` agora redireciona imediatamente para `/dashboard`, evitando conflitos de build entre páginas do grupo `(app)` e garantindo que o painel seja sempre exibido primeiro.
- O tema inclui novos tokens globais para cartões e widgets (`--card-bg-light`, `--card-bg-dark`, `--muted`, `--ring`, `--shadow`, `--radius`, `--sidebar-dark`, `--sidebar-foreground`, `--sidebar-hover`, `--sidebar-border` e `--brand`) que podem ser reutilizados em futuros componentes.
- Tokens adicionais para o painel (`--brand-rgb`, `--brand-soft-bg`, `--brand-soft-fill`, `--brand-soft-fill-strong`, `--chart-grid` e `--chart-point-border`) mantêm o contraste adequado do gráfico e dos ícones em ambos os temas.
- O gráfico utiliza Chart.js com carregamento dinâmico no cliente, respeitando a preferência de movimento reduzido do sistema.
- Os cards de estatísticas empregam botões de overflow acessíveis com foco visível (`ring-[var(--ring)]`) e usam o brand como destaque de ícones.
- A lógica do painel agora vive em um hook client-side dedicado que tenta carregar dados reais do Supabase; em caso de indisponibilidade, o painel recorre automaticamente aos mocks sem quebrar o layout.
- Quando não há transações no período selecionado, apresentamos um estado vazio textual acessível em vez de exibir a tabela vazia.
