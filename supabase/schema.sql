create extension if not exists "pgcrypto";

create table if not exists public.vpn_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  config text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.vpn_configs enable row level security;

create policy "Anyone can view active configs"
on public.vpn_configs
for select
using (active = true);

create policy "Authenticated users can manage configs"
on public.vpn_configs
for all
to authenticated
using (true)
with check (true);
