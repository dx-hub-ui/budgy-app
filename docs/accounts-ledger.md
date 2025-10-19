# Contas – Ledger unificado

## Sincronização com o orçamento
- As categorias exibidas no ledger de contas agora são carregadas diretamente de `public.budget_categories`, garantindo que as opções reflitam o mesmo catálogo utilizado pelo orçamento mensal.
- O seletor de categorias é agrupado por `group_name` e honra as flags `is_hidden`/`deleted_at` para esconder categorias arquivadas.
- A API `/api/budget/categories` passa a recalcular `activity_cents`, `inflows_cents` e `ready_to_assign_cents` lendo diretamente as linhas de `account_transactions`, refletindo despesas por categoria e entradas em "Disponível para orçar" imediatamente após o lançamento.

## Criação e edição inline
- O botão **Adicionar transação** abre uma nova linha editável no topo da tabela, mantendo o usuário na mesma página.
- Entradas e saídas aceitam valores livres (sem validação obrigatória de categoria). Caso a transação seja salva sem categoria, um _badge_ laranja "Requer uma categoria" aparece sobre a célula.
- Ao clicar no alerta, uma barra de ações azul surge fixa no rodapé da tela com atalhos como **Categorizar** e **Sem categoria**. A seleção confirma imediatamente via `updateExpense`.
- Um duplo clique na célula de categoria também abre a barra já com o seletor expandido para acelerar a triagem de múltiplos lançamentos.
- O campo **Beneficiário** oferece busca incremental e cria registros em `public.payees` sob demanda, preenchendo `payee_id` na transação. O botão "Gerenciar beneficiários" abre o modal administrativo para renomear ou arquivar entradas.
- Memos vazios continuam sendo enviados como `null`, preservando integrações que diferenciam campos em branco de campos não informados.

## Tratamento de valores
- Os campos de valor trabalham com entrada textual em PT-BR e normalizam o conteúdo para centavos (`parseCurrencyInput`).
- Valores positivos representam entradas (`direction = inflow`) e negativos representam saídas (`direction = outflow`).
- Após a persistência, os dados são atualizados chamando `listExpenses()` para manter saldo, totais e painel lateral sincronizados.

## Acessibilidade
- A barra flutuante pode ser fechada pelo botão "Fechar" ou salvando uma categoria, e permanece acessível via teclado (os botões recebem `aria-expanded`/`aria-pressed` adequados).
- Todos os rótulos da UI permanecem em PT-BR conforme o padrão do produto.

## Layout atualizado (dez/2024)
- O conteúdo principal ocupa toda a largura útil do `Shell`, sem cartões elevados. Sidebar e cabeçalho foram simplificados para
  replicar a hierarquia visual da página de orçamento.
- A seção "Lançamentos" apresenta contagem e busca inline com bordas sutis, alinhadas ao screenshot de referência.
- A barra de ações agora mantém o botão **Adicionar transação** alinhado à esquerda da listagem, enquanto **Reconciliar** fica
  sozinho no topo direito do cabeçalho, reproduzindo o layout exibido na captura de referência.
- Métricas do cabeçalho permanecem visíveis como texto puro, evitando painéis destacados para facilitar leitura em telas grandes.

## Menu lateral unificado (jan/2025)
- A navegação principal agora inclui o bloco **Contas** com saldo total e agrupamento por `group_label`, permitindo alternar entre
  contas diretamente pela sidebar.
- O botão **+ Criar conta** abre um modal em duas etapas: primeiro o usuário informa o nome, depois escolhe o tipo dentro de
  categorias traduzidas para PT-BR (contas à vista, crédito, financiamentos/empréstimos e acompanhamento).
- Após a criação, o app redireciona automaticamente para o ledger da nova conta e persiste a seleção em `localStorage` via chave
  `cc_last_account`.

## Compatibilidade com triggers antigas
- A migration `0017_fix_budget_refresh.sql` redefine `public.fn_recalc_month` para ignorar a antiga tabela
  `public.budget_allocations`. Em instalações novas, a função apenas verifica a existência de linhas em `public.budget_allocation`,
  eliminando o erro "relation public.budget_allocations does not exist" ao salvar transações.
