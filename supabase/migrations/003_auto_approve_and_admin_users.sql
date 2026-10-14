-- Build Tracker — open signup with auto-approve + admin can list all users
-- Safe to run without 002: privilege function is fixed before any backfill UPDATE.

-- ---------------------------------------------------------------------------
-- Ensure SQL Editor / null-JWT can update profiles (002 content, idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  -- No end-user JWT ⇒ SQL Editor, migrations, or service_role.
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() is distinct from new.id and not public.is_admin() then
    raise exception 'Only admins can update other profiles';
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role';
    end if;
    if new.approved is distinct from old.approved then
      raise exception 'You cannot change your own approval status';
    end if;
  end if;

  return new;
end;
$$;

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

-- Backfill anyone still waiting (disable trigger for environments that never
-- got 002 / in case an older function body is still attached mid-script)
alter table public.profiles disable trigger protect_profile_privileges;

update public.profiles
set approved = true, updated_at = now()
where approved = false;

alter table public.profiles enable trigger protect_profile_privileges;

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
