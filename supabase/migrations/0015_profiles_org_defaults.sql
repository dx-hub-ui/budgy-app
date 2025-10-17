-- Clean up legacy budgeting tables and introduce org-scoped profile defaults.

-- Drop unused legacy tables from the first budgeting prototype when they
-- are still present in the installation. Newer versions of the app rely on
-- the consolidated schema introduced in migrations 0011-0014.
drop table if exists public.budget_allocations cascade;
drop table if exists public.budget_goals cascade;
drop table if exists public.budget_months cascade;
drop table if exists public.budget_quick_stats cascade;
drop table if exists public.budgets cascade;

drop table if exists public.budget_category cascade;

-- Reference data with the starter groups/categories consumed by the
-- budgeting module. The table allows admins to tweak the defaults without
-- touching the seed routine itself.
create table if not exists public.default_categories (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  name text not null,
  icon text,
  sort integer not null,
  constraint default_categories_unique_name unique (group_name, name)
);

insert into public.default_categories (group_name, name, icon, sort)
values
  ('Contas Fixas', 'Aluguel/Prestação', null, 0),
  ('Contas Fixas', 'Condomínio', null, 1),
  ('Contas Fixas', 'Utilities (Energia/Água/Esgoto)', null, 2),
  ('Contas Fixas', 'TV/Telefone/Internet', null, 3),
  ('Contas Fixas', 'Seguro', null, 4),
  ('Contas Fixas', 'Empréstimo estudantil', null, 5),
  ('Contas Fixas', 'Empréstimo pessoal', null, 6),
  ('Contas Fixas', 'Música', null, 7),
  ('Contas Fixas', 'Streaming', null, 8),
  ('Necessidades', 'Transporte', null, 9),
  ('Necessidades', 'Manutenção do carro', null, 10),
  ('Necessidades', 'Cuidados pessoais', null, 11),
  ('Necessidades', 'Vestuário', null, 12),
  ('Necessidades', 'Impostos e taxas', null, 13),
  ('Desejos', 'Restaurantes', null, 14),
  ('Desejos', 'Compras', null, 15),
  ('Desejos', 'Lazer/Viagens', null, 16),
  ('Reservas', 'Fundo de emergência', null, 17),
  ('Reservas', 'Férias', null, 18),
  ('Reservas', 'Investimentos', null, 19),
  ('Dívidas', 'Cartão de crédito', null, 20),
  ('Dívidas', 'Financiamento do carro', null, 21),
  ('Dívidas', 'Financiamento do imóvel', null, 22),
  ('Dívidas', 'Consignado', null, 23),
  ('Receitas', 'Salário', null, 24),
  ('Receitas', 'Freelance/Autônomo', null, 25),
  ('Receitas', 'Reembolsos', null, 26),
  ('Receitas', 'Rendimentos', null, 27)
on conflict (group_name, name)
do update set icon = excluded.icon, sort = excluded.sort;

-- Extend profiles with org/phone details used by the multi-tenant budget.
alter table public.profiles
  add column if not exists org_id uuid,
  add column if not exists phone text;

update public.profiles
   set org_id = coalesce(org_id, gen_random_uuid());

alter table public.profiles
  alter column org_id set not null;

alter table public.profiles
  alter column org_id set default gen_random_uuid();

create index if not exists profiles_org_id_idx on public.profiles(org_id);

-- Align the audit log with the new budgeting categories table.
alter table public.budget_audit
  drop constraint if exists budget_audit_category_id_fkey;

alter table public.budget_audit
  add constraint budget_audit_category_id_fkey
    foreign key (category_id) references public.budget_categories(id) on delete set null;

-- Ensure audit entries can resolve the acting user even during service seeds.
create or replace function public.log_budget_audit() returns trigger language plpgsql as $$
declare
  new_payload jsonb;
  old_payload jsonb;
  org uuid;
  category uuid;
  month_value date;
  actor uuid;
  jwt_sub text;
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
  end if;

  if month_value is null then
    month_value := date_trunc('month', now())::date;
  end if;

  jwt_sub := current_setting('request.jwt.claim.sub', true);

  if auth.uid() is not null then
    actor := auth.uid();
  elsif jwt_sub is not null and jwt_sub <> '' then
    begin
      actor := jwt_sub::uuid;
    exception
      when invalid_text_representation then
        actor := null;
    end;
  end if;

  if actor is null then
    if new_payload is not null and new_payload ? 'user_id' then
      begin
        actor := (new_payload->>'user_id')::uuid;
      exception
        when others then
          actor := null;
      end;
    elsif old_payload is not null and old_payload ? 'user_id' then
      begin
        actor := (old_payload->>'user_id')::uuid;
      exception
        when others then
          actor := null;
      end;
    end if;
  end if;

  insert into public.budget_audit(org_id, category_id, month, user_id, before, after, reason)
  values (
    org,
    category,
    month_value,
    actor,
    old_payload,
    new_payload,
    tg_table_name || ' ' || tg_op
  );

  return coalesce(new, old);
end;
$$;

-- Seed helper now reads from the reference table instead of an inline list.
create or replace function public.seed_default_budget_categories(
  p_org_id uuid,
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  existing_count integer;
  prev_sub text;
  prev_role text;
  v_actor uuid;
begin
  v_org := coalesce(p_org_id, current_org());
  if v_org is null then
    return;
  end if;

  v_actor := coalesce(p_actor, auth.uid());
  prev_sub := current_setting('request.jwt.claim.sub', true);
  prev_role := current_setting('request.jwt.claim.role', true);

  if v_actor is not null then
    perform set_config('request.jwt.claim.sub', v_actor::text, true);
    if prev_role is null or prev_role = '' then
      perform set_config('request.jwt.claim.role', 'authenticated', true);
    end if;
  end if;

  perform public.ensure_budget_category_schema();

  select count(*)
    into existing_count
    from public.budget_categories
   where org_id = v_org;

  if existing_count > 0 then
    if v_actor is not null then
      perform set_config('request.jwt.claim.sub', coalesce(prev_sub, ''), true);
      perform set_config('request.jwt.claim.role', coalesce(prev_role, ''), true);
    end if;
    return;
  end if;

  insert into public.budget_categories (org_id, group_name, name, icon, sort)
  select v_org, group_name, name, icon, sort
    from public.default_categories
   order by sort, group_name, name;

  if v_actor is not null then
    perform set_config('request.jwt.claim.sub', coalesce(prev_sub, ''), true);
    perform set_config('request.jwt.claim.role', coalesce(prev_role, ''), true);
  end if;
end;
$$;

-- Sync helper used by both the auth trigger and backfill routine.
create or replace function public.sync_profile_from_auth(
  p_user_id uuid,
  p_email text,
  p_phone text,
  p_metadata jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_display text;
  v_phone text;
begin
  select org_id into v_org from public.profiles where id = p_user_id;
  if v_org is null then
    v_org := gen_random_uuid();
  end if;

  v_display := coalesce(
    nullif(btrim(coalesce(p_metadata ->> 'display_name', '')), ''),
    nullif(btrim(coalesce(p_metadata ->> 'full_name', '')), ''),
    nullif(btrim(p_email), ''),
    'Usuário'
  );

  v_phone := coalesce(
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_metadata ->> 'phone', '')), '')
  );

  insert into public.profiles (id, email, display_name, phone, org_id)
  values (p_user_id, p_email, v_display, v_phone, v_org)
  on conflict (id) do update
    set email = excluded.email,
        phone = coalesce(excluded.phone, public.profiles.phone),
        display_name = coalesce(
          nullif(btrim(public.profiles.display_name), ''),
          excluded.display_name
        ),
        org_id = public.profiles.org_id
  returning org_id into v_org;

  perform public.seed_default_budget_categories(v_org, p_user_id);
  return v_org;
end;
$$;

create or replace function public.trg_auth_users_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_profile_from_auth(new.id, new.email, new.phone, new.raw_user_meta_data);
  return new;
end;
$$;

drop trigger if exists t_auth_users_profile on auth.users;
create trigger t_auth_users_profile
  after insert on auth.users
  for each row
  execute function public.trg_auth_users_profile();

-- Backfill existing auth users to guarantee the org/category seed.
do $$
declare
  r record;
begin
  for r in select id, email, phone, raw_user_meta_data from auth.users loop
    perform public.sync_profile_from_auth(r.id, r.email, r.phone, r.raw_user_meta_data);
  end loop;
end;
$$;

-- Ensure the RLS policies still allow profile owners to manage their data.
drop policy if exists "profiles select self" on public.profiles;
create policy "profiles select self" on public.profiles
  for select using (id = auth.uid());

-- Recreate the insert/update policies to avoid duplicates on re-run.
drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Grant access to helper routines for API clients.
grant execute on function public.seed_default_budget_categories(uuid) to service_role, anon, authenticated;
grant execute on function public.sync_profile_from_auth(uuid, text, text, jsonb) to service_role;
