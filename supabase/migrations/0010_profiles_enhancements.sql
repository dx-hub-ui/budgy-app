-- Add profile customization fields
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists timezone text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now();

-- Backfill existing rows with timestamps
update public.profiles
  set updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 't_profiles_touch'
      and c.relname = 'profiles'
      and n.nspname = 'public'
  ) then
    create trigger t_profiles_touch
      before update on public.profiles
      for each row
      execute function public.touch_updated_at();
  end if;
end;
$$;
