-- Fix budget audit trigger to handle tables without category_id column
create or replace function public.log_budget_audit() returns trigger
language plpgsql
as $$
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
end;
$$;
