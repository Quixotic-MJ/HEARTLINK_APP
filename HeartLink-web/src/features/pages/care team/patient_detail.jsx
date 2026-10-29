import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import LoadError from "../../../components/ui/LoadError";
import CareNotes from "../../../components/care/CareNotes";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useAuth } from "../../../contexts/useAuth";
import { formatUserRef } from "../../../utils/formatUserRef";
import { TAG, bpBand, tierClass, tierDotClass } from "../../../components/care/vitals";
import { formatNoteTime } from "../../../components/care/noteTime";

// HL-039 / HL-040: one patient's logs (what the caller's expert type may read) and the care-team notes.
const SECTIONS = [
  ["health", "Blood pressure and check-ins"],
  ["meals", "Meals"],
  ["exercise", "Exercise"],
  ["sleep", "Sleep"],
  ["scores", "Score history"],
  ["alerts", "Alerts"],
];

const EXERCISE_STATUS = {
  completed: "Completed",
  in_progress: "In progress",
  skipped: "Skipped",
  partial: "Partly done",
  incomplete_due_to_symptoms: "Stopped for symptoms",
  abandoned: "Abandoned",
};

const dash = <span className="text-cal-muted-soft">—</span>;

function LogTable({ columns, rows, empty }) {
  if (!rows?.length) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-[14px] font-medium text-cal-muted">{empty}</p>
      </div>
    );
  }
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[580px] border-collapse text-left">
        <thead className="border-b border-cal-hairline bg-cal-surface-soft">
          <tr>
            {columns.map(([key, label]) => (
              <th
                key={key}
                scope="col"
                className="px-5 py-3 text-[12px] font-medium text-cal-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cal-hairline">
          {rows.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-cal-surface-soft/60 transition-colors">
              {columns.map(([key, , render]) => (
                <td key={key} className="px-5 py-3.5 text-[13.5px] text-cal-body">
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const when = [
  "when",
  "When",
  (r) => (
    <span className="whitespace-nowrap font-cal-mono text-[12px] text-cal-muted">
      {formatNoteTime(r.logged_at || r.computed_at || r.created_at)}
    </span>
  ),
];

const TABLES = {
  health: {
    empty: "No check-ins logged yet.",
    columns: [
      when,
      [
        "bp",
        "Blood pressure",
        (r) => {
          const band = bpBand(r.systolic_bp, r.diastolic_bp);
          return r.systolic_bp != null ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                {r.systolic_bp}/{r.diastolic_bp}
              </span>
              {band && (
                <span className={`${TAG} ${band.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${band.dotClass}`} />
                  <span>{band.label}</span>
                </span>
              )}
            </span>
          ) : (
            dash
          );
        },
      ],
      [
        "hr",
        "Heart rate",
        (r) =>
          r.heart_rate_bpm != null ? (
            <span className="font-cal-mono tabular-nums text-cal-ink">
              {r.heart_rate_bpm} <span className="text-[11.5px] text-cal-muted">bpm</span>
            </span>
          ) : (
            dash
          ),
      ],
      [
        "meds",
        "Medicine taken",
        (r) => (
          <span
            className={`${TAG} ${
              r.medication_taken
                ? "border-cal-success/25 bg-cal-success/10 text-cal-ink"
                : "border-cal-hairline bg-cal-surface-card text-cal-muted"
            }`}
          >
            {r.medication_taken ? "Yes" : "No"}
          </span>
        ),
      ],
      [
        "symptoms",
        "Symptoms",
        (r) =>
          r.symptoms?.length ? (
            <span className="text-cal-ink">{r.symptoms.join(", ")}</span>
          ) : (
            <span className="text-cal-muted">None</span>
          ),
      ],
    ],
  },
  meals: {
    empty: "No meals logged yet.",
    columns: [
      when,
      [
        "name",
        "Meal",
        (r) => <span className="font-medium text-cal-ink">{r.meal_name || "Meal"}</span>,
      ],
      [
        "cal",
        "Calories",
        (r) =>
          r.calories != null ? (
            <span className="font-cal-mono tabular-nums text-cal-ink">
              {Math.round(r.calories)} <span className="text-[11.5px] text-cal-muted">kcal</span>
            </span>
          ) : (
            dash
          ),
      ],
      [
        "sodium",
        "Sodium",
        (r) =>
          r.sodium_mg != null ? (
            <span className="font-cal-mono tabular-nums text-cal-ink">
              {Math.round(r.sodium_mg)} <span className="text-[11.5px] text-cal-muted">mg</span>
            </span>
          ) : (
            dash
          ),
      ],
    ],
  },
  exercise: {
    empty: "No exercise logged yet.",
    columns: [
      when,
      [
        "name",
        "Exercise",
        (r) => <span className="font-medium text-cal-ink">{r.routine_name || "Exercise"}</span>,
      ],
      [
        "min",
        "Minutes",
        (r) =>
          r.duration_minutes != null ? (
            <span className="font-cal-mono tabular-nums text-cal-ink">
              {r.duration_minutes} <span className="text-[11.5px] text-cal-muted">min</span>
            </span>
          ) : (
            dash
          ),
      ],
      [
        "status",
        "Result",
        (r) => {
          const label = EXERCISE_STATUS[r.status] || r.status;
          if (!label) return dash;
          const statusStyle =
            r.status === "completed"
              ? "border-cal-success/25 bg-cal-success/10 text-cal-ink"
              : r.status === "incomplete_due_to_symptoms"
                ? "border-cal-error/25 bg-cal-error/10 text-cal-ink"
                : "border-cal-hairline bg-cal-surface-card text-cal-body";
          return <span className={`${TAG} ${statusStyle}`}>{label}</span>;
        },
      ],
    ],
  },
  sleep: {
    empty: "No sleep logged yet.",
    columns: [
      when,
      [
        "hours",
        "Hours",
        (r) =>
          r.duration_hours != null ? (
            <span className="font-cal-mono tabular-nums text-cal-ink">
              {r.duration_hours} <span className="text-[11.5px] text-cal-muted">h</span>
            </span>
          ) : (
            dash
          ),
      ],
      [
        "quality",
        "Quality",
        (r) =>
          r.quality ? (
            <span className="font-medium capitalize text-cal-ink">{r.quality}</span>
          ) : (
            dash
          ),
      ],
    ],
  },
  scores: {
    empty: "No scores yet.",
    columns: [
      when,
      [
        "score",
        "Score",
        (r) => (
          <span className="font-cal-mono text-[14px] font-semibold tabular-nums text-cal-ink">
            {r.score}
          </span>
        ),
      ],
      [
        "tier",
        "Band",
        (r) =>
          r.tier ? (
            <span className={`${TAG} ${tierClass(r.tier)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tierDotClass(r.tier)}`} />
              <span>{r.tier}</span>
            </span>
          ) : (
            dash
          ),
      ],
    ],
  },
  alerts: {
    empty: "No alerts.",
    columns: [
      when,
      [
        "title",
        "Alert",
        (r) => (
          <span>
            <span className="font-medium text-cal-ink">{r.title}</span>
            {r.message && (
              <span className="mt-0.5 block text-[12.5px] text-cal-muted">{r.message}</span>
            )}
          </span>
        ),
      ],
      [
        "severity",
        "Severity",
        (r) => {
          const style =
            r.severity === "Critical"
              ? "border-cal-error/25 bg-cal-error/10 text-cal-ink"
              : r.severity === "Warning"
                ? "border-cal-warning/35 bg-cal-warning/15 text-cal-ink"
                : "border-cal-hairline bg-cal-surface-card text-cal-muted";
          const dot =
            r.severity === "Critical"
              ? "bg-cal-error"
              : r.severity === "Warning"
                ? "bg-cal-warning"
                : "bg-cal-muted-soft";
          return (
            <span className={`${TAG} ${style}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <span>{r.severity}</span>
            </span>
          );
        },
      ],
      [
        "status",
        "Status",
        (r) => (
          <span className="text-[13px] font-medium text-cal-body">{r.status || "—"}</span>
        ),
      ],
    ],
  },
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState(null);

  const logs = useApiQuery(`/api/admin/patients/${id}/logs`);
  const data = logs.data ?? null;
  const isNotFound = logs.isError && logs.error?.status === 404;

  const ref = formatUserRef(id);
  const sections = SECTIONS.filter(([key]) => data?.sections?.includes(key));
  const tab =
    selectedTab && (!data || data.sections?.includes(selectedTab))
      ? selectedTab
      : sections[0]?.[0] || "health";

  const latestBp = data?.health?.find((h) => h.systolic_bp != null);
  const band = latestBp ? bpBand(latestBp.systolic_bp, latestBp.diastolic_bp) : null;
  const latestScore = data?.scores?.[0];
  const openAlerts = (data?.alerts || []).filter((a) => a.status === "Under Review").length;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* Back navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/patients")}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-medium text-cal-body hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={14.5} />
            <span>All patients</span>
          </button>
        </div>

        {isNotFound ? (
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="mx-auto mb-3.5 flex h-10 w-10 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
              This patient could not be found
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-cal-muted">
              Verify the reference code or return to the care-team roster.
            </p>
            <button
              type="button"
              onClick={() => navigate("/patients")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
            >
              Back to patients
            </button>
          </div>
        ) : logs.isError ? (
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <LoadError what="this patient's record" onRetry={logs.refetch} />
          </div>
        ) : (
          <>
            {/* ─── 1. PATIENT SUMMARY HEADER CARD ─────────────────────────── */}
            <div className="flex flex-col justify-between gap-5 rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 text-[11.5px] font-medium text-cal-muted">
                  <ShieldCheck size={12.5} className="text-cal-ink" />
                  <span>Anonymized patient profile</span>
                </div>
                <h1 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.1] text-cal-ink">
                  {ref}
                </h1>
                <p className="mt-1.5 text-[13px] text-cal-muted">
                  {data?.patient?.created_at
                    ? `Joined ${new Date(data.patient.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })} · `
                    : ""}
                  Names and contact details are hidden.
                </p>
              </div>

              <dl className="grid min-w-0 grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline sm:grid-cols-3 lg:min-w-[470px]">
                <div className="bg-cal-canvas px-4 py-3.5">
                  <dt className="text-[12px] font-medium text-cal-muted">Latest blood pressure</dt>
                  <dd className="mt-1.5 flex flex-wrap items-center gap-2">
                    {data === null ? (
                      <Skeleton className="h-6 w-24 rounded-[6px] bg-cal-surface-strong/60" />
                    ) : latestBp ? (
                      <>
                        <span className="font-cal-display text-[22px] font-semibold tracking-[-0.5px] leading-none tabular-nums text-cal-ink">
                          {latestBp.systolic_bp}/{latestBp.diastolic_bp}
                        </span>
                        {band && (
                          <span className={`${TAG} ${band.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${band.dotClass}`} />
                            <span>{band.label}</span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[13.5px] text-cal-muted">None yet</span>
                    )}
                  </dd>
                </div>

                <div className="bg-cal-canvas px-4 py-3.5">
                  <dt className="text-[12px] font-medium text-cal-muted">Score</dt>
                  <dd className="mt-1.5 flex flex-wrap items-center gap-2">
                    {data === null ? (
                      <Skeleton className="h-6 w-16 rounded-[6px] bg-cal-surface-strong/60" />
                    ) : latestScore ? (
                      <>
                        <span className="font-cal-display text-[22px] font-semibold tracking-[-0.5px] leading-none tabular-nums text-cal-ink">
                          {latestScore.score}
                        </span>
                        <span className={`${TAG} ${tierClass(latestScore.tier)}`}>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${tierDotClass(
                              latestScore.tier
                            )}`}
                          />
                          <span>{latestScore.tier}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-[13.5px] text-cal-muted">None yet</span>
                    )}
                  </dd>
                </div>

                <div className="bg-cal-canvas px-4 py-3.5">
                  <dt className="text-[12px] font-medium text-cal-muted">Open alerts</dt>
                  <dd className="mt-1.5">
                    {data === null ? (
                      <Skeleton className="h-6 w-12 rounded-[6px] bg-cal-surface-strong/60" />
                    ) : (
                      <span
                        className={`font-cal-display text-[22px] font-semibold tracking-[-0.5px] leading-none tabular-nums ${
                          openAlerts > 0 ? "text-cal-error" : "text-cal-muted"
                        }`}
                      >
                        {openAlerts}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ─── 2. TWO-COLUMN TELEMETRY & CARE-TEAM WORKSPACE ──────────── */}
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
              <section
                aria-labelledby="logs-title"
                className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div className="border-b border-cal-hairline px-5 pt-4 pb-4">
                  <h2
                    id="logs-title"
                    className="font-cal-display text-[19px] font-semibold tracking-[-0.4px] text-cal-ink"
                  >
                    Logs
                  </h2>
                  <p className="mt-0.5 text-[13px] text-cal-muted">
                    The latest 100 entries of each kind, newest first.
                  </p>

                  {/* Cal.com Nav-Pill-Group Tablist */}
                  <div
                    role="tablist"
                    aria-label="Log type"
                    className="mt-3.5 inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
                  >
                    {(data ? sections : SECTIONS.slice(0, 3)).map(([key, label]) => {
                      const active = tab === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSelectedTab(key)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-cal-canvas text-cal-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                              : "text-cal-muted hover:text-cal-ink"
                          }`}
                        >
                          <span>{label}</span>
                          {data?.[key] && (
                            <span
                              className={`font-cal-mono text-[11.5px] tabular-nums ${
                                active ? "text-cal-ink" : "text-cal-muted-soft"
                              }`}
                            >
                              {data[key].length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {data === null ? (
                  <div className="space-y-2.5 p-5">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60"
                      />
                    ))}
                  </div>
                ) : data.sections?.includes(tab) ? (
                  <LogTable
                    columns={TABLES[tab].columns}
                    rows={data[tab]}
                    empty={TABLES[tab].empty}
                  />
                ) : (
                  <p className="px-5 py-12 text-center text-[14px] text-cal-muted">
                    Your role doesn&apos;t include these logs.
                  </p>
                )}
              </section>

              <CareNotes
                patientId={id}
                expertType={user?.role === "medical_expert" ? user?.expert_type : null}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
