# Gestão de perfil do usuário

A tela **Meu Perfil** está disponível pelo menu do avatar (item "Meu Perfil") e permite que cada pessoa personalize as suas informações básicas.

## Campos disponíveis
- **Avatar**: é possível enviar imagens PNG, JPG, WEBP ou GIF de até 5MB. Os arquivos são armazenados no [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). O preview é atualizado imediatamente após o upload e pode ser removido a qualquer momento.
- **Nome de exibição**: usado em toda a interface (Topbar, menu lateral e mensagens do aplicativo). Limite de 120 caracteres.
- **Fuso horário**: lista com todos os timezones suportados por `Intl.supportedValuesOf("timeZone")`. Quando não disponível, o formulário apresenta uma lista reduzida com as opções mais comuns.
- **E-mail**: exibido como campo somente leitura.

## Salvamento
- As alterações são persistidas na tabela `public.profiles` do Supabase.
- Ao salvar, o contexto de autenticação (`useAuth`) é atualizado para refletir o novo nome, avatar e fuso horário sem a necessidade de recarregar a página.
- Os metadados do usuário no Supabase (display name e avatar) também são sincronizados para manter coesão com integrações futuras.

## Acessibilidade e UX
- O formulário fornece feedback textual tanto para sucesso quanto para erro.
- Botões e inputs respeitam os estilos globais (`var(--cc-accent)`, `var(--cc-border)`), garantindo contraste adequado em ambos os temas.
- O avatar mantém borda e formato consistente com o restante da interface, seja utilizando imagem ou iniciais.
