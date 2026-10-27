import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, HeartPulse, Search, Users } from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useAuth } from "../../../contexts/useAuth";
import { formatUserRef } from "../../../utils/formatUserRef";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader, KpiCard } from "../../../styles/designSystem";
import { TAG, bpBand, tierClass } from "../../../components/care/vitals";
import { formatNoteTime } from "../../../components/care/noteTime";

// HL-039: every patient's latest blood pressure, score and open alerts. Cardiologists land here;
// Dietitians and PTs use it to reach a patient's care-team notes.
const FILTERS = [
  ["all", "All"],
  ["alerts", "Open alerts"],
  ["bp", "High or low blood pressure"],
];

// One shared empty list, so a failed load doesn't make the screen recount on every render
const NO_PATIENTS = [];

export default function Patients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCardiologist = user?.expert_type === "Cardiologist";
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  // HL-081: a ?search= link (the header's search box) fills the box; noticed during render, not in an effect
  const [searchParams] = useSearchParams();
  const searchParam = searchParams.get("search");
  const [seenSearchParam, setSeenSearchParam] = useState(null);
  if (searchParam !== null && searchParam !== seenSearchParam) {
    setSeenSearchParam(searchParam);
    setQuery(searchParam);
  }

  // null while loading; an empty list (with the reason) if the load failed
  const patients = useApiQuery("/api/admin/patients", { select: (d) => (Array.isArray(d) ? d : []) });
  const items = patients.isError ? NO_PATIENTS : patients.data ?? null;
  const error = patients.isError ? patients.error?.data?.detail || "Couldn't load patients." : "";

  const rows = useMemo(
    () =>
      (items || []).map((p) => ({
        ...p,
        ref: formatUserRef(p.id),
        band: p.latest_bp ? bpBand(p.latest_bp.systolic, p.latest_bp.diastolic) : null,
      })),
    [items]
  );

  const counts = {
    all: rows.length,
    alerts: rows.filter((r) => r.open_alerts > 0).length,
    bp: rows.filter((r) => r.band?.attention).length,
  };
  const needle = query.trim().toUpperCase();
  const shown = rows
    .filter((r) => (filter === "alerts" ? r.open_alerts > 0 : filter === "bp" ? r.band?.attention : true))
    .filter((r) => !needle || r.ref.includes(needle));

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        <PageHeader
          eyebrow="Care team"
          eyebrowIcon={HeartPulse}
          title={isCardiologist ? "Cardiologist dashboard" : "Patients"}
          description={
            isCardiologist
              ? "Every patient's latest blood pressure, score and open alerts. Open a patient to read all of their logs and leave guidance for the dietitians and physical therapists."
              : "Open a patient to read the cardiologist's guidance and talk with the rest of the care team."
          }
        />
        <p className="text-[13px] text-ds-slate -mt-3 mb-5">
          Names, phone numbers and emails are hidden. HeartLink supports healthy habits; its score is not a diagnosis.
        </p>

        <div className={UI.kpi.grid}>
          <KpiCard label="Patients" value={items ? counts.all : "–"} icon={Users} />
          <KpiCard label="With open alerts" value={items ? counts.alerts : "–"} icon={AlertTriangle} iconBg="bg-ds-rose" iconColor="text-ds-charcoal" iconBorder="border-ds-rose" />
          <KpiCard label="High or low last BP" value={items ? counts.bp : "–"} icon={HeartPulse} iconBg="bg-ds-yellow" iconColor="text-ds-warm-text" iconBorder="border-ds-yellow" />
        </div>

        <div className={UI.card.root}>
          <div className={UI.card.header}>
            <div role="group" aria-label="Filter patients" className="flex flex-wrap gap-2">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`min-h-[36px] px-3.5 rounded-full text-[12.5px] font-semibold border transition-colors cursor-pointer ${
                    filter === key ? "bg-ds-ink text-white border-ds-ink" : "bg-ds-canvas text-ds-ink border-ds-hairline hover:border-ds-steel"
                  }`}
                >
                  {label} ({counts[key]})
                </button>
              ))}
            </div>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Find a patient by reference</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-steel" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find USR-…" className={UI.input.search} />
            </label>
          </div>

          <div className={UI.table.container}>
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead className={UI.table.thead}>
                <tr>
                  <th scope="col" className={UI.table.th}>Patient</th>
                  <th scope="col" className={UI.table.th}>Latest blood pressure</th>
                  <th scope="col" className={UI.table.th}>Score</th>
                  <th scope="col" className={UI.table.th}>Open alerts</th>
                  <th scope="col" className={UI.table.th}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className={UI.table.tbody}>
                {items === null ? (
                  [0, 1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={5} className={UI.table.td}><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-5 text-center text-[14px] text-ds-slate">
                      {error || (rows.length ? "No patients match this filter." : "No patients yet.")}
                    </td>
                  </tr>
                ) : (
                  shown.map((p) => (
                    <tr
                      key={p.id}
                      className={UI.table.trClickable}
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <td className={UI.table.td}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${p.id}`);
                          }}
                          className="text-[14px] font-semibold text-ds-ink hover:underline cursor-pointer whitespace-nowrap"
                        >
                          {p.ref}
                        </button>
                        {p.account_status !== "active" && <span className="ml-2 text-[12px] text-ds-steel capitalize">{p.account_status}</span>}
                      </td>
                      <td className={UI.table.td}>
                        {p.latest_bp ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-ds-ink tabular-nums">
                              {p.latest_bp.systolic}/{p.latest_bp.diastolic}
                            </span>
                            <span className={`${TAG} ${p.band.className}`}>{p.band.label}</span>
                            <span className="text-[12px] text-ds-steel">{formatNoteTime(p.latest_bp.logged_at)}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-ds-steel">No reading yet</span>
                        )}
                      </td>
                      <td className={UI.table.td}>
                        {p.score != null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-ds-ink tabular-nums">{p.score}</span>
                            {p.tier && <span className={`${TAG} ${tierClass(p.tier)}`}>{p.tier}</span>}
                          </div>
                        ) : (
                          <span className="text-[13px] text-ds-steel">No score yet</span>
                        )}
                      </td>
                      <td className={UI.table.td}>
                        {p.open_alerts > 0 ? (
                          <span className={`${TAG} bg-ds-rose text-ds-ink`}>{p.open_alerts} open</span>
                        ) : (
                          <span className="text-[13px] text-ds-steel">None</span>
                        )}
                      </td>
                      <td className={`${UI.table.td} text-right`}>
                        <ChevronRight size={16} className="inline text-ds-steel" aria-hidden="true" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
