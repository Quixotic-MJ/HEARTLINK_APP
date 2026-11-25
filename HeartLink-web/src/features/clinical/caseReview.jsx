import { useState } from "react";
import { ArrowRight, BarChart3, HelpCircle, ShieldCheck, Shuffle, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import LoadError from "../../components/ui/loadError.jsx";
import { useAuth } from "../../contexts/useAuth.js";
import { PROGRESS, SECTION_EXPERT, mySection } from "./reviewUi.js";
import {
  PURPOSE,
  STEPS,
  casesForStep,
  helpPoints,
  isMyTurn,
  lastPickedText,
  stageLabel,
  stepCounts,
  waitingForYou,
} from "./reviewFlow.js";
import { WorkspaceHeader } from "../../components/ui/workspaceHeader.jsx";
import "./reviewWorkspace.css";

// HL-054 / HL-168 (panel revision): the case review list as four steps. Pick (an admin picks this week's random sample),
// Check (the three experts answer), Approve (the Cardiologist approves the case for the dataset), Results (Model Check).
// Experts see their own to-do list first. Nothing opens by itself and nothing is sent to users.
const NO_CASES = [];
const HELP_KEY = "hl-case-review-help-hidden";

const STAGE_TONE = {
  check: "border-cal-warning/30 bg-cal-warning/10",
  approve: "border-cal-badge-violet/25 bg-cal-badge-violet/15",
  approved: "border-cal-success/25 bg-cal-success/10",
  other: "border-cal-hairline bg-cal-surface-soft",
};

function readHelpHidden() {
  try {
    return localStorage.getItem(HELP_KEY) === "1";
  } catch {
    return false;
  }
}

function HowItWorks({ section, isAdmin, onHide }) {
  return (
    <section
      aria-label="How case review works"
      className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-cal-ink">How it works</h3>
        <button
          type="button"
          onClick={onHide}
          aria-label="Hide how it works"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {helpPoints(section, isAdmin).map((point, i) => (
          <li key={point} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cal-surface-card font-cal-mono text-[13px] font-semibold text-cal-ink">
              {i + 1}
            </span>
            <span className="text-[13.5px] leading-relaxed text-cal-body">{point}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepBar({ counts, step, onPick, loading }) {
  return (
    <nav aria-label="Case review steps" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {STEPS.map((s, i) => {
        const active = step === s.key;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(s.key)}
            className={`relative flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left transition-colors cursor-pointer ${
              active
                ? "border-cal-primary bg-cal-primary/10"
                : "border-cal-hairline bg-cal-canvas hover:bg-cal-surface-soft"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-cal-mono text-[13px] font-semibold ${
                active ? "bg-cal-primary text-cal-on-primary" : "bg-cal-surface-card text-cal-ink"
              }`}
            >
              {s.number}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-cal-ink">{s.label}</span>
              <span className="block text-[12.5px] text-cal-muted">
                {loading ? "—" : `${counts[s.key]} ${s.hint}`}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="absolute -right-[13px] top-1/2 z-10 hidden -translate-y-1/2 text-cal-muted-soft lg:block"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

const Cases = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Picking the sample (saves through apiFetch) reloads the list by itself
  const queue = useApiQuery("/api/admin/review-queue");
  const items = queue.data?.items ?? NO_CASES;
  const counts = stepCounts(queue.data?.steps);
  const loading = queue.isPending;

  const isAdmin = user?.role === "admin";
  const section = mySection(user);
  const [step, setStep] = useState("pick");
  const [mineOnly, setMineOnly] = useState(Boolean(section));
  const [helpHidden, setHelpHidden] = useState(readHelpHidden);
  const [busy, setBusy] = useState(false);

  // HL-081: the header's search box sends ?search=CASE-0042
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get("search") || "").trim().toUpperCase();

  const mine = section ? items.filter((i) => isMyTurn(i, section)) : NO_CASES;
  const shown = casesForStep(mineOnly ? mine : items, step).filter(
    (i) => !search || (i.case_code || "").toUpperCase().includes(search)
  );

  const setHelp = (hidden) => {
    setHelpHidden(hidden);
    try {
      localStorage.setItem(HELP_KEY, hidden ? "1" : "0");
    } catch {
      // The help box just shows again next time
    }
  };

  const pickCases = async () => {
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/review-queue/sample", { method: "POST" });
      toast.success(
        res.opened
          ? `Picked ${res.opened} ${res.opened === 1 ? "case" : "cases"} for this week.`
          : "No users can be picked right now. Each user is picked at most once every 30 days."
      );
      setStep("check");
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't pick cases.");
    } finally {
      setBusy(false);
    }
  };

  const emptyText = () => {
    if (items.length === 0) {
      return isAdmin
        ? ["No cases yet", "Click \"Pick this week's cases\" to start."]
        : ["No cases yet", "Cases appear here after an admin picks this week's cases."];
    }
    if (search) return [`No case matches ${search}`, "Clear the search to see every case."];
    if (mineOnly) return ["Nothing waiting for you here", "Choose \"All cases\" to see the others."];
    return ["No cases at this step", "Choose another step above."];
  };

  return (
    <AdminLayout>
      <div className="workspace workspace--operations workspace--refined workspace--teal review-workspace case-workspace mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        <WorkspaceHeader icon={ShieldCheck} title="Case review" description={PURPOSE}>
          <div className="flex flex-wrap items-center gap-2.5">
            {helpHidden && (
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
              >
                <HelpCircle size={15} />
                <span>How does this work?</span>
              </button>
            )}
            {isAdmin && (
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={pickCases}
                  disabled={busy}
                  className="flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
                >
                  <Shuffle size={15} />
                  <span>{busy ? "Picking…" : "Pick this week's cases"}</span>
                </button>
                <span className="text-[12px] text-cal-muted">{lastPickedText(queue.data?.steps?.last_picked_at)}</span>
              </div>
            )}
          </div>
        </WorkspaceHeader>

        {!helpHidden && <HowItWorks section={section} isAdmin={isAdmin} onHide={() => setHelp(true)} />}

        {/* An expert's own to-do list comes first */}
        {section && (
          <section
            aria-label="Your cases"
            className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div>
              <h3 className="text-[13px] font-medium text-cal-muted">Your cases ({SECTION_EXPERT[section]})</h3>
              <p className="mt-1 font-cal-display text-[22px] font-semibold tracking-[-0.4px] text-cal-ink">
                {loading ? "Loading…" : waitingForYou(mine.length)}
              </p>
            </div>
            {mine.length > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/cases/${mine[0].id}`)}
                className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
              >
                <span>Start the next case</span>
                <ArrowRight size={16} />
              </button>
            )}
          </section>
        )}

        <StepBar counts={counts} step={step} onPick={setStep} loading={loading} />

        <section className="review-table-panel overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-cal-ink">
                {STEPS.find((s) => s.key === step)?.number}. {STEPS.find((s) => s.key === step)?.label}
              </h3>
              <p className="text-[12.5px] text-cal-muted">
                {step === "pick" && "Every case picked so far."}
                {step === "check" && "The Cardiologist, the Dietitian and the Physical Therapist each answer their part."}
                {step === "approve" && "Every part is in. The Cardiologist approves the case for the dataset or leaves it out."}
                {step === "results" && "Finished cases. Approved ones are in the dataset."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {step === "results" && (
                <Link
                  to="/calibration"
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-card"
                >
                  <BarChart3 size={14} />
                  <span>See the results in Model Check</span>
                </Link>
              )}
              {section && (
                <div role="group" aria-label="Which cases" className="inline-flex rounded-full border border-cal-hairline bg-cal-surface-soft p-1">
                  {[
                    [true, "Waiting for me"],
                    [false, "All cases"],
                  ].map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={mineOnly === value}
                      onClick={() => setMineOnly(value)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium cursor-pointer ${
                        mineOnly === value ? "bg-cal-primary text-cal-on-primary" : "text-cal-muted hover:text-cal-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {search && (
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
              )}
            </div>
          </div>

          <div
            className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-cal-ink focus-visible:-outline-offset-2"
            role="region"
            aria-label="Cases"
            tabIndex={0}
          >
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                <tr>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">Case</th>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">Where it is</th>
                  {Object.keys(SECTION_EXPERT).map((s) => (
                    <th key={s} scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                      {SECTION_EXPERT[s]}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-right text-[12px] font-medium text-cal-muted">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cal-hairline">
                {loading ? (
                  [0, 1, 2].map((n) => (
                    <tr key={n}>
                      <td colSpan={6} className="px-5 py-4">
                        <Skeleton className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60" />
                      </td>
                    </tr>
                  ))
                ) : queue.isError ? (
                  <tr>
                    <td colSpan={6}>
                      <LoadError what="the cases" onRetry={queue.refetch} className="py-12" />
                    </td>
                  </tr>
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <p className="text-[14px] font-semibold text-cal-ink">{emptyText()[0]}</p>
                      <p className="mt-1 text-[13px] text-cal-muted">{emptyText()[1]}</p>
                    </td>
                  </tr>
                ) : (
                  shown.map((c) => {
                    const myTurn = isMyTurn(c, section);
                    const tone =
                      c.stage === "check" ? "check" : c.stage === "approve" ? "approve" : c.outcome === "approved" ? "approved" : "other";
                    return (
                      <tr key={c.id} className="bg-cal-canvas hover:bg-cal-surface-soft/80 transition-colors">
                        <td className="px-5 py-4 align-middle">
                          <div className="font-cal-mono text-[13.5px] font-semibold text-cal-ink">{c.case_code}</div>
                          <div className="mt-0.5 text-[12px] text-cal-muted">
                            {[c.age != null ? `${c.age} years old` : null, c.sex ? c.sex.charAt(0).toUpperCase() + c.sex.slice(1) : null]
                              .filter(Boolean)
                              .join(", ") || "Age not given"}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium text-cal-ink ${STAGE_TONE[tone]}`}>
                              {stageLabel(c)}
                            </span>
                            {c.older && (
                              <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 text-[11.5px] font-medium text-cal-muted">
                                Older case
                              </span>
                            )}
                          </div>
                        </td>
                        {Object.keys(SECTION_EXPERT).map((s) => {
                          const prog = PROGRESS[c.sections?.[s]];
                          return (
                            <td key={s} className="px-4 py-4 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${
                                  prog?.className || "border-cal-hairline bg-cal-surface-soft text-cal-muted"
                                }`}
                              >
                                {prog?.dotClass && <span className={`h-1.5 w-1.5 rounded-full ${prog.dotClass}`} />}
                                {prog?.label || "—"}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/cases/${c.id}`)}
                              aria-label={`${myTurn ? "Start" : "Open"} ${c.case_code}`}
                              className={
                                myTurn
                                  ? "inline-flex h-9 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                                  : "inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
                              }
                            >
                              {myTurn ? "Start" : "Open"}
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
      </div>
    </AdminLayout>
  );
};

export default Cases;
