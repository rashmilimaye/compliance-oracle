"use client";

import { useState } from "react";
import { Search, Sparkles, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/**
 * CompanySearchBox
 *
 * Type a company name, get back an AI-written summary grounded in that
 * company's actual profile, live compliance status, health score, and
 * recent history, via the company-summary edge function. If the search
 * matches more than one company, shows a short pick list instead of
 * guessing which one was meant.
 *
 * Usage:
 *   <CompanySearchBox />
 */

// A failed call comes back from supabase-js with a generic message. The real
// reason (missing API key, bad request, and so on) is in the response body the
// function sent, so read that first and only fall back to the generic text.
async function readInvokeError(error) {
  try {
    if (error?.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      if (body?.error) return body.error;
    }
  } catch {
    // body was not JSON, use the generic message below
  }
  return error?.message ?? "Something went wrong.";
}

const C = { navy: "#1F3864", ink: "#1E2321", inkSoft: "#5B6360", line: "#DEDACD", paper: "#F6F4EE" };

export default function CompanySearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { found, company, summary } | { found:false, multiple } | { found:false, message }
  const [errorMsg, setErrorMsg] = useState(null);

  async function search(nameOverride) {
    const name = (nameOverride ?? query).trim();
    if (!name) return;
    setLoading(true); setErrorMsg(null); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("company-summary", {
        body: { companyName: name },
      });
      if (error) throw new Error(await readInvokeError(error));
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setErrorMsg(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, maxWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, color: C.navy, marginBottom: 10 }}>
        <Building2 size={16} /> Look up a company
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} color={C.inkSoft} style={{ position: "absolute", left: 10, top: 11 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Start typing a company name"
            style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 7, padding: "9px 11px 9px 30px", fontSize: 13.5 }}
          />
        </div>
        <button onClick={() => search()} disabled={loading || !query.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6, background: C.navy, color: "#fff", border: "none", borderRadius: 7, padding: "0 14px", fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={14} className="csb-spin" /> : <Sparkles size={14} />}
          Search
        </button>
      </div>

      {errorMsg && <div style={{ marginTop: 12, fontSize: 13, color: "#A23E32" }}>{errorMsg}</div>}

      {result && !result.found && result.multiple && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>More than one match, pick one:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {result.multiple.map((m) => (
              <button key={m.id} onClick={() => { setQuery(m.name); search(m.name); }}
                style={{ textAlign: "left", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "7px 10px", fontSize: 12.5 }}>
                {m.name} <span style={{ color: C.inkSoft }}>&middot; {m.state}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && !result.found && result.message && (
        <div style={{ marginTop: 12, fontSize: 13, color: C.inkSoft, fontStyle: "italic" }}>{result.message}</div>
      )}

      {result && result.found && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.navy }}>{result.company.name}</div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
            {result.company.cluster ? `${result.company.cluster}, ` : ""}{result.company.district}, {result.company.state}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: C.ink, whiteSpace: "pre-wrap" }}>{result.summary}</div>
        </div>
      )}

      <style>{`.csb-spin { animation: csbspin 0.8s linear infinite; } @keyframes csbspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
