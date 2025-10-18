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

- **`budget_categories`**: mantém `group_name`, `name`, `icon`, `sort`, flags `is_hidden` e `deleted_at`. A migration `0011_budget_categories_table.sql` consolida o nome pluralizado como tabela real (sem view intermediária), reaproveitando dados herdados e garantindo as mesmas políticas/índices definidos pela rotina `ensure_budget_category_schema()`. Quando instalações antigas ainda possuírem a estrutura legada vinculada a `budget_id`, a migration `0013_budget_categories_reset.sql` derruba a tabela antiga e recria o esquema flexível antes de reinstalar políticas/índices. As categorias padrão em PT-BR (Contas Fixas, Necessidades, Desejos, Reservas, Dívidas e Receitas) são inseridas via função `seed_default_budget_categories()` tanto na criação de perfis quanto quando a API detecta uma organização sem registros. Todas as consultas/leads da API agora apontam para essa tabela pluralizada, que corresponde ao objeto público `public.budget_categories`.
- **`default_categories`**: tabela de referência que contém os grupos e nomes base do orçamento. A migration `0015_profiles_org_defaults.sql` povoa esse catálogo e atualiza `seed_default_budget_categories()` para copiar os registros para `public.budget_categories` sempre que uma nova organização é criada. Ajustes no seed passam a ser feitos editando essa tabela (sem recompilar funções PL/pgSQL).
- **`budget_goal`**: metas por categoria (`type` em `TB`/`TBD`/`MFG`/`CUSTOM`, `amount_cents`, `target_month`, `cadence`).
- **`budget_allocation`**: `assigned_cents`, `activity_cents`, `available_cents` por categoria/mês (`month` = 1º dia). A API de snapshot cria linhas faltantes para o mês solicitado e já prepara, em background, o mês anterior e o posterior para agilizar a navegação; falhas nessas rotinas assíncronas são apenas registradas em log, mantendo a resposta principal disponível.
- **Migração `0013_budget_audit_json_columns.sql`**: converte instalações herdadas que ainda possuem colunas `before_cents`/`after_cents` para os campos `jsonb` (`before`/`after`) utilizados hoje. Isso evita o erro `column "before" of relation "budget_audit" does not exist` ao acionar os gatilhos de auditoria em bancos que vieram do protótipo inicial.
- **Função `current_org()`**: usa `request.jwt.claim.org_id`, o header `x-cc-org-id` ou o cookie `cc_org_id`. Se nada for informado, cai para `auth.uid()` e, por fim, para a org padrão `00000000-0000-0000-0000-000000000001`, evitando falhas de RLS em ambientes sem cabeçalhos explícitos. A API de perfil passa a gravar os cookies `cc_org_id` e `cc_user_id` automaticamente após o primeiro acesso.
- **`getContext()` da API**: instancia o client com o cabeçalho detectado e, caso apenas o usuário autenticado esteja disponível (ambiente sem `cc_org_id`), reidrata o client com `auth.uid()` como `org_id`. Assim o seed padrão de categorias (`ensureSeedCategories` → RPC `seed_default_budget_categories`) sempre passa pelo `with check (org_id = current_org())`, mesmo ao usar apenas a chave pública do Supabase. O helper também encaminha o `userId` como `p_actor`, garantindo que o trigger de auditoria receba o usuário correto mesmo quando a requisição usa apenas a chave pública.
- **Migração `0012_budget_org_columns.sql`**: garante que instalações antigas que ainda usam o esquema protótipo (sem `org_id`) ganhem a coluna em todas as tabelas (`budget_categories`, `budget_goal`, `budget_allocation`, `budget_audit`). Sem isso, filtros `eq("org_id", …)` das APIs retornam o erro `column "org_id" does not exist` ao abrir o orçamento.
- **Função `log_budget_audit()`**: desde a migração `0014_budget_audit_month_guard.sql`, sempre atribui um mês padrão (`date_trunc('month', now())`) quando um gatilho não informar o campo explicitamente (ex.: inserts em `budget_categories`). Isso evita violações de `NOT NULL` no histórico quando seeds ou novos cadastros forem executados.

### Escopo de organizações (`org_id`)

O aplicativo segue o modelo de um orçamento compartilhado (estilo YNAB), mas permite que cada workspace/usuário mantenha seus dados completamente isolados. O identificador `org_id` cumpre esse papel multi-tenant:

- Todas as tabelas do orçamento usam `org_id` como partição lógica e têm políticas RLS que garantem que um usuário só enxergue os registros da sua organização.
- A API (`getContext()` em `utils.ts`) detecta o `org_id` a partir do cabeçalho `x-cc-org-id`, do cookie `cc_org_id` ou, na ausência deles, cai para `auth.uid()`. Isso permite que ambientes single-user (sem escolher organização manualmente) continuem funcionais sem quebrar as políticas.
- As seeds padrão de categorias chamam `seed_default_budget_categories(p_org_id, p_actor)` sempre com o `org_id` resolvido e o usuário atual informado. Assim, os grupos e categorias públicos são criados uma única vez por organização e podem ser estendidos pelo usuário sem interferir em outros workspaces. O catálogo `default_categories` garante que instalações futuras recebam o mesmo conjunto base sem depender de listas embutidas em funções.
- Operações de auditoria, metas e alocações reutilizam o mesmo `org_id`, garantindo rastreabilidade entre organizações ao mesmo tempo em que mantêm o isolamento financeiro.

### API Next.js

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/budget/categories?month=YYYY-MM` | Garante seeds, cria alocações ausentes para o mês (e vizinhos) e devolve snapshot (`categories`, `goals`, `allocations`, totais e `ready_to_assign_cents`). |
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
2. **Cabeçalho do orçamento** – ocupa toda a largura útil dentro do conteúdo principal (sem topbar global) e agora usa um cartão branco (#FFFFFF) com tipografia em cinza-escuro (#1E1E1E). As setas de navegação permanecem em ícones cinza (#6E6E6E) e ganham hover azul (#5865F2), enquanto o card central "Pronto para atribuir" replica o visual do YNAB com fundo lima #C6FF7F, texto verde-escuro (#1C3A0D) e botão "Atribuir" integrado ao cartão (verde #3E8E41 com ícone `ChevronDown`). O bloco também mantém o acesso rápido aos grupos de categorias e os botões `Desfazer`/`Refazer` (atalhos `⌘/Ctrl+Z` e `Shift+⌘/Ctrl+Z`).
3. **Painel lateral de insights** – à direita, mostra o mês corrente, o card de "Pronto para atribuir" e os totais de "Atribuído", "Atividade" e "Disponível", além de dicas de próximos passos. É oculto em telas menores que `xl` para priorizar o grid.
4. **Grid de categorias** – accordions por grupo, célula "Atribuído" mostra o valor formatado em BRL e, ao clicar, revela um campo inline para edição. A pill de "Disponível" permanece colorida (`cc-pill-positive`, `cc-pill-zero`, `cc-pill-negative`). Clicar em qualquer linha seleciona a categoria e abre seus detalhes no painel lateral.
   - Toda a linha responde ao clique para carregar o painel lateral, enquanto apenas o texto do nome da categoria abre o modal de edição, evitando acionar a renomeação ao tocar nos espaços vazios da linha.
   - A seleção grava o `id` da categoria na query string (`?cat=`) e atualiza imediatamente o painel de detalhes sem recarregar a página, preservando o compartilhamento de links e o estado atual do mês.
5. **Modal de nome** – abre ao clicar no nome da categoria. Permite renomear, ocultar e excluir (soft delete) com acessibilidade (`aria-modal`, foco inicial no campo) e uma confirmação inline (sem `window.confirm`) antes de efetivar a exclusão.
6. **Painel lateral da categoria** – ganhou um visual inspirado no mock do YNAB mostrado acima, dividido em três estados claros:
   - O topo traz um cartão de **Saldo disponível** com o total atual, rollover do mês anterior (`prev_available_cents`) e linha-a-linha dos valores atribuídos e gastos nos dois últimos meses. Esse bloco não contém mais ações; ele serve apenas como visão geral imediata do caixa.
   - A seção **Meta da categoria** começa com um estado de boas-vindas quando não há meta: texto introdutório + botão único **Criar meta**. Ao clicar, abre-se o formulário compacto com as tabs Semanal/Mensal/Anual/Personalizado, campos "Preciso de" e (quando `type === "TBD"`) o seletor de mês. A borda inferior agrega botões "Cancelar" e "Criar meta" (ou "Salvar alterações"), além de "Excluir meta" quando já existe alvo salvo.
   - Depois de salvar, a mesma área exibe a visão geral da meta: anel de progresso laranja/amarelo, headline com a recomendação (`calcularProjecaoMeta`) e botão **Atribuir R$X** que chama `POST /goal/:id/apply`. Abaixo ficam os cards "Necessário este mês / Já atribuído / Saldo disponível" e os links para editar ou remover a meta.
   - Um cartão extra de **Auto-atribuição** agrupa métricas relevantes (atribuições e gastos do mês atual e anterior, saldo disponível e sugestão da meta) para facilitar decisões rápidas.
   - O rodapé abriga **Ações rápidas** (atribuir valor, mover de volta para Pronto para atribuir, zerar categoria) e a seção **Organizar categoria** (renomear ou arquivar). Todos os comandos disparam modais próprios de valor/confirmacão, preservando acessibilidade.
7. **Toasts** – mensagens PT-BR (`Salvo com sucesso`, `Erro ao salvar`, etc.) expiram em 4 s e podem ser disparadas pelo store. Todos os alertas/erros dos fluxos de orçamento passam a usar toasts ou mensagens inline, sem diálogos nativos do navegador.
8. **Distribuição automática** – o botão "Atribuir" do cabeçalho abre um modal que distribui automaticamente o saldo `Pronto para atribuir` entre as categorias selecionadas. O modal lista todas as categorias com checkboxes, permite selecionar/limpar em massa e antecipa quanto cada categoria receberá e qual será o novo total antes de confirmar.

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
