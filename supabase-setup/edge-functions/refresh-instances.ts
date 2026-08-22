// refresh-instances
//
// Regenerates compliance_instances from the current companies and
// compliance_rules tables. Running this server side, on a schedule,
// means the database always holds the current answer, and the
// dashboard just reads rows instead of recomputing dates itself.
//
// This is a self-contained version: the original project splits the
// date-calculation engine into its own file (supabase/functions/_shared/
// compliance-rules.ts) shared with the send-alerts function, but the
// Supabase Dashboard's single-file function editor is the simplest way
// to deploy without a CLI, so that engine is inlined below instead.
//
// Trigger this:
//   - once manually right after loading schema.sql + the seed files
//   - daily, a few minutes before send-alerts runs
//   - any time after a new company is onboarded through the dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------------------------------------------------------
   Compliance engine (inlined from _shared/compliance-rules.ts)
------------------------------------------------------------------*/
type TriggerType =
  | "incorporation_once"
  | "fy_end_annual"
  | "agm_relative"
  | "fixed_annual_date"
  | "recurring_interval";

interface ComplianceRule {
  code: string;
  label: string;
  section_ref: string;
  responsible_role: "director" | "ca" | "isb_lead";
  trigger: TriggerType;
  offset_days?: number;
  offset_months?: number;
  fixed_month?: number;
  fixed_day?: number;
  internal_buffer_days: number;
  depends_on?: string;
  active: boolean;
  description: string;
}

interface Company {
  id: string;
  name: string;
  state: string;
  district: string;
  incorporation_date: string | null;
  fy_end_month?: number;
  fy_end_day?: number;
}

interface ComplianceInstance {
  company_id: string;
  rule_code: string;
  cycle_year: number;
  statutory_due_date: string;
  internal_target_date: string;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function addMonthsClamped(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d.toISOString().slice(0, 10);
}

function fyEndForCycle(company: Company, cycleYear: number): string {
  const month = company.fy_end_month ?? 3;
  const day = company.fy_end_day ?? 31;
  const mm = String(month).padStart(2, "0");
  const daysInMonth = new Date(Date.UTC(cycleYear, month, 0)).getUTCDate();
  const dd = String(Math.min(day, daysInMonth)).padStart(2, "0");
  return `${cycleYear}-${mm}-${dd}`;
}

function currentCycleYear(company: Company, today: string): number {
  const t = new Date(today + "T00:00:00Z");
  const fyEndThisYear = new Date(fyEndForCycle(company, t.getUTCFullYear()) + "T00:00:00Z");
  return t > fyEndThisYear ? t.getUTCFullYear() : t.getUTCFullYear() - 1;
}

function incorporationYear(company: Company): number {
  return new Date(company.incorporation_date as string).getUTCFullYear();
}

function makeInstance(company: Company, rule: ComplianceRule, cycleYear: number, statutoryDue: string): ComplianceInstance {
  return {
    company_id: company.id,
    rule_code: rule.code,
    cycle_year: cycleYear,
    statutory_due_date: statutoryDue,
    internal_target_date: addDays(statutoryDue, -(rule.internal_buffer_days ?? 0)),
  };
}

function buildInstances(company: Company, rules: ComplianceRule[], today: string, lookaheadCycles = 2): ComplianceInstance[] {
  if (!company.incorporation_date) return [];

  const out: ComplianceInstance[] = [];
  const byCode: Record<string, ComplianceRule> = {};
  rules.forEach((r) => (byCode[r.code] = r));

  const baseCycle = currentCycleYear(company, today);
  const cycles = [baseCycle - 1, baseCycle, baseCycle + 1].slice(0, lookaheadCycles + 1);

  for (const rule of rules) {
    if (!rule.active) continue;

    if (rule.trigger === "incorporation_once") {
      const due = addDays(company.incorporation_date, rule.offset_days ?? 0);
      out.push(makeInstance(company, rule, incorporationYear(company), due));
      continue;
    }

    if (rule.trigger === "recurring_interval") {
      let d = company.incorporation_date;
      const step = rule.offset_days ?? 90;
      const horizon = addDays(today, 400);
      let guard = 0;
      while (d < today && guard < 2000) { d = addDays(d, step); guard++; }
      let count = 0;
      while (d <= horizon && count < 2) {
        out.push(makeInstance(company, rule, new Date(d).getUTCFullYear(), d));
        d = addDays(d, step);
        count++;
      }
      continue;
    }

    if (rule.trigger === "fixed_annual_date") {
      for (const cycleYear of cycles) {
        const mm = String(rule.fixed_month ?? 9).padStart(2, "0");
        const dd = String(rule.fixed_day ?? 30).padStart(2, "0");
        const due = `${cycleYear + 1}-${mm}-${dd}`;
        out.push(makeInstance(company, rule, cycleYear, due));
      }
      continue;
    }

    if (rule.trigger === "fy_end_annual") {
      for (const cycleYear of cycles) {
        const fyEnd = fyEndForCycle(company, cycleYear);
        const due = rule.offset_months != null
          ? addMonthsClamped(fyEnd, rule.offset_months)
          : addDays(fyEnd, rule.offset_days ?? 0);
        out.push(makeInstance(company, rule, cycleYear, due));
      }
      continue;
    }

    if (rule.trigger === "agm_relative") {
      const depCode = rule.depends_on ?? "AGM";
      const depRule = byCode[depCode];
      if (!depRule) continue;
      for (const cycleYear of cycles) {
        const fyEnd = fyEndForCycle(company, cycleYear);
        const agmDue = depRule.offset_months != null
          ? addMonthsClamped(fyEnd, depRule.offset_months)
          : addDays(fyEnd, depRule.offset_days ?? 0);
        const due = addDays(agmDue, rule.offset_days ?? 0);
        out.push(makeInstance(company, rule, cycleYear, due));
      }
      continue;
    }
  }

  return out.sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date));
}

/* ---------------------------------------------------------------
   The function itself
------------------------------------------------------------------*/
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: companies, error: coErr }, { data: rules, error: ruErr }] = await Promise.all([
    supabase.from("companies").select("id, name, state, district, incorporation_date, fy_end_month, fy_end_day").eq("status", "active"),
    supabase.from("compliance_rules").select("*").eq("active", true),
  ]);

  if (coErr) return jsonError(coErr.message);
  if (ruErr) return jsonError(ruErr.message);

  const typedRules = (rules ?? []) as ComplianceRule[];
  let totalUpserted = 0;
  const errors: string[] = [];

  for (const row of companies ?? []) {
    const company: Company = {
      id: row.id, name: row.name, state: row.state, district: row.district,
      incorporation_date: row.incorporation_date, fy_end_month: row.fy_end_month, fy_end_day: row.fy_end_day,
    };
    const instances = buildInstances(company, typedRules, today, 2);
    if (instances.length === 0) continue;

    const { error } = await supabase.from("compliance_instances").upsert(
      instances.map((i) => ({
        company_id: i.company_id,
        rule_code: i.rule_code,
        cycle_year: i.cycle_year,
        statutory_due_date: i.statutory_due_date,
        internal_target_date: i.internal_target_date,
      })),
      { onConflict: "company_id,rule_code,statutory_due_date", ignoreDuplicates: false }
    );

    if (error) errors.push(`${row.name}: ${error.message}`);
    else totalUpserted += instances.length;
  }

  return new Response(
    JSON.stringify({ ok: errors.length === 0, companies_processed: (companies ?? []).length, instances_upserted: totalUpserted, errors }),
    { headers: { "Content-Type": "application/json" }, status: errors.length ? 207 : 200 }
  );
});

function jsonError(message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
}
