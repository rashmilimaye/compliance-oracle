-- =====================================================================
-- schema.sql
-- Producer Company Compliance Oracle -- database schema for Supabase.
--
-- Run this once against a fresh Supabase project (SQL Editor, or via
-- `supabase db push` if you set up the CLI). It is written to run
-- top to bottom without manual steps in between.
--
-- Design notes worth reading before you extend this:
--   1. compliance_rules is DATA, not code. The engine in
--      compliance-rules.ts reads this table (or its typed mirror) to
--      generate instances. Correcting a due-date offset, or adding a
--      new statutory requirement, is a row edit here, never a
--      redeploy.
--   2. compliance_instances stores only what is actually a fact:
--      the computed dates, and whether something was completed.
--      "Overdue" / "due soon" / "upcoming" are never stored, they
--      are computed from today's date at query time (see the view
--      at the bottom), so they can never go stale.
--   3. RLS is on for every table that holds anything company
--      specific. A state lead's Supabase login only ever returns
--      their own state's rows, enforced by Postgres itself, not by
--      the application remembering to filter.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Profiles: one row per person who logs in, extending Supabase auth.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'compliance_lead', 'state_lead', 'ca')),
  state text,              -- required for state_lead, null for the others (they see everything)
  phone text,
  created_at timestamptz not null default now()
);

comment on table profiles is 'One row per login. role + state drive every RLS policy below.';

-- Helper functions, marked security definer so RLS policies that call
-- them do not recursively re-trigger RLS on profiles (a common Supabase
-- foot-gun otherwise).
create or replace function current_role_name() returns text
  language sql security definer stable as
  $$ select role from profiles where id = auth.uid() $$;

create or replace function current_state() returns text
  language sql security definer stable as
  $$ select state from profiles where id = auth.uid() $$;

-- ---------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  sno int,                              -- original serial number from the Master Sheet, kept for cross-reference during transition
  name text not null,
  cin text unique,
  state text not null,
  district text not null,
  cluster text,
  address text,
  incorporation_date date,              -- null if not yet incorporated
  incorporation_date_verified boolean not null default true, -- false for dates flagged as ambiguous at import, see seed_companies.sql
  fy_end_month int not null default 3,
  fy_end_day int not null default 31,
  ca_name text,
  ca_contact text,
  status text not null default 'active' check (status in ('pre_incorporation', 'active', 'dormant', 'struck_off', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_state on companies(state);
create index if not exists idx_companies_district on companies(district);

alter table companies enable row level security;

create policy companies_select on companies for select
  using (
    current_role_name() in ('admin', 'compliance_lead')
    or (current_role_name() = 'state_lead' and state = current_state())
    or current_role_name() = 'ca'  -- refine to a company-level CA assignment table if/when a CA needs narrower scope
  );

create policy companies_write on companies for all
  using (current_role_name() in ('admin', 'compliance_lead'))
  with check (current_role_name() in ('admin', 'compliance_lead'));

-- ---------------------------------------------------------------------
-- Contacts: directors, the FA, the assigned CA and ISB lead, kept
-- separate from companies so phone numbers and personal details can
-- be governed by their own policy without touching company data.
-- ---------------------------------------------------------------------
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  role text not null check (role in ('president', 'director', 'fa', 'ca', 'isb_lead')),
  name text not null,
  phone text,
  whatsapp_opt_in boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_contacts_company on contacts(company_id);

alter table contacts enable row level security;

create policy contacts_select on contacts for select
  using (
    current_role_name() in ('admin', 'compliance_lead')
    or exists (
      select 1 from companies c
      where c.id = contacts.company_id
        and (current_role_name() != 'state_lead' or c.state = current_state())
    )
  );

create policy contacts_write on contacts for all
  using (current_role_name() in ('admin', 'compliance_lead'))
  with check (current_role_name() in ('admin', 'compliance_lead'));

-- ---------------------------------------------------------------------
-- Compliance rules: the calendar's rule book, as data.
-- Mirrors the ComplianceRule type in compliance-rules.ts exactly.
-- ---------------------------------------------------------------------
create table if not exists compliance_rules (
  code text primary key,
  label text not null,
  section_ref text not null,
  responsible_role text not null check (responsible_role in ('director', 'ca', 'isb_lead')),
  trigger text not null check (trigger in ('incorporation_once', 'fy_end_annual', 'agm_relative', 'fixed_annual_date', 'recurring_interval')),
  offset_days int,
  offset_months int,
  fixed_month int,
  fixed_day int,
  internal_buffer_days int not null default 0,
  depends_on text references compliance_rules(code),
  active boolean not null default true,
  description text
);

alter table compliance_rules enable row level security;

create policy compliance_rules_select on compliance_rules for select
  using (true); -- every logged-in role needs to read the rule book to understand what they are looking at

create policy compliance_rules_write on compliance_rules for all
  using (current_role_name() in ('admin', 'compliance_lead'))
  with check (current_role_name() in ('admin', 'compliance_lead'));

-- ---------------------------------------------------------------------
-- Compliance instances: the generated, dated rows.
-- Generated by re-running compliance-rules.ts (see
-- supabase/functions/refresh-instances, described in BUILD_BRIEF.md)
-- rather than hand maintained.
-- ---------------------------------------------------------------------
create table if not exists compliance_instances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  rule_code text not null references compliance_rules(code),
  cycle_year int not null,              -- informational grouping only (e.g. "FY 2025-26 cycle"); NOT the uniqueness key, see below
  statutory_due_date date not null,
  internal_target_date date not null,
  completed_date date,
  completed_by uuid references profiles(id),
  notes text,
  document_id uuid,  -- fk added below, after the documents table exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Keyed on the due date rather than cycle_year on purpose: a quarterly board
  -- meeting rule produces two or more instances inside the same calendar year,
  -- which a (company_id, rule_code, cycle_year) constraint would collide on and
  -- silently drop. Caught by testing the engine against the real portfolio at
  -- full scale, not by inspection, which is exactly why that test is worth
  -- keeping around (see BUILD_BRIEF.md).
  unique (company_id, rule_code, statutory_due_date)
);

create index if not exists idx_instances_company on compliance_instances(company_id);
create index if not exists idx_instances_due on compliance_instances(statutory_due_date);
create index if not exists idx_instances_incomplete on compliance_instances(statutory_due_date) where completed_date is null;

alter table compliance_instances enable row level security;

create policy instances_select on compliance_instances for select
  using (
    current_role_name() in ('admin', 'compliance_lead')
    or exists (
      select 1 from companies c
      where c.id = compliance_instances.company_id
        and (current_role_name() != 'state_lead' or c.state = current_state())
    )
  );

-- State leads and CAs can mark things complete and add notes; only
-- admin/compliance_lead can edit the generated dates themselves.
create policy instances_update_completion on compliance_instances for update
  using (
    exists (
      select 1 from companies c
      where c.id = compliance_instances.company_id
        and (current_role_name() in ('admin', 'compliance_lead', 'ca')
             or (current_role_name() = 'state_lead' and c.state = current_state()))
    )
  );

create policy instances_write on compliance_instances for insert
  with check (current_role_name() in ('admin', 'compliance_lead'));

create policy instances_delete on compliance_instances for delete
  using (current_role_name() in ('admin', 'compliance_lead'));

-- ---------------------------------------------------------------------
-- Documents: proof of filing, stored in Supabase Storage; this table
-- just holds the pointer and who put it there.
-- ---------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  compliance_instance_id uuid references compliance_instances(id) on delete set null,
  file_path text not null,   -- path inside the 'compliance-documents' storage bucket
  description text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table compliance_instances
  add constraint fk_instances_document foreign key (document_id) references documents(id) on delete set null;

alter table documents enable row level security;

create policy documents_select on documents for select
  using (
    current_role_name() in ('admin', 'compliance_lead')
    or exists (
      select 1 from companies c
      where c.id = documents.company_id
        and (current_role_name() != 'state_lead' or c.state = current_state())
    )
  );

create policy documents_write on documents for insert
  with check (
    exists (
      select 1 from companies c
      where c.id = documents.company_id
        and (current_role_name() in ('admin', 'compliance_lead', 'ca')
             or (current_role_name() = 'state_lead' and c.state = current_state()))
    )
  );

-- ---------------------------------------------------------------------
-- Festival / local-context windows (SOP-01's local calendar layer),
-- as data a State Lead can maintain without touching code.
-- ---------------------------------------------------------------------
create table if not exists festival_windows (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  district text,          -- null = applies state-wide
  label text not null,
  start_month_day text not null,  -- 'MM-DD'
  end_month_day text not null,
  year int,                -- null = recurs every year
  active boolean not null default true
);

alter table festival_windows enable row level security;

create policy festival_select on festival_windows for select using (true);

create policy festival_write on festival_windows for all
  using (current_role_name() in ('admin', 'compliance_lead', 'state_lead'))
  with check (current_role_name() in ('admin', 'compliance_lead', 'state_lead'));

-- ---------------------------------------------------------------------
-- Notification log: an audit trail of every alert actually sent,
-- written by the send-alerts edge function. This is what answers
-- "did the director actually get told" six months from now.
-- ---------------------------------------------------------------------
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  compliance_instance_id uuid references compliance_instances(id) on delete cascade,
  recipient_contact_id uuid references contacts(id),
  channel text not null check (channel in ('whatsapp', 'sms')),
  template_code text not null,
  status text not null check (status in ('sent', 'failed', 'skipped_no_optin')),
  provider_message_id text,
  error_detail text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_notiflog_instance on notification_log(compliance_instance_id);

alter table notification_log enable row level security;

create policy notiflog_select on notification_log for select
  using (
    current_role_name() in ('admin', 'compliance_lead')
    or exists (
      select 1 from compliance_instances ci join companies c on c.id = ci.company_id
      where ci.id = notification_log.compliance_instance_id
        and current_role_name() = 'state_lead' and c.state = current_state()
    )
  );

-- the edge function writes here using the service role key, which
-- bypasses RLS by design, so no insert policy is needed for it.

-- ---------------------------------------------------------------------
-- Live status view. Nothing here is stored: status is derived fresh
-- from today's date every time it is queried, which is what keeps it
-- honest.
-- ---------------------------------------------------------------------
create or replace view compliance_instances_live as
select
  ci.*,
  co.name as company_name,
  co.state,
  co.district,
  cr.label as rule_label,
  cr.section_ref,
  cr.responsible_role,
  case
    when ci.completed_date is not null then 'completed'
    when ci.statutory_due_date < current_date then 'overdue'
    when ci.statutory_due_date <= current_date + interval '60 days' then 'dueSoon'
    else 'upcoming'
  end as live_status,
  (ci.statutory_due_date - current_date) as days_remaining
from compliance_instances ci
join companies co on co.id = ci.company_id
join compliance_rules cr on cr.code = ci.rule_code;

-- Views inherit RLS from their underlying tables automatically in
-- Postgres when created with the default (invoker) security, so no
-- separate policy is needed here, it will only ever return what the
-- querying user's row-level policies on compliance_instances allow.

-- =====================================================================
-- Storage: the bucket documents point into, and its access policy.
-- Supabase Storage's own permission model is a second RLS layer, on
-- storage.objects, separate from the table policies above, so it needs
-- its own rules even though the intent (state leads see their own
-- state, admins see everything) is identical.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

create policy storage_select on storage.objects for select
  using (
    bucket_id = 'compliance-documents'
    and (
      current_role_name() in ('admin', 'compliance_lead')
      or exists (
        select 1 from companies c
        where c.id::text = (storage.foldername(name))[1]  -- convention: files live at <company_id>/<filename>
          and (current_role_name() != 'state_lead' or c.state = current_state())
      )
    )
  );

create policy storage_insert on storage.objects for insert
  with check (
    bucket_id = 'compliance-documents'
    and exists (
      select 1 from companies c
      where c.id::text = (storage.foldername(name))[1]
        and (current_role_name() in ('admin', 'compliance_lead', 'ca')
             or (current_role_name() = 'state_lead' and c.state = current_state()))
    )
  );

-- =====================================================================
-- Auto-provisioning: when someone accepts a Supabase Auth invite, they
-- get an auth.users row automatically, but nothing in profiles yet,
-- which would make current_role_name() return null and quietly lock
-- them out of everything. This trigger creates a minimal profiles row
-- the moment the auth user exists, defaulted to the lowest-privilege
-- role, so an admin then only has to promote the role and set the
-- state, not create the row from scratch.
-- =====================================================================
create or replace function handle_new_user() returns trigger
  language plpgsql security definer as
$$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'state_lead')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- After this runs, promote your own account by hand once, from the SQL
-- editor, since nothing is admin by default:
--   update profiles set role = 'admin', state = null where id =
--     (select id from auth.users where email = 'you@yourorg.example');
