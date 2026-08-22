# Supabase setup files

These aren't part of the website itself, they're what sets up the database
the website reads from. Everything here runs through the Supabase
dashboard in your browser, nothing here needs a terminal.

**SQL files (run these in order, in the Supabase SQL Editor):**

1. `1_schema.sql` — creates every table and permission rule
2. `2_seed_rules.sql` — the eleven compliance rules
3. `3_seed_companies.sql` — the 31 companies
4. `4_seed_festival_windows.sql` — optional, the four local festival
   windows the dashboard flags when a deadline falls inside one
5. `5a_fix_sarisajam_baha.sql` — one company's data needed a real fix,
   not just a backfill; see the comments inside. Run this, then
   re-trigger `refresh-instances` once more, before step 6.
6. `5b_backfill_compliances_status.sql` — marks everything the
   "Compliances status" sheet already shows as filed, tested end to
   end against a real Postgres database before being handed over:
   297 false "overdue" items before running it, 193 genuinely
   outstanding ones after, matching what the sheet actually shows.

**Edge functions (paste these into Supabase, Edge Functions, Deploy a
new function, Via Editor):**

- `edge-functions/refresh-instances.ts` — generates the actual dated
  compliance rows from the rules and companies above; run this once
  right after the SQL files, and nightly after that
- `edge-functions/send-alerts.ts` — sends the WhatsApp reminders; needs
  the `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, and (optionally)
  `WHATSAPP_TEMPLATE_NAME` secrets set first, under Edge Functions,
  Secrets

The full beginner's guide walks through exactly where to click for each
of these.
