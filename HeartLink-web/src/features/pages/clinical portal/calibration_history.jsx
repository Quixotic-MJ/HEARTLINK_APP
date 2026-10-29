import { Fragment, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  History,
  Info,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import LoadError from "../../../components/ui/LoadError";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useAuth } from "../../../contexts/useAuth";
import {
  AGREEMENT,
  CHECKUP,
  CONFIDENCE,
  LANES,
  PROGRESS,
  REASONS,
  SCORERS,
  TIERS,
  labelOf,
} from "./reviewUi";

// HL-058: Model Check replaces Calibration History. One row per review round with a Cardiologist review;
// the Dietitian's and PT's checks sit inside that row. Measures count clinical reviews only.

const SCORER_FILTERS = [
  ["all", "All scorers"],
  ["baseline_model", SCORERS.baseline_model],
  ["bp_rules", SCORERS.bp_rules],
  ["lifestyle_points", SCORERS.lifestyle_points],
];

const ROW_FILTERS = [
  ["all", "All reviews"],
  ["clinical", "Clinical"],
  ["practice", "Practice"],
];

const SHORT_TIER = {
  Stable: "Stable",
  Moderate: "Moderate",
  "Elevated Risk": "Elevated",
  Critical: "Critical",
};

const TIER_DOT = {
  Stable: "bg-cal-success",
  Moderate: "bg-cal-warning",
  "Elevated Risk": "bg-cal-error",
  Critical: "bg-cal-error",
};

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const pct = (m) => (m?.percent == null ? "—" : `${m.percent}%`);
const day = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

function MeasureCard({ label, value, note, icon: Icon, iconTone, highlight = false }) {
  return (
    <div
      className={`rounded-[12px] border bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        highlight ? "border-cal-warning/45" : "border-cal-hairline"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-cal-muted">
          {label}
        </span>
        {Icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${iconTone}`}
          >
            <Icon size={14.5} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-cal-muted">{note}</div>
    </div>
  );
}

function CheckSummary({ check }) {
  if (!check) return null;
  const progress = PROGRESS[check.status] || PROGRESS.waiting;
  return (
    <span className={`${PILL} ${progress.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${progress.dotClass}`} />
      <span>
        {progress.label}
        {check.not_suitable?.length
          ? ` · ${check.not_suitable.length} flagged`
          : ""}
      </span>
    </span>
  );
}

function TierInline({ tier }) {
  if (!tier) {
    return <span className="text-[13px] font-medium text-cal-muted">No level</span>;
  }
  const dot = TIER_DOT[tier] || "bg-cal-muted";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-cal-ink">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span>{tier}</span>
    </span>
  );
}

const ModelCheck = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [exporting, setExporting] = useState(false);
  const [scorer, setScorer] = useState("all");
  const [rowFilter, setRowFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  // The current results stay on screen while another scorer's load; archiving refreshes them by itself
  const modelCheck = useApiQuery(`/api/admin/model-check?scorer=${scorer}`, {
    keepPrevious: true,
  });
  const data = modelCheck.data ?? null;
  const loading = modelCheck.isPending;

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await apiFetch(`/api/admin/model-check/${archiveTarget.round_id}/archive`, {
        method: "PUT",
      });
      toast.success(`${archiveTarget.case_code} archived`);
      if (open === archiveTarget.round_id) {
        setOpen(null);
      }
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't archive review.");
    }
  };

  // HL-059: clinical reviews only, for retraining outside the app (scripts/train_starting_score.py)
  const exportDataset = async () => {
    setExporting(true);
    try {
      const file = await apiFetch("/api/admin/model-check/export");
      const blob = new Blob([JSON.stringify(file, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `heartlink-clinical-reviews-${file.generated_at.slice(
        0,
        10
      )}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(
        `Exported ${file.counts.rows} clinical reviews (${file.counts.excluded} left out, reasons in the file).`
      );
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't export the clinical reviews.");
    } finally {
      setExporting(false);
    }
  };

  const allRows = useMemo(() => data?.rows ?? [], [data]);
  const rowCounts = useMemo(
    () => ({
      all: allRows.length,
      clinical: allRows.filter((r) => r.is_clinical).length,
      practice: allRows.filter((r) => !r.is_clinical).length,
    }),
    [allRows]
  );

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((r) => {
      const matchesType =
        rowFilter === "all" ||
        (rowFilter === "clinical" ? r.is_clinical : !r.is_clinical);
      const matchesSearch =
        !q ||
        (r.case_code || "").toLowerCase().includes(q) ||
        (r.reviewer_name || "").toLowerCase().includes(q) ||
        (r.app_tier || "").toLowerCase().includes(q) ||
        (r.expert_tier || "").toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [allRows, rowFilter, searchQuery]);

  const clinical = data?.clinical;
  const matrix = clinical?.matrix?.rows_app_columns_cardiologist || [];

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <History size={13.5} className="text-cal-ink" />
              <span>Clinical portal · Risk model validation</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Model check
            </h2>
            <p className="mt-1.5 max-w-[66ch] text-[14px] leading-[1.5] text-cal-muted">
              How often the app&apos;s risk level matches a cardiologist&apos;s,
              and which way it misses. Measures count clinical reviews only.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={exportDataset}
              disabled={exporting}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
            >
              <Download size={15.5} aria-hidden="true" />
              <span>
                {exporting ? "Exporting…" : "Export clinical reviews"}
              </span>
            </button>
          )}
        </div>

        {/* ─── 2. SCORER PILL SWITCHER ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Scorer"
            className="inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
          >
            {SCORER_FILTERS.map(([key, label]) => {
              const active = scorer === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScorer(key)}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-cal-canvas text-cal-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                      : "text-cal-muted hover:text-cal-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {modelCheck.isFetching && !loading && (
            <span className="font-cal-mono text-[12px] text-cal-muted">
              Updating metrics…
            </span>
          )}
        </div>

        {/* ─── 3. BODY: ERROR / SKELETON / METRICS ──────────────────────────── */}
        {modelCheck.isError && !data ? (
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-8">
            <LoadError what="Model Check" onRetry={modelCheck.refetch} />
          </div>
        ) : loading || !data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton
                  key={n}
                  className="h-28 rounded-[12px] bg-cal-surface-card"
                />
              ))}
            </div>
            <Skeleton className="h-64 rounded-[12px] bg-cal-surface-card" />
            <Skeleton className="h-72 rounded-[12px] bg-cal-surface-card" />
          </div>
        ) : (
          <>
            {!clinical.enough_reviews && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-warning/35 bg-cal-warning/15 px-4 py-3 text-[13.5px] text-cal-ink">
                <Info
                  size={16}
                  className="mt-0.5 shrink-0 text-cal-warning"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  <span className="font-semibold">Reference sample only:</span>{" "}
                  not enough clinical reviews to judge the model yet (
                  <span className="font-cal-mono font-semibold tabular-nums">
                    {clinical.reviews}
                  </span>{" "}
                  of{" "}
                  <span className="font-cal-mono font-semibold tabular-nums">
                    {data.min_clinical_reviews}
                  </span>{" "}
                  required). The metrics below are preliminary.
                </p>
              </div>
            )}

            {/* 4-Column Clinical Calibration Strip */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <MeasureCard
                  label="Agreement"
                  value={pct(clinical.agreement)}
                  note={`${clinical.agreement.count} of ${clinical.reviews} clinical reviews`}
                  icon={CheckCircle2}
                  iconTone="border-cal-success/25 bg-cal-success/10 text-cal-success"
                />
                <MeasureCard
                  label="Weighted kappa"
                  value={clinical.weighted_kappa ?? "—"}
                  note={
                    clinical.kappa_label
                      ? `${clinical.kappa_label} agreement`
                      : "Needs reviews at more than one level"
                  }
                  icon={Activity}
                  iconTone="border-cal-hairline bg-cal-surface-soft text-cal-ink"
                />
                <MeasureCard
                  label="Under-calling (safety)"
                  value={pct(clinical.under_calling)}
                  note={`${clinical.under_calling.count} rated riskier by cardiologist`}
                  icon={AlertTriangle}
                  iconTone="border-cal-warning/35 bg-cal-warning/15 text-cal-ink"
                  highlight={(clinical.under_calling?.count || 0) > 0}
                />
                <MeasureCard
                  label="Over-calling"
                  value={pct(clinical.over_calling)}
                  note={`${clinical.over_calling.count} rated safer by cardiologist`}
                  icon={ArrowUpRight}
                  iconTone="border-cal-hairline bg-cal-surface-soft text-cal-ink"
                />
              </div>

              {/* Practice & Score Gap Footnote Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-2.5 text-[12.5px] text-cal-muted">
                <span>
                  Practice reviews (by experts not yet verified as clinicians,
                  excluded above):{" "}
                  <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                    {data.practice.reviews}
                  </span>
                  {data.practice.reviews
                    ? ` (${pct(data.practice.agreement)} agreement)`
                    : ""}
                </span>
                {clinical.score_difference?.reviews_with_score ? (
                  <span>
                    Average 1–100 score gap:{" "}
                    <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                      {clinical.score_difference.average_gap} pts
                    </span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Confusion Matrix Card */}
            <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-cal-ink">
                    Level by level (clinical reviews)
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-cal-muted">
                    Rows show the app&apos;s predicted tier; columns show the
                    cardiologist&apos;s clinical rating.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-cal-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cal-success/25 bg-cal-success/10 px-2.5 py-0.5 text-cal-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
                    <span>Exact match</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cal-warning/35 bg-cal-warning/15 px-2.5 py-0.5 text-cal-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-warning" />
                    <span>App too low</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cal-hairline bg-cal-surface-card px-2.5 py-0.5 text-cal-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-ink" />
                    <span>App too high</span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto p-4 sm:p-5">
                <table className="w-full min-w-[520px] border-separate border-spacing-1.5 text-center">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        App ↓ · Cardiologist →
                      </th>
                      {TIERS.map((t) => (
                        <th
                          key={t}
                          scope="col"
                          className="px-2 py-2 text-[12.5px] font-semibold text-cal-ink"
                        >
                          <span className="inline-flex items-center justify-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${TIER_DOT[t]}`}
                            />
                            <span>{SHORT_TIER[t]}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map((t, i) => (
                      <tr key={t}>
                        <th
                          scope="row"
                          className="px-3 py-2.5 text-left text-[13px] font-semibold text-cal-ink"
                        >
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${TIER_DOT[t]}`}
                            />
                            <span>{SHORT_TIER[t]}</span>
                          </span>
                        </th>
                        {(matrix[i] || [0, 0, 0, 0]).map((n, j) => {
                          let cellTone =
                            "border-cal-hairline/70 bg-cal-surface-soft/60 text-cal-muted-soft";
                          if (i === j) {
                            cellTone = n
                              ? "border-cal-success/30 bg-cal-success/12 text-cal-ink"
                              : "border-cal-success/20 bg-cal-success/5 text-cal-muted";
                          } else if (j > i && n > 0) {
                            cellTone =
                              "border-cal-warning/40 bg-cal-warning/18 text-cal-ink";
                          } else if (j < i && n > 0) {
                            cellTone =
                              "border-cal-ink/20 bg-cal-surface-card text-cal-ink";
                          }

                          return (
                            <td
                              key={j}
                              className={`rounded-[8px] border py-3 font-cal-mono text-[14px] font-semibold tabular-nums ${cellTone}`}
                            >
                              {n}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Reviewed Cases Directory Card */}
            <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-[15px] font-semibold text-cal-ink">
                    Reviewed cases
                  </h3>
                  <div
                    role="group"
                    aria-label="Filter reviewed cases"
                    className="inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
                  >
                    {ROW_FILTERS.map(([key, label]) => {
                      const active = rowFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setRowFilter(key)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-cal-canvas text-cal-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                              : "text-cal-muted hover:text-cal-ink"
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`font-cal-mono text-[11.5px] tabular-nums ${
                              active ? "text-cal-ink" : "text-cal-muted-soft"
                            }`}
                          >
                            {rowCounts[key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
                  />
                  <input
                    type="text"
                    aria-label="Search reviewed cases"
                    placeholder="Search case code or reviewer…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-cal-muted hover:text-cal-ink cursor-pointer"
                    >
                      <X size={13.5} />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                      <th scope="col" className="w-11 px-3 py-3">
                        <span className="sr-only">Details</span>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        Case
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        App said
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        Cardiologist
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        Comparison
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        Food check
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        Exercise check
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                      >
                        Counts as
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cal-hairline">
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-14 text-center text-[13.5px] text-cal-muted"
                        >
                          {allRows.length === 0 ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                                <History size={18} />
                              </div>
                              <p className="font-semibold text-cal-ink">
                                No reviewed cases yet
                              </p>
                              <p className="max-w-md text-[13px] text-cal-muted">
                                Cases appear here once a Cardiologist submits a
                                clinical or practice review.
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <p className="font-semibold text-cal-ink">
                                No reviewed cases match your filter
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowFilter("all");
                                  setSearchQuery("");
                                }}
                                className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                              >
                                <RotateCcw size={13.5} />
                                <span>Reset filters</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => {
                        const agreement = AGREEMENT[r.tier_agreement];
                        const laneInfo = LANES[r.lane];
                        const isOpen = open === r.round_id;

                        return (
                          <Fragment key={r.round_id}>
                            <tr
                              onClick={() => setOpen(isOpen ? null : r.round_id)}
                              className={`cursor-pointer transition-colors hover:bg-cal-surface-soft/70 ${
                                isOpen ? "bg-cal-surface-soft/50" : ""
                              }`}
                            >
                              <td
                                className="px-3 py-3.5 align-middle"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  aria-expanded={isOpen}
                                  aria-label={`${
                                    isOpen ? "Hide" : "Show"
                                  } details for ${r.case_code}`}
                                  onClick={() =>
                                    setOpen(isOpen ? null : r.round_id)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer"
                                >
                                  {isOpen ? (
                                    <ChevronDown size={15} />
                                  ) : (
                                    <ChevronRight size={15} />
                                  )}
                                </button>
                              </td>

                              <td className="px-4 py-3.5 align-middle">
                                <div className="font-cal-mono text-[13px] font-semibold tabular-nums text-cal-ink">
                                  {r.case_code}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-cal-muted">
                                  {laneInfo && (
                                    <>
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${laneInfo.dotClass}`}
                                      />
                                      <span>{laneInfo.label}</span>
                                      <span>·</span>
                                    </>
                                  )}
                                  <span className="font-cal-mono text-[11.5px] tabular-nums">
                                    {day(r.reviewed_at)}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-middle">
                                <TierInline tier={r.app_tier} />
                                <div className="mt-0.5 text-[12px] text-cal-muted">
                                  {r.app_score != null && (
                                    <>
                                      <span className="font-cal-mono font-medium tabular-nums text-cal-ink">
                                        {r.app_score}
                                      </span>
                                      <span> · </span>
                                    </>
                                  )}
                                  <span>
                                    {SCORERS[r.app_scorer] || r.app_scorer}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-middle">
                                <TierInline tier={r.expert_tier} />
                                <div className="mt-0.5 font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                                  {r.expert_score != null
                                    ? `Score ${r.expert_score}`
                                    : "No numeric score"}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-middle">
                                <span
                                  className={`${PILL} ${
                                    agreement?.className ||
                                    "border-cal-hairline bg-cal-surface-soft text-cal-muted"
                                  }`}
                                >
                                  {agreement?.label || "Not comparable"}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 align-middle">
                                <CheckSummary check={r.food_check} />
                              </td>

                              <td className="px-4 py-3.5 align-middle">
                                <CheckSummary check={r.exercise_check} />
                              </td>

                              <td className="px-4 py-3.5 text-right align-middle">
                                <span
                                  className={`${PILL} ${
                                    r.is_clinical
                                      ? "border-cal-success/25 bg-cal-success/10 text-cal-ink"
                                      : "border-cal-warning/35 bg-cal-warning/15 text-cal-ink"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      r.is_clinical
                                        ? "bg-cal-success"
                                        : "bg-cal-warning"
                                    }`}
                                  />
                                  <span>
                                    {r.is_clinical ? "Clinical" : "Practice"}
                                  </span>
                                </span>
                              </td>
                            </tr>

                            {isOpen && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="border-t border-cal-hairline bg-cal-surface-soft/70 px-5 py-4"
                                >
                                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {/* Left: Cardiology Evaluation */}
                                    <div className="rounded-[10px] border border-cal-hairline bg-cal-canvas p-4">
                                      <h4 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                                        Cardiology evaluation
                                      </h4>
                                      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[13px]">
                                        <dt className="font-medium text-cal-muted">
                                          Reviewer
                                        </dt>
                                        <dd className="text-cal-ink">
                                          <span className="font-semibold">
                                            {r.reviewer_name}
                                          </span>{" "}
                                          <span className="text-cal-muted">
                                            · confidence{" "}
                                            {labelOf(CONFIDENCE, r.confidence)}
                                          </span>
                                        </dd>

                                        <dt className="font-medium text-cal-muted">
                                          Reasons
                                        </dt>
                                        <dd className="text-cal-ink">
                                          {(r.reasons || []).length
                                            ? r.reasons
                                                .map((x) => labelOf(REASONS, x))
                                                .join(", ")
                                            : "None listed"}
                                        </dd>

                                        <dt className="font-medium text-cal-muted">
                                          Checkup
                                        </dt>
                                        <dd className="text-cal-ink">
                                          {labelOf(CHECKUP, r.checkup_flag)}
                                        </dd>

                                        {r.notes ? (
                                          <>
                                            <dt className="font-medium text-cal-muted">
                                              Note
                                            </dt>
                                            <dd className="whitespace-pre-line text-cal-ink">
                                              {r.notes}
                                            </dd>
                                          </>
                                        ) : null}

                                        <dt className="font-medium text-cal-muted">
                                          Model
                                        </dt>
                                        <dd className="font-cal-mono text-[12px] tabular-nums text-cal-muted">
                                          {r.model_version || "Unknown"} ·
                                          opened {day(r.opened_at)}
                                        </dd>
                                      </dl>
                                    </div>

                                    {/* Right: Allied Health Checks & Admin Actions */}
                                    <div className="flex flex-col justify-between rounded-[10px] border border-cal-hairline bg-cal-canvas p-4">
                                      <div>
                                        <h4 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                                          Dietitian &amp; PT checks
                                        </h4>
                                        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[13px]">
                                          <dt className="font-medium text-cal-muted">
                                            Food check
                                          </dt>
                                          <dd className="text-cal-ink">
                                            {r.food_check?.status === "done"
                                              ? `${r.food_check.reviewer_name}: ${
                                                  r.food_check.not_suitable
                                                    ?.length
                                                    ? `not suitable: ${r.food_check.not_suitable.join(
                                                        ", "
                                                      )}`
                                                    : "all recipes suitable"
                                                }`
                                              : PROGRESS[r.food_check?.status]
                                                  ?.label || "Waiting"}
                                          </dd>

                                          <dt className="font-medium text-cal-muted">
                                            Exercise check
                                          </dt>
                                          <dd className="text-cal-ink">
                                            {r.exercise_check?.status === "done"
                                              ? `${
                                                  r.exercise_check.reviewer_name
                                                }: ${
                                                  [
                                                    r.exercise_check
                                                      .not_suitable?.length
                                                      ? `not suitable: ${r.exercise_check.not_suitable.join(
                                                          ", "
                                                        )}`
                                                      : "",
                                                    r.exercise_check
                                                      .with_changes?.length
                                                      ? `with changes: ${r.exercise_check.with_changes.join(
                                                          ", "
                                                        )}`
                                                      : "",
                                                  ]
                                                    .filter(Boolean)
                                                    .join("; ") ||
                                                  "all exercises suitable"
                                                }`
                                              : PROGRESS[
                                                  r.exercise_check?.status
                                                ]?.label || "Waiting"}
                                          </dd>
                                        </dl>
                                      </div>

                                      {isAdmin && (
                                        <div className="mt-4 flex justify-end border-t border-cal-hairline pt-3">
                                          <button
                                            type="button"
                                            onClick={() => setArchiveTarget(r)}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                                          >
                                            <Archive
                                              size={14}
                                              className="text-cal-muted"
                                            />
                                            <span>Archive this review</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Archive Review Confirmation Modal */}
        <ConfirmActionModal
          isOpen={Boolean(archiveTarget)}
          onClose={() => setArchiveTarget(null)}
          onConfirm={confirmArchive}
          title={
            archiveTarget
              ? `Archive ${archiveTarget.case_code}?`
              : "Archive review?"
          }
          subtitle="Remove from calibration dataset"
          description={
            archiveTarget
              ? `Archive ${archiveTarget.case_code}? It will leave Model Check and the active review queue.`
              : ""
          }
          confirmText="Archive review"
          cancelText="Cancel"
          variant="warning"
          icon={Archive}
          entityInfo={
            archiveTarget
              ? {
                  name: archiveTarget.case_code,
                  badge: archiveTarget.is_clinical ? "Clinical" : "Practice",
                  email: `${
                    LANES[archiveTarget.lane]?.label || "Case"
                  } · Reviewed ${day(archiveTarget.reviewed_at)}`,
                  id: archiveTarget.round_id,
                }
              : null
          }
          impactDetails={[
            "Excluded from Model Check agreement, kappa, and export counts.",
            "Removed from open case review lanes.",
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default ModelCheck;
