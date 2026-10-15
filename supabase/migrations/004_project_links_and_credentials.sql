-- Build Tracker — project portal links + test credentials
-- Run in Supabase → SQL Editor after 001–003.

-- ---------------------------------------------------------------------------
-- project_links (steady portal / environment URLs on the project screen)
-- ---------------------------------------------------------------------------
create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  url text not null,
  environment text not null default 'LIVE'
    check (environment in ('LIVE', 'DEV', 'STAG', 'Other')),
  custom_environment text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  constraint project_links_name_required check (char_length(trim(name)) > 0),
  constraint project_links_url_http check (url ~* '^https?://')
);

create index if not exists project_links_project_id_idx
  on public.project_links (project_id);
create index if not exists project_links_created_at_idx
  on public.project_links (created_at desc);

-- ---------------------------------------------------------------------------
-- project_credentials (internal test accounts — stored plaintext for MVP)
-- ---------------------------------------------------------------------------
create table if not exists public.project_credentials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  identifier text not null,
  password text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  constraint project_credentials_label_required check (char_length(trim(label)) > 0),
  constraint project_credentials_identifier_required check (char_length(trim(identifier)) > 0)
);

comment on table public.project_credentials is
  'Internal test account credentials. Passwords are stored in plaintext for MVP convenience — do not store production secrets.';

create index if not exists project_credentials_project_id_idx
  on public.project_credentials (project_id);
create index if not exists project_credentials_created_at_idx
  on public.project_credentials (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.project_links enable row level security;
alter table public.project_credentials enable row level security;

-- Links
drop policy if exists "Approved users can read project links" on public.project_links;
create policy "Approved users can read project links"
  on public.project_links for select
  to authenticated
  using (public.is_approved_user());

drop policy if exists "Approved users can create project links" on public.project_links;
create policy "Approved users can create project links"
  on public.project_links for insert
  to authenticated
  with check (
    public.is_approved_user()
    and created_by = auth.uid()
  );

drop policy if exists "Creators or admins can update project links" on public.project_links;
create policy "Creators or admins can update project links"
  on public.project_links for update
  to authenticated
  using (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  );

drop policy if exists "Creators or admins can delete project links" on public.project_links;
create policy "Creators or admins can delete project links"
  on public.project_links for delete
  to authenticated
  using (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  );

-- Credentials
drop policy if exists "Approved users can read project credentials" on public.project_credentials;
create policy "Approved users can read project credentials"
  on public.project_credentials for select
  to authenticated
  using (public.is_approved_user());

drop policy if exists "Approved users can create project credentials" on public.project_credentials;
create policy "Approved users can create project credentials"
  on public.project_credentials for insert
  to authenticated
  with check (
    public.is_approved_user()
    and created_by = auth.uid()
  );

drop policy if exists "Creators or admins can update project credentials" on public.project_credentials;
create policy "Creators or admins can update project credentials"
  on public.project_credentials for update
  to authenticated
  using (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  );

drop policy if exists "Creators or admins can delete project credentials" on public.project_credentials;
create policy "Creators or admins can delete project credentials"
  on public.project_credentials for delete
  to authenticated
  using (
    public.is_approved_user()
    and (created_by = auth.uid() or public.is_admin())
  );
