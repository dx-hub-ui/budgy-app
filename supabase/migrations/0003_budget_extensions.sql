-- additional budgeting structures to support advanced workflow

-- auxiliary month dimension for budgets
create table if not exists public.budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  month date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

-- extend existing budget_categories with grouping metadata
alter table if exists public.budget_categories
  add column if not exists group_name text;

-- allocations table to persist calculated activity/available snapshots per month
create table if not exists public.budget_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid references public.categories(id) on delete set null,
  month date not null,
  budgeted_cents int not null default 0,
  activity_cents int not null default 0,
  available_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- goals metadata
create table if not exists public.budget_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  goal_type text not null check (goal_type in ('TB','TBD','MFG')),
  amount_cents int not null,
  target_month date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cached statistics for quick budget suggestions
create table if not exists public.budget_quick_stats (
  user_id uuid not null,
  month date not null,
  totals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- audit trail for manual adjustments
create table if not exists public.budget_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid references public.categories(id) on delete set null,
  month date not null,
  before_cents int,
  after_cents int,
  reason text,
  created_at timestamptz not null default now()
);

-- helper to touch updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- keep timestamps fresh
drop trigger if exists t_budget_allocations_touch on public.budget_allocations;
create trigger t_budget_allocations_touch
  before update on public.budget_allocations
  for each row execute function public.touch_updated_at();

drop trigger if exists t_budget_goals_touch on public.budget_goals;
create trigger t_budget_goals_touch
  before update on public.budget_goals
  for each row execute function public.touch_updated_at();

drop trigger if exists t_budget_quick_stats_touch on public.budget_quick_stats;
create trigger t_budget_quick_stats_touch
  before update on public.budget_quick_stats
  for each row execute function public.touch_updated_at();

-- core recomputation routine (placeholder implementation retains compatibility)
create or replace function public.fn_recalc_month(p_user_id uuid, p_month date)
returns void
language plpgsql
as $$
begin
  -- this implementation acts as a placeholder so existing workloads succeed during the migration.
  -- downstream services should extend it to sync with the transaction ledger when available.
  update public.budget_allocations
     set updated_at = now()
   where user_id = p_user_id and month = p_month;
end;
$$;

create or replace function public.fn_apply_quick_budget(p_user_id uuid, p_month date, p_mode text)
returns jsonb
language plpgsql
as $$
begin
  -- placeholder that returns an empty diff; frontend applies calculations optimistically.
  return '[]'::jsonb;
end;
$$;

create or replace function public.tr_expenses_budget_refresh()
returns trigger
language plpgsql
as $$
begin
  perform public.fn_recalc_month(
    coalesce(new.user_id, old.user_id),
    coalesce(date_trunc('month', new.date), date_trunc('month', old.date))::date
  );
  return coalesce(new, old);
end;
$$;

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    EXECUTE 'drop trigger if exists tr_expenses_budget_refresh on public.expenses';
    EXECUTE 'create trigger tr_expenses_budget_refresh '
      'after insert or update or delete on public.expenses '
      'for each row execute function public.tr_expenses_budget_refresh()';
  END IF;
END;
$$;

alter table public.budget_months enable row level security;
alter table public.budget_allocations enable row level security;
alter table public.budget_goals enable row level security;
alter table public.budget_quick_stats enable row level security;
alter table public.budget_audit enable row level security;

drop policy if exists "budget_months_own" on public.budget_months;
create policy "budget_months_own" on public.budget_months
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "budget_allocations_own" on public.budget_allocations;
create policy "budget_allocations_own" on public.budget_allocations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "budget_goals_own" on public.budget_goals;
create policy "budget_goals_own" on public.budget_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "budget_quick_stats_own" on public.budget_quick_stats;
create policy "budget_quick_stats_own" on public.budget_quick_stats
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "budget_audit_own" on public.budget_audit;
create policy "budget_audit_own" on public.budget_audit
  for select using (user_id = auth.uid());
