-- Ensure legacy budgeting tables expose the org_id column used by the
-- application. Some self-hosted databases might still have the early
-- prototype schema without the multi-tenant column, which breaks API
-- calls filtering by org_id.

-- Harden the index helper so it tolerates legacy schemas missing columns
-- such as `sort` (from very early prototypes).
create or replace function public.ensure_budget_category_indexes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_categories'
       and column_name = 'sort'
  ) then
    execute 'create index if not exists budget_categories_org_sort_idx on public.budget_categories(org_id, sort)';
  else
    raise notice 'Skipping budget_categories_org_sort_idx: column "sort" is missing';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_goal'
       and column_name = 'category_id'
  ) then
    execute 'create index if not exists budget_goal_org_category_idx on public.budget_goal(org_id, category_id)';
  else
    raise notice 'Skipping budget_goal_org_category_idx: column "category_id" is missing';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_allocation'
       and column_name = 'category_id'
  )
  and exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_allocation'
       and column_name = 'month'
  ) then
    execute 'create index if not exists budget_allocation_lookup_idx on public.budget_allocation(org_id, category_id, month)';
  else
    raise notice 'Skipping budget_allocation_lookup_idx: required columns are missing';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_audit'
       and column_name = 'org_id'
  ) then
    execute 'create index if not exists budget_audit_org_idx on public.budget_audit(org_id, created_at desc)';
  else
    raise notice 'Skipping budget_audit_org_idx: column "org_id" is missing';
  end if;
end;
$$;

do $$
begin
  -- budget_categories
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_categories'
       and column_name = 'org_id'
  ) then
    alter table public.budget_categories add column org_id uuid;
    update public.budget_categories
       set org_id = coalesce(org_id, '00000000-0000-0000-0000-000000000001'::uuid);
    alter table public.budget_categories alter column org_id set not null;
    alter table public.budget_categories alter column org_id set default public.current_org();
  end if;

  -- budget_goal
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_goal'
       and column_name = 'org_id'
  ) then
    alter table public.budget_goal add column org_id uuid;
    update public.budget_goal
       set org_id = coalesce(org_id, '00000000-0000-0000-0000-000000000001'::uuid);
    alter table public.budget_goal alter column org_id set not null;
    alter table public.budget_goal alter column org_id set default public.current_org();
  end if;

  -- budget_allocation
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_allocation'
       and column_name = 'org_id'
  ) then
    alter table public.budget_allocation add column org_id uuid;
    update public.budget_allocation
       set org_id = coalesce(org_id, '00000000-0000-0000-0000-000000000001'::uuid);
    alter table public.budget_allocation alter column org_id set not null;
    alter table public.budget_allocation alter column org_id set default public.current_org();
  end if;

  -- budget_audit
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'budget_audit'
       and column_name = 'org_id'
  ) then
    alter table public.budget_audit add column org_id uuid;
    update public.budget_audit
       set org_id = coalesce(org_id, '00000000-0000-0000-0000-000000000001'::uuid);
    alter table public.budget_audit alter column org_id set not null;
    alter table public.budget_audit alter column org_id set default public.current_org();
  end if;

  -- After fixing the columns, ensure policies and triggers are aligned
  -- with the consolidated budgeting schema.
  perform public.ensure_budget_category_schema();
end;
$$;
