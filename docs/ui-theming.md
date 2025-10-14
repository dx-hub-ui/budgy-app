# Interface Theming and Auth Guard

## Tema claro e escuro
- O aplicativo agora possui temas claro e escuro.
- O tema claro é aplicado por padrão. Usuários podem alternar entre os temas pelo botão com ícones de sol e lua localizado na Topbar.
- A escolha do tema é persistida localmente no navegador (`localStorage`) e respeita mudanças de preferência do sistema quando não houver uma seleção explícita.
- A logomarca exibida na Topbar respeita o tema ativo, utilizando as versões claras e escuras disponibilizadas em `/public/brand`.

## Proteção de acesso
- Todas as rotas internas dependem de autenticação. Usuários não autenticados são redirecionados para `/login` antes de qualquer conteúdo do app ser renderizado.
- Durante a checagem da sessão é exibido apenas um estado de carregamento, evitando o vazamento de conteúdo sensível.
- O gerenciamento de sessão evita o uso de hooks condicionais, garantindo que os builds de produção concluam sem erros de lint.
- Quando variáveis de ambiente do Supabase não estiverem presentes, o cliente de autenticação entra em modo de simulação para permitir builds locais sem falhas.

## Menu global do usuário
- O avatar na Topbar agora abre um menu suspenso com o e-mail da conta e a ação de sair (com ícone).
- O botão de sair utiliza a API do Supabase e também está disponível dentro do menu, em vez de exposto diretamente na Topbar.

## Layout da Topbar
- A Topbar agora ocupa 100% da largura disponível, mantendo apenas um espaçamento lateral pelo padding padrão do layout.
- A área de branding permanece ancorada à esquerda exibindo a logomarca adequada ao tema ativo, enquanto as ações do usuário (alternância de tema, notificações e menu do avatar) ficam agrupadas no extremo direito.
- O botão de colapsar a sidebar foi removido da Topbar; a alternância continua disponível diretamente na própria sidebar e via atalho de teclado.
