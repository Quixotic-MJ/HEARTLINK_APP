import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import { Skeleton } from "../ui/Skeleton";
import LoadError from "../ui/LoadError";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

const STATUS_TABS = [
  ["all", "All"],
  ["active", "Active"],
  ["disabled", "Disabled"],
  ["premium", "Premium"],
  ["free", "Free plan"],
];

// HL-084: the patient's plan; Premium shows its end date on hover
const getPlanBadge = (user) =>
  user.isPremium ? (
    <span
      title={
        user.premiumUntil
          ? `Premium until ${new Date(user.premiumUntil).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`
          : undefined
      }
      className={`${PILL} border-cal-badge-orange/35 bg-cal-badge-orange/15 text-cal-ink`}
    >
      <Crown size={11.5} className="text-cal-ink" />
      <span>{user.premiumSource === "trial" ? "Trial" : "Premium"}</span>
    </span>
  ) : (
    <span className="text-[13px] text-cal-muted">Free</span>
  );

const getStatusBadge = (status) => {
  if (status === "Active" || status === "active") {
    return (
      <span className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}>
        <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
        <span>Active</span>
      </span>
    );
  }
  return (
    <span className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}>
      <span className="h-1.5 w-1.5 rounded-full bg-cal-error" />
      <span>Disabled</span>
    </span>
  );
};

const getHssBadge = (score) => {
  if (score === null || score === undefined) {
    return <span className="text-[13px] text-cal-muted">N/A</span>;
  }

  let standardTier;
  let tone;
  let dot;

  if (score >= 80) {
    standardTier = "Stable";
    tone = "border-cal-success/25 bg-cal-success/10 text-cal-ink";
    dot = "bg-cal-success";
  } else if (score >= 60) {
    standardTier = "Moderate";
    tone = "border-cal-warning/35 bg-cal-warning/15 text-cal-ink";
    dot = "bg-cal-warning";
  } else if (score >= 50) {
    standardTier = "Elevated Risk";
    tone = "border-cal-error/25 bg-cal-error/10 text-cal-ink";
    dot = "bg-cal-error";
  } else {
    standardTier = "Critical";
    tone = "border-cal-error/25 bg-cal-error/10 text-cal-ink";
    dot = "bg-cal-error";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-cal-mono text-[13.5px] font-semibold tabular-nums text-cal-ink">
        {score}
      </span>
      <span className={`${PILL} ${tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span>{standardTier}</span>
      </span>
    </div>
  );
};

const getActivityBadge = (activity) => {
  if (activity === "Recently Active") {
    return (
      <span className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}>
        <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
        <span>Active</span>
      </span>
    );
  }
  if (activity === "Inactive") {
    return (
      <span className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}>
        <span className="h-1.5 w-1.5 rounded-full bg-cal-warning" />
        <span>Inactive</span>
      </span>
    );
  }
  if (activity === "Sparse Data" || activity === "Sparse") {
    return (
      <span className={`${PILL} border-cal-badge-violet/30 bg-cal-badge-violet/10 text-cal-ink`}>
        <span className="h-1.5 w-1.5 rounded-full bg-cal-badge-violet" />
        <span>Sparse</span>
      </span>
    );
  }
  return (
    <span className={`${PILL} border-cal-hairline bg-cal-surface-card text-cal-muted`}>
      <span>New</span>
    </span>
  );
};

const getOnboardingBadge = (status) => {
  if (status === "Complete" || status === "complete") {
    return (
      <span className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}>
        <CheckCircle2 size={11.5} className="text-cal-success" />
        <span>Done</span>
      </span>
    );
  }
  return (
    <span className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}>
      <span>Pending</span>
    </span>
  );
};

const getReviewBadge = (status) => {
  if (status === "Evaluated") {
    return (
      <span className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}>
        <ShieldCheck size={11.5} className="text-cal-success" />
        <span>Evaluated</span>
      </span>
    );
  }
  return (
    <span className={`${PILL} border-cal-hairline bg-cal-surface-card text-cal-muted`}>
      <span>Pending</span>
    </span>
  );
};

const UserListView = ({
  users,
  allUsers,
  searchQuery,
  onSearchChange,
  onClearSearch,
  filterStatus,
  onFilterChange,
  onOpenUser,
  loading,
  error = false,
  onRetry,
}) => {
  const pool = allUsers || users;
  const totalUsers = pool.length;
  const activeUsers = pool.filter(
    (u) => u.status === "Active" || u.status === "active"
  ).length;
  const elevatedRisk = pool.filter(
    (u) => u.hssScore !== null && u.hssScore !== undefined && u.hssScore < 60
  ).length;
  const evaluated = pool.filter((u) => u.reviewStatus === "Evaluated").length;

  const tabCounts = {
    all: pool.length,
    active: activeUsers,
    disabled: pool.filter((u) => (u.status || "").toLowerCase() === "disabled").length,
    premium: pool.filter((u) => u.isPremium).length,
    free: pool.filter((u) => !u.isPremium).length,
  };

  const clearSearch = () => {
    if (onClearSearch) {
      onClearSearch();
    } else {
      onSearchChange("");
    }
  };

  const resetAll = () => {
    onFilterChange("all");
    clearSearch();
  };

  return (
    <div className="space-y-6 font-cal-sans text-cal-ink">
      {/* ── 1. KPI METRICS STRIP ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Total patients</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <Users size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : totalUsers}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Registered mobile accounts</div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Active accounts</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
              <CheckCircle2 size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : activeUsers}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Enabled sign-in access</div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Elevated risk</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
              <AlertCircle size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div
            className={`mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none ${
              !loading && elevatedRisk > 0 ? "text-cal-error" : "text-cal-ink"
            }`}
          >
            {loading ? "—" : elevatedRisk}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">HSS score under 60</div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Evaluated</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <ShieldCheck size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : evaluated}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Completed clinical review</div>
        </div>
      </div>

      {/* ── 2. USERS DIRECTORY TABLE CARD ───────────────────────────────── */}
      <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Toolbar: Nav-Pill-Group + Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5">
          <div
            role="group"
            aria-label="Filter patient accounts"
            className="relative inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
          >
            {STATUS_TABS.map(([key, label]) => {
              const active = filterStatus === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilterChange(key)}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                    active
                      ? "text-white font-semibold"
                      : "text-cal-muted hover:text-cal-ink"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="user-status-filter-tab"
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
                    {loading ? "—" : tabCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <label htmlFor="user-directory-search" className="sr-only">
              Search user accounts
            </label>
            <Search
              size={14.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cal-muted"
            />
            <input
              id="user-directory-search"
              type="text"
              placeholder="Search by ID, name, or phone…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13px] text-cal-ink placeholder:text-cal-muted focus:border-cal-ink focus:outline-none transition-colors"
            />
            {searchQuery && (
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

        {/* Users Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <thead className="border-b border-cal-hairline bg-cal-surface-soft">
              <tr>
                <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                  Patient
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  User ID
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  HSS score
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Activity
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Account
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Plan
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Onboarding
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Review
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-right text-[12px] font-medium text-cal-muted"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal-hairline">
              {loading ? (
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={item}>
                    <td colSpan={9} className="px-5 py-4">
                      <Skeleton className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={9}>
                    <LoadError what="user accounts" onRetry={onRetry} className="py-12" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <p className="text-[14px] font-semibold text-cal-ink">
                      {pool.length === 0
                        ? "No user accounts registered yet"
                        : "No user accounts match these filters"}
                    </p>
                    <p className="mt-1 text-[13px] text-cal-muted">
                      {pool.length === 0
                        ? "Patient mobile registrations will appear here automatically."
                        : "Try clearing the search query or switching back to All."}
                    </p>
                    {pool.length > 0 && (filterStatus !== "all" || searchQuery) && (
                      <button
                        type="button"
                        onClick={resetAll}
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => onOpenUser(u)}
                    className="group hover:bg-cal-surface-soft/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-[12px] font-semibold text-cal-ink">
                          {(u.name?.charAt(0) || "P").toUpperCase()}
                        </span>
                        <span className="text-[13.5px] font-semibold text-cal-ink group-hover:underline">
                          {u.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center rounded-[6px] border border-cal-hairline bg-cal-surface-soft px-2 py-0.5 font-cal-mono text-[12px] font-semibold text-cal-ink">
                        {formatUserRef(u.id)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      {getHssBadge(u.hssScore, u.hssTier)}
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      {getActivityBadge(u.activityStatus)}
                    </td>

                    <td className="px-4 py-3.5 align-middle">{getStatusBadge(u.status)}</td>

                    <td className="px-4 py-3.5 align-middle">{getPlanBadge(u)}</td>

                    <td className="px-4 py-3.5 align-middle">
                      {getOnboardingBadge(u.onboardingStatus)}
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      {getReviewBadge(u.reviewStatus)}
                    </td>

                    <td
                      className="px-5 py-3.5 text-right align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenUser(u)}
                        className="inline-flex items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-1.5 text-[12.5px] font-semibold text-cal-ink group-hover:border-cal-primary group-hover:bg-cal-primary group-hover:text-cal-on-primary hover:border-cal-primary hover:bg-cal-primary hover:text-cal-on-primary transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default UserListView;
