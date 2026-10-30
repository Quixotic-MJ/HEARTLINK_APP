import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Stethoscope,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import { useAuth } from "../../../contexts/useAuth";
import {
  LANES,
  PROGRESS,
  SECTION_EXPERT,
  SECTION_LABELS,
  mySection,
  waitingText,
} from "./reviewUi";

// HL-054 / HL-055: the case review queue. Urgent first, then re-reviews, then the weekly sample.
const NO_CASES = [];

const LANE_TABS = [
  ["all", "All"],
  ["urgent", "Urgent"],
  ["rereview", "Re-review"],
  ["sample", "Sample"],
];

const Cases = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Refreshing the queue or drawing the sample (saves through apiFetch) reloads it by itself
  const queue = useApiQuery("/api/admin/review-queue");
  const items = queue.data?.items ?? NO_CASES;
  const urgentHours = queue.data?.urgent_review_hours || 48;
  const loading = queue.isPending;

  const [lane, setLane] = useState("all");
  const [busy, setBusy] = useState(null);

  // HL-081: the header's search box sends ?search=CASE-0042
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get("search") || "").trim().toUpperCase();

  const isAdmin = user?.role === "admin";
  const section = mySection(user);

  const refresh = async () => {
    setBusy("refresh");
    try {
      const res = await apiFetch("/api/admin/review-queue/refresh", { method: "POST" });
      toast.success(
        res.opened || res.upgraded
          ? `Queue updated: ${res.opened} new, ${res.upgraded} moved to urgent.`
          : "Queue is up to date."
      );
    } catch {
      toast.error("Couldn't refresh the queue.");
    } finally {
      setBusy(null);
    }
  };

  const drawSample = async () => {
    setBusy("sample");
    try {
      const res = await apiFetch("/api/admin/review-queue/sample", { method: "POST" });
      toast.success(
        res.opened
          ? `Added ${res.opened} cases to the sample lane.`
          : "No patients are due for sampling right now."
      );
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't draw the sample.");
    } finally {
      setBusy(null);
    }
  };

  const counts = {
    all: items.length,
    urgent: items.filter((i) => i.lane === "urgent").length,
    rereview: items.filter((i) => i.lane === "rereview").length,
    sample: items.filter((i) => i.lane === "sample").length,
  };
  const overdueCount = items.filter((i) => i.overdue).length;
  const awaitingMineCount = section
    ? items.filter((i) => i.sections?.[section] === "waiting").length
    : 0;

  const shown = (lane === "all" ? items : items.filter((i) => i.lane === lane)).filter(
    (i) => !search || (i.case_code || "").toUpperCase().includes(search)
  );

  const yourPart = section
    ? `Your assignment: evaluate the ${SECTION_LABELS[section]} section of each open case.`
    : isAdmin
      ? "Administrative view: monitor multi-disciplinary review progress and draw the weekly sample. Clinical scoring is reserved for verified medical experts."
      : "Your account does not have an assigned specialist discipline yet, so cases open in read-only mode.";

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <ShieldCheck size={13.5} className="text-cal-ink" />
              <span>Clinical portal · Anonymized HSS queue</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Case review
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Urgent cases first, then re-reviews, then the weekly sample. Names, phone numbers, and email addresses are hidden.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={refresh}
              disabled={busy !== null}
              className="flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={busy === "refresh" ? "animate-spin" : ""} />
              <span>Check for new cases</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={drawSample}
                disabled={busy !== null}
                className="flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
              >
                <Shuffle size={15} />
                <span>Draw this week&apos;s sample</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── 2. ROLE RESPONSIBILITY BAR & SUMMARY METRICS ─────────────────── */}
        <div className="flex items-center gap-3 rounded-[12px] border border-cal-hairline bg-cal-canvas px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cal-surface-card text-cal-ink">
            <Stethoscope size={16} strokeWidth={1.9} />
          </div>
          <p className="text-[13.5px] font-medium text-cal-body">{yourPart}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-[12.5px] font-medium text-cal-muted">Open queue</div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : counts.all}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Active evaluation rounds</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">Urgent lane</span>
              <span className="h-2 w-2 rounded-full bg-cal-error" />
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : counts.urgent}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Target review within {urgentHours}h
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-[12.5px] font-medium text-cal-muted">Overdue</div>
            <div
              className={`mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none ${
                !loading && overdueCount > 0 ? "text-cal-error" : "text-cal-ink"
              }`}
            >
              {loading ? "—" : overdueCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Past {urgentHours}h urgent window</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-[12.5px] font-medium text-cal-muted">
              {section ? `Awaiting ${SECTION_LABELS[section].toLowerCase()}` : "Weekly sample"}
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : section ? awaitingMineCount : counts.sample}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              {section ? "Ready for your verdict" : "Sampled calibration rounds"}
            </div>
          </div>
        </div>

        {/* ─── 3. QUEUE FILTER BAR & TABLE CARD ─────────────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Card Header with Cal.com Nav-Pill-Group */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5">
            <div
              role="group"
              aria-label="Filter by lane"
              className="relative inline-flex flex-wrap items-center gap-1 rounded-full bg-cal-surface-soft p-1 border border-cal-hairline/80"
            >
              {LANE_TABS.map(([key, label]) => {
                const active = lane === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLane(key)}
                    className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="case-review-lane-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-xs"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                    <span
                      className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums ${
                        active ? "text-white/90 font-medium" : "text-cal-muted-soft"
                      }`}
                    >
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {search ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-surface-soft px-3 py-1 text-[12.5px] text-cal-body">
                <span>
                  Matching <strong className="font-cal-mono font-semibold text-cal-ink">{search}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  aria-label="Clear case search"
                  className="inline-flex items-center gap-1 font-semibold text-cal-ink hover:underline cursor-pointer"
                >
                  <X size={12} />
                  <span>Clear</span>
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[12.5px] text-cal-muted">
                <Clock size={13.5} className="shrink-0 text-cal-muted" />
                <span>Urgent cases should be reviewed within {urgentHours} hours.</span>
              </div>
            )}
          </div>

          {/* Queue Data Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                <tr>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Case
                  </th>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Why it is here
                  </th>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Waiting
                  </th>
                  {Object.keys(SECTION_LABELS).map((s) => (
                    <th
                      key={s}
                      scope="col"
                      className="px-4 py-3 text-[12px] font-medium text-cal-muted"
                    >
                      {SECTION_LABELS[s]}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-right text-[12px] font-medium text-cal-muted">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cal-hairline">
                {loading ? (
                  [0, 1, 2, 3].map((n) => (
                    <tr key={n}>
                      <td colSpan={7} className="px-5 py-4">
                        <Skeleton className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60" />
                      </td>
                    </tr>
                  ))
                ) : queue.isError ? (
                  <tr>
                    <td colSpan={7}>
                      <LoadError what="the review queue" onRetry={queue.refetch} className="py-12" />
                    </td>
                  </tr>
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <p className="text-[14px] font-semibold text-cal-ink">
                        {items.length === 0
                          ? "No open cases in the queue"
                          : search
                            ? `No open case matches ${search}`
                            : "No cases in this lane"}
                      </p>
                      <p className="mt-1 text-[13px] text-cal-muted">
                        {items.length === 0
                          ? "Urgent cases open automatically from patient telemetry; administrators can also draw the weekly sample."
                          : "Switch lanes above or clear your active filter to view other cases."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  shown.map((c) => {
                    const mine = section && c.sections?.[section] === "waiting";
                    const pendingChecks = ["nutrition", "exercise"]
                      .filter((s) => c.sections?.[s] === "waiting")
                      .map((s) => SECTION_LABELS[s].toLowerCase());
                    const laneMeta = LANES[c.lane];

                    return (
                      <tr
                        key={c.id}
                        className="group bg-cal-canvas hover:bg-cal-surface-soft/80 transition-colors"
                      >
                        {/* Case Code & Anonymized Demographics */}
                        <td className="px-5 py-4 align-middle">
                          <div className="font-cal-mono text-[13.5px] font-semibold text-cal-ink">
                            {c.case_code}
                          </div>
                          <div className="mt-0.5 text-[12px] text-cal-muted">
                            {[
                              c.age != null ? `${c.age} yrs` : null,
                              c.sex ? c.sex.charAt(0).toUpperCase() + c.sex.slice(1) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Age not given"}
                          </div>
                        </td>

                        {/* Lane, Overdue Signal & Trigger Reason */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${
                                laneMeta?.className || "border-cal-hairline bg-cal-surface-card text-cal-ink"
                              }`}
                            >
                              {laneMeta?.dotClass && (
                                <span className={`h-1.5 w-1.5 rounded-full ${laneMeta.dotClass}`} />
                              )}
                              {laneMeta?.label || c.lane}
                            </span>

                            {c.overdue && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-cal-error/30 bg-cal-error/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-cal-error">
                                <AlertTriangle size={11} aria-hidden="true" />
                                <span>Overdue</span>
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 text-[13px] text-cal-body">{c.reason}</div>

                          {c.status === "complete" && pendingChecks.length > 0 && (
                            <div className="mt-1 text-[12px] font-medium text-cal-muted">
                              Cardiology complete · waiting for {pendingChecks.join(" and ")}
                            </div>
                          )}
                        </td>

                        {/* Waiting Duration */}
                        <td className="px-5 py-4 align-middle whitespace-nowrap font-cal-mono text-[12.5px] font-medium text-cal-body tabular-nums">
                          {waitingText(c.waiting_hours)}
                        </td>

                        {/* Discipline Progress Pills */}
                        {Object.keys(SECTION_LABELS).map((s) => {
                          const prog = PROGRESS[c.sections?.[s]];
                          return (
                            <td key={s} className="px-4 py-4 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${
                                  prog?.className || "border-cal-hairline bg-cal-surface-soft text-cal-muted"
                                }`}
                              >
                                {prog?.dotClass && (
                                  <span className={`h-1.5 w-1.5 rounded-full ${prog.dotClass}`} />
                                )}
                                {prog?.label || c.sections?.[s]}
                              </span>
                            </td>
                          );
                        })}

                        {/* Action CTA */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/cases/${c.id}`)}
                              aria-label={`${mine ? "Review" : "Open"} ${c.case_code}`}
                              className={
                                mine
                                  ? "inline-flex h-9 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                                  : "inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
                              }
                            >
                              {mine ? "Review" : "Open"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Governance Note */}
        <p className="text-[12.5px] text-cal-muted">
          A case counts toward Model Check as soon as the {SECTION_EXPERT.cardiology} submits, and remains in this queue until food and exercise suitability checks are completed.
        </p>
      </div>
    </AdminLayout>
  );
};

export default Cases;
