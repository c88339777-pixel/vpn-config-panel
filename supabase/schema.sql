-- VPN Hub schema aligned with the current Next.js API routes.
-- Run in Supabase SQL Editor as project owner.

create extension if not exists pgcrypto;

-- Shared server/config inventory. Keep the existing table if it already exists.
create table if not exists public.vpn_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  config text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- App-managed customer accounts. Passwords are stored as scrypt hashes by the API.
create table if not exists public.vpn_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  plan_start timestamptz,
  plan_expires_at timestamptz,
  total_gb numeric(12,3),
  used_gb numeric(12,3) not null default 0,
  constraint vpn_users_username_format check (username ~ '^[a-z0-9_-]{3,30}$'),
  constraint vpn_users_total_gb_nonnegative check (total_gb is null or total_gb >= 0),
  constraint vpn_users_used_gb_nonnegative check (used_gb >= 0)
);

-- Opaque session tokens are never stored in plaintext; only SHA-256 hashes are stored.
create table if not exists public.vpn_user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.vpn_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Which configs each customer is allowed to receive.
create table if not exists public.vpn_user_configs (
  user_id uuid not null references public.vpn_users(id) on delete cascade,
  config_id uuid not null references public.vpn_configs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, config_id)
);

create index if not exists vpn_user_sessions_user_id_idx
  on public.vpn_user_sessions(user_id);
create index if not exists vpn_user_sessions_expiry_idx
  on public.vpn_user_sessions(expires_at);
create index if not exists vpn_user_configs_config_id_idx
  on public.vpn_user_configs(config_id);
create index if not exists vpn_configs_active_created_idx
  on public.vpn_configs(active, created_at desc);

-- RLS: the browser admin UI may manage vpn_configs only when signed in as
-- the exact Supabase Auth user ID checked by lib/admin-auth.ts.
-- The three customer/session tables are accessed server-side using the
-- service-role key after API authentication; no direct browser policies exist.
alter table public.vpn_configs enable row level security;
alter table public.vpn_users enable row level security;
alter table public.vpn_user_sessions enable row level security;
alter table public.vpn_user_configs enable row level security;

drop policy if exists "Anyone can view active configs" on public.vpn_configs;
drop policy if exists "Authenticated users can manage configs" on public.vpn_configs;
drop policy if exists "VPN Hub admin can manage configs" on public.vpn_configs;

create policy "VPN Hub admin can manage configs"
on public.vpn_configs
for all
to authenticated
using (auth.uid() = '88d549d1-2a8c-4604-bd14-6afa6a0b335f'::uuid)
with check (auth.uid() = '88d549d1-2a8c-4604-bd14-6afa6a0b335f'::uuid);

-- No anon/authenticated policies on vpn_users, vpn_user_sessions,
-- or vpn_user_configs. Server-side service-role access bypasses RLS.

-- Subscription link (for iPhone / third-party apps). One secret token per user.
-- Safe to run more than once. Run just this block on an existing database.
alter table public.vpn_users add column if not exists sub_token text;
create unique index if not exists vpn_users_sub_token_idx
  on public.vpn_users(sub_token) where sub_token is not null;
