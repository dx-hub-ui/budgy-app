# Página "Como usar o Budgy"

Esta página descreve a implementação da rota `/como-usar`, que transforma o documento "Método Orçamento com Propósito — O Sistema Budgy" em um guia navegável dentro do app.

## Estrutura

- **Fundamento**: reforça a ideia de que todo real precisa de propósito e aponta o link direto para o orçamento.
- **Quatro Regras**: cada regra recebe um bloco com descrição ampliada e uma lista de ações recomendadas no produto.
- **Estrutura de categorias**: apresenta os quatro grupos sugeridos no documento original com exemplos práticos.
- **Rotina de aplicação**: distribui tarefas em cadências diária, semanal e mensal.
- **Princípios**: transforma os princípios do método em comportamentos observáveis.
- **Delta**: destaca o que já está coberto na plataforma e o que ainda depende de evolução.
- **Acessibilidade textual**: usamos aspas tipográficas para destacar ações da interface sem quebrar as regras de linting do React.

## Acessos rápidos

O item "Como usar" foi adicionado ao menu lateral autenticado (`Sidebar.tsx`). Ele pode ser acessado por qualquer usuário logado e está localizado após o item de contas.

### Atualização de navegação na Sidebar

Para garantir que a seleção de menu reflita imediatamente a página ativa, os cliques nos itens da Sidebar agora acionam `router.push` diretamente no `onClick` dos links. Isso evita estados inconsistentes do `pathname` e assegura que indicadores de item ativo sejam atualizados assim que a navegação ocorre.

Além disso, todos os destinos expostos na Sidebar (dashboard de orçamentos, relatórios, contas específicas e o atalho da home) são pré-carregados via `router.prefetch`. Isso garante que cada rota responda com fluidez mesmo na primeira interação e ajuda a validar que cada item do menu está devidamente roteando para sua página correspondente.

## Próximos passos sugeridos

- Integrar métricas em tempo real (por exemplo, "Idade do Dinheiro") diretamente nesta página quando os dados estiverem disponíveis na API.
- Adicionar vídeos curtos ou ilustrações assim que a biblioteca de assets for produzida.
- Exibir alertas dinâmicos para metas atrasadas, aproveitando o contexto do orçamento carregado.
