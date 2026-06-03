@AGENTS.md
# Calorie Tracker App

## Stack
- Next.js 14 with App Router and TypeScript
- Tailwind CSS for styling
- Supabase for database and auth
- Deployed on Vercel

## What we're building
A calorie tracking app where users can:
- Snap a photo of food and get AI calorie estimates
- Log their weight over time
- See trends and progress

## Rules
- Always use TypeScript
- Always use Tailwind for styling
- Never edit .env.local
- Always use the App Router pattern
- Keep components in /components folder
- Keep database queries in /lib/supabase folder

## Database
- meals table: stores logged food with calories and macros
- weight_logs table: stores daily weight entries
- All tables have row level security enabled