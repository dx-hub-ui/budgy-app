# Interface Theming and Auth Guard

## Tema claro e escuro
- O aplicativo agora possui temas claro e escuro.
- O tema claro é aplicado por padrão. Usuários podem alternar entre os temas pelo botão com ícones de sol e lua localizado na Topbar.
- A escolha do tema é persistida localmente no navegador (`localStorage`) e respeita mudanças de preferência do sistema quando não houver uma seleção explícita.

## Proteção de acesso
- Todas as rotas internas dependem de autenticação. Usuários não autenticados são redirecionados para `/login` antes de qualquer conteúdo do app ser renderizado.
- Durante a checagem da sessão é exibido apenas um estado de carregamento, evitando o vazamento de conteúdo sensível.

## Menu global do usuário
- O avatar na Topbar agora abre um menu suspenso com o e-mail da conta e a ação de sair (com ícone).
- O botão de sair utiliza a API do Supabase e também está disponível dentro do menu, em vez de exposto diretamente na Topbar.
