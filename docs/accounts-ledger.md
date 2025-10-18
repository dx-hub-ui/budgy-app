# Contas – Ledger unificado

## Sincronização com o orçamento
- As categorias exibidas no ledger de contas agora são carregadas diretamente de `public.budget_categories`, garantindo que as opções reflitam o mesmo catálogo utilizado pelo orçamento mensal.
- O seletor de categorias é agrupado por `group_name` e honra as flags `is_hidden`/`deleted_at` para esconder categorias arquivadas.

## Criação e edição inline
- O botão **Adicionar transação** abre uma nova linha editável no topo da tabela, mantendo o usuário na mesma página.
- Entradas e saídas aceitam valores livres (sem validação obrigatória de categoria). Caso a transação seja salva sem categoria, um _badge_ laranja "Requer uma categoria" aparece sobre a célula.
- Ao clicar no alerta, um popover azul apresenta atalhos de categoria. A ação salva imediatamente a categoria via `updateExpense`.

## Tratamento de valores
- Os campos de valor trabalham com entrada textual em PT-BR e normalizam o conteúdo para centavos (`parseCurrencyInput`).
- Valores positivos representam entradas (`direction = inflow`) e negativos representam saídas (`direction = outflow`).
- Após a persistência, os dados são atualizados chamando `listExpenses()` para manter saldo, totais e painel lateral sincronizados.

## Acessibilidade
- O popover pode ser fechado pelo botão "Fechar" ou clicando fora da célula.
- Todos os rótulos da UI permanecem em PT-BR conforme o padrão do produto.

## Layout atualizado (dez/2024)
- O conteúdo principal ocupa toda a largura útil do `Shell`, sem cartões elevados. Sidebar e cabeçalho foram simplificados para
  replicar a hierarquia visual da página de orçamento.
- A seção "Lançamentos" apresenta contagem e busca inline com bordas sutis, alinhadas ao screenshot de referência.
- Métricas do cabeçalho permanecem visíveis como texto puro, evitando painéis destacados para facilitar leitura em telas grandes.

## Compatibilidade com triggers antigas
- A migration `0017_fix_budget_refresh.sql` redefine `public.fn_recalc_month` para ignorar a antiga tabela
  `public.budget_allocations`. Em instalações novas, a função apenas verifica a existência de linhas em `public.budget_allocation`,
  eliminando o erro "relation public.budget_allocations does not exist" ao salvar transações.
