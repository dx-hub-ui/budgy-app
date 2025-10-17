# Gestão de perfil do usuário

A tela **Meu Perfil** está disponível pelo menu do avatar na barra lateral (item "Meu Perfil") e permite que cada pessoa personalize as suas informações básicas.

## Campos disponíveis
- **Avatar**: é possível enviar imagens PNG, JPG, WEBP ou GIF de até 5MB. Os arquivos são armazenados no [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). O preview é atualizado imediatamente após o upload e pode ser removido a qualquer momento.
- **Nome de exibição**: usado em toda a interface (menu lateral e mensagens do aplicativo). Limite de 120 caracteres.
- **Fuso horário**: lista com todos os timezones suportados por `Intl.supportedValuesOf("timeZone")`. Quando não disponível, o formulário apresenta uma lista reduzida com as opções mais comuns.
- **Telefone**: campo opcional para contato/identificação rápida. Aceita números, espaços e os símbolos `+`, `(`, `)`, `-` e `.` (limitado a 32 caracteres).
- **E-mail**: exibido como campo somente leitura.

Cada perfil guarda ainda o `org_id` atribuído automaticamente na criação do usuário. Esse identificador é exposto como cookie (`cc_org_id`) sempre que `/api/profile` é chamado, permitindo que o backend resolva a organização atual sem depender de headers customizados.

## Salvamento
- As alterações são persistidas na tabela `public.profiles` do Supabase.
- Ao salvar, o contexto de autenticação (`useAuth`) é atualizado para refletir o novo nome, avatar e fuso horário sem a necessidade de recarregar a página.
- Os metadados do usuário no Supabase (display name, avatar e telefone) também são sincronizados para manter coesão com integrações futuras.
- As chamadas para `/api/profile` agora enviam o token da sessão no header `Authorization: Bearer`, garantindo que o Supabase valide o usuário antes de aplicar qualquer atualização e evitando o erro `{"message":"Não autenticado"}` ao salvar.
- O backend força que todas as requisições ao Supabase incluam os headers `apikey` e `Authorization` com a chave de serviço, evitando respostas `401 no_authorization` quando o token de sessão do usuário precisa ser validado.
- Quando a chave de serviço não está disponível, o backend utiliza apenas o token da sessão do usuário para preencher nome e e-mail padrão do perfil, evitando falhas `not_admin` ao carregar os dados.
- As políticas de RLS `profiles insert self` e `profiles update self` garantem que cada usuário autenticado possa criar ou atualizar o próprio registro em `public.profiles` sem depender de privilégios administrativos, evitando erros `new row violates row-level security policy` durante o primeiro acesso.

Quando um usuário é criado no `auth.users`, a trigger `t_auth_users_profile` executa `sync_profile_from_auth()` para inserir/atualizar o registro correspondente em `public.profiles`, gerar o `org_id` e acionar `seed_default_budget_categories()` informando o próprio usuário como ator (`p_actor`). Assim o workspace recém-criado já recebe todas as categorias padrão definidas em `public.default_categories` e os logs de auditoria registram corretamente quem disparou a seed.

## Acessibilidade e UX
- O formulário fornece feedback textual tanto para sucesso quanto para erro.
- Botões e inputs respeitam os estilos globais (`var(--cc-accent)`, `var(--cc-border)`), garantindo contraste adequado em ambos os temas.
- O avatar mantém borda e formato consistente com o restante da interface, seja utilizando imagem ou iniciais.
- Enquanto o perfil é carregado, a aplicação exibe um estado de carregamento discreto e, em caso de ausência de dados, recorre ao e-mail do usuário para preencher o nome de exibição.
