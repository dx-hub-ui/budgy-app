-- Payees support for transactions and budgeting
create table if not exists public.payees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default current_org(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.payees enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'payees_org_name_key'
  ) then
    execute 'create unique index payees_org_name_key on public.payees(org_id, lower(name))';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 't_payees_touch'
      and tgrelid = 'public.payees'::regclass
  ) then
    execute 'create trigger t_payees_touch before update on public.payees for each row execute function public.touch_updated_at()';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payees'
      and policyname = 'payees_org'
  ) then
    execute 'create policy payees_org on public.payees for all using (org_id = current_org()) with check (org_id = current_org())';
  end if;
end;
$$;

alter table public.account_transactions
  add column if not exists payee_id uuid references public.payees(id) on delete set null;

create index if not exists account_transactions_payee_idx
  on public.account_transactions(org_id, payee_id);
