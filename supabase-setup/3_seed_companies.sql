-- =====================================================================
-- seed_companies.sql
-- The real portfolio, from Sulabhaa_PCs_status.xlsx (Master Sheet), as of
-- 19 August 2026. Re-export and re-run this whenever the source sheet is
-- updated -- treat this file as generated, not hand edited.
--
-- incorporation_date_verified is set to false for nine rows where the
-- source cell was a native Excel date with a day-of-month of 12 or below.
-- For those, a locale mix-up between DD/MM and MM/DD cannot be ruled out
-- from the spreadsheet alone (Excel stores an unambiguous date once
-- entered, but says nothing about what the person who typed it meant).
-- The dashboard should visibly flag these until someone checks them
-- against the certificate of incorporation. RANITARAGA is additionally
-- over a year out of step with the rest of its filing-date neighbours by
-- CIN sequence, and is the one most worth checking first.
-- =====================================================================

insert into companies (sno, name, cin, state, district, incorporation_date, incorporation_date_verified, status)
values
  (1, 'Gandha Mardan Green Shakti Producer Company Limited', 'U02400OD2025PTC048341', 'Odisha', 'Keonjhar', '2025-03-03', false, 'active'),
  (2, 'Kaijala Green Shakti Producer Company Limited', 'U02400OD2025PTC048620', 'Odisha', 'Keonjhar', '2025-03-26', true, 'active'),
  (3, 'Sunamanjari Green Shakti Producer Company Limited', 'U02400OD2025PTC048468', 'Odisha', 'Keonjhar', '2025-11-03', false, 'active'),
  (4, 'Saptadhara Green Shakti Producer Company Limited', 'U02400OD2025PTC048585', 'Odisha', 'Koraput', '2025-03-22', true, 'active'),
  (5, 'Jhankiriamma Green Shakti Producer Company Limited', 'U02400OD2025PTC048201', 'Odisha', 'Koraput', '2025-02-22', true, 'active'),
  (6, 'Manaya Green Shakti Producer Company Limited', 'U02400OD2025PTC048469', 'Odisha', 'Mayurbhanj', '2025-11-03', false, 'active'),
  (7, 'Duarasuni Green Shakti Producer Company Limited', 'U02400OD2025PTC048645', 'Odisha', 'Mayurbhanj', '2025-03-28', true, 'active'),
  (8, 'Mendadongri Green Shakti Producer Company Limited', 'U02400OD2025PTC048571', 'Odisha', 'Nabarangpur', '2025-03-21', true, 'active'),
  (9, 'Sarguli Green Shakti Producer Company Limited', 'U02400OD2025PTC048307', 'Odisha', 'Nabarangpur', '2025-02-28', true, 'active'),
  (10, 'Kanamraj Green Shakti Producer Company', 'U01139OD2025PTC047802', 'Odisha', 'Malkangiri', '2025-01-15', true, 'active'),
  (11, 'Bonda Remolena Ungam Green Shakti Producer Company Limited', 'U02400OD2025PTC048644', 'Odisha', 'Malkangiri', '2025-03-28', true, 'active'),
  (12, 'Tadikrew Green Shakti Producer Company Limited', 'U02400OD2025PTC048661', 'Odisha', 'Malkangiri', '2025-03-29', true, 'active'),
  (13, 'Nagabali Green Shakti Producer Company Limited', 'U02400OD2025PTC048268', 'Odisha', 'Rayagada', '2025-02-26', true, 'active'),
  (14, 'Matarbanam Green Shakti Producer Company Limited', 'U02400OD2025PTC048483', 'Odisha', 'Rayagada', '2025-12-03', false, 'active'),
  (15, 'Sona Buru Jungle Producer Company Limited', 'U02400JH2025PTC024466', 'Jharkhand', 'Simdega', '2025-03-04', false, 'active'),
  (16, 'Band Karyani Green Shakti Producer Company Limited', 'U02400OD2025PTC050203', 'Odisha', 'Malkangiri', '2025-08-13', true, 'active'),
  (17, 'Bhairaghumar Green Shakti Producer Company Limited', 'U02400OD2025PTC050333', 'Odisha', 'Nabarangpur', '2025-08-23', true, 'active'),
  (18, 'Darmetaraj Green Shakti Producer Company Limited', 'U02400OD2025PTC050268', 'Odisha', 'Malkangiri', '2025-08-20', true, 'active'),
  (19, 'Bisiri Thakurini Green Shakti Producer Company Limited', 'U02400OD2025PTC050633', 'Odisha', 'Keonjhar', '2025-12-09', false, 'active'),
  (20, 'Jamukona Green Shakti Producer Company Limited', 'U02400OD2025PTC050768', 'Odisha', 'Nabarangpur', '2025-09-18', true, 'active'),
  (21, 'Jib Jiali Green Shakti Producer Company Limited', 'U02400OD2025PTC050764', 'Odisha', 'Mayurbhanj', '2025-09-18', true, 'active'),
  (22, 'Rasigumi Green Shakti Producer Company Limited', 'U02400OD2025PTC050902', 'Odisha', 'Rayagada', '2025-09-29', true, 'active'),
  (23, 'Pondagada Green Shakti Producer Company Limited', 'U02400OD2025PTC050979', 'Odisha', 'Rayagada', '2025-06-10', false, 'active'),
  (24, 'Baba Kalapahada Green Shakti Producer Company Limited', 'U02400OD2025PTC051082', 'Odisha', 'Mayurbhanj', '2025-10-15', true, 'active'),
  (25, 'Banadurga Green Shakti Producer Company Limited', 'U02400OD2025PTC051340', 'Odisha', 'Keonjhar', '2025-11-11', false, 'active'),
  (26, 'Sagensakam Green Shakti Producer Company Limited', 'U02400OD2025PTC051396', 'Odisha', 'Mayurbhanj', '2025-11-19', true, 'active'),
  (27, 'Lanjia Saora Green Shakti Producer Company Limited', 'U02400OD2025PTC051769', 'Odisha', 'Rayagada', '2025-12-17', true, 'active'),
  (28, 'Patarani Green Shakti Producer Company Limited', 'U02400OD2025PTC051786', 'Odisha', 'Keonjhar', '2025-12-18', true, 'active'),
  (29, 'Ranitaraga Green Shakti Producer Company Limited', 'U02400OD2026PTC052112', 'Odisha', 'Koraput', '2026-12-01', false, 'active'),
  (30, 'Durka Dongri Green Shakti Producer Company Limited', 'U02400OD2026PTC052311', 'Odisha', 'Nabarangpur', '2026-01-27', true, 'active'),
  (31, 'Sarisajam Baha Green Shakti Producer Company Limited', NULL, 'Odisha', 'Mayurbhanj', NULL, true, 'pre_incorporation');

-- Sanity check after running the insert above: this should return 31.
-- select count(*) from companies;