-- =====================================================================
-- seed_rules.sql
-- Generated directly from DEFAULT_RULES in compliance-rules.ts, so the
-- database and the typed engine can never quietly drift apart. If you
-- change a rule, change it in compliance-rules.ts and re-run
-- `npx tsx gen_seed_rules.ts > seed_rules.sql`, don't hand edit this file.
-- =====================================================================

insert into compliance_rules
  (code, label, section_ref, responsible_role, trigger, offset_days, offset_months, fixed_month, fixed_day, internal_buffer_days, depends_on, active, description)
values
  ('INC22', 'Registered Office Verification (INC-22)', 'Sec. 12', 'ca', 'incorporation_once', 30, NULL, NULL, NULL, 5, NULL, true, 'One-time filing confirming the registered office address.'),
  ('INC20A', 'Declaration of Commencement of Business (INC-20A)', 'Sec. 10A', 'ca', 'incorporation_once', 180, NULL, NULL, NULL, 90, NULL, true, 'Statutory deadline is 180 days. The internal target of 90 days matches what the team already chases in the field, well inside the legal window.'),
  ('FIRST_MEETING', 'First members'' meeting to lay the Memorandum and Articles', 'Sec. 378G(2)(o)', 'director', 'incorporation_once', 90, NULL, NULL, NULL, 15, NULL, true, 'The Producer Company specific meeting the team already tracks as its early ''AGM to be conducted before'' deadline. Distinct from the ongoing annual AGM below, and easy to conflate with it, so it is named separately here on purpose.'),
  ('AGM', 'Annual General Meeting', 'Sec. 96', 'director', 'fy_end_annual', NULL, 6, NULL, NULL, 30, NULL, true, 'Within six months of financial year end, for every year after the first.'),
  ('ADT1', 'Auditor Appointment Intimation (ADT-1)', 'Sec. 139', 'ca', 'agm_relative', 15, NULL, NULL, NULL, 3, 'AGM', true, 'Within fifteen days of the AGM at which the auditor is appointed.'),
  ('AOC4', 'Financial Statements Filing (AOC-4)', 'Sec. 137', 'ca', 'agm_relative', 30, NULL, NULL, NULL, 7, 'AGM', true, 'Within thirty days of the AGM.'),
  ('MGT7', 'Annual Return (MGT-7)', 'Sec. 92', 'ca', 'agm_relative', 60, NULL, NULL, NULL, 10, 'AGM', true, 'Within sixty days of the AGM.'),
  ('DIR3KYC', 'Director KYC (DIR-3 KYC)', 'Rule 12A', 'director', 'fixed_annual_date', NULL, NULL, 9, 30, 14, NULL, true, 'Every director holding a DIN files this by 30 September each year, independent of the company''s own financial year.'),
  ('STATAUDIT', 'Statutory Audit, completed and signed', 'Sec. 143', 'ca', 'fy_end_annual', 137, NULL, NULL, NULL, 15, NULL, true, 'Internal target, not a filing in itself: complete the audit well ahead of the AGM so the AGM and the filings that follow it are never rushed.'),
  ('INTAUDIT', 'Internal Audit (distinct from the statutory audit)', 'Sec. 378ZF', 'ca', 'fy_end_annual', NULL, 8, NULL, NULL, 15, NULL, true, 'Interval is actually set by each company''s own articles. Shown here as an annual default; override per company if a specific company''s articles say otherwise.'),
  ('BOARD', 'Board Meeting (quarterly minimum)', 'Sec. 378R', 'director', 'recurring_interval', 90, NULL, NULL, NULL, 7, NULL, true, 'Not more than one hundred and twenty days between meetings, minimum four a year. Modelled here as a 90 day cadence from incorporation.');
