-- Ensure Navy+Mint budgeting tables exist in legacy databases
create or replace function public.ensure_budget_category_schema()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure helper function exists
  if not exists (
    select 1 from pg_proc
    where proname = 'current_org' and pg_function_is_visible(oid)
  ) then
    execute $$
      create or replace function public.current_org() returns uuid as $$
        select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.uid());
      $$ language sql stable;
    $$;
  end if;

  -- main tables
  if to_regclass('public.budget_category') is null then
    execute $$
      create table public.budget_category(
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
    $$;
  end if;

  if to_regclass('public.budget_goal') is null then
    execute $$
      create table public.budget_goal(
        id uuid primary key default gen_random_uuid(),
        org_id uuid not null default current_org(),
        category_id uuid not null references public.budget_category(id) on delete cascade,
        type text not null check (type in ('TB','TBD','MFG','CUSTOM')),
        amount_cents int not null,
        target_month date,
        cadence text check (cadence in ('weekly','monthly','yearly','custom')),
        created_at timestamptz not null default now()
      );
    $$;
  end if;

  if to_regclass('public.budget_allocation') is null then
    execute $$
      create table public.budget_allocation(
        org_id uuid not null default current_org(),
        category_id uuid not null references public.budget_category(id) on delete cascade,
        month date not null,
        assigned_cents int not null default 0,
        activity_cents int not null default 0,
        available_cents int not null default 0,
        primary key(org_id, category_id, month)
      );
    $$;
  end if;

  if to_regclass('public.budget_audit') is null then
    execute $$
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
    $$;
  end if;

  -- compat view + bridge to pluralized table name used by API clients
  execute $$
    create or replace view public.budget_categories as
      select
        id,
        org_id,
        group_name,
        name,
        icon,
        sort,
        is_hidden,
        deleted_at,
        created_at
      from public.budget_category;
  $$;

  execute $$
    create or replace function public.budget_categories_bridge()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    begin
      if tg_op = 'INSERT' then
        insert into public.budget_category as bc(
          id,
          org_id,
          group_name,
          name,
          icon,
          sort,
          is_hidden,
          deleted_at,
          created_at
        )
        values (
          new.id,
          coalesce(new.org_id, current_org()),
          new.group_name,
          new.name,
          new.icon,
          coalesce(new.sort, 0),
          coalesce(new.is_hidden, false),
          new.deleted_at,
          coalesce(new.created_at, now())
        )
        returning * into new;
        return new;
      elsif tg_op = 'UPDATE' then
        update public.budget_category as bc
        set
          org_id = coalesce(new.org_id, old.org_id),
          group_name = coalesce(new.group_name, old.group_name),
          name = coalesce(new.name, old.name),
          icon = coalesce(new.icon, old.icon),
          sort = coalesce(new.sort, old.sort),
          is_hidden = coalesce(new.is_hidden, old.is_hidden),
          deleted_at = coalesce(new.deleted_at, old.deleted_at)
        where bc.id = old.id
        returning * into new;
        return new;
      elsif tg_op = 'DELETE' then
        delete from public.budget_category as bc
        where bc.id = old.id
        returning * into old;
        return old;
      end if;

      return null;
    end;
    $$;
  $$;

  execute 'drop trigger if exists budget_categories_bridge on public.budget_categories';
  execute $$
    create trigger budget_categories_bridge
      instead of insert or update or delete on public.budget_categories
      for each row execute function public.budget_categories_bridge();
  $$;

  -- enable RLS
  if not exists (
    select 1 from pg_class
    where oid = 'public.budget_category'::regclass
      and relrowsecurity
  ) then
    execute 'alter table public.budget_category enable row level security';
  end if;

  if not exists (
    select 1 from pg_class
    where oid = 'public.budget_goal'::regclass
      and relrowsecurity
  ) then
    execute 'alter table public.budget_goal enable row level security';
  end if;

  if not exists (
    select 1 from pg_class
    where oid = 'public.budget_allocation'::regclass
      and relrowsecurity
  ) then
    execute 'alter table public.budget_allocation enable row level security';
  end if;

  if not exists (
    select 1 from pg_class
    where oid = 'public.budget_audit'::regclass
      and relrowsecurity
  ) then
    execute 'alter table public.budget_audit enable row level security';
  end if;

  -- policies
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'budget_category'
      and policyname = 'budget_category_org'
  ) then
    execute $$
      create policy "budget_category_org" on public.budget_category
        for all using (org_id = current_org())
        with check (org_id = current_org());
    $$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'budget_goal'
      and policyname = 'budget_goal_org'
  ) then
    execute $$
      create policy "budget_goal_org" on public.budget_goal
        for all using (org_id = current_org())
        with check (org_id = current_org());
    $$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'budget_allocation'
      and policyname = 'budget_allocation_org'
  ) then
    execute $$
      create policy "budget_allocation_org" on public.budget_allocation
        for all using (org_id = current_org())
        with check (org_id = current_org());
    $$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'budget_audit'
      and policyname = 'budget_audit_view'
  ) then
    execute $$
      create policy "budget_audit_view" on public.budget_audit
        for select using (org_id = current_org());
    $$;
  end if;

  -- support function & triggers
  execute $$
    create or replace function public.log_budget_audit() returns trigger language plpgsql as $$
    declare
      new_row jsonb;
      old_row jsonb;
      org uuid;
      category uuid;
      month_val date;
    begin
      if tg_op = 'DELETE' then
        new_row := null;
        old_row := to_jsonb(old);
      elsif tg_op = 'INSERT' then
        new_row := to_jsonb(new);
        old_row := null;
      else
        new_row := to_jsonb(new);
        old_row := to_jsonb(old);
      end if;

      org := coalesce(
        nullif((coalesce(new_row, '{}'::jsonb) ->> 'org_id'), '')::uuid,
        nullif((coalesce(old_row, '{}'::jsonb) ->> 'org_id'), '')::uuid,
        current_org()
      );

      category := coalesce(
        nullif((coalesce(new_row, '{}'::jsonb) ->> 'category_id'), '')::uuid,
        nullif((coalesce(old_row, '{}'::jsonb) ->> 'category_id'), '')::uuid,
        case
          when tg_table_name = 'budget_category' then coalesce(
            nullif((coalesce(new_row, '{}'::jsonb) ->> 'id'), '')::uuid,
            nullif((coalesce(old_row, '{}'::jsonb) ->> 'id'), '')::uuid
          )
          else null
        end
      );

      month_val := coalesce(
        nullif((coalesce(new_row, '{}'::jsonb) ->> 'month'), '')::date,
        nullif((coalesce(old_row, '{}'::jsonb) ->> 'month'), '')::date
      );

      insert into public.budget_audit(org_id, category_id, month, user_id, before, after, reason)
      values (
        org,
        category,
        month_val,
        auth.uid(),
        case when tg_op = 'INSERT' then null else old_row end,
        case when tg_op = 'DELETE' then null else new_row end,
        tg_table_name || ' ' || tg_op
      );

      return coalesce(new, old);
    end $$;
  $$;

  if not exists (
    select 1 from pg_trigger where tgname = 't_budget_goal_audit'
  ) then
    execute $$
      create trigger t_budget_goal_audit
        after insert or update or delete on public.budget_goal
        for each row execute function public.log_budget_audit();
    $$;
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 't_budget_allocation_audit'
  ) then
    execute $$
      create trigger t_budget_allocation_audit
        after insert or update or delete on public.budget_allocation
        for each row execute function public.log_budget_audit();
    $$;
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 't_budget_category_audit'
  ) then
    execute $$
      create trigger t_budget_category_audit
        after insert or update or delete on public.budget_category
        for each row execute function public.log_budget_audit();
    $$;
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'budget_category_org_sort_idx'
  ) then
    execute 'create index budget_category_org_sort_idx on public.budget_category(org_id, sort)';
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'budget_goal_org_category_idx'
  ) then
    execute 'create index budget_goal_org_category_idx on public.budget_goal(org_id, category_id)';
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'budget_allocation_lookup_idx'
  ) then
    execute 'create index budget_allocation_lookup_idx on public.budget_allocation(org_id, category_id, month)';
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'budget_audit_org_idx'
  ) then
    execute 'create index budget_audit_org_idx on public.budget_audit(org_id, created_at desc)';
  end if;
end;
$$;

grant execute on function public.ensure_budget_category_schema() to service_role;
