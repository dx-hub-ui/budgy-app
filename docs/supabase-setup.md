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

## 5. Sprint 2 CRUD validation

With a signed-in session you can exercise the new category and expense flows:

1. Navigate to `/categories` and add a couple of sample categories with distinct colors.
2. Use the delete action to confirm that Supabase writes propagate instantly.
3. Head to `/new` to create expenses, selecting a category, payment method, and optional description.
4. After saving, you will be redirected to the dashboard (`/`), where the latest expenses will surface once sprint 3 lands.

These steps verify the Supabase mutations and client-side validation introduced in sprint 2.
