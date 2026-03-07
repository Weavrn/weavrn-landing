-- Run this in your Supabase SQL editor to set up the database

create table profiles (
  wallet_address text primary key,
  x_handle text,
  total_earned numeric default 0,
  created_at timestamptz default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references profiles(wallet_address),
  x_handle text not null,
  post_url text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  engagement_score numeric,
  reward_amount numeric,
  claimed boolean default false,
  created_at timestamptz default now()
);

create index idx_submissions_wallet on submissions(wallet_address);
create index idx_submissions_status on submissions(status);
create index idx_submissions_created on submissions(created_at);

-- RLS policies
alter table profiles enable row level security;
alter table submissions enable row level security;

-- Allow anonymous reads for the dashboard
create policy "Public profiles are viewable" on profiles
  for select using (true);

create policy "Public submissions are viewable" on submissions
  for select using (true);

-- Allow inserts via the API (service role key handles auth)
create policy "Service can insert profiles" on profiles
  for insert with check (true);

create policy "Service can update profiles" on profiles
  for update using (true);

create policy "Service can insert submissions" on submissions
  for insert with check (true);

create policy "Service can update submissions" on submissions
  for update using (true);
