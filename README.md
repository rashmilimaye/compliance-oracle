# The Oracle — PC Compliance dashboard

A Next.js website connected to Supabase, showing live compliance
status for the 31-company Producer Company portfolio.

## What's in here

- `app/`, `components/`, `lib/` — the actual website source code
- `supabase-setup/` — the SQL and edge function files that set up the
  database this website reads from; see `supabase-setup/README.md`
- `.env.local.example` — copy to `.env.local` and fill in your own
  Supabase project's URL and anon key if you ever want to preview
  this locally; not needed for the GitHub → Vercel deployment path

## Deploying

This project doesn't need to be built or run on your own computer.
Upload it to a GitHub repository, then import that repository into
Vercel and set two environment variables there
(`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Vercel builds and runs it on its own servers. The full beginner's
guide walks through every click.
