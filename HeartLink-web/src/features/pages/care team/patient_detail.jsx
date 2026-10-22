import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import CareNotes from "../../../components/care/CareNotes";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { formatUserRef } from "../../../utils/formatUserRef";
import { UI, FONTS } from "../../../styles/designSystem";
import { TAG, bpBand, tierClass } from "../../../components/care/vitals";
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

const dash = <span className="text-ds-steel">–</span>;

function LogTable({ columns, rows, empty }) {
  if (!rows?.length) return <p className="px-5 py-10 text-center text-[14px] text-ds-slate">{empty}</p>;
  return (
    <div className={UI.table.container}>
      <table className="w-full text-left border-collapse min-w-[560px]">
        <thead className={UI.table.thead}>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key} scope="col" className={UI.table.th}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className={UI.table.tbody}>
          {rows.map((row, i) => (
            <tr key={row.id || i} className={UI.table.tr}>
              {columns.map(([key, , render]) => (
                <td key={key} className={`${UI.table.td} text-[13.5px] text-ds-charcoal`}>{render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const when = ["when", "When", (r) => <span className="whitespace-nowrap">{formatNoteTime(r.logged_at || r.computed_at || r.created_at)}</span>];

const TABLES = {
  health: {
    empty: "No check-ins logged yet.",
    columns: [
      when,
      ["bp", "Blood pressure", (r) => {
        const band = bpBand(r.systolic_bp, r.diastolic_bp);
        return r.systolic_bp != null ? (
          <span className="flex items-center gap-2">
            <span className="font-semibold text-ds-ink tabular-nums">{r.systolic_bp}/{r.diastolic_bp}</span>
            {band && <span className={`${TAG} ${band.className}`}>{band.label}</span>}
          </span>
        ) : dash;
      }],
      ["hr", "Heart rate", (r) => (r.heart_rate_bpm != null ? `${r.heart_rate_bpm} bpm` : dash)],
      ["meds", "Medicine taken", (r) => (r.medication_taken ? "Yes" : "No")],
      ["symptoms", "Symptoms", (r) => (r.symptoms?.length ? r.symptoms.join(", ") : "None")],
    ],
  },
  meals: {
    empty: "No meals logged yet.",
    columns: [
      when,
      ["name", "Meal", (r) => <span className="font-medium text-ds-ink">{r.meal_name || "Meal"}</span>],
      ["cal", "Calories", (r) => (r.calories != null ? `${Math.round(r.calories)} kcal` : dash)],
      ["sodium", "Sodium", (r) => (r.sodium_mg != null ? `${Math.round(r.sodium_mg)} mg` : dash)],
    ],
  },
  exercise: {
    empty: "No exercise logged yet.",
    columns: [
      when,
      ["name", "Exercise", (r) => <span className="font-medium text-ds-ink">{r.routine_name || "Exercise"}</span>],
      ["min", "Minutes", (r) => r.duration_minutes ?? dash],
      ["status", "Result", (r) => EXERCISE_STATUS[r.status] || r.status || dash],
    ],
  },
  sleep: {
    empty: "No sleep logged yet.",
    columns: [
      when,
      ["hours", "Hours", (r) => (r.duration_hours != null ? `${r.duration_hours} h` : dash)],
      ["quality", "Quality", (r) => r.quality || dash],
    ],
  },
  scores: {
    empty: "No scores yet.",
    columns: [
      when,
      ["score", "Score", (r) => <span className="font-semibold text-ds-ink tabular-nums">{r.score}</span>],
      ["tier", "Band", (r) => (r.tier ? <span className={`${TAG} ${tierClass(r.tier)}`}>{r.tier}</span> : dash)],
    ],
  },
  alerts: {
    empty: "No alerts.",
    columns: [
      when,
      ["title", "Alert", (r) => (
        <span>
          <span className="font-medium text-ds-ink">{r.title}</span>
          {r.message && <span className="block text-[12.5px] text-ds-slate">{r.message}</span>}
        </span>
      )],
      ["severity", "Severity", (r) => (
        <span className={`${TAG} ${r.severity === "Critical" ? "bg-ds-rose text-ds-ink" : r.severity === "Warning" ? "bg-ds-yellow text-ds-warm-text" : "bg-ds-surface-alt text-ds-slate"}`}>
          {r.severity}
        </span>
      )],
      ["status", "Status", (r) => r.status],
    ],
  },
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("health");

  useEffect(() => {
    apiFetch(`/api/admin/patients/${id}/logs`, { bypassCache: true })
      .then(setData)
      .catch((e) => setError(e?.status === 404 ? "This patient could not be found." : e?.data?.detail || "Couldn't load this patient."));
  }, [id]);

  const ref = formatUserRef(id);
  const sections = SECTIONS.filter(([key]) => data?.sections?.includes(key));
  const latestBp = data?.health?.find((h) => h.systolic_bp != null);
  const band = latestBp ? bpBand(latestBp.systolic_bp, latestBp.diastolic_bp) : null;
  const latestScore = data?.scores?.[0];
  const openAlerts = (data?.alerts || []).filter((a) => a.status === "Under Review").length;

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 text-ds-slate hover:text-ds-ink transition-colors mb-5 w-fit cursor-pointer text-[13px] font-medium"
        >
          <ArrowLeft size={15} />
          <span>All patients</span>
        </button>

        {error ? (
          <div className="bg-ds-canvas p-8 rounded-xl border border-ds-hairline flex flex-col items-center text-center">
            <AlertTriangle size={28} className="mb-3 text-ds-danger" />
            <p className="text-[15px] font-semibold text-ds-ink">{error}</p>
          </div>
        ) : (
          <>
            <div className="bg-ds-canvas rounded-xl p-5 sm:p-6 border border-ds-hairline mb-6 flex flex-col md:flex-row gap-5 md:items-center justify-between">
              <div>
                <p className="text-[13px] text-ds-slate">Patient</p>
                <h1 className="text-[26px] font-semibold tracking-tight text-ds-ink">{ref}</h1>
                <p className="text-[13px] text-ds-slate mt-0.5">
                  {data?.patient?.created_at ? `Joined ${new Date(data.patient.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}. ` : ""}
                  Names and contact details are hidden.
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-px bg-ds-hairline-soft border border-ds-hairline rounded-xl overflow-hidden min-w-0 md:min-w-[440px]">
                <div className="bg-ds-canvas px-4 py-3">
                  <dt className="text-[12px] text-ds-slate">Latest blood pressure</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {data === null ? <Skeleton className="h-6 w-20" /> : latestBp ? (
                      <>
                        <span className="text-[17px] font-semibold tabular-nums">{latestBp.systolic_bp}/{latestBp.diastolic_bp}</span>
                        {band && <span className={`${TAG} ${band.className}`}>{band.label}</span>}
                      </>
                    ) : <span className="text-[14px] text-ds-steel">None yet</span>}
                  </dd>
                </div>
                <div className="bg-ds-canvas px-4 py-3">
                  <dt className="text-[12px] text-ds-slate">Score</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {data === null ? <Skeleton className="h-6 w-16" /> : latestScore ? (
                      <>
                        <span className="text-[17px] font-semibold tabular-nums">{latestScore.score}</span>
                        <span className={`${TAG} ${tierClass(latestScore.tier)}`}>{latestScore.tier}</span>
                      </>
                    ) : <span className="text-[14px] text-ds-steel">None yet</span>}
                  </dd>
                </div>
                <div className="bg-ds-canvas px-4 py-3">
                  <dt className="text-[12px] text-ds-slate">Open alerts</dt>
                  <dd className="mt-0.5">
                    {data === null ? <Skeleton className="h-6 w-10" /> : (
                      <span className={`text-[17px] font-semibold ${openAlerts ? "text-ds-ink" : "text-ds-steel"}`}>{openAlerts}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
              <section className={UI.card.root} aria-labelledby="logs-title">
                <div className="px-5 pt-4 pb-3 border-b border-ds-hairline">
                  <h2 id="logs-title" className="text-[16px] font-semibold text-ds-ink">Logs</h2>
                  <p className="text-[13px] text-ds-slate mt-0.5">The latest 100 entries of each kind, newest first.</p>
                  <div role="tablist" aria-label="Log type" className="mt-3 flex flex-wrap gap-2">
                    {(data ? sections : SECTIONS.slice(0, 3)).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`min-h-[36px] px-3.5 rounded-full text-[12.5px] font-semibold border transition-colors cursor-pointer ${
                          tab === key ? "bg-ds-ink text-white border-ds-ink" : "bg-ds-canvas text-ds-ink border-ds-hairline hover:border-ds-steel"
                        }`}
                      >
                        {label}
                        {data?.[key] ? ` (${data[key].length})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
                {data === null ? (
                  <div className="p-5 space-y-2">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
                  </div>
                ) : data.sections.includes(tab) ? (
                  <LogTable columns={TABLES[tab].columns} rows={data[tab]} empty={TABLES[tab].empty} />
                ) : (
                  <p className="px-5 py-10 text-center text-[14px] text-ds-slate">Your role doesn't include these logs.</p>
                )}
              </section>

              <CareNotes patientId={id} expertType={user?.role === "medical_expert" ? user?.expert_type : null} />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
