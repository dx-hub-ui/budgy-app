# Módulo de Orçamento (Budget estilo YNAB)

Este documento descreve como o módulo de orçamento mensal funciona no Budgy após o redesenho inspirado no YNAB, cobrindo tanto a experiência de usuário quanto os novos cálculos e artefatos de banco.

## Navegação

O módulo pode ser acessado diretamente pelo item **Orçamento** no menu lateral da aplicação, que leva o usuário para a visão de lista (`/budgets`).

### Visão de lista

- A tela inicial consulta o Supabase por meio de `listRecentBudgets` e exibe apenas os orçamentos que foram efetivamente criados pelo usuário (sem meses mockados).
- Cada cartão mostra o saldo disponível, status (verde/atenção/estourado) e os valores orçado x gasto, aproximando-se do layout clean do YNAB.
- Quando não há dados, o usuário vê um estado vazio convidando a criar o primeiro orçamento do mês atual.

## Estrutura de dados

- **Tabela `budgets`**: continua sendo o cabeçalho mensal com `year`, `month`, `to_budget_cents` (usado como "Funds for {month}") e nota opcional.
- **Tabela `budget_categories`**: recebeu a coluna `group_name` para organizar as categorias em cinco grupos fixos (Immediate Obligations, Debt Payments, True Expenses, Quality of Life Goals, Just for Fun). Também permanecem os campos `budgeted_cents`, `activity_cents`, `available_cents` e `rollover`.
- **Tabela `budget_months`**: nova entidade que garante unicidade do mês na organização/usuário e serve como ponte para as estatísticas agregadas.
- **Tabela `budget_allocations`**: snapshots derivados com orçamento, gasto e disponível por categoria/mês usados para auditoria e reconstrução rápida.
- **Tabela `budget_goals`**: guarda metas por categoria (`goal_type` TB/TBD/MFG, `amount_cents`, `target_month`).
- **Tabela `budget_quick_stats`**: cache JSON dos cálculos de Quick Budget.
- **Tabela `budget_audit`**: log de alterações (antes/depois, usuário, timestamp, razão).
- **Funções `fn_recalc_month` e `fn_apply_quick_budget`**: mantêm as agregações em dia e permitem aplicar presets direto via SQL. A implementação atual é um placeholder seguro para não quebrar fluxos existentes; a equipe pode evoluir o algoritmo depois.
- **Triggers**: ao inserir/alterar despesas, `fn_recalc_month` é chamado para atualizar os snapshots. A migration cria o trigger
  somente quando a tabela `public.expenses` está disponível, permitindo que projetos sem esse recurso apliquem o script sem
  falhas.

## Fluxo geral

1. O usuário navega até `/budgets/[slug]?m=YYYY-MM`. O `slug` existe por retrocompatibilidade, mas o parâmetro `m` é a fonte da verdade e permite trocar de mês sem recarregar a página.
2. O cliente carrega `loadBudgetMonth`, que garante a existência do cabeçalho (`budgets`) e retorna:
   - resumo (`BudgetMonthSummary`) com `funds_for_month_cents`, `to_be_budgeted_cents`, `overspent_last_month_cents` etc;
   - lista de categorias (`BudgetAllocationView`) já ordenadas por grupo, com meta opcional e os valores de rollover calculados;
   - mapas auxiliares para Quick Budget (mês anterior, médias móveis).
3. O estado fica em um store do Zustand com histórico (até 50 passos). Toda edição dispara atualização otimista e é salva com debounce via `upsertBudget`/`upsertBudgetCategories`.
4. O grid permite seleção múltipla (click + shift/cmd, atalhos `j/k` ou setas) e edição inline com `FieldCurrency`. Disponível (`Available`) usa pílulas coloridas (>0 verde, =0 neutra, <0 vermelha).
5. O painel lateral mostra totais, permite ajustar "Saldo a orçar" e oferece o **Quick Budget** (Metas, Orçado mês anterior, Gasto mês anterior, Média orçada, Média gasta). Cada botão calcula a diferença, aplica via store e dispara toast com resumo + opção de `Undo`.
6. O rodapé mantém botões de `Undo/Redo`, texto da última ação e integra com os atalhos `⌘/Ctrl + Z` e `⌘/Ctrl + Shift + Z`.

## Fórmulas

- **Disponível por categoria**: `available = (rollover ? prev_available : 0) + budgeted - activity`.
- **To Be Budgeted (TBB)**: `toBeBudgeted = inflows - Σ(budgeted) - reservedAdjustments + carryoverAdjustments`.
  - `inflows` vem de `budgets.to_budget_cents`.
  - `reservedAdjustments` e `carryoverAdjustments` são zero por padrão, mas o domínio expõe parâmetros para cenários avançados.
- **Metas**:
  - `TB`/`TBD`: objetivo de saldo; Quick Budget calcula o orçamento necessário para que `available` alcance `amount_cents` até a data alvo.
  - `MFG`: objetivo de aporte mensal fixo.
- **Quick Budget totals**: o preview soma `Σ(delta)` das linhas afetadas antes de aplicar, permitindo mostrar o valor na UI.

## Quick Budget

- A prévia é derivada via `previewQuickBudget(mode)` no store (não toca a API).
- Ao aplicar, o store retorna os deltas (`QuickBudgetDiff`), que são marcados como "pendentes" e persistidos pelo debounce comum.
- Há toast com resumo e o histórico aceita undo/redo imediatamente.

## Atalhos de teclado

- `j` / `↓`: avança linha
- `k` / `↑`: volta linha
- `e`: foca a célula de orçamento da linha atual
- `Enter`: confirma edição e mantém foco
- `Esc`: sai da edição
- `⌘/Ctrl + Z`: undo
- `⌘/Ctrl + Shift + Z`: redo

## Relatório

A página `/budgets/report` apresenta o gráfico "Previsto vs. Realizado" do mês atual (top 5 categorias) com dynamic import do Chart.js.

## Testes

- `tests/budget.test.ts` cobre `computeAvailable`, `calculateToBeBudgeted` e mantém a bateria da média de 3 meses (`suggestFromAvg3m`) com mocks do Supabase.
- Novos componentes (grid/painel) dependem de hooks e foram estruturados para facilitar testes de interação com Playwright futuramente.
