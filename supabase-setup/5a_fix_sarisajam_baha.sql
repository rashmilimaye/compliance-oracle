-- =====================================================================
-- 5a_fix_sarisajam_baha.sql
--
-- Run this FIRST, on its own, before 5b. Two things were found while
-- comparing the "Compliances status" sheet against the seeded data:
--
--   1. SARISAJAM BAHA is seeded with a null incorporation date (not
--      yet incorporated, per seed_companies.sql), but the sheet shows
--      it was actually incorporated 19 April 2026, with real progress
--      already made (INC-22, INC-20A, Auditor Appointment, Board
--      meeting, and the first members' meeting all already done).
--      Without this fix, refresh-instances has nothing to generate
--      for this company at all: its incorporation date is null AND
--      its status is still 'pre_incorporation', and refresh-instances
--      only processes companies where status = 'active'.
--
--   2. RANITARAGA's incorporation date is stored as 2026-12-01, over a
--      year after its CIN-sequence neighbours. The sheet's own AGM
--      Date for Ranitaraga is 10 April 2026, which cannot come after
--      an incorporation date of 1 December 2026, that would mean the
--      first meeting happened before the company existed. This
--      independently supports the earlier suspicion that the true
--      date is closer to 12 January 2026 (a day/month swap at data
--      entry), which would put the first meeting comfortably within
--      its normal 90-day window. Worth confirming against the actual
--      certificate of incorporation, then correcting with an update
--      in the same shape as the one below, before trusting
--      Ranitaraga's dates on the dashboard. Not applied automatically
--      here since it's a guess, not a confirmed fact yet.

update companies
set incorporation_date = '2026-04-19', incorporation_date_verified = true, status = 'active'
where name = 'Sarisajam Baha Green Shakti Producer Company Limited'
  and incorporation_date is null;

-- After this runs, go re-trigger refresh-instances once (Phase 4's
-- Test button in Edge Functions) before running 5b, so Sarisajam
-- Baha's rows actually exist to be marked complete.
