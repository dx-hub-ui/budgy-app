-- Accounts and account linkage
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null check (type in ('cash','checking','credit','savings','investment','other')),
  default_method text check (default_method in ('pix','debito','credito','dinheiro')),
  group_label text not null,
  sort int not null default 0,
  is_closed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists accounts_user_sort_idx on public.accounts(user_id, sort);

alter table public.accounts enable row level security;

create policy if not exists "accounts_select_own" on public.accounts
  for select using (user_id = auth.uid());

create policy if not exists "accounts_insert_own" on public.accounts
  for insert with check (user_id = auth.uid());

create policy if not exists "accounts_update_own" on public.accounts
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "accounts_delete_own" on public.accounts
  for delete using (user_id = auth.uid());

create trigger if not exists t_accounts_touch
  before update on public.accounts
  for each row execute function public.touch_updated_at();

alter table public.expenses
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.expenses
  add column if not exists memo text;

alter table public.expenses
  add column if not exists direction text not null default 'outflow' check (direction in ('outflow','inflow'));

create index if not exists expenses_account_idx on public.expenses(account_id);
