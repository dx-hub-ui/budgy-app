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
4. After saving, you will be redirected to the dashboard (`/`).

These steps verify the Supabase mutations and client-side validation introduced in sprint 2.

## 6. Sprint 3 dashboard and export validation

Sprint 3 wires the dashboard metrics and CSV export to live Supabase data. After completing the steps above:

1. Refresh the dashboard (`/`) and use the selector to switch between months. The headline cards update totals and expense counts based on Supabase queries.
2. Confirm that the “Recentes” list shows the 20 most recent expenses, including descriptions and category context where available.
3. Visit `/export`, choose the same month, and click **Baixar CSV**. The downloaded file should contain every expense within the selected window along with category names and formatted amounts.
4. Open the CSV in a spreadsheet editor to confirm UTF-8 encoding and escaped quotes.

If any of these steps fail, re-run `pnpm dev` to observe console output and ensure the Supabase environment variables are set.
