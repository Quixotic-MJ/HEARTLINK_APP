import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Download,
  Dumbbell,
  FileSpreadsheet,
  Headset,
  Loader2,
  Megaphone,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { downloadCsv, toCsv } from "../../../utils/csv";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "case", label: "Case reviews" },
  { value: "user", label: "Users" },
  { value: "staff", label: "Staff" },
  { value: "recipe", label: "Recipes" },
  { value: "exercise", label: "Exercises" },
  { value: "broadcast", label: "Announcements" },
  { value: "feedback", label: "Feedback" },
  { value: "premium", label: "Premium settings" },
  { value: "dataset", label: "Datasets" },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_OPTIONS.map((opt) => [opt.value, opt.label])
);

function EventTypeBadge({ type }) {
  const key = type ? type.toLowerCase() : "";

  switch (key) {
    case "case":
      return (
        <span
          className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}
        >
          <Activity size={11} className="text-cal-error" aria-hidden="true" />
          <span>Case review</span>
        </span>
      );
    case "staff":
      return (
        <span
          className={`${PILL} border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink`}
        >
          <Shield
            size={11}
            className="text-cal-badge-violet"
            aria-hidden="true"
          />
          <span>Staff</span>
        </span>
      );
    case "user":
      return (
        <span
          className={`${PILL} border-cal-brand-accent/25 bg-cal-brand-accent/10 text-cal-ink`}
        >
          <Users
            size={11}
            className="text-cal-brand-accent"
            aria-hidden="true"
          />
          <span>User</span>
        </span>
      );
    case "recipe":
      return (
        <span
          className={`${PILL} border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink`}
        >
          <Utensils size={11} className="text-cal-success" aria-hidden="true" />
          <span>Recipe</span>
        </span>
      );
    case "exercise":
      return (
        <span
          className={`${PILL} border-cal-badge-orange/35 bg-cal-badge-orange/15 text-cal-ink`}
        >
          <Dumbbell
            size={11}
            className="text-cal-badge-orange"
            aria-hidden="true"
          />
          <span>Exercise</span>
        </span>
      );
    case "feedback":
      return (
        <span
          className={`${PILL} border-cal-badge-pink/30 bg-cal-badge-pink/15 text-cal-ink`}
        >
          <Headset
            size={11}
            className="text-cal-badge-pink"
            aria-hidden="true"
          />
          <span>Feedback</span>
        </span>
      );
    case "broadcast":
      return (
        <span
          className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}
        >
          <Megaphone
            size={11}
            className="text-cal-warning"
            aria-hidden="true"
          />
          <span>Announcement</span>
        </span>
      );
    case "premium":
      return (
        <span
          className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}
        >
          <Crown size={11} className="text-cal-warning" aria-hidden="true" />
          <span>Premium</span>
        </span>
      );
    case "dataset":
      return (
        <span
          className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}
        >
          <FileSpreadsheet
            size={11}
            className="text-cal-muted"
            aria-hidden="true"
          />
          <span>Dataset</span>
        </span>
      );
    default:
      return (
        <span
          className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}
        >
          <Activity size={11} className="text-cal-muted" aria-hidden="true" />
          <span>General</span>
        </span>
      );
  }
}

function formatTimestamp(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function formatShortDate(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDetails(log) {
  const actionStr = log.action
    ? log.action.charAt(0).toUpperCase() + log.action.slice(1)
    : "";
  const typeStr = log.target_type || "";
  const nameStr = log.target_name || log.target_id || "";
  if (nameStr) {
    return `${actionStr} ${typeStr}: ${nameStr}`.trim();
  }
  return `${actionStr} ${typeStr}`.trim() || "Recorded administrative event";
}

const ActivityLog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Debounce search query to reduce API hits
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleFilterChange = (e) => {
    setEventTypeFilter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setEventTypeFilter("all");
    setPage(1);
  };

  // Log events for this page, search and filter; the last page stays on screen while the next one loads
  let activityUrl = `/api/admin/activity?page=${page}&page_size=${pageSize}`;
  if (debouncedSearch && debouncedSearch.trim()) {
    activityUrl += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
  }
  if (eventTypeFilter && eventTypeFilter !== "all") {
    activityUrl += `&target_type=${eventTypeFilter}`;
  }

  const {
    data,
    isFetching: loading,
    isPending,
    isError,
    error,
    refetch,
  } = useApiQuery(activityUrl, { keepPrevious: true });

  const logs = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 0;
  const accessDenied = isError && error?.status === 403;
  const fetchError = isError && !accessDenied;

  // HL-080: every entry matching the current search and type, as a spreadsheet file
  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (eventTypeFilter !== "all") params.set("target_type", eventTypeFilter);
      const query = params.toString();
      const file = await apiFetch(
        `/api/admin/activity/export${query ? `?${query}` : ""}`
      );
      const csv = toCsv(file.items || [], [
        { label: "When", value: (r) => formatTimestamp(r.created_at) },
        { label: "Admin", value: (r) => r.admin_name },
        { label: "Action", value: (r) => r.action },
        { label: "Type", value: (r) => r.target_type },
        { label: "Target", value: (r) => r.target_name },
        { label: "Target ID", value: (r) => r.target_id },
      ]);
      downloadCsv(
        `heartlink-activity-log-${file.generated_at.slice(0, 10)}.csv`,
        csv
      );
      toast.success(
        `Exported ${file.count} log ${file.count === 1 ? "entry" : "entries"}.`
      );
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't export the activity log.");
    } finally {
      setExporting(false);
    }
  };

  if (accessDenied) {
    return (
      <AdminLayout>
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-center py-16 font-cal-sans text-cal-ink">
          <div className="flex max-w-md flex-col items-center rounded-[12px] border border-cal-hairline bg-cal-canvas px-8 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
              <Shield size={22} aria-hidden="true" />
            </div>
            <h2 className="font-cal-display text-[22px] font-semibold tracking-[-0.5px] text-cal-ink">
              Access restricted
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-cal-muted">
              You do not have permission to view the system activity audit log.
              Only authorized system administrators can inspect audit records.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const showSkeleton = (isPending || loading) && logs.length === 0 && !fetchError;
  const isEmpty = !loading && !fetchError && logs.length === 0;
  const isSearchOrFilterApplied =
    debouncedSearch.trim() !== "" || eventTypeFilter !== "all";

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const latestEntry = logs[0] || null;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <Activity size={13.5} className="text-cal-ink" />
              <span>System &amp; compliance · Immutable audit trail</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              System activity audit log
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Immutable clinical and administrative audit trail of platform
              actions, content approvals, and account changes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={14.5}
                className={loading ? "animate-spin text-cal-muted" : "text-cal-muted"}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting || total === 0}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={15} aria-hidden="true" />
              )}
              <span>{exporting ? "Exporting…" : "Export audit CSV"}</span>
            </button>
          </div>
        </div>

        {/* ─── 2. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                {isSearchOrFilterApplied ? "Matching events" : "Total audit events"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Activity size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {showSkeleton ? "—" : total.toLocaleString()}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              {isSearchOrFilterApplied
                ? "Filtered clinical & admin entries"
                : "Recorded across all modules"}
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Viewing window
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <FileSpreadsheet size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {showSkeleton
                ? "—"
                : total === 0
                ? "0"
                : `${rangeStart}–${rangeEnd}`}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              {totalPages > 0
                ? `Page ${page} of ${totalPages} (${pageSize} per page)`
                : `${pageSize} entries per page`}
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Category scope
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink">
                <Shield size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 truncate font-cal-display text-[24px] sm:text-[26px] font-semibold tracking-[-0.5px] leading-none text-cal-ink">
              {CATEGORY_LABELS[eventTypeFilter] || "All categories"}
            </div>
            <div className="mt-2 truncate text-[12px] text-cal-muted">
              {debouncedSearch.trim()
                ? `Keyword: "${debouncedSearch.trim()}"`
                : "All keywords included"}
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Latest visible entry
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                <Clock size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {showSkeleton
                ? "—"
                : latestEntry
                ? formatShortDate(latestEntry.created_at)
                : "—"}
            </div>
            <div className="mt-2 truncate text-[12px] text-cal-muted">
              {latestEntry
                ? `By ${latestEntry.admin_name || latestEntry.admin_user_id || "System"}`
                : "Immutable append-only log"}
            </div>
          </div>
        </div>

        {/* ─── 3. MAIN AUDIT LOG CARD ───────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
              />
              <input
                type="text"
                aria-label="Search audit log"
                placeholder="Search by admin name or target…"
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-cal-muted hover:text-cal-ink cursor-pointer"
                >
                  <X size={13.5} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <select
                  aria-label="Filter by event category"
                  value={eventTypeFilter}
                  onChange={handleFilterChange}
                  className="h-9 appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3.5 pr-9 text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft focus:border-cal-ink focus:outline-none transition-colors cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {isSearchOrFilterApplied && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} className="text-cal-muted" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Category
                  </th>
                  <th className="w-[42%] px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Activity details
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Actor
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Status
                  </th>
                </tr>
              </thead>

              {showSkeleton ? (
                <tbody className="divide-y divide-cal-hairline">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3.5 sm:px-5 align-middle">
                        <Skeleton className="h-4 w-36 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 align-middle">
                        <Skeleton className="h-5 w-24 rounded-full bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 align-middle">
                        <Skeleton className="mb-1.5 h-4 w-64 rounded bg-cal-surface-card" />
                        <Skeleton className="h-3 w-36 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 align-middle">
                        <Skeleton className="h-6 w-28 rounded-full bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right align-middle">
                        <Skeleton className="ml-auto h-5 w-20 rounded-full bg-cal-surface-card" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : logs.length > 0 ? (
                <tbody
                  className={`divide-y divide-cal-hairline transition-opacity ${
                    loading ? "opacity-60" : "opacity-100"
                  }`}
                >
                  {logs.map((log) => {
                    const showTargetId =
                      Boolean(log.target_id) &&
                      log.target_id !== log.target_name;

                    return (
                      <tr
                        key={log.id}
                        className="transition-colors hover:bg-cal-surface-soft/70"
                      >
                        <td className="px-4 py-3.5 sm:px-5 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-cal-mono text-[12.5px] tabular-nums text-cal-muted">
                            <Clock size={12.5} aria-hidden="true" />
                            <span>{formatTimestamp(log.created_at)}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <EventTypeBadge type={log.target_type} />
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="max-w-[460px]">
                            <p className="text-[13.5px] font-semibold leading-snug text-cal-ink">
                              {formatDetails(log)}
                            </p>
                            {showTargetId && (
                              <p className="mt-0.5 truncate font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                                Ref: {log.target_id}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-1 text-[12px] font-semibold text-cal-ink">
                            <Shield
                              size={11.5}
                              className="text-cal-muted"
                              aria-hidden="true"
                            />
                            <span className="max-w-[180px] truncate">
                              {log.admin_name || log.admin_user_id || "System"}
                            </span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 text-right align-middle">
                          <span
                            className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
                          >
                            <CheckCircle2
                              size={11}
                              className="text-cal-success"
                              aria-hidden="true"
                            />
                            <span>Logged</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : null}
            </table>

            {/* Error & Empty States */}
            {fetchError && logs.length === 0 && (
              <div className="border-t border-cal-hairline px-6 py-10">
                <LoadError
                  what="activity logs"
                  onRetry={refetch}
                  className="py-2"
                />
              </div>
            )}

            {fetchError && logs.length > 0 && (
              <div className="border-t border-cal-hairline bg-cal-error/5 px-5 py-3">
                <LoadError
                  what="the latest activity page"
                  onRetry={refetch}
                  className="py-1"
                />
              </div>
            )}

            {isEmpty && (
              <div className="flex flex-col items-center justify-center gap-2.5 border-t border-cal-hairline px-6 py-14 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                  <Activity size={18} aria-hidden="true" />
                </div>
                {isSearchOrFilterApplied ? (
                  <>
                    <p className="text-[14px] font-semibold text-cal-ink">
                      No audit events match your filters
                    </p>
                    <p className="max-w-sm text-[13px] text-cal-muted">
                      Try clearing your search keyword or switching back to all
                      categories.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13.5} />
                      <span>Reset filters</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-cal-ink">
                      No administrative activity recorded yet
                    </p>
                    <p className="max-w-sm text-[13px] text-cal-muted">
                      Clinical reviews, library updates, and account changes
                      will appear here automatically.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col justify-between gap-3 border-t border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
            <p className="text-[12.5px] text-cal-muted">
              {total === 0 ? (
                "Showing 0 of 0 events"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                    {rangeStart}–{rangeEnd}
                  </span>{" "}
                  of{" "}
                  <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                    {total.toLocaleString()}
                  </span>{" "}
                  events
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              {totalPages > 0 && (
                <span className="mr-1 font-cal-mono text-[12px] tabular-nums text-cal-muted">
                  Page {page} / {totalPages}
                </span>
              )}

              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page >= totalPages || loading}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default ActivityLog;
