-- Build Tracker — initial schema, indexes, RLS, and admin bootstrap helpers
-- Apply in Supabase Dashboard → SQL Editor (run the entire file once).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (mirrors auth.users, stores role + approval)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profiles. Role elevation must only happen via SQL / service role.';

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  archived_at timestamptz
);

-- Case-insensitive unique project names
create unique index if not exists projects_name_unique_ci
  on public.projects (lower(name));

create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists projects_archived_at_idx on public.projects (archived_at);
create index if not exists projects_created_by_idx on public.projects (created_by);

-- ---------------------------------------------------------------------------
-- Builds
-- ---------------------------------------------------------------------------
create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  version text not null,
  build_link text not null,
  environment text,
  custom_environment text,
  platform text,
  custom_platform text,
  build_number text,
  distribution_type text,
  custom_distribution_type text,
  notes text,
  extra_details text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  constraint builds_version_required check (char_length(trim(version)) > 0),
  constraint builds_link_http check (
    build_link ~* '^https?://'
  )
);

create index if not exists builds_project_id_idx on public.builds (project_id);
create index if not exists builds_created_at_idx on public.builds (created_at desc);
create index if not exists builds_environment_idx on public.builds (environment);
create index if not exists builds_platform_idx on public.builds (platform);
create index if not exists builds_distribution_type_idx on public.builds (distribution_type);
create index if not exists builds_version_idx on public.builds (version);
create index if not exists builds_created_by_idx on public.builds (created_by);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER — avoid recursive RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and p.role = 'admin'
  );
$$;

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
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Prevent clients from elevating their own role or approving themselves.
-- auth.uid() is null in SQL Editor / migrations / service_role — allow those
-- paths so the first admin can be bootstrapped without a chicken-and-egg lock.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Only admins may archive / unarchive projects
create or replace function public.protect_project_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is distinct from old.archived_at and not public.is_admin() then
    raise exception 'Only admins can archive or restore projects';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_project_archive on public.projects;
create trigger protect_project_archive
  before update on public.projects
  for each row execute function public.protect_project_archive();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.builds enable row level security;

-- Profiles
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

drop policy if exists "Users can update own non-privileged fields" on public.profiles;
create policy "Users can update own non-privileged fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update any profile" on public.profiles;
-- Covered by the update policy above via is_admin()

-- Projects
drop policy if exists "Approved users can read projects" on public.projects;
create policy "Approved users can read projects"
  on public.projects for select
  to authenticated
  using (public.is_approved_user());

drop policy if exists "Approved users can create projects" on public.projects;
create policy "Approved users can create projects"
  on public.projects for insert
  to authenticated
  with check (
    public.is_approved_user()
    and created_by = auth.uid()
  );

drop policy if exists "Creators or admins can update projects" on public.projects;
create policy "Creators or admins can update projects"
  on public.projects for update
  to authenticated
  using (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  );

-- Archive is enforced in app for creators; admins always allowed.
-- Hard delete restricted to admins only.
drop policy if exists "Admins can delete projects" on public.projects;
create policy "Admins can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_admin());

-- Builds
drop policy if exists "Approved users can read builds" on public.builds;
create policy "Approved users can read builds"
  on public.builds for select
  to authenticated
  using (public.is_approved_user());

drop policy if exists "Approved users can create builds" on public.builds;
create policy "Approved users can create builds"
  on public.builds for insert
  to authenticated
  with check (
    public.is_approved_user()
    and created_by = auth.uid()
  );

drop policy if exists "Creators or admins can update builds" on public.builds;
create policy "Creators or admins can update builds"
  on public.builds for update
  to authenticated
  using (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  );

drop policy if exists "Admins can delete builds" on public.builds;
create policy "Admins can delete builds"
  on public.builds for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Bootstrap helpers (run manually after creating your first user)
-- ---------------------------------------------------------------------------
-- 1) Sign up / invite your admin account via Supabase Auth.
-- 2) Approve and promote that user:
--
--    update public.profiles
--    set approved = true, role = 'admin'
--    where email = 'you@company.com';
--
-- 3) Approve additional teammates:
--
--    update public.profiles
--    set approved = true
--    where email in ('qa@company.com', 'dev@company.com');
--
-- Unauthenticated access is denied by default (no anon policies).
