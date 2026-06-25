-- Mapify multiplayer SaaS foundation
-- Run in Supabase SQL editor after the legacy snapshot table.

-- Legacy encrypted snapshots (unchanged)
create table if not exists mapify_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  sheet_name text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

create index if not exists mapify_snapshots_updated_at_idx on mapify_snapshots (updated_at desc);

-- Cloud projects (maps to local Dexie project id)
create table if not exists projects (
  id text primary key,
  name text not null,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_updated_at_idx on projects (updated_at desc);

-- Project membership & invites
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  user_id uuid,
  email text,
  role text not null check (role in ('viewer', 'editor')),
  invite_token text unique,
  created_at timestamptz not null default now()
);

create index if not exists project_members_project_id_idx on project_members (project_id);
create index if not exists project_members_email_idx on project_members (email);

-- Version history snapshots (plain JSON for preview/restore; add RLS + auth in production)
create table if not exists project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  sheet_id text not null,
  version_name text not null,
  snapshot jsonb not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists project_versions_project_sheet_idx
  on project_versions (project_id, sheet_id, created_at desc);

-- Development: anon policies (replace with auth-based RLS before production)
alter table mapify_snapshots enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_versions enable row level security;

drop policy if exists "anon_select_mapify_snapshots" on mapify_snapshots;
drop policy if exists "anon_insert_mapify_snapshots" on mapify_snapshots;
drop policy if exists "anon_update_mapify_snapshots" on mapify_snapshots;
drop policy if exists "anon_delete_mapify_snapshots" on mapify_snapshots;
drop policy if exists "anon_all_projects" on projects;
drop policy if exists "anon_all_project_members" on project_members;
drop policy if exists "anon_all_project_versions" on project_versions;

create policy "anon_select_mapify_snapshots" on mapify_snapshots for select to anon using (true);
create policy "anon_insert_mapify_snapshots" on mapify_snapshots for insert to anon with check (true);
create policy "anon_update_mapify_snapshots" on mapify_snapshots for update to anon using (true);
create policy "anon_delete_mapify_snapshots" on mapify_snapshots for delete to anon using (true);
create policy "anon_all_projects" on projects for all to anon using (true) with check (true);
create policy "anon_all_project_members" on project_members for all to anon using (true) with check (true);
create policy "anon_all_project_versions" on project_versions for all to anon using (true) with check (true);
