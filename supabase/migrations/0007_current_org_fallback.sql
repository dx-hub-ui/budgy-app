create or replace function public.current_org() returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.org_id', true), ''),
    nullif(current_setting('request.header.x-cc-org-id', true), ''),
    nullif(current_setting('request.cookie.cc_org_id', true), ''),
    auth.uid(),
    '00000000-0000-0000-0000-000000000001'
  )::uuid;
$$ language sql stable;
