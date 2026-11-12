import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChartColumn, FlaskConical } from "lucide-react";

// These literal design fixtures are independent of live queries and never replace failed API data.
const SCORE_DESIGN_PREVIEW = {
  "30days": { label: "30-day sample", average: 72, records: 24, signups: 18, active: 15, logs: 84, archived: 2, points: [["Week 1", 68], ["Week 2", 72], ["Week 3", 70], ["Week 4", 72]], activity: [["Meals", 42], ["Movement", 26], ["Sleep", 16]], content: [["Recipe views", 64], ["Routine views", 48], ["Recipe saves", 22], ["Routine saves", 16]] },
  "3months": { label: "3-month sample", average: 70, records: 60, signups: 46, active: 38, logs: 220, archived: 4, points: [["Month 1", 69], ["Month 2", 73], ["Month 3", 70]], activity: [["Meals", 110], ["Movement", 68], ["Sleep", 42]], content: [["Recipe views", 164], ["Routine views", 128], ["Recipe saves", 58], ["Routine saves", 42]] },
  "6months": { label: "6-month sample", average: 71, records: 120, signups: 92, active: 76, logs: 440, archived: 8, points: [["Month 1", 67], ["Month 2", 72], ["Month 3", 69], ["Month 4", 73], ["Month 5", 70], ["Month 6", 71]], activity: [["Meals", 220], ["Movement", 136], ["Sleep", 84]], content: [["Recipe views", 328], ["Routine views", 256], ["Recipe saves", 116], ["Routine saves", 84]] },
};

export default function ScoreDesignPreview({ compact = false }) {
  const periodId = useId();
  const [period, setPeriod] = useState("30days");
  const preview = SCORE_DESIGN_PREVIEW[period];
  return (
    <section className={`score-design-preview ${compact ? "score-design-preview-compact" : ""}`} aria-label="Synthetic analytics design preview">
      <div className="score-preview-disclosure"><FlaskConical size={15} aria-hidden="true" /><strong>Sample data / Design preview—not live</strong></div>
      <div className="home-panel-heading"><div><h2>Habits score{compact ? " design preview" : " & activity"}</h2><p>Illustrative values only. Score correctness and real-data reporting are not established.</p></div>{compact ? <Link to="/analytics" className="score-preview-link">Explore preview <ArrowRight size={14} aria-hidden="true" /></Link> : <div className="score-preview-period"><label htmlFor={periodId}>Sample period</label><select id={periodId} value={period} onChange={(event) => setPeriod(event.target.value)}><option value="30days">30 days</option><option value="3months">3 months</option><option value="6months">6 months</option></select></div>}</div>
      <div className="score-preview-layout">
        <dl className="score-preview-summary"><div><dt>Sample average habits score</dt><dd>{preview.average}<span>/100</span></dd></div><div><dt>Illustrative score records</dt><dd>{preview.records}</dd></div></dl>
        <figure className="score-preview-chart"><figcaption><ChartColumn size={15} aria-hidden="true" />{preview.label} · illustrative score values</figcaption><div className="score-preview-bars">{preview.points.map(([label, value]) => <div key={label}><span className="score-preview-bar-value">{value}</span><div className="score-preview-bar-track"><span style={{ height: `${value}%` }} /></div><span className="score-preview-bar-label">{label}</span></div>)}</div></figure>
      </div>
      {!compact && <>
        <dl className="score-preview-adoption">{[["Sample sign-ups", preview.signups], ["Sample active accounts", preview.active], ["Sample activity logs", preview.logs], ["Sample archived accounts", preview.archived]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="score-preview-detail-grid">{[["Activity volume", preview.activity], ["Content usage", preview.content]].map(([heading, rows]) => <section key={heading}><h3>{heading}</h3><p>Sample counts for the selected illustrative period.</p><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div>
        <p className="score-preview-footnote">These examples show a possible reporting layout. They contain no personal records, clinical risk categories, validated outcomes or live population statistics. Period controls switch between fixed synthetic examples.</p>
      </>}
    </section>
  );
}
