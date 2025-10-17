-- Ensure authenticated users can manage their own profiles
create policy "profiles insert self" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles update self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
