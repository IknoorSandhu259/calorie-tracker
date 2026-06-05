-- Run this in your Supabase SQL editor.
-- Safe to run on a fresh DB or one that already has a profiles table.

-- 1. Create profiles table if it does not exist yet.
create table if not exists profiles (
  id                 uuid    primary key references auth.users(id) on delete cascade,
  daily_kcal_target  integer not null default 2000 check (daily_kcal_target between 100 and 10000),
  daily_protein_g    integer not null default 150  check (daily_protein_g  between 0 and 500),
  daily_carbs_g      integer not null default 200  check (daily_carbs_g    between 0 and 1000),
  daily_fat_g        integer not null default 65   check (daily_fat_g      between 0 and 500),
  updated_at         timestamptz not null default now()
);

-- 2. If profiles already existed (e.g. from the design schema), add the macro columns.
alter table profiles add column if not exists daily_protein_g integer not null default 150;
alter table profiles add column if not exists daily_carbs_g   integer not null default 200;
alter table profiles add column if not exists daily_fat_g     integer not null default 65;

-- 3. Enable row-level security.
alter table profiles enable row level security;

-- 4. Create the "own row" policy if it doesn't exist yet.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'profiles: own row'
  ) then
    create policy "profiles: own row"
      on profiles for all
      using (id = auth.uid());
  end if;
end $$;

-- 5. Auto-create a profile row when a new user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
