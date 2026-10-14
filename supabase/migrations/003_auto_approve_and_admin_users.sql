-- Build Tracker — open signup with auto-approve + admin can list all users
-- Run this entire file in Supabase → SQL Editor (after 001 and 002).

-- ---------------------------------------------------------------------------
-- Default + trigger: new signups are approved immediately
-- ---------------------------------------------------------------------------
alter table public.profiles
  alter column approved set default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'member',
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

-- Backfill anyone still waiting
update public.profiles
set approved = true, updated_at = now()
where approved = false;

-- ---------------------------------------------------------------------------
-- RLS: admins can select every profile (including unapproved)
-- Members still see own row + approved peers (for "added by" display)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Approved users can read approved peers" on public.profiles;
create policy "Approved users can read approved peers"
  on public.profiles for select
  to authenticated
  using (public.is_approved_user() and approved = true);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Admins may update any profile (role / approved). Non-admins still blocked
-- from elevating themselves by protect_profile_privileges().
drop policy if exists "Users can update own non-privileged fields" on public.profiles;
create policy "Users can update own non-privileged fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Archive / delete remain admin-only (unchanged policies from 001).
-- protect_profile_privileges still prevents members from changing role/approved.
