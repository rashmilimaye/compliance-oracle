"use client";

import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/**
 * AIQueryPanel
 *
 * A plain English question box wired to the ai-query edge function via
 * supabase.functions.invoke, which handles the project URL and the
 * signed-in user's auth token automatically, the same session already
 * driving every other query on this page.
 *
 * This answers questions the dashboard's own filters weren't built to
 * anticipate, "which companies in Rayagada have missed more than one
 * deadline this year", grounded strictly in the live table, never
 * inventing a company, date, or status that isn't actually there.
 *
 * Usage:
 *   <AIQueryPanel />
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

const EXAMPLES = [
  "Which companies in Odisha are currently overdue?",
  "What is due in the next two weeks for Mayurbhanj district?",
  "List every company whose auditor appointment is still pending.",
];

export default function AIQueryPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function ask(q) {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion) return;
    setLoading(true); setErrorMsg(null); setAnswer(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: { question: finalQuestion, askedBy: user?.id ?? null },
      });
      if (error) throw new Error(await readInvokeError(error));
      if (data?.error) throw new Error(data.error);
      setAnswer(data.answer);
    } catch (e) {
      setErrorMsg(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, color: C.navy, marginBottom: 10 }}>
        <Sparkles size={16} /> Ask the oracle
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask a question about the portfolio"
          style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 7, padding: "9px 11px", fontSize: 13.5 }}
        />
        <button
          onClick={() => ask()}
          disabled={loading || !question.trim()}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: C.navy, color: "#fff", border: "none",
            borderRadius: 7, padding: "0 14px", fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <Loader2 size={14} className="aiq-spin" /> : <Send size={14} />}
          Ask
        </button>
      </div>

      {!answer && !loading && !errorMsg && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setQuestion(ex); ask(ex); }}
              style={{ fontSize: 11.5, color: C.inkSoft, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 20, padding: "4px 10px" }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {errorMsg && <div style={{ marginTop: 12, fontSize: 13, color: "#A23E32" }}>{errorMsg}</div>}

      {answer && (
        <div style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.55, color: C.ink, whiteSpace: "pre-wrap", borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          {answer}
        </div>
      )}

      <style>{`.aiq-spin { animation: aiqspin 0.8s linear infinite; } @keyframes aiqspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
