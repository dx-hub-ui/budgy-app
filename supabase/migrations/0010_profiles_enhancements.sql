-- Add profile customization fields
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists timezone text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now();

-- Backfill existing rows with timestamps
update public.profiles
  set updated_at = coalesce(updated_at, now());

-- Ensure updated_at is automatically refreshed on updates
create trigger if not exists t_profiles_touch
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();
