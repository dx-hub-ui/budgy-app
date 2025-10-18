-- Consolidate legacy expenses into account_transactions and drop obsolete structures

-- Ensure the ledger table supports all required columns
alter table public.account_transactions
  alter column account_id drop not null;

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'account_transactions'
       and column_name = 'method'
  ) then
    alter table public.account_transactions
      add column method text;
  end if;
end;
$$;

update public.account_transactions
   set method = coalesce(method, 'pix')
 where method is null;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'account_transactions'
       and column_name = 'method'
  ) then
    alter table public.account_transactions
      alter column method set default 'pix';
    alter table public.account_transactions
      alter column method set not null;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
      from information_schema.constraint_column_usage
     where table_schema = 'public'
       and table_name = 'account_transactions'
       and constraint_name = 'account_transactions_method_check'
  ) then
    alter table public.account_transactions
      add constraint account_transactions_method_check
        check (method in ('pix','debito','credito','dinheiro'));
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.expenses') is not null then
    insert into public.account_transactions (
      id,
      org_id,
      account_id,
      category_id,
      amount_cents,
      direction,
      occurred_on,
      description,
      memo,
      method,
      created_at,
      updated_at,
      deleted_at
    )
    select
      e.id,
      coalesce(p.org_id, current_org()),
      e.account_id,
      e.category_id,
      e.amount_cents,
      coalesce(e.direction, 'outflow'),
      e."date",
      e.description,
      e.memo,
      coalesce(e.method, 'pix'),
      e.created_at,
      e.updated_at,
      e.deleted_at
    from public.expenses e
    left join public.profiles p on p.id = e.user_id
    where not exists (
      select 1
        from public.account_transactions t
       where t.id = e.id
    )
    on conflict do nothing;
  end if;
end;
$$;

-- Replace the budgeting trigger to react to the consolidated ledger
DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    EXECUTE 'drop trigger if exists tr_expenses_budget_refresh on public.expenses';
  END IF;
END;
$$;

drop function if exists public.tr_expenses_budget_refresh();

create or replace function public.tr_account_transactions_budget_refresh()
returns trigger
language plpgsql
as $$
begin
  perform public.fn_recalc_month(
    null,
    coalesce(
      date_trunc('month', new.occurred_on),
      date_trunc('month', old.occurred_on),
      date_trunc('month', now())
    )::date
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_account_transactions_budget_refresh on public.account_transactions;
create trigger tr_account_transactions_budget_refresh
  after insert or update or delete on public.account_transactions
  for each row execute function public.tr_account_transactions_budget_refresh();

-- The legacy view is no longer required and referenced; remove it to avoid invalid dependencies
drop view if exists public.v_budget_activity;

-- Finally drop the obsolete table
drop table if exists public.expenses cascade;
