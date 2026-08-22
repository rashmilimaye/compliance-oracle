-- Optional but recommended: seeds the same four local-context windows
-- that the original prototype had built in. Run this once in the
-- Supabase SQL Editor, any time after schema.sql. A State Lead can
-- add more rows here later without touching any code, see the
-- festival_windows comment in schema.sql.
insert into festival_windows (state, district, label, start_month_day, end_month_day, year, active) values
  ('Odisha', null, 'Nuakhai', '09-10', '09-20', null, true),
  ('Odisha', null, 'Raja Parba', '06-14', '06-17', null, true),
  ('Odisha', null, 'Durga Puja', '09-28', '10-05', null, true),
  ('Jharkhand', null, 'Sarhul / harvest window', '09-15', '10-10', null, true);
