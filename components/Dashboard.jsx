"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  ChevronRight,
  Calendar,
  Building2,
  X,
  Check,
  AlertTriangle,
  Info,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ---------------------------------------------------------------
   Palette. Matches PC_Compliance_Oracle_Prototype.jsx exactly, so
   the live site looks identical to the version everyone already
   reviewed.
------------------------------------------------------------------*/
const C = {
  paper: "#F6F4EE", paperRaised: "#FFFFFF", ink: "#1E2321", inkSoft: "#5B6360",
  navy: "#1F3864", navySoft: "#3C5580", forest: "#2F5C45", forestSoft: "#4F7C63",
  gold: "#93701C", goldSoft: "#B08B33", brick: "#A23E32", brickSoft: "#C97363",
  line: "#DEDACD", lineSoft: "#EAE7DC",
};
const DISPLAY_FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const BODY_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif';
const MONO_FONT = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const TODAY_ISO = TODAY.toISOString().slice(0, 10);

function daysBetween(fromIso, toIso) {
  return Math.round((new Date(toIso + "T00:00:00Z") - new Date(fromIso + "T00:00:00Z")) / 86400000);
}
function formatDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function roleLabel(r) {
  return { director: "State Lead", ca: "CA", isb_lead: "ISB Lead" }[r] || r;
}
function festivalClash(company, iso, windows) {
  const tag = iso.slice(5);
  const year = Number(iso.slice(0, 4));
  return windows.find((w) => {
    if (w.state !== company.state) return false;
    if (w.district && w.district !== company.district) return false;
    if (w.year && w.year !== year) return false;
    return tag >= w.start_month_day && tag <= w.end_month_day;
  });
}

/* ---------------------------------------------------------------
   Data loading. Everything here reads through Supabase's row-level
   security: a state lead's session simply never receives another
   state's rows, enforced by Postgres itself, not by this code
   remembering to filter, so there is nothing to double check here.
------------------------------------------------------------------*/
function useOracleData() {
  const [companies, setCompanies] = useState([]);
  const [instances, setInstances] = useState([]);
  const [rules, setRules] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [companiesRes, instancesRes, rulesRes, festivalsRes, profileRes] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("compliance_instances_live").select("*"),
      supabase.from("compliance_rules").select("*"),
      supabase.from("festival_windows").select("*").eq("active", true),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    const firstError =
      companiesRes.error || instancesRes.error || rulesRes.error || festivalsRes.error || profileRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setCompanies(companiesRes.data || []);
    setInstances(instancesRes.data || []);
    setRules(rulesRes.data || []);
    setFestivals(festivalsRes.data || []);
    setProfile(profileRes.data || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the standard pattern for a client-only dashboard like
    // this one. The newer set-state-in-effect lint rule is written for
    // apps using Suspense/use() data fetching, which this project doesn't
    // use, so it's disabled here rather than worked around.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { companies, instances, rules, festivals, profile, loading, error, reload };
}

/* ---------------------------------------------------------------
   Small visual pieces (unchanged from the prototype).
------------------------------------------------------------------*/
function RingBadge({ status, daysLeft }) {
  const size = 34, stroke = 3.5, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const palette = { overdue: C.brick, dueSoon: C.gold, upcoming: C.forestSoft, completed: C.forest };
  const color = palette[status];
  const frac = status === "completed" || status === "overdue" ? 1 : Math.max(0.06, Math.min(1, 1 - daysLeft / 60));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.lineSoft} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${circ * frac} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {status === "completed" ? <Check size={14} color={color} strokeWidth={3} />
          : status === "overdue" ? <AlertTriangle size={13} color={color} strokeWidth={2.5} />
          : status === "dueSoon" ? <span style={{ fontFamily: MONO_FONT, fontSize: 10, color, fontWeight: 700 }}>{Math.abs(daysLeft)}</span>
          : <span style={{ width: 6, height: 6, borderRadius: 6, background: color, display: "block" }} />}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    overdue: { bg: "#F3E4E0", fg: C.brick, label: "Overdue" },
    dueSoon: { bg: "#F1E7D3", fg: C.gold, label: "Due within 60 days" },
    upcoming: { bg: "#E7EEE8", fg: C.forestSoft, label: "Upcoming" },
    completed: { bg: "#E1EAE3", fg: C.forest, label: "Completed" },
  };
  const s = map[status];
  return <span style={{ background: s.bg, color: s.fg, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function UnverifiedTag() {
  return (
    <span title="Incorporation date came from a spreadsheet cell where a day/month mix-up cannot be ruled out. Check against the certificate of incorporation."
      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, color: C.brick, fontWeight: 600, marginLeft: 6 }}>
      <ShieldAlert size={11} /> unverified date
    </span>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: "16px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontFamily: MONO_FONT, fontSize: 28, color: tone, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>{label}</div>
    </div>
  );
}

function statusToLabel(s) { return { overdue: "Overdue", dueSoon: "Due within 60 days", upcoming: "Upcoming", completed: "Completed" }[s]; }

function SideLink({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 7, background: active ? "#2C4670" : "transparent", border: "none", color: active ? "#fff" : "#C7CFDE", fontSize: 13.5, textAlign: "left", fontWeight: active ? 600 : 400 }}>{icon}{label}</button>
  );
}

function FilterBar({ query, setQuery, states, stateFilter, setStateFilter, statusFilter, setStatusFilter }) {
  const inputStyle = { border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", fontSize: 13, background: C.paperRaised, color: C.ink };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <Search size={14} color={C.inkSoft} style={{ position: "absolute", left: 9, top: 10 }} />
        <input placeholder="Search company or compliance" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputStyle, paddingLeft: 30, width: 240 }} />
      </div>
      <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={inputStyle}>{states.map((s) => <option key={s}>{s}</option>)}</select>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
        {["Actionable", "All statuses", "Overdue", "Due within 60 days", "Upcoming", "Completed"].map((s) => <option key={s}>{s}</option>)}
      </select>
      {statusFilter === "Actionable" && <span style={{ fontSize: 12, color: C.inkSoft }}>overdue + due within 60 days, the default view at this portfolio size</span>}
    </div>
  );
}

function RowHeader() {
  const cell = { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkSoft, fontWeight: 600 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px 2.1fr 1.6fr 100px 1fr 90px", gap: 12, alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.line}`, background: C.lineSoft }}>
      <span></span><span style={cell}>Company</span><span style={cell}>Compliance</span><span style={cell}>Due</span><span style={cell}>Status</span><span style={cell}>Owner</span>
    </div>
  );
}

function ComplianceRow({ row, onComplete, onUndo, onOpenCompany }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="oracle-row" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "grid", gridTemplateColumns: "40px 2.1fr 1.6fr 100px 1fr 90px", gap: 12, alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${C.lineSoft}` }}>
      <RingBadge status={row.status} daysLeft={row.daysLeft} />
      <div>
        <button onClick={onOpenCompany} style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: C.navy, fontWeight: 600, fontSize: 13.5 }}>{row.company.name}</button>
        <div style={{ fontSize: 11.5, color: C.inkSoft }}>{row.company.state} &middot; {row.company.district}{!row.company.incorporation_date_verified && <UnverifiedTag />}</div>
      </div>
      <div>
        <div style={{ fontWeight: 500 }}>{row.rule_label}</div>
        <div style={{ fontSize: 11.5, color: C.inkSoft }}>{row.section_ref}</div>
        {row.clash && <div style={{ fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><Info size={11} /> falls in {row.clash.label} window, move the working date earlier</div>}
      </div>
      <div style={{ fontFamily: MONO_FONT, fontSize: 12.5 }}>{formatDate(row.statutory_due_date)}</div>
      <div><StatusPill status={row.status} /></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 12, color: C.inkSoft }}>{roleLabel(row.responsible_role)}</span>
        {hover && (row.status === "completed"
          ? <button onClick={() => onUndo(row)} title="Undo" style={{ background: "none", border: "none", color: C.inkSoft }}><X size={14} /></button>
          : <button onClick={() => onComplete(row)} title="Mark complete" style={{ background: "none", border: `1px solid ${C.forestSoft}`, color: C.forestSoft, borderRadius: 5, padding: "2px 6px", fontSize: 11 }}>Mark done</button>)}
      </div>
    </div>
  );
}

function CompanyCard({ co, instances, onOpen }) {
  const overdue = instances.filter((r) => r.status === "overdue").length;
  const dueSoon = instances.filter((r) => r.status === "dueSoon").length;
  const notIncorporated = !co.incorporation_date;
  return (
    <button onClick={onOpen} style={{ textAlign: "left", background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{co.name}</div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{co.cluster ? `${co.cluster}, ` : ""}{co.district}, {co.state}</div>
      </div>
      <div style={{ fontSize: 11.5, color: C.inkSoft, display: "flex", flexDirection: "column", gap: 3 }}>
        <span>{notIncorporated ? "Not yet incorporated" : `Incorporated ${formatDate(co.incorporation_date)}`}{!notIncorporated && !co.incorporation_date_verified && <UnverifiedTag />}</span>
        <span style={{ fontFamily: MONO_FONT }}>{co.cin || "CIN pending"}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
        {notIncorporated ? <span style={{ fontSize: 11.5, color: C.inkSoft, fontStyle: "italic" }}>No calendar until incorporation is confirmed</span>
          : <>{overdue > 0 && <StatusPill status="overdue" />}{dueSoon > 0 && <StatusPill status="dueSoon" />}{overdue === 0 && dueSoon === 0 && <StatusPill status="upcoming" />}</>}
      </div>
    </button>
  );
}

function DetailLine({ label, value }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: C.inkSoft }}>{label}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span></div>;
}

function CompanyDetail({ co, rows, onClose, onComplete, onUndo }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", justifyContent: "flex-end", zIndex: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: "90vw", background: C.paper, height: "100%", padding: "22px 22px", overflow: "auto", boxShadow: "-8px 0 24px #00000022" }} className="oracle-scroll">
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkSoft, display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, marginBottom: 14 }}><ChevronRight size={14} /> Close</button>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 20, color: C.navy, margin: "0 0 4px" }}>{co.name}</h2>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{co.cluster ? `${co.cluster}, ` : ""}{co.district}, {co.state}</div>

        <div style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 9, padding: 14, fontSize: 12.5, marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <DetailLine label="Incorporated" value={co.incorporation_date ? formatDate(co.incorporation_date) : "Not yet"} />
          {!co.incorporation_date_verified && co.incorporation_date && <div style={{ fontSize: 11.5, color: C.brick, display: "flex", alignItems: "center", gap: 4 }}><ShieldAlert size={12} /> date unverified, check against the certificate of incorporation</div>}
          <DetailLine label="CIN" value={co.cin || "Pending"} />
          <DetailLine label="Cluster" value={co.cluster || "\u2014"} />
        </div>

        {rows.length === 0 ? (
          <div style={{ fontSize: 13, color: C.inkSoft, fontStyle: "italic" }}>No calendar generated yet, this company is not incorporated.</div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkSoft, fontWeight: 600, marginBottom: 8 }}>Compliance timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((row) => (
                <div key={row.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 9, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <RingBadge status={row.status} daysLeft={row.daysLeft} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{row.rule_label}</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 1 }}>{row.description}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontFamily: MONO_FONT, fontSize: 12 }}>{formatDate(row.statutory_due_date)}</span>
                      <StatusPill status={row.status} />
                    </div>
                    {row.status !== "completed" ? (
                      <button onClick={() => onComplete(row)} style={{ marginTop: 8, background: "none", border: `1px solid ${C.forestSoft}`, color: C.forestSoft, borderRadius: 5, padding: "3px 8px", fontSize: 11 }}>Mark done</button>
                    ) : (
                      <button onClick={() => onUndo(row)} style={{ marginTop: 8, background: "none", border: `1px solid ${C.line}`, color: C.inkSoft, borderRadius: 5, padding: "3px 8px", fontSize: 11 }}>Undo</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddCompanyModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", state: "Odisha", district: "", cluster: "", cin: "", incorporationDate: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const canSave = form.name && form.district && !saving;
  const field = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 7, padding: "9px 10px", fontSize: 13, marginTop: 4 };
  const label = { fontSize: 11.5, color: C.inkSoft, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.paper, borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw" }}>
        <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 19, color: C.navy, margin: "0 0 14px" }}>Onboard a Producer Company</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={label}>Company name<input style={field} value={form.name} onChange={set("name")} placeholder="Full registered name" /></label>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ ...label, flex: 1 }}>State<select style={field} value={form.state} onChange={set("state")}>{["Odisha", "Maharashtra", "Himachal Pradesh", "Jharkhand"].map((s) => <option key={s}>{s}</option>)}</select></label>
            <label style={{ ...label, flex: 1 }}>District<input style={field} value={form.district} onChange={set("district")} placeholder="District" /></label>
          </div>
          <label style={label}>CIN (leave blank if not yet incorporated)<input style={field} value={form.cin} onChange={set("cin")} placeholder="U02400OD2026PTC0XXXXX" /></label>
          <label style={label}>Date of incorporation<input type="date" style={field} value={form.incorporationDate} onChange={set("incorporationDate")} /></label>
        </div>
        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 12 }}>
          New compliance dates for this company appear after the nightly refresh, or as soon as refresh-instances is next run manually from the Supabase dashboard.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 14px", fontSize: 13 }}>Cancel</button>
          <button disabled={!canSave} onClick={async () => {
              setSaving(true);
              await onAdd({
                name: form.name,
                state: form.state,
                district: form.district,
                cluster: form.cluster || null,
                cin: form.cin || null,
                incorporation_date: form.incorporationDate || null,
                incorporation_date_verified: true,
              });
              setSaving(false);
            }}
            style={{ background: canSave ? C.navy : C.line, color: canSave ? "#fff" : C.inkSoft, border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
            {saving ? "Saving\u2026" : "Add to the oracle"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Main app
------------------------------------------------------------------*/
export default function Dashboard() {
  const { companies, instances, rules, festivals, profile, loading, error, reload } = useOracleData();
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All states");
  const [statusFilter, setStatusFilter] = useState("Actionable");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const rulesByCode = useMemo(() => Object.fromEntries(rules.map((r) => [r.code, r])), [rules]);
  const companiesById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies]);

  const rows = useMemo(() => {
    return instances
      .map((inst) => {
        const company = companiesById[inst.company_id];
        if (!company) return null;
        const daysLeft = daysBetween(TODAY_ISO, inst.statutory_due_date);
        const clash = festivalClash(company, inst.statutory_due_date, festivals);
        return {
          ...inst,
          company,
          status: inst.live_status,
          daysLeft,
          clash,
          description: rulesByCode[inst.rule_code]?.description || "",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date));
  }, [instances, companiesById, festivals, rulesByCode]);

  const states = useMemo(() => ["All states", ...Array.from(new Set(companies.map((c) => c.state)))], [companies]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (stateFilter !== "All states" && row.company.state !== stateFilter) return false;
    if (statusFilter === "Actionable" && !["overdue", "dueSoon"].includes(row.status)) return false;
    if (statusFilter !== "Actionable" && statusFilter !== "All statuses" && statusToLabel(row.status) !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!row.company.name.toLowerCase().includes(q) && !row.rule_label.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, stateFilter, statusFilter, query]);

  const counts = useMemo(() => {
    const c = { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const unverifiedCount = useMemo(() => companies.filter((c) => !c.incorporation_date_verified).length, [companies]);
  const preIncorporationCount = useMemo(() => companies.filter((c) => !c.incorporation_date).length, [companies]);

  const markComplete = useCallback(async (row) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("compliance_instances")
      .update({ completed_date: TODAY_ISO, completed_by: user?.id || null })
      .eq("id", row.id);
    reload();
  }, [reload]);

  const undoComplete = useCallback(async (row) => {
    await supabase.from("compliance_instances")
      .update({ completed_date: null, completed_by: null })
      .eq("id", row.id);
    reload();
  }, [reload]);

  const addCompany = useCallback(async (co) => {
    const { error } = await supabase.from("companies").insert(co);
    if (error) {
      alert("Could not add the company: " + error.message);
      return;
    }
    setShowAdd(false);
    reload();
  }, [reload]);

  const canWrite = profile && ["admin", "compliance_lead"].includes(profile.role);
  const selectedCompany = companies.find((c) => c.id === selected);

  return (
    <div style={{ fontFamily: BODY_FONT, background: C.paper, color: C.ink, minHeight: "100vh", display: "flex", fontSize: 14, lineHeight: 1.45 }}>
      <style>{`
        * { box-sizing: border-box; } button { font-family: ${BODY_FONT}; cursor: pointer; }
        input, select { font-family: ${BODY_FONT}; } ::selection { background: ${C.gold}33; }
        .oracle-row:hover { background: ${C.lineSoft} !important; }
        .oracle-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .oracle-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 8px; }
      `}</style>

      <div style={{ width: 220, flexShrink: 0, background: C.navy, color: "#EDE9DC", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 19, letterSpacing: 0.2, marginBottom: 2 }}>The Oracle</div>
        <div style={{ fontSize: 11.5, color: "#B9C3D6", marginBottom: 26 }}>Producer Company compliance, live</div>
        <SideLink icon={<Calendar size={15} />} label="Portfolio overview" active={view === "overview"} onClick={() => setView("overview")} />
        <SideLink icon={<Building2 size={15} />} label={`Companies (${companies.length})`} active={view === "companies"} onClick={() => setView("companies")} />
        {(unverifiedCount > 0 || preIncorporationCount > 0) && (
          <div style={{ marginTop: 16, fontSize: 11.5, color: "#D8C89A", background: "#28406A", borderRadius: 7, padding: "9px 10px", lineHeight: 1.5 }}>
            {unverifiedCount > 0 && <div>{unverifiedCount} companies have an unverified incorporation date</div>}
            {preIncorporationCount > 0 && <div style={{ marginTop: unverifiedCount ? 4 : 0 }}>{preIncorporationCount} not yet incorporated, no calendar generated</div>}
          </div>
        )}
        <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #33507A", fontSize: 11, color: "#93A3C2", display: "flex", flexDirection: "column", gap: 10 }}>
          {profile && <div>{profile.full_name} &middot; {profile.role}{profile.state ? ` \u00b7 ${profile.state}` : ""}</div>}
          <button onClick={() => supabase.auth.signOut()} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #33507A", color: "#C7CFDE", borderRadius: 6, padding: "6px 9px", fontSize: 11.5 }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, padding: "26px 32px", overflow: "auto" }} className="oracle-scroll">
        {loading ? (
          <div style={{ color: C.inkSoft, fontSize: 13 }}>Loading the oracle&hellip;</div>
        ) : error ? (
          <div style={{ color: C.brick, fontSize: 13 }}>Could not load data: {error}</div>
        ) : view === "overview" ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 26, margin: 0, color: C.navy }}>What needs attention now</h1>
                <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 4 }}>{formatDate(TODAY_ISO)} &middot; {companies.length} companies on the oracle across {states.length - 1} states</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
              <StatCard label="Overdue" value={counts.overdue} tone={C.brick} />
              <StatCard label="Due within 60 days" value={counts.dueSoon} tone={C.gold} />
              <StatCard label="Upcoming" value={counts.upcoming} tone={C.forestSoft} />
              <StatCard label="Completed this cycle" value={counts.completed} tone={C.forest} />
            </div>

            <FilterBar query={query} setQuery={setQuery} states={states} stateFilter={stateFilter} setStateFilter={setStateFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

            <div style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginTop: 14 }}>
              <RowHeader />
              {filtered.length === 0 && <div style={{ padding: "28px 18px", color: C.inkSoft, fontSize: 13 }}>Nothing matches these filters.</div>}
              {filtered.map((row) => (
                <ComplianceRow key={row.id} row={row} onComplete={markComplete} onUndo={undoComplete} onOpenCompany={() => setSelected(row.company.id)} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 26, margin: 0, color: C.navy }}>Companies on the oracle</h1>
                <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 4 }}>Every profile drives its own calendar automatically from its incorporation date.</div>
              </div>
              {canWrite && (
                <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}>
                  <Plus size={15} /> Onboard a company
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {companies.map((co) => (
                <CompanyCard key={co.id} co={co} instances={rows.filter((r) => r.company.id === co.id)} onOpen={() => setSelected(co.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedCompany && (
        <CompanyDetail co={selectedCompany} rows={rows.filter((r) => r.company.id === selectedCompany.id)}
          onClose={() => setSelected(null)} onComplete={markComplete} onUndo={undoComplete} />
      )}
      {showAdd && <AddCompanyModal onClose={() => setShowAdd(false)} onAdd={addCompany} />}
    </div>
  );
}
