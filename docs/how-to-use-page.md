# Página "Como usar o Budgy"

Esta página descreve a implementação da rota `/como-usar`, que transforma o documento "Método Orçamento com Propósito — O Sistema Budgy" em um guia navegável dentro do app.

## Estrutura

- **Fundamento**: reforça a ideia de que todo real precisa de propósito e aponta o link direto para o orçamento.
- **Quatro Regras**: cada regra recebe um bloco com descrição ampliada e uma lista de ações recomendadas no produto.
- **Estrutura de categorias**: apresenta os quatro grupos sugeridos no documento original com exemplos práticos.
- **Rotina de aplicação**: distribui tarefas em cadências diária, semanal e mensal.
- **Princípios**: transforma os princípios do método em comportamentos observáveis.
- **Delta**: destaca o que já está coberto na plataforma e o que ainda depende de evolução.

## Acessos rápidos

O item "Como usar" foi adicionado ao menu lateral autenticado (`Sidebar.tsx`). Ele pode ser acessado por qualquer usuário logado e está localizado após o item de exportação.

## Próximos passos sugeridos

- Integrar métricas em tempo real (por exemplo, "Idade do Dinheiro") diretamente nesta página quando os dados estiverem disponíveis na API.
- Adicionar vídeos curtos ou ilustrações assim que a biblioteca de assets for produzida.
- Exibir alertas dinâmicos para metas atrasadas, aproveitando o contexto do orçamento carregado.
