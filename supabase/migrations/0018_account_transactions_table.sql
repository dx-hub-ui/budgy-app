-- Account transactions ledger and budgeting enhancements
create table if not exists public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default current_org(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.budget_categories(id) on delete set null,
  amount_cents bigint not null check (amount_cents >= 0),
  direction text not null check (direction in ('outflow','inflow')),
  occurred_on date not null,
  description text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.account_transactions enable row level security;

create index if not exists account_transactions_org_month_idx
  on public.account_transactions(org_id, occurred_on);

create index if not exists account_transactions_category_idx
  on public.account_transactions(org_id, category_id, occurred_on);

create index if not exists account_transactions_account_idx
  on public.account_transactions(org_id, account_id, occurred_on);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_transactions'
      and policyname = 'account_transactions_org'
  ) then
    execute $policy$
      create policy account_transactions_org on public.account_transactions
        for all
        using (org_id = current_org())
        with check (org_id = current_org());
    $policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 't_account_transactions_touch'
      and tgrelid = 'public.account_transactions'::regclass
  ) then
    execute $trigger$
      create trigger t_account_transactions_touch
        before update on public.account_transactions
        for each row execute function public.touch_updated_at();
    $trigger$;
  end if;
end;
$$;

-- Ensure budgeting tables support notes and due dates
alter table public.budget_categories
  add column if not exists note text;

alter table public.budget_goal
  add column if not exists due_day_of_month smallint check (due_day_of_month between 1 and 31);

-- Refresh helper to materialize the latest schema when provisioned lazily
create or replace function public.ensure_budget_category_schema()
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if to_regclass('public.budget_categories') is null then
    execute $_ddl$
      create table public.budget_categories(
        id uuid primary key default gen_random_uuid(),
        org_id uuid not null default current_org(),
        group_name text not null,
        name text not null,
        icon text,
        sort int not null default 0,
        is_hidden boolean not null default false,
        deleted_at timestamptz,
        note text,
        created_at timestamptz not null default now()
      );
    $_ddl$;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_categories'
      and column_name = 'note'
  ) then
    execute 'alter table public.budget_categories add column note text';
  end if;

  if to_regclass('public.budget_goal') is null then
    execute $_ddl$
      create table public.budget_goal(
        id uuid primary key default gen_random_uuid(),
        org_id uuid not null default current_org(),
        category_id uuid not null references public.budget_categories(id) on delete cascade,
        type text not null check (type in ('TB','TBD','MFG','CUSTOM')),
        amount_cents int not null,
        target_month date,
        cadence text check (cadence in ('weekly','monthly','yearly','custom')),
        due_day_of_month smallint check (due_day_of_month between 1 and 31),
        created_at timestamptz not null default now()
      );
    $_ddl$;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_goal'
      and column_name = 'due_day_of_month'
  ) then
    execute 'alter table public.budget_goal add column due_day_of_month smallint check (due_day_of_month between 1 and 31)';
  end if;

  if to_regclass('public.budget_allocation') is null then
    execute $_ddl$
      create table public.budget_allocation(
        org_id uuid not null default current_org(),
        category_id uuid not null references public.budget_categories(id) on delete cascade,
        month date not null,
        assigned_cents int not null default 0,
        activity_cents int not null default 0,
        available_cents int not null default 0,
        primary key(org_id, category_id, month)
      );
    $_ddl$;
  end if;

  if to_regclass('public.budget_audit') is null then
    execute $_ddl$
      create table public.budget_audit(
        id uuid primary key default gen_random_uuid(),
        org_id uuid not null default current_org(),
        category_id uuid,
        month date,
        user_id uuid,
        before jsonb,
        after jsonb,
        reason text,
        created_at timestamptz not null default now()
      );
    $_ddl$;
  end if;

  perform public.ensure_budget_category_policies();
  perform public.ensure_budget_category_indexes();
  perform public.ensure_budget_category_audit_triggers();
end;
$function$;
