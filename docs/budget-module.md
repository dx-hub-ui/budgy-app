# Módulo de Orçamento (Navy + Mint)

Este documento resume o comportamento do orçamento mensal após o rollout Navy + Mint. Inclui os novos artefatos de dados, API Next.js e as interações de UI/UX que guiam o assistente de metas.

## Navegação

- A entrada continua como **Orçamento** no menu lateral.
- Cada mês é carregado em `/budgets/[slug]?m=YYYY-MM`; o parâmetro `m` é a referência de sincronização entre SSR e CSR.
- Trocas de mês usam `router.replace`, evitando recarga da página e mantendo histórico do navegador.

## Estrutura de dados (Supabase)

- **`budget_category`**: mantém `group_name`, `name`, `icon`, `sort`, flags `is_hidden` e `deleted_at`. A migration `0004_budget_v2.sql` semeia automaticamente seis grupos em PT-BR (Contas Fixas, Necessidades, Desejos, Reservas, Dívidas e Receitas).
- **`budget_goal`**: metas por categoria (`type` em `TB`/`TBD`/`MFG`/`CUSTOM`, `amount_cents`, `target_month`, `cadence`).
- **`budget_allocation`**: `assigned_cents`, `activity_cents`, `available_cents` por categoria/mês (`month` = 1º dia). O front cria linhas faltantes on-demand.
- **`budget_audit`**: log de alterações com triggers automáticos. Guarda `before`/`after`, `reason` e `user_id` (`auth.uid()`), facilitando auditoria.
- **Função `current_org()`**: usa `request.jwt.claim.org_id` (fallback `auth.uid()`) para simplificar as políticas RLS.

### API Next.js

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/budget/categories?month=YYYY-MM` | Garante seeds e devolve snapshot (`categories`, `goals`, `allocations`, totais e `ready_to_assign_cents`). |
| `POST` | `/api/budget/categories` | Reroda o seed e retorna snapshot (útil em testes/reset). |
| `PATCH` | `/api/budget/category/:id` | Renomear, ocultar ou soft-delete. |
| `PUT` | `/api/budget/goal/:categoryId` | Upsert de metas. |
| `DELETE` | `/api/budget/goal/:categoryId` | Remove meta. |
| `POST` | `/api/budget/goal/:categoryId/apply` | Calcula diferença para a meta do mês e atualiza `budget_allocation`. |
| `PUT` | `/api/budget/allocation` | Edição inline de atribuído (debounce de 300 ms no front). |

Todas as rotas usam o client server-side (`createServerSupabaseClient`) e herdam os triggers de auditoria. Para builds e testes
locais funcionarem, é obrigatório definir `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; sem estas variáveis a
criação do client falha deliberadamente com mensagem em PT-BR. O helper valida ambas a cada chamada antes de instanciar o SDK,
evitando que valores `undefined` cheguem ao `createClient` em builds ou requests SSR.

## Fluxo de UI/UX

1. **Inicialização** – `useBudgetPlannerStore.initializeMonth` carrega snapshot, popula Zustand e zera histórico (máx. 50 passos).
2. **Topbar** – seletor de mês, pill "Pronto para atribuir" e botões `Desfazer`/`Refazer` (atalhos `⌘/Ctrl+Z` e `Shift+⌘/Ctrl+Z`).
3. **Grid de categorias** – accordions por grupo, célula "Atribuído" com máscara BRL e pill de "Disponível" colorida (`cc-pill-positive`, `cc-pill-zero`, `cc-pill-negative`).
4. **Modal de nome** – abre ao clicar no nome da categoria. Permite renomear, ocultar e excluir (soft delete) com acessibilidade (`aria-modal`, foco inicial no campo).
5. **Drawer Assistente (3 passos)**:
   - *Passo 1* – tabs Semanal/Mensal/Anual/Personalizado, input de valor, prazo e estratégia para o mês seguinte. Salva via `PUT /goal`.
   - *Passo 2* – usa `calcularProjecaoMeta` para exibir progresso, CTA "Atribuir" (POST apply) e estatísticas "Atribuir este mês / Atribuído / Falta".
   - *Passo 3* – resumo, botão "Editar meta" (volta ao passo 1), "Remover" e "Atribuir".
6. **Toasts** – mensagens PT-BR (`Salvo com sucesso`, `Erro ao salvar`, etc.) expiram em 4 s e podem ser disparadas pelo store.

## Fórmulas e regras financeiras

- `disponível(m) = disponível(m-1) + atribuído(m) − atividade(m)`.
- `aAtribuir(m) = entradas(m) − Σ atribuído(m)` (entradas atuais = soma do atribuído, podendo ser ajustado futuramente por receitas reais).
- Estouro em dinheiro (`disponível < 0`) pode reduzir `aAtribuir` do mês seguinte com `aplicarEstouroEmDinheiro`.
- Metas:
  - `TB` e `TBD`: saldo alvo (com divisão por meses restantes no TBD).
  - `MFG`: aporte fixo mensal.
  - `CUSTOM`: fallback usado pelos tabs personalizados.

## Atalhos e acessibilidade

- `⌘/Ctrl + Z` / `Shift + ⌘/Ctrl + Z`: undo/redo.
- `Esc`: fecha modal/drawer.
- Foco visível segue `outline: 2px solid var(--ring)`.
- Inputs com labels e atributos `aria-*` garantem leitura por leitores de tela.

## Testes

- `tests/budget.test.ts` cobre:
  - `calcularDisponivel` e `calcularAAtribuir` (fórmulas base);
  - `aplicarEstouroEmDinheiro` (rollover de estouros);
  - `calcularProjecaoMeta` para TB/TBD/MFG.
- As rotas Next.js retornam mensagens de erro em PT-BR, úteis para testes de API e feedback ao usuário.
