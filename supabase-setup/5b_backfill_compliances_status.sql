-- =====================================================================
-- 5b_backfill_compliances_status.sql
--
-- Run this AFTER 5a, and after re-triggering refresh-instances once
-- in between. Marks the compliance rows already filed, as of the
-- "Compliances status" sheet you shared, so the dashboard doesn't
-- open showing roughly 297 false "overdue" items.
--
-- What this does NOT cover, and why:
--   - GST filings, MSME, bank account, and similar columns in the
--     sheet: these aren't tracked as compliance_rules in this system,
--     nothing to backfill.
--   - AOC4, MGT7, STATAUDIT, INTAUDIT: none of the 31 companies has a
--     financial year old enough for these to be due yet, so the sheet
--     has no data for them and none needed backfilling.
--   - Where the sheet gave "Completed" with no specific date (most
--     rows for INC-22, INC-20A, DIN KYC, Auditor Appointment, and
--     Board meeting), the statutory due date itself is used as a
--     stand-in completion date (see the coalesce below). Only the
--     AGM/first-meeting column had real dates in the sheet, so those
--     are used where present.
--   - DURKA DONGRI's AGM column is blank even though its "AGM Date"
--     cell has a value (19 March 2026); left un-backfilled on
--     purpose, since a date sitting in that column without the
--     "Completed" marker next to it is more likely a data-entry
--     artifact than a real first meeting, and marking something done
--     that wasn't actually filed is the one mistake this script
--     should never make in either direction.
--
-- Deliberately no "on commit drop" here: the SQL Editor runs each
-- statement in its own committed transaction, which would delete this
-- table before the insert below ever ran. It's still a temporary
-- table, so it disappears on its own once this session ends; if you
-- want it gone sooner, run "drop table backfill_status;" afterwards.
create temporary table if not exists backfill_status (
  company_name text,
  rule_code text,
  completed_date date
);
truncate backfill_status;

insert into backfill_status (company_name, rule_code, completed_date) values
  ('Gandha Mardan Green Shakti Producer Company Limited', 'INC22', null),
  ('Gandha Mardan Green Shakti Producer Company Limited', 'INC20A', null),
  ('Gandha Mardan Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Gandha Mardan Green Shakti Producer Company Limited', 'ADT1', null),
  ('Gandha Mardan Green Shakti Producer Company Limited', 'BOARD', null),
  ('Gandha Mardan Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-05-26'),
  ('Kaijala Green Shakti Producer Company Limited', 'INC22', null),
  ('Kaijala Green Shakti Producer Company Limited', 'INC20A', null),
  ('Kaijala Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Kaijala Green Shakti Producer Company Limited', 'ADT1', null),
  ('Kaijala Green Shakti Producer Company Limited', 'BOARD', null),
  ('Kaijala Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-06-01'),
  ('Sunamanjari Green Shakti Producer Company Limited', 'INC22', null),
  ('Sunamanjari Green Shakti Producer Company Limited', 'INC20A', null),
  ('Sunamanjari Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Sunamanjari Green Shakti Producer Company Limited', 'ADT1', null),
  ('Sunamanjari Green Shakti Producer Company Limited', 'BOARD', null),
  ('Sunamanjari Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-06-05'),
  ('Saptadhara Green Shakti Producer Company Limited', 'INC22', null),
  ('Saptadhara Green Shakti Producer Company Limited', 'INC20A', null),
  ('Saptadhara Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Saptadhara Green Shakti Producer Company Limited', 'ADT1', null),
  ('Saptadhara Green Shakti Producer Company Limited', 'BOARD', null),
  ('Saptadhara Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-06-09'),
  ('Jhankiriamma Green Shakti Producer Company Limited', 'INC22', null),
  ('Jhankiriamma Green Shakti Producer Company Limited', 'INC20A', null),
  ('Jhankiriamma Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Jhankiriamma Green Shakti Producer Company Limited', 'ADT1', null),
  ('Jhankiriamma Green Shakti Producer Company Limited', 'BOARD', null),
  ('Jhankiriamma Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-06-19'),
  ('Manaya Green Shakti Producer Company Limited', 'INC22', null),
  ('Manaya Green Shakti Producer Company Limited', 'INC20A', null),
  ('Manaya Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Manaya Green Shakti Producer Company Limited', 'ADT1', null),
  ('Manaya Green Shakti Producer Company Limited', 'BOARD', null),
  ('Manaya Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-05-14'),
  ('Duarasuni Green Shakti Producer Company Limited', 'INC22', null),
  ('Duarasuni Green Shakti Producer Company Limited', 'INC20A', null),
  ('Duarasuni Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Duarasuni Green Shakti Producer Company Limited', 'ADT1', null),
  ('Duarasuni Green Shakti Producer Company Limited', 'BOARD', null),
  ('Duarasuni Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-04-03'),
  ('Mendadongri Green Shakti Producer Company Limited', 'INC22', null),
  ('Mendadongri Green Shakti Producer Company Limited', 'INC20A', null),
  ('Mendadongri Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Mendadongri Green Shakti Producer Company Limited', 'ADT1', null),
  ('Mendadongri Green Shakti Producer Company Limited', 'BOARD', null),
  ('Mendadongri Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-05-26'),
  ('Sarguli Green Shakti Producer Company Limited', 'INC22', null),
  ('Sarguli Green Shakti Producer Company Limited', 'INC20A', null),
  ('Sarguli Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Sarguli Green Shakti Producer Company Limited', 'ADT1', null),
  ('Sarguli Green Shakti Producer Company Limited', 'BOARD', null),
  ('Sarguli Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-05-28'),
  ('Kanamraj Green Shakti Producer Company', 'INC22', null),
  ('Kanamraj Green Shakti Producer Company', 'INC20A', null),
  ('Kanamraj Green Shakti Producer Company', 'DIR3KYC', null),
  ('Kanamraj Green Shakti Producer Company', 'ADT1', null),
  ('Kanamraj Green Shakti Producer Company', 'BOARD', null),
  ('Kanamraj Green Shakti Producer Company', 'FIRST_MEETING', '2025-03-27'),
  ('Bonda Remolena Ungam Green Shakti Producer Company Limited', 'INC22', null),
  ('Bonda Remolena Ungam Green Shakti Producer Company Limited', 'INC20A', null),
  ('Bonda Remolena Ungam Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Bonda Remolena Ungam Green Shakti Producer Company Limited', 'ADT1', null),
  ('Bonda Remolena Ungam Green Shakti Producer Company Limited', 'BOARD', null),
  ('Bonda Remolena Ungam Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-06-28'),
  ('Tadikrew Green Shakti Producer Company Limited', 'INC22', null),
  ('Tadikrew Green Shakti Producer Company Limited', 'INC20A', null),
  ('Tadikrew Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Tadikrew Green Shakti Producer Company Limited', 'ADT1', null),
  ('Tadikrew Green Shakti Producer Company Limited', 'BOARD', null),
  ('Tadikrew Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-05-26'),
  ('Nagabali Green Shakti Producer Company Limited', 'INC22', null),
  ('Nagabali Green Shakti Producer Company Limited', 'INC20A', null),
  ('Nagabali Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Nagabali Green Shakti Producer Company Limited', 'ADT1', null),
  ('Nagabali Green Shakti Producer Company Limited', 'BOARD', null),
  ('Matarbanam Green Shakti Producer Company Limited', 'INC22', null),
  ('Matarbanam Green Shakti Producer Company Limited', 'INC20A', null),
  ('Matarbanam Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Matarbanam Green Shakti Producer Company Limited', 'ADT1', null),
  ('Matarbanam Green Shakti Producer Company Limited', 'BOARD', null),
  ('Sona Buru Jungle Producer Company Limited', 'INC22', null),
  ('Sona Buru Jungle Producer Company Limited', 'INC20A', null),
  ('Sona Buru Jungle Producer Company Limited', 'DIR3KYC', null),
  ('Sona Buru Jungle Producer Company Limited', 'ADT1', null),
  ('Sona Buru Jungle Producer Company Limited', 'BOARD', null),
  ('Sona Buru Jungle Producer Company Limited', 'FIRST_MEETING', null),
  ('Band Karyani Green Shakti Producer Company Limited', 'INC22', null),
  ('Band Karyani Green Shakti Producer Company Limited', 'INC20A', null),
  ('Band Karyani Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Band Karyani Green Shakti Producer Company Limited', 'ADT1', null),
  ('Band Karyani Green Shakti Producer Company Limited', 'BOARD', null),
  ('Band Karyani Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-09-29'),
  ('Bhairaghumar Green Shakti Producer Company Limited', 'INC22', null),
  ('Bhairaghumar Green Shakti Producer Company Limited', 'INC20A', null),
  ('Bhairaghumar Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Bhairaghumar Green Shakti Producer Company Limited', 'ADT1', null),
  ('Bhairaghumar Green Shakti Producer Company Limited', 'BOARD', null),
  ('Bhairaghumar Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-09-04'),
  ('Darmetaraj Green Shakti Producer Company Limited', 'INC22', null),
  ('Darmetaraj Green Shakti Producer Company Limited', 'INC20A', null),
  ('Darmetaraj Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Darmetaraj Green Shakti Producer Company Limited', 'ADT1', null),
  ('Darmetaraj Green Shakti Producer Company Limited', 'BOARD', null),
  ('Darmetaraj Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-11-04'),
  ('Bisiri Thakurini Green Shakti Producer Company Limited', 'INC22', null),
  ('Bisiri Thakurini Green Shakti Producer Company Limited', 'INC20A', null),
  ('Bisiri Thakurini Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Bisiri Thakurini Green Shakti Producer Company Limited', 'ADT1', null),
  ('Bisiri Thakurini Green Shakti Producer Company Limited', 'BOARD', null),
  ('Bisiri Thakurini Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-11-17'),
  ('Jamukona Green Shakti Producer Company Limited', 'INC22', null),
  ('Jamukona Green Shakti Producer Company Limited', 'INC20A', null),
  ('Jamukona Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Jamukona Green Shakti Producer Company Limited', 'ADT1', null),
  ('Jamukona Green Shakti Producer Company Limited', 'BOARD', null),
  ('Jamukona Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-11-27'),
  ('Jib Jiali Green Shakti Producer Company Limited', 'INC22', null),
  ('Jib Jiali Green Shakti Producer Company Limited', 'INC20A', null),
  ('Jib Jiali Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Jib Jiali Green Shakti Producer Company Limited', 'ADT1', null),
  ('Jib Jiali Green Shakti Producer Company Limited', 'BOARD', null),
  ('Jib Jiali Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-11-19'),
  ('Rasigumi Green Shakti Producer Company Limited', 'INC22', null),
  ('Rasigumi Green Shakti Producer Company Limited', 'INC20A', null),
  ('Rasigumi Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Rasigumi Green Shakti Producer Company Limited', 'ADT1', null),
  ('Rasigumi Green Shakti Producer Company Limited', 'BOARD', null),
  ('Pondagada Green Shakti Producer Company Limited', 'INC22', null),
  ('Pondagada Green Shakti Producer Company Limited', 'INC20A', null),
  ('Pondagada Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Pondagada Green Shakti Producer Company Limited', 'ADT1', null),
  ('Pondagada Green Shakti Producer Company Limited', 'BOARD', null),
  ('Baba Kalapahada Green Shakti Producer Company Limited', 'INC22', null),
  ('Baba Kalapahada Green Shakti Producer Company Limited', 'INC20A', null),
  ('Baba Kalapahada Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Baba Kalapahada Green Shakti Producer Company Limited', 'ADT1', null),
  ('Baba Kalapahada Green Shakti Producer Company Limited', 'BOARD', null),
  ('Baba Kalapahada Green Shakti Producer Company Limited', 'FIRST_MEETING', '2025-11-28'),
  ('Banadurga Green Shakti Producer Company Limited', 'INC22', null),
  ('Banadurga Green Shakti Producer Company Limited', 'INC20A', null),
  ('Banadurga Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Banadurga Green Shakti Producer Company Limited', 'ADT1', null),
  ('Banadurga Green Shakti Producer Company Limited', 'BOARD', null),
  ('Banadurga Green Shakti Producer Company Limited', 'FIRST_MEETING', null),
  ('Sagensakam Green Shakti Producer Company Limited', 'INC22', null),
  ('Sagensakam Green Shakti Producer Company Limited', 'INC20A', null),
  ('Sagensakam Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Sagensakam Green Shakti Producer Company Limited', 'ADT1', null),
  ('Sagensakam Green Shakti Producer Company Limited', 'BOARD', null),
  ('Sagensakam Green Shakti Producer Company Limited', 'FIRST_MEETING', '2026-01-02'),
  ('Lanjia Saora Green Shakti Producer Company Limited', 'INC22', null),
  ('Lanjia Saora Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Lanjia Saora Green Shakti Producer Company Limited', 'ADT1', null),
  ('Lanjia Saora Green Shakti Producer Company Limited', 'BOARD', null),
  ('Patarani Green Shakti Producer Company Limited', 'INC22', null),
  ('Patarani Green Shakti Producer Company Limited', 'INC20A', null),
  ('Patarani Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Patarani Green Shakti Producer Company Limited', 'ADT1', null),
  ('Patarani Green Shakti Producer Company Limited', 'BOARD', null),
  ('Patarani Green Shakti Producer Company Limited', 'FIRST_MEETING', null),
  ('Ranitaraga Green Shakti Producer Company Limited', 'INC22', null),
  ('Ranitaraga Green Shakti Producer Company Limited', 'INC20A', null),
  ('Ranitaraga Green Shakti Producer Company Limited', 'DIR3KYC', null),
  ('Ranitaraga Green Shakti Producer Company Limited', 'ADT1', null),
  ('Ranitaraga Green Shakti Producer Company Limited', 'BOARD', null),
  ('Ranitaraga Green Shakti Producer Company Limited', 'FIRST_MEETING', '2026-04-10'),
  ('Durka Dongri Green Shakti Producer Company Limited', 'INC22', null),
  ('Durka Dongri Green Shakti Producer Company Limited', 'INC20A', null),
  ('Durka Dongri Green Shakti Producer Company Limited', 'ADT1', null),
  ('Durka Dongri Green Shakti Producer Company Limited', 'BOARD', null),
  ('Sarisajam Baha Green Shakti Producer Company Limited', 'INC22', null),
  ('Sarisajam Baha Green Shakti Producer Company Limited', 'INC20A', null),
  ('Sarisajam Baha Green Shakti Producer Company Limited', 'ADT1', null),
  ('Sarisajam Baha Green Shakti Producer Company Limited', 'BOARD', null),
  ('Sarisajam Baha Green Shakti Producer Company Limited', 'FIRST_MEETING', '2026-04-24');

update compliance_instances ci
set completed_date = coalesce(bs.completed_date, ci.statutory_due_date)
from backfill_status bs
join companies c on upper(c.name) = upper(bs.company_name)
where ci.company_id = c.id
  and ci.rule_code = bs.rule_code
  and ci.completed_date is null
  and ci.statutory_due_date = (
    select min(ci2.statutory_due_date)
    from compliance_instances ci2
    where ci2.company_id = c.id and ci2.rule_code = bs.rule_code
  );

-- Sanity check: run this next and compare it to what your team would
-- say off the top of their heads is actually outstanding right now.
select count(*) from compliance_instances_live where live_status = 'overdue';
