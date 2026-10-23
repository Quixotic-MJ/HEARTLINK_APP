import { useEffect, useState, Fragment } from "react";
import { History, ChevronDown, ChevronRight, Info, Download } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../contexts/useAuth";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader } from "../../../styles/designSystem";
import { AGREEMENT, CHECKUP, CONFIDENCE, LANES, PROGRESS, REASONS, SCORERS, TIERS, labelOf } from "./reviewUi";

// HL-058: Model Check replaces Calibration History. One row per review round with a Cardiologist review;
// the Dietitian's and PT's checks sit inside that row. Measures count clinical reviews only.

const SCORER_FILTERS = [["all", "All scorers"], ["baseline_model", SCORERS.baseline_model], ["bp_rules", SCORERS.bp_rules], ["lifestyle_points", SCORERS.lifestyle_points]];
const ROW_FILTERS = [["all", "All reviews"], ["clinical", "Clinical"], ["practice", "Practice"]];
const SHORT_TIER = { Stable: "Stable", Moderate: "Moderate", "Elevated Risk": "Elevated", Critical: "Critical" };

const pct = (m) => (m?.percent == null ? "—" : `${m.percent}%`);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

const chip = (selected) =>
  `min-h-[36px] px-3.5 rounded-full text-[12.5px] font-semibold border transition-colors cursor-pointer ${
    selected ? "bg-ds-ink text-white border-ds-ink" : "bg-ds-canvas text-ds-ink border-ds-hairline hover:border-ds-steel"
  }`;

function Measure({ label, value, note, tone = "plain" }) {
  const tones = {
    plain: "bg-ds-canvas border-ds-hairline text-ds-ink",
    warn: "bg-ds-yellow border-ds-yellow-bold text-ds-warm-text",
  };
  return (
    <div className={`p-4 rounded-xl border ${tones[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-[26px] font-semibold leading-tight mt-1">{value}</div>
      <div className="text-[12px] opacity-80 mt-0.5">{note}</div>
    </div>
  );
}

function CheckSummary({ check }) {
  if (!check) return null;
  const progress = PROGRESS[check.status] || PROGRESS.waiting;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${progress.className}`}>
      {progress.label}{check.not_suitable?.length ? ` · ${check.not_suitable.length} not suitable` : ""}
    </span>
  );
}

const ModelCheck = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const [exporting, setExporting] = useState(false);
  const [scorer, setScorer] = useState("all");
  const [rowFilter, setRowFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  const load = (s) =>
    apiFetch(`/api/admin/model-check?scorer=${s}`, { bypassCache: true })
      .then(setData)
      .catch(() => toast.error("Couldn't load Model Check."));

  useEffect(() => {
    let alive = true;
    apiFetch(`/api/admin/model-check?scorer=${scorer}`, { bypassCache: true })
      .then((d) => alive && setData(d))
      .catch(() => toast.error("Couldn't load Model Check."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scorer]);

  const archive = async (row) => {
    if (!window.confirm(`Archive ${row.case_code}? It will leave Model Check and the review queue.`)) return;
    try {
      await apiFetch(`/api/admin/model-check/${row.round_id}/archive`, { method: "PUT" });
      toast.success(`${row.case_code} archived.`);
      setOpen(null);
      await load(scorer);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't archive.");
    }
  };

  // HL-059: clinical reviews only, for retraining outside the app (scripts/train_starting_score.py)
  const exportDataset = async () => {
    setExporting(true);
    try {
      const file = await apiFetch("/api/admin/model-check/export", { bypassCache: true });
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `heartlink-clinical-reviews-${file.generated_at.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Exported ${file.counts.rows} clinical reviews (${file.counts.excluded} left out, reasons in the file).`);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't export the clinical reviews.");
    } finally {
      setExporting(false);
    }
  };

  const clinical = data?.clinical;
  const rows = (data?.rows || []).filter((r) => rowFilter === "all" || (rowFilter === "clinical" ? r.is_clinical : !r.is_clinical));
  const matrix = clinical?.matrix?.rows_app_columns_cardiologist || [];

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        <PageHeader
          eyebrow="Clinical portal"
          eyebrowIcon={History}
          title="Model Check"
          description="How often the app's risk level matches a cardiologist's, and which way it misses. Measures use clinical reviews only."
          actions={
            isSuperAdmin && (
              <button type="button" onClick={exportDataset} disabled={exporting} className={UI.button.secondary}>
                <Download size={15} aria-hidden="true" /> {exporting ? "Exporting…" : "Export clinical reviews"}
              </button>
            )
          }
        />

        <div role="group" aria-label="Scorer" className="flex flex-wrap gap-2 mb-4">
          {SCORER_FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={scorer === key} onClick={() => setScorer(key)} className={chip(scorer === key)}>{label}</button>
          ))}
        </div>

        {loading || !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-24" />)}</div>
        ) : (
          <>
            {!clinical.enough_reviews && (
              <div className="flex items-start gap-2 text-[12.5px] bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold rounded-[8px] px-3 py-2.5 mb-4">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                Not enough clinical reviews to judge the model yet: {clinical.reviews} of {data.min_clinical_reviews}. The numbers below are for reference only.
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <Measure label="Agreement" value={pct(clinical.agreement)} note={`${clinical.agreement.count} of ${clinical.reviews} clinical reviews`} />
              <Measure label="Weighted kappa" value={clinical.weighted_kappa ?? "—"} note={clinical.kappa_label ? `${clinical.kappa_label} agreement` : "Needs reviews at more than one level"} />
              <Measure label="Under-calling (safety)" value={pct(clinical.under_calling)} note={`${clinical.under_calling.count} rated riskier by the cardiologist`} tone="warn" />
              <Measure label="Over-calling" value={pct(clinical.over_calling)} note={`${clinical.over_calling.count} rated safer by the cardiologist`} />
            </div>
            <p className="text-[12px] text-ds-slate mb-6">
              Practice reviews (by experts not yet verified as clinicians), not counted above: {data.practice.reviews}
              {data.practice.reviews ? `, ${pct(data.practice.agreement)} agreement` : ""}.
              {clinical.score_difference.reviews_with_score ? ` Average gap where a 1–100 score was given: ${clinical.score_difference.average_gap} points.` : ""}
            </p>

            <div className={`${UI.card.root} mb-6`}>
              <div className={UI.card.header}>
                <h2 className="text-[14px] font-semibold m-0">Level by level (clinical reviews)</h2>
                <span className="text-[12px] text-ds-slate">Rows: the app. Columns: the cardiologist. Orange = app too low.</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full min-w-[460px] border-separate border-spacing-1 text-[13px] text-center">
                  <thead>
                    <tr>
                      <th scope="col" className="text-left text-[11px] font-semibold text-ds-slate uppercase tracking-wider">App ↓ · Cardiologist →</th>
                      {TIERS.map((t) => <th key={t} scope="col" className="text-[12px] font-semibold text-ds-charcoal">{SHORT_TIER[t]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map((t, i) => (
                      <tr key={t}>
                        <th scope="row" className="text-left text-[12.5px] font-semibold py-2">{SHORT_TIER[t]}</th>
                        {(matrix[i] || [0, 0, 0, 0]).map((n, j) => (
                          <td key={j} className={`py-2.5 rounded-[6px] font-semibold ${
                            i === j ? "bg-ds-mint text-ds-charcoal" : j > i ? (n ? "bg-ds-yellow text-ds-warm-text" : "bg-ds-surface text-ds-steel") : (n ? "bg-ds-tint text-ds-primary-pressed" : "bg-ds-surface text-ds-steel")
                          }`}>{n}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={UI.card.root}>
              <div className={UI.card.header}>
                <h2 className="text-[14px] font-semibold m-0">Reviewed cases ({rows.length})</h2>
                <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
                  {ROW_FILTERS.map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={rowFilter === key} onClick={() => setRowFilter(key)} className={chip(rowFilter === key)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className={UI.table.container}>
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className={UI.table.thead}>
                    <tr>
                      <th scope="col" className={UI.table.th}><span className="sr-only">Details</span></th>
                      <th scope="col" className={UI.table.th}>Case</th>
                      <th scope="col" className={UI.table.th}>App said</th>
                      <th scope="col" className={UI.table.th}>Cardiologist</th>
                      <th scope="col" className={UI.table.th}>Comparison</th>
                      <th scope="col" className={UI.table.th}>Food check</th>
                      <th scope="col" className={UI.table.th}>Exercise check</th>
                      <th scope="col" className={UI.table.th}>Counts as</th>
                    </tr>
                  </thead>
                  <tbody className={UI.table.tbody}>
                    {rows.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 px-5 text-center text-[13px] text-ds-slate">No reviewed cases yet. Cases appear here once a Cardiologist submits a review.</td></tr>
                    ) : rows.map((r) => {
                      const agreement = AGREEMENT[r.tier_agreement];
                      const isOpen = open === r.round_id;
                      return (
                        <Fragment key={r.round_id}>
                          <tr className={UI.table.tr}>
                            <td className={UI.table.td}>
                              <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} details for ${r.case_code}`} onClick={() => setOpen(isOpen ? null : r.round_id)} className={UI.button.icon}>
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            </td>
                            <td className={UI.table.td}>
                              <div className="text-[13px] font-semibold">{r.case_code}</div>
                              <div className="text-[11.5px] text-ds-slate">{LANES[r.lane]?.label} · {day(r.reviewed_at)}</div>
                            </td>
                            <td className={UI.table.td}>
                              <div className="text-[13px] font-semibold">{r.app_tier || "No level"}</div>
                              <div className="text-[11.5px] text-ds-slate">{r.app_score != null ? `${r.app_score} · ` : ""}{SCORERS[r.app_scorer]}</div>
                            </td>
                            <td className={UI.table.td}>
                              <div className="text-[13px] font-semibold">{r.expert_tier}</div>
                              <div className="text-[11.5px] text-ds-slate">{r.expert_score != null ? `Score ${r.expert_score}` : "No score"}</div>
                            </td>
                            <td className={UI.table.td}>
                              <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${agreement?.className || ""}`}>{agreement?.label || "Not comparable"}</span>
                            </td>
                            <td className={UI.table.td}><CheckSummary check={r.food_check} /></td>
                            <td className={UI.table.td}><CheckSummary check={r.exercise_check} /></td>
                            <td className={`${UI.table.td} text-[12.5px] font-semibold ${r.is_clinical ? "text-ds-charcoal" : "text-ds-warm-text"}`}>{r.is_clinical ? "Clinical" : "Practice"}</td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={8} className="bg-ds-surface px-5 py-4">
                                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[12.5px] m-0">
                                  <dt className="font-semibold">Reviewer</dt><dd className="m-0">{r.reviewer_name} · confidence {labelOf(CONFIDENCE, r.confidence)}</dd>
                                  <dt className="font-semibold">Reasons</dt><dd className="m-0">{r.reasons.map((x) => labelOf(REASONS, x)).join(", ")}</dd>
                                  <dt className="font-semibold">Checkup</dt><dd className="m-0">{labelOf(CHECKUP, r.checkup_flag)}</dd>
                                  {r.notes ? (<><dt className="font-semibold">Note</dt><dd className="m-0 whitespace-pre-line">{r.notes}</dd></>) : null}
                                  <dt className="font-semibold">Food check</dt>
                                  <dd className="m-0">{r.food_check.status === "done" ? `${r.food_check.reviewer_name}: ${r.food_check.not_suitable.length ? `not suitable: ${r.food_check.not_suitable.join(", ")}` : "all recipes suitable"}` : PROGRESS[r.food_check.status]?.label}</dd>
                                  <dt className="font-semibold">Exercise check</dt>
                                  <dd className="m-0">{r.exercise_check.status === "done"
                                    ? `${r.exercise_check.reviewer_name}: ${[r.exercise_check.not_suitable.length ? `not suitable: ${r.exercise_check.not_suitable.join(", ")}` : "", r.exercise_check.with_changes.length ? `with changes: ${r.exercise_check.with_changes.join(", ")}` : ""].filter(Boolean).join("; ") || "all exercises suitable"}`
                                    : PROGRESS[r.exercise_check.status]?.label}</dd>
                                  <dt className="font-semibold">Model</dt><dd className="m-0">{r.model_version || "Unknown"} · case opened {day(r.opened_at)}</dd>
                                </dl>
                                {isAdmin && (
                                  <button type="button" onClick={() => archive(r)} className={`${UI.button.secondary} mt-3`}>Archive this review</button>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default ModelCheck;
