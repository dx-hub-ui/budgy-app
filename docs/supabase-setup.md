# Supabase Local Setup

Follow these steps to run the ContaCerta Supabase-backed MVP locally.

## 1. Environment variables
Create a `.env.local` file in the project root (never commit this file) with the credentials from your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These values are available in the Supabase dashboard under **Project Settings → API**.

## 2. Apply database migration
Install the Supabase CLI if it is not already available:

```
npm install -g supabase
```

Authenticate the CLI and target your project:

```
supabase login
supabase link --project-ref <your-project-ref>
```

Then push the migration included in this repository:

```
supabase db push
```

This command runs the SQL script at `supabase/migrations/0001_init.sql`, creating tables, indexes, triggers, and RLS policies required for the MVP.

## 3. Configure storage bucket
Create a private bucket named `receipts` in the Supabase dashboard. Add a policy that allows authenticated users to read and write only their own files:

```
auth.role() = 'authenticated' and request.auth.uid() = user_id
```

File uploads are deferred to a later sprint, so leaving `attachment_url` empty is expected during this iteration.

## 4. Run the app locally
Install dependencies and start the development server:

```
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and visit `/login` to request a magic link. After authenticating, the top bar will display your Supabase user email and offer a sign-out button.

> **Magic link redirect URL**
>
> Add `http://localhost:3000/auth/callback` (and any deployed domains such as `https://app.budgy.com.br/auth/callback`) to **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard. The callback screen now lives at `src/app/auth/callback/page.tsx`, so every environment must point Supabase to `/auth/callback` to ensure the page can capture the access and refresh tokens before navigating to the orçamento (`/budgets/<ano-mes>`).

## 5. Load development seed data

To populate the dashboard with realistic fixtures, use the included seed script. It creates a confirmed Supabase user (`demo@contacerta.test` by default), ensures the related profile, and inserts example categories and expenses covering the last two months.

1. Add your Supabase service role key to the environment (locally you can place it in `.env.local` or export it inline) alongside the existing URL:

   ```
   export NEXT_PUBLIC_SUPABASE_URL=your-project-url
   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Optionally override `SEED_EMAIL` and `SEED_PASSWORD` if you prefer different demo credentials.

2. Run the script:

   ```
   pnpm seed
   ```

Re-running the command is safe—the script is idempotent and only inserts records that are missing for the configured user.

## 6. Sprint 2 CRUD validation

With a signed-in session you can exercise the new category and transaction flows:

1. Navigate to `/categories` and add a couple of sample categories with distinct colors.
2. Use the delete action to confirm that Supabase writes propagate instantly.
3. Head to `/new` to create a transaction, selecting a category, payment method, and optional description.
4. After saving, you will be redirected to the dashboard (`/`).

These steps verify the Supabase mutations and client-side validation introduced in sprint 2.

## 7. Sprint 3 dashboard and export validation

Sprint 3 wires the dashboard metrics and CSV export to live Supabase data. After completing the steps above:

1. Refresh the dashboard (`/`) and use the selector to switch between months. The headline cards update totals and transaction counts based on Supabase queries.
2. Confirm that the “Recentes” list shows the 20 most recent transactions, including descriptions and category context where available.
3. Visit `/export`, choose the same month, and click **Baixar CSV**. The downloaded file should contain every transaction within the selected window along with category names and formatted amounts.
4. Open the CSV in a spreadsheet editor to confirm UTF-8 encoding and escaped quotes.

If any of these steps fail, re-run `pnpm dev` to observe console output and ensure the Supabase environment variables are set.

## 8. Sprint 4 contas e conciliações

O módulo de contas cria uma tabela dedicada (`public.accounts`) com políticas de RLS, mapeia cada lançamento financeiro a uma
conta (`account_id`) e registra o sentido de cada movimento (`direction`, com valores `outflow` ou `inflow`). A migration
`0019_migrate_expenses_to_account_transactions.sql` consolida o livro-razão em `public.account_transactions`, garante o campo
`method` e remove a antiga tabela `public.expenses`.

Após executar `pnpm seed`, o usuário demo passa a contar com quatro contas padrão (Conta Corrente, Carteira, Carteira Pix e
Cartão de Crédito). Cada lançamento carregado pelo seed recebe automaticamente o `account_id` correspondente, preserva o método
de pagamento original e passa a ser registrado exclusivamente na tabela `public.account_transactions`. Isso permite testar a
tela `/contas`, que agrupa contas por tipo, apresenta saldos calculados em tempo real e permite inserir novas transações
diretamente na grade.

Para validar o fluxo completo:

1. Acesse `/contas`. A barra lateral deve listar os grupos e o saldo consolidado do plano.
2. Clique em **Adicionar conta** para abrir o formulário `/contas/nova` e cadastre uma conta manual. Após salvar você será
   redirecionado para o registro da conta recém-criada.
3. Use a linha de inserção rápida no topo da tabela para registrar uma saída (preenchendo apenas a coluna **Saída**) ou uma
   entrada. O registro aparece imediatamente com a categoria, memo e valores formatados.
4. Ative os botões **Adicionar transferência** ou **Reconciliar** para exibir orientações sobre os próximos passos.

Os comandos de build (`pnpm build`) e o teste unitário (`pnpm test`) continuam obrigatórios após qualquer alteração estruturante
no banco. Se algo falhar, rode novamente as migrations com `supabase db reset` antes de testar.

## Troubleshooting authentication issues

- When developing offline or before Supabase credentials are configured correctly, the app may briefly show the `Carregando…` sta
  te before redirecting you back to `/login`. The AuthGate now treats initialization errors as an unauthenticated state so you can
  recover by fixing the connection or credentials and attempting to log in again.
- Requests to `/api/budget/allocation` (and the remaining budget module routes) now return `503 Serviço indisponível` with the message
  "Não foi possível conectar ao Supabase" when the RPC or tables are unreachable. Double-check the `NEXT_PUBLIC_SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` variables and the network connectivity before retrying.
