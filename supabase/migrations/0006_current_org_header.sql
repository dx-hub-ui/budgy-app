create or replace function public.current_org() returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.org_id', true), ''),
    nullif(current_setting('request.header.x-cc-org-id', true), ''),
    auth.uid()
  );
$$ language sql stable;
