"use client";

import { useState, useEffect } from "react";
import { History } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/**
 * AuditTrailPanel
 *
 * Fetches and renders rows from the `compliance_audit_trail` view
 * (see migration 002) for one company. Fetches on mount, matching the
 * fetch-on-mount pattern already used by useOracleData in Dashboard.jsx.
 *
 * Usage:
 *   <AuditTrailPanel companyId={co.id} />
 */

const C = { navy: "#1F3864", inkSoft: "#5B6360", line: "#DEDACD", forest: "#2F5C45", brick: "#A23E32" };

function describeChange(entry) {
  if (entry.action === "insert") return "created this compliance record";
  if (entry.action === "delete") return "removed this compliance record";
  if (entry.new_completed_date && !entry.old_completed_date) return "marked this complete";
  if (!entry.new_completed_date && entry.old_completed_date) return "reopened this, marked incomplete again";
  return "updated this record";
}

export default function AuditTrailPanel({ companyId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    supabase
      .from("compliance_audit_trail")
      .select("*")
      .eq("company_id", companyId)
      .order("changed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (alive) { setEntries(data || []); setLoading(false); }
      });
    return () => { alive = false; };
  }, [companyId]);

  if (loading) {
    return <div style={{ fontSize: 12.5, color: C.inkSoft, fontStyle: "italic", padding: "8px 0" }}>Loading history&hellip;</div>;
  }

  if (entries.length === 0) {
    return <div style={{ fontSize: 12.5, color: C.inkSoft, fontStyle: "italic", padding: "8px 0" }}>No changes recorded yet.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkSoft, fontWeight: 600, marginBottom: 8 }}>
        <History size={13} /> History
      </div>
      <div style={{ borderLeft: `2px solid ${C.line}`, marginLeft: 5, display: "flex", flexDirection: "column", gap: 14 }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ position: "relative", paddingLeft: 16 }}>
            <span style={{
              position: "absolute", left: -6, top: 3, width: 9, height: 9, borderRadius: 9,
              background: entry.action === "delete" ? C.brick : C.forest, border: "2px solid #fff",
            }} />
            <div style={{ fontSize: 13 }}>
              <strong>{entry.changed_by_name ?? "The system"}</strong> {describeChange(entry)}
            </div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 1 }}>
              {new Date(entry.changed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
