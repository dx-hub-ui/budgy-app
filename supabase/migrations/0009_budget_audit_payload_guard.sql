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
