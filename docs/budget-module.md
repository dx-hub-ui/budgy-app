# Módulo de Orçamento (Budget estilo YNAB)

Este documento descreve como o módulo de orçamento mensal funciona no Budgy.

## Navegação

O módulo pode ser acessado diretamente pelo item **Orçamento** no menu lateral da aplicação, que leva o usuário para a visão de lista (`/budgets`).

### Visão de lista

- A tela inicial consulta o Supabase por meio de `listRecentBudgets` e exibe apenas os orçamentos que foram efetivamente criados pelo usuário (sem meses mockados).
- Cada cartão mostra o saldo disponível, status (verde/atenção/estourado) e os valores orçado x gasto, aproximando-se do layout clean do YNAB.
- Quando não há dados, o usuário vê um estado vazio convidando a criar o primeiro orçamento do mês atual.

## Estrutura de dados

- **Tabela `budgets`**: Cabeçalho mensal com `year`, `month`, `to_budget_cents` e nota opcional.
- **Tabela `budget_categories`**: Linhas do orçamento para cada categoria com os campos `budgeted_cents`, `activity_cents`, `available_cents` e `rollover`.
- Ao sincronizar as categorias, novos registros são enviados sem `id` explícito para que o Supabase gere o UUID automaticamente e evite violações de `NOT NULL`.
- **View `v_budget_activity`**: Soma das despesas (`expenses`) por categoria/mês usada para preencher a coluna de gasto (activity).

## Fluxo geral

1. O usuário navega até `/budgets/AAAA-MM`. Caso não exista um orçamento para o mês, um cabeçalho é criado automaticamente e as categorias são vinculadas com valores iniciais em zero.
2. A tabela apresenta para cada categoria o valor orçado, o gasto realizado via view e o disponível calculado considerando rollover do mês anterior.
3. O botão **Copiar mês anterior** clona os valores de orçamento/rollover do mês anterior para o mês aberto.
4. O botão **Distribuir por média 3m** aplica o orçamento sugerido com base na média dos últimos três meses de execução.
5. O botão **Salvar** persiste o saldo a orçar e todas as linhas recalculando o disponível.

## Cálculo do disponível

```
available = (rollover ? prev_available : 0) + budgeted - activity
```

O `prev_available` vem do mês anterior e só é considerado quando o rollover está ativo.

## Relatório

A página `/budgets/report` apresenta o gráfico "Previsto vs. Realizado" do mês atual (top 5 categorias) com dynamic import do Chart.js.

## Testes

Os testes em `tests/budget.test.ts` validam a função `computeAvailable` e a média de 3 meses usada em `suggestFromAvg3m` com mocks do Supabase.
