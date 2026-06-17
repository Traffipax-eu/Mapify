-- Run this in the Supabase SQL editor for Mapify cloud snapshots.
-- Stores ONLY encrypted ciphertext — never plain JSON.

create table if not exists mapify_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  sheet_name text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

create index if not exists mapify_snapshots_updated_at_idx on mapify_snapshots (updated_at desc);

-- Development: allow anon read/write (replace with auth-based RLS in production)
alter table mapify_snapshots enable row level security;

create policy "anon_select_mapify_snapshots"
  on mapify_snapshots for select
  to anon
  using (true);

create policy "anon_insert_mapify_snapshots"
  on mapify_snapshots for insert
  to anon
  with check (true);

create policy "anon_update_mapify_snapshots"
  on mapify_snapshots for update
  to anon
  using (true);

create policy "anon_delete_mapify_snapshots"
  on mapify_snapshots for delete
  to anon
  using (true);
