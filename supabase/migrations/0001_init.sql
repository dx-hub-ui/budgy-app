-- Extensions
create extension if not exists pgcrypto with schema public;
create extension if not exists "uuid-ossp" with schema public;

-- Tables
create table public.profiles(
  id uuid primary key default auth.uid(),
  email text unique,
  created_at timestamptz default now()
);

create table public.categories(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  color text not null default '#6ea8fe',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.expenses(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  amount_cents int not null check (amount_cents > 0),
  "date" date not null,
  category_id uuid references public.categories(id) on delete set null,
  method text not null check (method in ('pix','debito','credito','dinheiro')),
  description text,
  attachment_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Indices
create index on public.categories(user_id, name);
create index on public.expenses(user_id, "date");
create index on public.expenses(user_id, updated_at);

-- RLS
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.expenses  enable row level security;

create policy "profiles self" on public.profiles
  for select using (id = auth.uid());

create policy "cats select own" on public.categories
  for select using (user_id = auth.uid());
create policy "cats ins own" on public.categories
  for insert with check (user_id = auth.uid());
create policy "cats upd own" on public.categories
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "cats del own" on public.categories
  for delete using (user_id = auth.uid());

create policy "exp select own" on public.expenses
  for select using (user_id = auth.uid() and deleted_at is null);
create policy "exp ins own" on public.expenses
  for insert with check (user_id = auth.uid());
create policy "exp upd own" on public.expenses
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "exp del own" on public.expenses
  for delete using (user_id = auth.uid());

-- Triggers updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_categories_touch before update on public.categories
for each row execute function public.touch_updated_at();

create trigger t_expenses_touch before update on public.expenses
for each row execute function public.touch_updated_at();

-- Seed categories utility (optional)
-- insert into public.categories(name,color) values ('Alimentação','#22c55e'),('Transporte','#3b82f6'),('Lazer','#f59e0b');
