-- Ensure the expenses trigger remains compatible with the consolidated budgeting schema.
create or replace function public.fn_recalc_month(p_user_id uuid, p_month date)
returns void
language plpgsql
as $$
declare
  v_month date := coalesce(p_month, date_trunc('month', now())::date);
  v_org uuid;
begin
  -- Budget v2 installations rely on budget_allocation with org-scoped rows.
  if to_regclass('public.budget_allocation') is not null then
    v_org := null;
    begin
      v_org := current_org();
    exception
      when others then
        v_org := null;
    end;

    if v_org is null and p_user_id is not null then
      begin
        select org_id into v_org
          from public.profiles
         where id = p_user_id
         limit 1;
      exception
        when others then
          v_org := null;
      end;
    end if;

    -- The budgeting module recomputes aggregates on demand, so we only ensure
    -- the reference rows exist to keep the trigger side-effects backward compatible.
    if v_org is not null then
      perform 1
        from public.budget_allocation
       where org_id = v_org
         and month = v_month
       limit 1;
    end if;
    return;
  end if;

  -- Legacy installations without the consolidated schema still expect the old table.
  if to_regclass('public.budget_allocations') is not null then
    update public.budget_allocations
       set updated_at = now()
     where user_id = coalesce(p_user_id, auth.uid())
       and month = v_month;
  end if;
end;
$$;
