-- ============================================================
--  Calorie Snap — Supabase Schema
--  Tables: profiles · meal_logs · weight_logs · daily_summaries
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

create type goal_type   as enum ('lose', 'maintain', 'gain');
create type sex_type    as enum ('female', 'male', 'other');
create type unit_pref   as enum ('lb', 'kg');
create type meal_type   as enum ('breakfast', 'lunch', 'dinner', 'snack');


-- ── 1. profiles ──────────────────────────────────────────────
--  One row per user. Extends Supabase auth.users.
--  Stores onboarding answers and preferences.

create table profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,

  -- identity
  full_name         text,
  avatar_url        text,

  -- onboarding (steps 1–2)
  goal              goal_type   not null default 'lose',
  sex               sex_type,
  age               smallint    check (age between 10 and 120),
  height_cm         numeric(5,1)  check (height_cm       between 50 and 280),   -- stored in cm, displayed in ft/in or cm
  start_weight_kg   numeric(6,2)  check (start_weight_kg between 20 and 500),   -- always stored in kg; UI converts

  -- targets (steps 3–4)
  goal_weight_kg    numeric(6,2)  check (goal_weight_kg  between 20 and 500),
  daily_kcal_target smallint    not null default 2000
                                check (daily_kcal_target between 800 and 6000),

  -- display preference
  units             unit_pref   not null default 'lb',

  -- streak helper (incremented server-side)
  current_streak    smallint    not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function touch_updated_at();


-- ── 2. meal_logs ─────────────────────────────────────────────
--  One row per meal entry. Supports logged and planned meals.

create table meal_logs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references profiles(id) on delete cascade,

  -- when
  logged_at     timestamptz not null default now(),   -- exact timestamp
  log_date      date        not null,                 -- user's local date; supplied by app

  -- what
  meal_type     meal_type   not null,
  name          text        not null,
  portion_desc  text,                                 -- e.g. "1 bowl (~340 g)"

  -- image (Supabase Storage path, not full URL)
  image_path    text,                                 -- e.g. "meals/<user_id>/<uuid>.jpg"

  -- nutrition (all per-entry totals, not per-100 g)
  kcal          smallint    not null check (kcal >= 0),
  protein_g     numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g       numeric(6,1) not null default 0 check (carbs_g   >= 0),
  fat_g         numeric(6,1) not null default 0 check (fat_g     >= 0),
  fiber_g       numeric(6,1)          default 0 check (fiber_g   >= 0),

  -- AI confidence score from vision model (0.00–1.00)
  ai_confidence numeric(4,2)          check (ai_confidence between 0 and 1),

  -- planned vs logged
  is_planned    boolean     not null default false,

  created_at    timestamptz not null default now()
);

create index meal_logs_user_date on meal_logs (user_id, log_date desc);
create index meal_logs_planned   on meal_logs (user_id, log_date) where is_planned = true;


-- ── 3. weight_logs ───────────────────────────────────────────
--  One row per weigh-in. One entry per day is typical but not enforced.

create table weight_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,

  logged_at   timestamptz not null default now(),
  log_date    date        not null,                 -- user's local date; supplied by app

  weight_kg   numeric(6,2) not null check (weight_kg between 20 and 500),

  note        text,

  created_at  timestamptz not null default now()
);

-- Only one entry per user per day (last write wins via upsert on this constraint)
-- This unique index also serves as the lookup index for (user_id, log_date) queries.
create unique index weight_logs_one_per_day on weight_logs (user_id, log_date);


-- ── 4. daily_summaries ───────────────────────────────────────
--  Pre-aggregated row per (user, date). Upserted when a meal is
--  saved or deleted — avoids re-summing every read.

create table daily_summaries (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  summary_date    date        not null,

  -- calorie snapshot
  total_kcal      smallint    not null default 0,
  kcal_target     smallint    not null default 2000,   -- copied from profile at write time

  -- macro totals
  total_protein_g numeric(7,1) not null default 0,
  total_carbs_g   numeric(7,1) not null default 0,
  total_fat_g     numeric(7,1) not null default 0,
  total_fiber_g   numeric(7,1) not null default 0,

  -- meal counts
  meals_logged    smallint    not null default 0,
  meals_planned   smallint    not null default 0,

  -- weight that day (denormalised from weight_logs for quick chart queries)
  weight_kg       numeric(6,2),

  updated_at      timestamptz not null default now(),

  constraint daily_summaries_user_date unique (user_id, summary_date)
);

create index daily_summaries_user_date on daily_summaries (user_id, summary_date desc);

create trigger daily_summaries_updated_at
  before update on daily_summaries
  for each row execute function touch_updated_at();


-- ── Row-Level Security ───────────────────────────────────────
--  Users can only read and write their own rows.

alter table profiles        enable row level security;
alter table meal_logs       enable row level security;
alter table weight_logs     enable row level security;
alter table daily_summaries enable row level security;

-- profiles
create policy "profiles: own row"
  on profiles for all
  using (id = auth.uid());

-- meal_logs
create policy "meal_logs: own rows"
  on meal_logs for all
  using (user_id = auth.uid());

-- weight_logs
create policy "weight_logs: own rows"
  on weight_logs for all
  using (user_id = auth.uid());

-- daily_summaries
create policy "daily_summaries: own rows"
  on daily_summaries for all
  using (user_id = auth.uid());


-- ── Auto-create profile on sign-up ───────────────────────────
--  Triggered by Supabase Auth inserting into auth.users.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
