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

-- Seed helper now reads from the reference table instead of an inline list.
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

  select count(*)
    into existing_count
    from public.budget_categories
   where org_id = v_org;

  if existing_count > 0 then
    return;
  end if;

  insert into public.budget_categories (org_id, group_name, name, icon, sort)
  select v_org, group_name, name, icon, sort
    from public.default_categories
   order by sort, group_name, name;
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

  perform public.seed_default_budget_categories(v_org);
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
