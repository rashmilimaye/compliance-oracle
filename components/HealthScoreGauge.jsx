"use client";

/**
 * HealthScoreGauge
 *
 * Renders the 0-100 score from the `company_health_score` view as a
 * radial gauge, colour banded so the read is immediate: nobody should
 * need to read the number to know whether a company needs attention.
 *
 * Usage:
 *   <HealthScoreGauge score={82} overdueCount={0} size={72} />
 */

const BANDS = [
  { min: 80, color: "#2F5C45", label: "Healthy" },
  { min: 60, color: "#93701C", label: "Watch" },
  { min: 0, color: "#A23E32", label: "At risk" },
];

function bandFor(score) {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

export default function HealthScoreGauge({ score, overdueCount = 0, size = 72, showLabel = true }) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = bandFor(clamped);
  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (clamped / 100);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7DC" strokeWidth={stroke} />
          {clamped > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={band.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 400ms ease" }}
            />
          )}
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: size * 0.30, fontWeight: 700, color: band.color, lineHeight: 1 }}>{clamped}</span>
        </div>
      </div>
      {showLabel && (
        <div style={{ fontSize: 12.5 }}>
          <div style={{ fontWeight: 600, color: band.color }}>{band.label}</div>
          <div style={{ color: "#5B6360", fontSize: 11.5 }}>
            {overdueCount > 0 ? `${overdueCount} overdue` : "nothing overdue"}
          </div>
        </div>
      )}
    </div>
  );
}
