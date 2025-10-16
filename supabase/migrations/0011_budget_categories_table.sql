-- Consolidate budget categories schema to use the pluralized table name
-- and seed default categories for every organization/user.

-- Ensure previous compatibility view/triggers are removed so the table
-- name `public.budget_categories` can be created without conflicts.
do $$
declare
  v_kind "char";
begin
  select c.relkind
    into v_kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'budget_categories';

  if v_kind = 'v' or v_kind = 'm' then
    execute 'drop view if exists public.budget_categories cascade';
  elsif v_kind = 'r' then
    -- Preserve legacy rows created by the first budgeting prototype.
    perform 1
      from information_schema.tables
     where table_schema = 'public'
       and table_name = 'budget_categories_legacy';
    if not found then
      execute 'alter table public.budget_categories rename to budget_categories_legacy';
    end if;
  end if;

  if exists (
    select 1
      from pg_trigger
     where tgname = 'budget_categories_bridge'
       and tgrelid = 'public.budget_categories'::regclass
  ) then
    execute 'drop trigger budget_categories_bridge on public.budget_categories';
  end if;
exception
  when undefined_table then
    -- The bridge trigger references a relation that was renamed. Ignore.
    null;
end;
$$;

-- Rename the canonical table created in 0004 to the pluralized name.
do $$
begin
  if to_regclass('public.budget_category') is not null
     and to_regclass('public.budget_categories') is null then
    execute 'alter table public.budget_category rename to budget_categories';
  end if;
end;
$$;

-- Recreate the helper to guarantee the latest schema without relying on a view.
create or replace function public.ensure_budget_category_schema()
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if to_regclass('public.budget_categories') is null then
    execute $$
      create table public.budget_categories(
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
        category_id uuid not null references public.budget_categories(id) on delete cascade,
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
        category_id uuid not null references public.budget_categories(id) on delete cascade,
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

  perform public.ensure_budget_category_policies();
  perform public.ensure_budget_category_indexes();
  perform public.ensure_budget_category_audit_triggers();
end;
$function$;

-- Helpers to keep policy/index/trigger creation idempotent.
create or replace function public.ensure_budget_category_policies()
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'budget_categories'
      and policyname = 'budget_category_org'
  ) then
    execute $$
      create policy "budget_category_org" on public.budget_categories
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

  perform public.ensure_budget_category_rls('budget_categories');
  perform public.ensure_budget_category_rls('budget_goal');
  perform public.ensure_budget_category_rls('budget_allocation');
  perform public.ensure_budget_category_rls('budget_audit');
end;
$function$;

create or replace function public.ensure_budget_category_rls(p_table text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from pg_class c
     where c.oid = format('public.%s', p_table)::regclass
       and c.relrowsecurity
  ) then
    execute format('alter table public.%I enable row level security', p_table);
  end if;
end;
$$;

create or replace function public.ensure_budget_category_indexes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute 'create index if not exists budget_categories_org_sort_idx on public.budget_categories(org_id, sort)';
  execute 'create index if not exists budget_goal_org_category_idx on public.budget_goal(org_id, category_id)';
  execute 'create index if not exists budget_allocation_lookup_idx on public.budget_allocation(org_id, category_id, month)';
  execute 'create index if not exists budget_audit_org_idx on public.budget_audit(org_id, created_at desc)';
end;
$$;

create or replace function public.ensure_budget_category_audit_triggers()
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not exists (
    select 1
      from pg_trigger t
     where t.tgname = 't_budget_goal_audit'
       and t.tgrelid = 'public.budget_goal'::regclass
  ) then
    execute $$
      create trigger t_budget_goal_audit
        after insert or update or delete on public.budget_goal
        for each row execute function public.log_budget_audit();
    $$;
  end if;

  if not exists (
    select 1
      from pg_trigger t
     where t.tgname = 't_budget_allocation_audit'
       and t.tgrelid = 'public.budget_allocation'::regclass
  ) then
    execute $$
      create trigger t_budget_allocation_audit
        after insert or update or delete on public.budget_allocation
        for each row execute function public.log_budget_audit();
    $$;
  end if;

  if not exists (
    select 1
      from pg_trigger t
     where t.tgname = 't_budget_category_audit'
       and t.tgrelid = 'public.budget_categories'::regclass
  ) then
    execute $$
      create trigger t_budget_category_audit
        after insert or update or delete on public.budget_categories
        for each row execute function public.log_budget_audit();
    $$;
  end if;
end;
$function$;

-- Update the audit trigger helper to look for the new table name.
create or replace function public.log_budget_audit() returns trigger language plpgsql as $$
declare
  new_payload jsonb;
  old_payload jsonb;
  org uuid;
  category uuid;
  month_value date;
begin
  if tg_op = 'DELETE' then
    new_payload := null;
    old_payload := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    new_payload := to_jsonb(new);
    old_payload := null;
  else
    new_payload := to_jsonb(new);
    old_payload := to_jsonb(old);
  end if;

  if new_payload is not null and new_payload ? 'org_id' then
    org := (new_payload->>'org_id')::uuid;
  elsif old_payload is not null and old_payload ? 'org_id' then
    org := (old_payload->>'org_id')::uuid;
  else
    org := current_org();
  end if;

  if new_payload is not null and new_payload ? 'category_id' then
    category := (new_payload->>'category_id')::uuid;
  elsif old_payload is not null and old_payload ? 'category_id' then
    category := (old_payload->>'category_id')::uuid;
  elsif tg_table_name = 'budget_categories' then
    category := coalesce(
      nullif((coalesce(new_payload, '{}'::jsonb) ->> 'id'), '')::uuid,
      nullif((coalesce(old_payload, '{}'::jsonb) ->> 'id'), '')::uuid
    );
  else
    category := null;
  end if;

  if new_payload is not null and new_payload ? 'month' then
    month_value := (new_payload->>'month')::date;
  elsif old_payload is not null and old_payload ? 'month' then
    month_value := (old_payload->>'month')::date;
  else
    month_value := null;
  end if;

  insert into public.budget_audit(org_id, category_id, month, user_id, before, after, reason)
  values (
    org,
    category,
    month_value,
    auth.uid(),
    old_payload,
    new_payload,
    tg_table_name || ' ' || tg_op
  );

  return coalesce(new, old);
end;
$$;

-- Seed helper invoked both from the API and from an automatic trigger.
create or replace function public.seed_default_budget_categories(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  existing_count integer;
begin
  v_org := coalesce(p_org_id, current_org());
  if v_org is null then
    return;
  end if;

  perform public.ensure_budget_category_schema();

  select count(*) into existing_count
    from public.budget_categories
   where org_id = v_org;

  if existing_count > 0 then
    return;
  end if;

  with seeds(group_name, name, sort_order) as (
    values
      ('Contas Fixas', 'Aluguel/Prestação', 0),
      ('Contas Fixas', 'Condomínio', 1),
      ('Contas Fixas', 'Utilities (Energia/Água/Esgoto)', 2),
      ('Contas Fixas', 'TV/Telefone/Internet', 3),
      ('Contas Fixas', 'Seguro', 4),
      ('Contas Fixas', 'Empréstimo estudantil', 5),
      ('Contas Fixas', 'Empréstimo pessoal', 6),
      ('Contas Fixas', 'Música', 7),
      ('Contas Fixas', 'Streaming', 8),
      ('Necessidades', 'Transporte', 9),
      ('Necessidades', 'Manutenção do carro', 10),
      ('Necessidades', 'Cuidados pessoais', 11),
      ('Necessidades', 'Vestuário', 12),
      ('Necessidades', 'Impostos e taxas', 13),
      ('Desejos', 'Restaurantes', 14),
      ('Desejos', 'Compras', 15),
      ('Desejos', 'Lazer/Viagens', 16),
      ('Reservas', 'Fundo de emergência', 17),
      ('Reservas', 'Férias', 18),
      ('Reservas', 'Investimentos', 19),
      ('Dívidas', 'Cartão de crédito', 20),
      ('Dívidas', 'Financiamento do carro', 21),
      ('Dívidas', 'Financiamento do imóvel', 22),
      ('Dívidas', 'Consignado', 23),
      ('Receitas', 'Salário', 24),
      ('Receitas', 'Freelance/Autônomo', 25),
      ('Receitas', 'Reembolsos', 26),
      ('Receitas', 'Rendimentos', 27)
  )
  insert into public.budget_categories(org_id, group_name, name, icon, sort)
  select v_org, group_name, name, null, sort_order from seeds;
end;
$$;

-- Trigger to seed the categories for every new profile created by Supabase Auth.
create or replace function public.tr_profiles_seed_budget_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_budget_categories(new.id);
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
      from pg_trigger t
     where t.tgname = 't_profiles_seed_budget_categories'
       and t.tgrelid = 'public.profiles'::regclass
  ) then
    execute 'drop trigger t_profiles_seed_budget_categories on public.profiles';
  end if;

  execute $$
    create trigger t_profiles_seed_budget_categories
      after insert on public.profiles
      for each row execute function public.tr_profiles_seed_budget_categories();
  $$;
end;
$$;

-- Backfill existing profiles with the default categories if they still do not have any.
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.seed_default_budget_categories(r.id);
  end loop;
end;
$$;
