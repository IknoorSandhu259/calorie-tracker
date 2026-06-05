-- Adds onboarding and personal profile columns.
-- Run this after 001_macro_goals.sql in the Supabase SQL editor.

alter table profiles add column if not exists onboarding_completed boolean      not null default false;
alter table profiles add column if not exists age                  smallint      check (age between 10 and 120);
alter table profiles add column if not exists sex                  text          check (sex in ('male', 'female', 'other'));
alter table profiles add column if not exists height_cm            numeric(5,1)  check (height_cm between 50 and 280);
alter table profiles add column if not exists weight_kg            numeric(6,2)  check (weight_kg between 20 and 500);
alter table profiles add column if not exists goal_type            text          check (goal_type in ('lose', 'maintain', 'gain'));
alter table profiles add column if not exists activity_level       text          check (activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'));
alter table profiles add column if not exists goal_pace            text          check (goal_pace in ('slow', 'moderate', 'fast'));
