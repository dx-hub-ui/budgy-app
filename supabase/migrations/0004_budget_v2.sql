-- Budget v2 navy+mint rollout
create or replace function public.current_org() returns uuid as $$
  select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.uid());
$$ language sql stable;

create table if not exists public.budget_category(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default current_org(),
  group_name text not null,
  name text not null,
  icon text,
  sort int not null default 0,
  is_hidden boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_goal(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default current_org(),
  category_id uuid not null references public.budget_category(id) on delete cascade,
  type text not null check (type in ('TB','TBD','MFG','CUSTOM')),
  amount_cents int not null,
  target_month date,
  cadence text check (cadence in ('weekly','monthly','yearly','custom')),
  created_at timestamptz not null default now()
);

create table if not exists public.budget_allocation(
  org_id uuid not null default current_org(),
  category_id uuid not null references public.budget_category(id) on delete cascade,
  month date not null,
  assigned_cents int not null default 0,
  activity_cents int not null default 0,
  available_cents int not null default 0,
  primary key(org_id, category_id, month)
);

create table if not exists public.budget_audit(
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

alter table public.budget_category enable row level security;
alter table public.budget_goal enable row level security;
alter table public.budget_allocation enable row level security;
alter table public.budget_audit enable row level security;

create policy "budget_category_org" on public.budget_category
  for all using (org_id = current_org())
  with check (org_id = current_org());

create policy "budget_goal_org" on public.budget_goal
  for all using (org_id = current_org())
  with check (org_id = current_org());

create policy "budget_allocation_org" on public.budget_allocation
  for all using (org_id = current_org())
  with check (org_id = current_org());

create policy "budget_audit_view" on public.budget_audit
  for select using (org_id = current_org());

create or replace function public.log_budget_audit() returns trigger language plpgsql as $$
declare
  payload jsonb;
  entry jsonb;
begin
  if tg_op = 'DELETE' then
    payload := to_jsonb(old);
  else
    payload := to_jsonb(new);
  end if;

  insert into public.budget_audit(org_id, category_id, month, user_id, before, after, reason)
  values (
    coalesce(new.org_id, old.org_id, current_org()),
    coalesce(new.category_id, old.category_id),
    coalesce(new.month, old.month),
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    tg_table_name || ' ' || tg_op
  );
  return new;
end $$;

create trigger t_budget_goal_audit
  after insert or update or delete on public.budget_goal
  for each row execute function public.log_budget_audit();

create trigger t_budget_allocation_audit
  after insert or update or delete on public.budget_allocation
  for each row execute function public.log_budget_audit();

create trigger t_budget_category_audit
  after insert or update or delete on public.budget_category
  for each row execute function public.log_budget_audit();

create index if not exists budget_category_org_sort_idx on public.budget_category(org_id, sort);
create index if not exists budget_goal_org_category_idx on public.budget_goal(org_id, category_id);
create index if not exists budget_allocation_lookup_idx on public.budget_allocation(org_id, category_id, month);
create index if not exists budget_audit_org_idx on public.budget_audit(org_id, created_at desc);
