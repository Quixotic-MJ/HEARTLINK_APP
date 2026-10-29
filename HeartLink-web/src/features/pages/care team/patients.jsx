import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronRight,
  HeartPulse,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import LoadError from "../../../components/ui/LoadError";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useAuth } from "../../../contexts/useAuth";
import { formatUserRef } from "../../../utils/formatUserRef";
import { TAG, bpBand, tierClass, tierDotClass } from "../../../components/care/vitals";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("search");
  const [seenSearchParam, setSeenSearchParam] = useState(null);
  if (searchParam !== seenSearchParam) {
    setSeenSearchParam(searchParam);
    if (searchParam !== null) {
      setQuery(searchParam);
    }
  }

  // null while loading; an empty list if the load failed
  const patients = useApiQuery("/api/admin/patients", {
    select: (d) => (Array.isArray(d) ? d : []),
  });
  const loading = patients.isPending;
  const items = patients.isError ? NO_PATIENTS : patients.data ?? null;

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
    .filter((r) =>
      filter === "alerts" ? r.open_alerts > 0 : filter === "bp" ? r.band?.attention : true
    )
    .filter((r) => !needle || r.ref.includes(needle));

  const clearSearch = () => {
    setQuery("");
    if (searchParams.has("search")) {
      setSearchParams({});
    }
  };

  const resetFilters = () => {
    setFilter("all");
    clearSearch();
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <ShieldCheck size={13.5} className="text-cal-ink" />
              <span>Care team · Anonymized patient roster</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              {isCardiologist ? "Cardiologist dashboard" : "Patients"}
            </h2>
            <p className="mt-1.5 max-w-[66ch] text-[14px] leading-[1.5] text-cal-muted">
              {isCardiologist
                ? "Every patient's latest blood pressure, score, and open alerts. Open a patient to read all of their logs and leave guidance for the dietitians and physical therapists."
                : "Open a patient to read the cardiologist's guidance and coordinate in the shared care-team thread."}
            </p>
          </div>
        </div>

        {/* ─── 2. CLINICAL GOVERNANCE & PRIVACY BAR (HL-039) ────────────────── */}
        <div className="flex items-center gap-3 rounded-[12px] border border-cal-hairline bg-cal-canvas px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cal-surface-card text-cal-ink">
            <Stethoscope size={16} strokeWidth={1.9} />
          </div>
          <p className="text-[13.5px] font-medium text-cal-body">
            Names, phone numbers, and emails are hidden. HeartLink supports healthy habits; its score is not a diagnosis.
          </p>
        </div>

        {/* ─── 3. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">Patients</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Users size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : counts.all}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Anonymized care-team profiles</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">With open alerts</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
                <AlertTriangle size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div
              className={`mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none ${
                !loading && counts.alerts > 0 ? "text-cal-error" : "text-cal-ink"
              }`}
            >
              {loading ? "—" : counts.alerts}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Flagged telemetry under review</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">High or low last BP</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                <HeartPulse size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : counts.bp}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              At or above 140/90, or below 90/60 mmHg
            </div>
          </div>
        </div>

        {/* ─── 4. PATIENT ROSTER CARD ───────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Toolbar: Cal.com Nav-Pill-Group + Hairline Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5">
            <div
              role="group"
              aria-label="Filter patients"
              className="inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
            >
              {FILTERS.map(([key, label]) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(key)}
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
                      {loading ? "—" : counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <label htmlFor="patient-ref-search" className="sr-only">
                Find a patient by reference
              </label>
              <Search
                size={14.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cal-muted"
                aria-hidden="true"
              />
              <input
                id="patient-ref-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find USR-…"
                className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 font-cal-mono text-[13px] text-cal-ink placeholder:font-cal-sans placeholder:text-cal-muted focus:border-cal-ink focus:outline-none transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                <tr>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Patient
                  </th>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Latest blood pressure
                  </th>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Score
                  </th>
                  <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                    Open alerts
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right text-[12px] font-medium text-cal-muted"
                  >
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cal-hairline">
                {loading ? (
                  [0, 1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-5 py-4">
                        <Skeleton className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60" />
                      </td>
                    </tr>
                  ))
                ) : patients.isError ? (
                  <tr>
                    <td colSpan={5}>
                      <LoadError what="patients" onRetry={patients.refetch} className="py-12" />
                    </td>
                  </tr>
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <p className="text-[14px] font-semibold text-cal-ink">
                        {rows.length === 0
                          ? "No patients yet"
                          : needle
                            ? `No patient matches ${needle}`
                            : "No patients match this filter"}
                      </p>
                      <p className="mt-1 text-[13px] text-cal-muted">
                        {rows.length === 0
                          ? "Anonymized patient profiles will appear here once mobile accounts register."
                          : "Try switching back to All or clearing the reference search."}
                      </p>
                      {rows.length > 0 && (filter !== "all" || needle) && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-4 inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                        >
                          Reset filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  shown.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="group hover:bg-cal-surface-soft/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft font-cal-mono text-[11px] font-semibold text-cal-ink">
                            {p.ref.slice(-2)}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/patients/${p.id}`);
                              }}
                              className="font-cal-mono text-[13.5px] font-semibold text-cal-ink group-hover:underline cursor-pointer whitespace-nowrap"
                            >
                              {p.ref}
                            </button>
                            {p.account_status && p.account_status !== "active" && (
                              <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-card px-2 py-0.5 text-[11px] font-medium capitalize text-cal-muted">
                                {p.account_status}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {p.latest_bp ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-cal-mono text-[14px] font-semibold tabular-nums text-cal-ink">
                              {p.latest_bp.systolic}/{p.latest_bp.diastolic}
                            </span>
                            {p.band && (
                              <span className={`${TAG} ${p.band.className}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${p.band.dotClass}`} />
                                <span>{p.band.label}</span>
                              </span>
                            )}
                            <span className="font-cal-mono text-[11.5px] text-cal-muted">
                              {formatNoteTime(p.latest_bp.logged_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-cal-muted">No reading yet</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {p.score != null ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-cal-mono text-[14px] font-semibold tabular-nums text-cal-ink">
                              {p.score}
                            </span>
                            {p.tier && (
                              <span className={`${TAG} ${tierClass(p.tier)}`}>
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${tierDotClass(p.tier)}`}
                                />
                                <span>{p.tier}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px] text-cal-muted">No score yet</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {p.open_alerts > 0 ? (
                          <span
                            className={`${TAG} border-cal-error/25 bg-cal-error/10 text-cal-ink`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-cal-error" />
                            <span className="font-cal-mono tabular-nums">{p.open_alerts}</span>
                            <span>open</span>
                          </span>
                        ) : (
                          <span className="text-[13px] text-cal-muted">None</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-2.5 py-1 text-[12.5px] font-semibold text-cal-ink group-hover:border-cal-primary group-hover:bg-cal-primary group-hover:text-cal-on-primary transition-colors">
                          <span>Open</span>
                          <ChevronRight size={14} aria-hidden="true" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
