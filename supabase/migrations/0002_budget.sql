-- budgets (head mensal)
create table if not exists public.budgets(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  year int not null,
  month int not null check (month between 1 and 12),
  to_budget_cents int not null default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year, month)
);
-- budget_categories (linhas do orçamento)
create table if not exists public.budget_categories(
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  budgeted_cents int not null default 0,
  activity_cents int not null default 0,
  available_cents int not null default 0,
  rollover boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- view de execução por categoria/mês
create or replace view public.v_budget_activity as
select
  e.user_id,
  date_part('year', e.date)::int as year,
  date_part('month', e.date)::int as month,
  e.category_id,
  sum(e.amount_cents)::bigint as executed_cents
from public.expenses e
where e.deleted_at is null
group by 1,2,3,4;

-- RLS
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;

create policy "budgets_own" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "budget_cats_own" on public.budget_categories
  for all using (exists (
    select 1 from public.budgets b where b.id = budget_categories.budget_id and b.user_id = auth.uid()
  ));

-- triggers updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists t_budgets_touch on public.budgets;
create trigger t_budgets_touch before update on public.budgets
for each row execute function public.touch_updated_at();
drop trigger if exists t_budget_categories_touch on public.budget_categories;
create trigger t_budget_categories_touch before update on public.budget_categories
for each row execute function public.touch_updated_at();
