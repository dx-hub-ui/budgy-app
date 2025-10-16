# Módulo de Orçamento (Navy + Mint)

Este documento resume o comportamento do orçamento mensal após o rollout Navy + Mint. Inclui os novos artefatos de dados, API Next.js e as interações de UI/UX que guiam o assistente de metas.

## Navegação

- A entrada continua como **Orçamento** no menu lateral; o atalho antigo **Categorias** foi removido porque o CRUD agora acontece dentro do próprio orçamento.
- Cada mês é carregado diretamente em `/budgets/[slug]` (slug `YYYY-MM`). O link "Orçamento" da sidebar já aponta para o mês atual, garantindo entrada imediata no planejador.
- O mês atual é calculado com base no fuso horário local do usuário (métodos `getFullYear()`/`getMonth()`), evitando regressões para o mês anterior quando o navegador ainda estiver no final do dia 1º em UTC.
- A label exibida no topo usa a data do dia 1º às 12h UTC ao formatar (`Intl.DateTimeFormat`), o que impede o recuo para o mês anterior ao aplicar o timezone `America/Sao_Paulo`.
- Trocas de mês usam `router.replace`, evitando recarga da página e mantendo histórico do navegador.
- A navegação mensal é feita pelas setas laterais na própria página do mês, carregando apenas o mês anterior e o posterior conforme o mock de referência.

## Estrutura de dados (Supabase)

- **`budget_categories`**: mantém `group_name`, `name`, `icon`, `sort`, flags `is_hidden` e `deleted_at`. A migration `0011_budget_categories_table.sql` consolida o nome pluralizado como tabela real (sem view intermediária), reaproveitando dados herdados e garantindo as mesmas políticas/índices definidos pela rotina `ensure_budget_category_schema()`. As categorias padrão em PT-BR (Contas Fixas, Necessidades, Desejos, Reservas, Dívidas e Receitas) são inseridas via função `seed_default_budget_categories()` tanto na criação de perfis quanto quando a API detecta uma organização sem registros. Todas as consultas/leads da API agora apontam para essa tabela pluralizada, que corresponde ao objeto público `public.budget_categories`.
- **`budget_goal`**: metas por categoria (`type` em `TB`/`TBD`/`MFG`/`CUSTOM`, `amount_cents`, `target_month`, `cadence`).
- **`budget_allocation`**: `assigned_cents`, `activity_cents`, `available_cents` por categoria/mês (`month` = 1º dia). O front cria linhas faltantes on-demand.
- **`budget_audit`**: log de alterações com triggers automáticos. Guarda `before`/`after`, `reason` e `user_id` (`auth.uid()`), facilitando auditoria. A função `log_budget_audit()` converte os registros para `jsonb` antes de consultar campos opcionais, evitando falhas quando a tabela alvo (como `budget_categories`) não possui `category_id`. A rotina `ensure_budget_category_schema()` também instala essa versão protegida da trigger, eliminando o erro `record "new" has no field "category_id"` em bancos ainda não migrados.
- **Função `current_org()`**: usa `request.jwt.claim.org_id`, o header `x-cc-org-id` ou o cookie `cc_org_id`. Se nada for informado, cai para `auth.uid()` e, por fim, para a org padrão `00000000-0000-0000-0000-000000000001`, evitando falhas de RLS em ambientes sem cabeçalhos explícitos.
- **`getContext()` da API**: instancia o client com o cabeçalho detectado e, caso apenas o usuário autenticado esteja disponível (ambiente sem `cc_org_id`), reidrata o client com `auth.uid()` como `org_id`. Assim o seed padrão de categorias (`ensureSeedCategories` → RPC `seed_default_budget_categories`) sempre passa pelo `with check (org_id = current_org())`, mesmo ao usar apenas a chave pública do Supabase.

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
2. **Cabeçalho do orçamento** – ocupa toda a largura útil dentro do conteúdo principal (sem topbar global), concentrando as setas de navegação do mês, o acesso rápido aos grupos de categorias e os cards-resumo de "Pronto para atribuir", "Atribuído", "Atividade" e "Disponível", juntamente com os botões `Desfazer`/`Refazer` (atalhos `⌘/Ctrl+Z` e `Shift+⌘/Ctrl+Z`).
3. **Painel lateral de insights** – à direita, mostra o mês corrente, totais principais e dicas de próximos passos. É oculto em telas menores que `xl` para priorizar o grid.
4. **Grid de categorias** – accordions por grupo, célula "Atribuído" com máscara BRL e pill de "Disponível" colorida (`cc-pill-positive`, `cc-pill-zero`, `cc-pill-negative`).
5. **Modal de nome** – abre ao clicar no nome da categoria. Permite renomear, ocultar e excluir (soft delete) com acessibilidade (`aria-modal`, foco inicial no campo).
6. **Drawer Assistente (3 passos)**:
   - *Passo 1* – tabs Semanal/Mensal/Anual/Personalizado, input de valor, prazo e estratégia para o mês seguinte. Salva via `PUT /goal`.
   - *Passo 2* – usa `calcularProjecaoMeta` para exibir progresso, CTA "Atribuir" (POST apply) e estatísticas "Atribuir este mês / Atribuído / Falta".
   - *Passo 3* – resumo, botão "Editar meta" (volta ao passo 1), "Remover" e "Atribuir".
7. **Toasts** – mensagens PT-BR (`Salvo com sucesso`, `Erro ao salvar`, etc.) expiram em 4 s e podem ser disparadas pelo store.

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
