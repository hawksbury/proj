import { useState } from "react";

// ── Static documentation ──────────────────────────────────────────────────────

const LEVELS = [
  { level: "critical", range: "90–100", color: "#d94f5c", meaning: "Immediate response. Life may be at risk without rapid action." },
  { level: "high",     range: "75–89",  color: "#e7793a", meaning: "Urgent. Respond within 30 minutes." },
  { level: "medium",   range: "55–74",  color: "#e7b94d", meaning: "Important. Queue for timely response." },
  { level: "low",      range: "0–54",   color: "#64a86f", meaning: "Lower urgency. Monitor and prepare resources." },
];

const FACTORS = [
  { label: "Registry base score",           range: "0–100", why: "Pre-assigned vulnerability level from intake assessment. Reflects chronic conditions, age, and known risk factors." },
  { label: "Oxygen dependent",              bonus: "+25",   why: "Requires powered oxygen equipment. Loss of power = immediately life-threatening." },
  { label: "Power-dependent equipment",     bonus: "+20",   why: "Dialysis machine, ventilator, CPAP, or infusion pump. Cannot function without power." },
  { label: "Critical evacuation level",     bonus: "+15",   why: "Registry-assessed as requiring specialized transport and heavy coordination to evacuate." },
  { label: "High evacuation level",         bonus: "+10",   why: "Needs substantial assistance to evacuate. Cannot self-evacuate." },
  { label: "Needs physical transfer",       bonus: "+10",   why: "Cannot move independently. Requires staff to physically lift or transfer." },
  { label: "Lives alone",                   bonus: "+8",    why: "No support person on-site. Wider gap between signal and help arriving." },
  { label: "Non-ambulatory",                bonus: "+8",    why: "Cannot walk at all. Mobility equipment required for any evacuation." },
  { label: "ASL interpreter required",      bonus: "+5",    why: "Arranging a qualified ASL interpreter adds significant coordination overhead." },
  { label: "Accessible transport required", bonus: "+5",    why: "Standard vehicles unusable. Requires wheelchair van or specialty vehicle." },
  { label: "Wheelchair user",               bonus: "+5",    why: "Standard vehicle not usable; accessible transport must be sourced." },
  { label: "Language translator required",  bonus: "+3",    why: "Non-English primary language. Communication delay increases response time." },
  { label: "Limited walking ability",       bonus: "+3",    why: "Partial mobility. Some extra physical assistance needed." },
  { label: "Service animal",                bonus: "+3",    why: "Transport and shelter must accommodate and accept a service animal." },
];

/**
 * Worked examples. Three use real patients from the live alert data
 * (SCRBS-4807, SCRBS-3211, SCRBS-2657). The fourth is a synthetic
 * low-severity case to show the full score range.
 */
const SCENARIOS = [
  {
    id: "s1",
    level: "critical",
    score: 100,
    raw: 135,
    label: "Layla Rivera, 91 · Austin TX · Power outage",
    summary: "Elderly patient with COPD, oxygen concentrator, and critical evacuation classification. Any delay risks respiratory failure.",
    breakdown: [
      { factor: "Registry base score",       value: 92 },
      { factor: "Oxygen dependent",          value: 25, why: "Uses powered oxygen concentrator" },
      { factor: "Critical evacuation level", value: 15, why: "Registry-assessed: specialized transport required" },
      { factor: "Language translator",       value: 3,  why: "Arabic primary language" },
    ],
  },
  {
    id: "s2",
    level: "critical",
    score: 91,
    raw: 91,
    label: "Priya Kim, 51 · San Antonio TX · Power outage",
    summary: "Dialysis-dependent, non-ambulatory, ASL-only patient. Dialysis machine will fail without power; patient cannot self-evacuate.",
    breakdown: [
      { factor: "Registry base score",           value: 58 },
      { factor: "Power-dependent equipment",     value: 20, why: "Dialysis machine" },
      { factor: "Non-ambulatory",                value: 8,  why: "Cannot walk independently" },
      { factor: "ASL interpreter required",      value: 5,  why: "ASL is primary language" },
    ],
  },
  {
    id: "s3",
    level: "high",
    score: 79,
    raw: 79,
    label: "Luis Kim, 16 · Austin TX · Flood",
    summary: "Teenager with epilepsy and wheelchair dependency in a flood zone. Needs accessible vehicle and Urdu interpretation.",
    breakdown: [
      { factor: "Registry base score",           value: 61 },
      { factor: "High evacuation level",         value: 10, why: "Wheelchair — cannot self-evacuate" },
      { factor: "Accessible transport required", value: 5,  why: "Wheelchair van needed" },
      { factor: "Language translator",           value: 3,  why: "Urdu primary language" },
    ],
  },
  {
    id: "s4",
    level: "medium",
    score: 61,
    raw: 61,
    label: "Sam R., 24 · Example: mild disability",
    summary: "Young adult in registry for communication support. Fully mobile, lives with family, no power-dependent equipment.",
    breakdown: [
      { factor: "Registry base score",       value: 52 },
      { factor: "Language translator",       value: 3,  why: "Non-English primary language" },
      { factor: "Service animal",            value: 3,  why: "Must transport together" },
      { factor: "Limited walking ability",   value: 3,  why: "Uses cane for longer distances" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScoringGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("factors");

  return (
    <div className="scoring-guide">
      <button
        className="guide-toggle"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="guide-toggle-icon">?</span>
        How priority scores are calculated
        <span className="guide-toggle-arrow">{open ? "▲" : "▼"}</span>
      </button>

      <div className={`guide-body ${open ? "open" : ""}`}>
        <div className="guide-inner">

          {/* Level thresholds */}
          <div className="guide-levels">
            {LEVELS.map((l) => (
              <div key={l.level} className="guide-level-row">
                <span className="level-pill" style={{ background: l.color, color: l.level === "medium" ? "#263943" : "#fff" }}>
                  {l.level.toUpperCase()}
                </span>
                <span className="level-range">{l.range}</span>
                <span className="level-meaning">{l.meaning}</span>
              </div>
            ))}
            <p className="guide-cap-note">All scores are capped at 100. Base score alone never exceeds 100.</p>
          </div>

          {/* Tabs */}
          <div className="guide-tabs">
            <button
              className={`guide-tab ${tab === "factors" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("factors")}
            >
              Scoring Factors
            </button>
            <button
              className={`guide-tab ${tab === "scenarios" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("scenarios")}
            >
              Worked Examples
            </button>
          </div>

          {tab === "factors" && (
            <table className="factors-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Points</th>
                  <th>Why it raises priority</th>
                </tr>
              </thead>
              <tbody>
                {FACTORS.map((f) => (
                  <tr key={f.label}>
                    <td><strong>{f.label}</strong></td>
                    <td className="factor-bonus">{f.range ?? f.bonus}</td>
                    <td className="factor-why">{f.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "scenarios" && (
            <div className="scenario-grid">
              {SCENARIOS.map((s) => (
                <div key={s.id} className={`scenario-card level-border-${s.level}`}>
                  <div className="scenario-header">
                    <span className={`priority-badge level-${s.level}`}>{s.level.toUpperCase()}</span>
                    <strong className={`score-num level-${s.level}`}>{s.score}</strong>
                    <span className="scenario-label">{s.label}</span>
                  </div>
                  <p className="scenario-summary">{s.summary}</p>
                  <div className="scenario-math">
                    {s.breakdown.map((b, i) => (
                      <div key={i} className="math-row">
                        <div className="math-factor-group">
                          <span className="math-factor">{b.factor}</span>
                          {b.why && <span className="math-why">{b.why}</span>}
                        </div>
                        <span className="math-value">{i === 0 ? b.value : `+${b.value}`}</span>
                      </div>
                    ))}
                    <div className="math-total">
                      <span>Raw total</span>
                      <span>{s.raw}{s.raw > 100 ? " → capped at 100" : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
