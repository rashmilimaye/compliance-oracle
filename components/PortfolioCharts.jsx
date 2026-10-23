"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

/**
 * PortfolioCharts
 *
 * Two small, honest charts rather than one dense dashboard: how many
 * items are overdue per state right now, and the health score
 * distribution across the portfolio. Both read off the healthScores
 * array already fetched by useOracleData in Dashboard.jsx, this
 * component only renders.
 *
 * Usage:
 *   <PortfolioCharts companies={healthScores} />
 *   where healthScores comes straight from:
 *     supabase.from("company_health_score").select("*")
 */

const C = { navy: "#1F3864", forest: "#2F5C45", gold: "#93701C", brick: "#A23E32", line: "#DEDACD", inkSoft: "#5B6360" };

function bandColor(score) {
  if (score >= 80) return C.forest;
  if (score >= 60) return C.gold;
  return C.brick;
}

// Charts need a glance-able label, not the full registered name. Strips the
// common "Green Shakti Producer Company Limited" / "Producer Company
// Limited" suffix pattern so what's left is the distinguishing place name,
// shorter and more useful to scan than the legal suffix every row shares
// anyway. Falls back to a plain truncation for anything that doesn't match
// the pattern, so an unusually named company never breaks this.
function shortLabel(name, maxLen = 22) {
  const stripped = name.replace(/\s*(Green Shakti\s*)?Producer Compan(y|ies)( Limited)?$/i, "").trim();
  const base = stripped || name;
  return base.length > maxLen ? base.slice(0, maxLen - 1) + "\u2026" : base;
}

export default function PortfolioCharts({ companies }) {
  if (!companies || companies.length === 0) {
    return <div style={{ fontSize: 13, color: C.inkSoft, fontStyle: "italic" }}>No portfolio data to chart yet.</div>;
  }

  const byState = Object.values(
    companies.reduce((acc, c) => {
      acc[c.state] ??= { state: c.state, overdue: 0, companies: 0 };
      acc[c.state].overdue += c.overdue_count;
      acc[c.state].companies += 1;
      return acc;
    }, {})
  );

  const sortedByScore = [...companies]
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 12)
    .map((c) => ({ ...c, shortName: shortLabel(c.name) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.navy, marginBottom: 8 }}>Overdue items by state</div>
        <ResponsiveContainer width="100%" height={Math.max(120, byState.length * 46)}>
          <BarChart data={byState} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="state" width={110} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, _n, p) => [`${v} overdue across ${p.payload.companies} companies`, p.payload.state]} />
            <Bar dataKey="overdue" radius={[0, 4, 4, 0]}>
              {byState.map((row) => <Cell key={row.state} fill={row.overdue > 0 ? C.brick : C.forest} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.navy, marginBottom: 8 }}>
          Lowest health scores in the portfolio {companies.length > 12 && `(bottom 12 of ${companies.length})`}
        </div>
        <ResponsiveContainer width="100%" height={Math.max(160, sortedByScore.length * 32)}>
          <BarChart data={sortedByScore} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="shortName" width={110} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""} formatter={(v) => [`${v} / 100`, "Health score"]} />
            <Bar dataKey="health_score" radius={[0, 4, 4, 0]}>
              {sortedByScore.map((row) => <Cell key={row.company_id} fill={bandColor(row.health_score)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
