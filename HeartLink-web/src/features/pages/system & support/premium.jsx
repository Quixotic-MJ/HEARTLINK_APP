import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Crown,
  Gift,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useApiQuery } from "../../../hooks/useApiQuery";

// Demo history is bounded; recorded amounts are not revenue or payment receipts.

const peso = (n) =>
  n == null ? "Not recorded" : `₱${Number(n).toLocaleString("en-PH")}`;

const dateLabel = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const PERIOD_WORDS = { monthly: "1 month", yearly: "1 year" };

const EVENT_FILTERS = [
  ["all", "All activity"],
  ["checkout", "Demo checkouts"],
  ["trial_started", "Trials"],
  ["admin", "Admin changes"],
];

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

function describeEvent(e) {
  switch (e.kind) {
    case "trial_started":
      return "Started the free trial";
    case "checkout":
      return `Recorded demo amount ${peso(e.amount_php)} for ${
        PERIOD_WORDS[e.period] || e.period
      } (${e.method === "gcash" ? "GCash simulation" : e.method === "card" ? "card simulation" : "method not recorded"}; no charge)`;
    case "admin_granted":
      return `Given Premium${e.actor_name ? ` by ${e.actor_name}` : ""}`;
    case "admin_removed":
      return `Premium removed${e.actor_name ? ` by ${e.actor_name}` : ""}`;
    default:
      return e.kind;
  }
}

function getEventBadge(kind) {
  switch (kind) {
    case "checkout":
      return {
        label: "Test payment",
        tone: "border-cal-success/25 bg-cal-success/10 text-cal-ink",
        dot: "bg-cal-success",
      };
    case "trial_started":
      return {
        label: "Free trial",
        tone: "border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink",
        dot: "bg-cal-badge-violet",
      };
    case "admin_granted":
      return {
        label: "Granted",
        tone: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
        dot: "bg-cal-warning",
      };
    case "admin_removed":
      return {
        label: "Removed",
        tone: "border-cal-hairline bg-cal-surface-card text-cal-muted",
        dot: "bg-cal-muted",
      };
    default:
      return {
        label: kind,
        tone: "border-cal-hairline bg-cal-surface-soft text-cal-ink",
        dot: "bg-cal-muted",
      };
  }
}

function PlanConfiguration({ config, basis }) {
  return (
    <section className="rounded-xl border border-cal-hairline bg-cal-canvas p-5">
      <h3 className="text-base font-semibold text-cal-ink">
        Demo plan configuration
      </h3>
      <p className="mt-1 text-sm text-cal-muted">
        Read-only reference. No real money is charged and this page cannot
        change prices or sign-up settings.
      </p>
      <p className="mt-2 text-xs text-cal-muted">
        {basis === "stored"
          ? "Configuration basis: stored values."
          : basis === "default"
            ? "Configuration basis: fallback defaults; no stored configuration row was found."
            : "Configuration basis: not verified."}
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-cal-muted">Monthly demo amount</dt>
          <dd className="mt-1 font-semibold">
            {peso(config.monthly_price_php)}
          </dd>
        </div>
        <div>
          <dt className="text-cal-muted">Yearly demo amount</dt>
          <dd className="mt-1 font-semibold">
            {peso(config.yearly_price_php)}
          </dd>
        </div>
        <div>
          <dt className="text-cal-muted">Configured trial</dt>
          <dd className="mt-1 font-semibold">{config.trial_days} days</dd>
        </div>
        <div>
          <dt className="text-cal-muted">Demo sign-ups</dt>
          <dd className="mt-1 font-semibold">
            {config.checkout_enabled ? "Enabled" : "Paused"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ChangesTable({ events = [] }) {
  const [filterKind, setFilterKind] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: events.length,
      checkout: events.filter((e) => e.kind === "checkout").length,
      trial_started: events.filter((e) => e.kind === "trial_started").length,
      admin: events.filter(
        (e) => e.kind === "admin_granted" || e.kind === "admin_removed",
      ).length,
    }),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      const matchesKind =
        filterKind === "all" ||
        (filterKind === "admin"
          ? e.kind === "admin_granted" || e.kind === "admin_removed"
          : e.kind === filterKind);
      const matchesSearch =
        !q ||
        (e.user_name || "").toLowerCase().includes(q) ||
        (e.actor_name || "").toLowerCase().includes(q) ||
        describeEvent(e).toLowerCase().includes(q);
      return matchesKind && matchesSearch;
    });
  }, [events, filterKind, searchQuery]);

  return (
    <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="space-y-3 border-b border-cal-hairline px-4 py-4 sm:px-5">
        <div>
          <h3 className="text-[15px] font-semibold text-cal-ink">
            Recent changes
          </h3>
          <p className="mt-0.5 text-[12.5px] text-cal-muted">
            Latest returned trial, demo-checkout and Admin-access records only;
            filters apply to this window, not all account history. Dates use
            Asia/Manila.
          </p>
        </div>

        {events.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 select-none">
            <div
              role="group"
              aria-label="Filter Premium activity"
              className="relative inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1 select-none"
            >
              {EVENT_FILTERS.map(([key, label]) => {
                const active = filterKind === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterKind(key)}
                    className={`group relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="premium-filter-active-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                    <span
                      className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums rounded-full px-1.5 py-0.5 transition-colors ${
                        active
                          ? "bg-white/20 text-white font-medium border border-white/20"
                          : "bg-cal-surface-card text-cal-muted-soft"
                      }`}
                    >
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
              />
              <input
                type="text"
                aria-label="Search Premium activity"
                placeholder="Search account or event…"
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
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
            <Crown size={18} />
          </div>
          <p className="text-[14px] font-semibold text-cal-ink">
            No Premium activity yet
          </p>
          <p className="max-w-sm text-[13px] text-cal-muted">
            Recorded trials, demo checkouts, and admin grants will appear here.
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <p className="text-[14px] font-semibold text-cal-ink">
            No activity matches your filter
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterKind("all");
              setSearchQuery("");
            }}
            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
          >
            <RotateCcw size={13.5} />
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Premium activity table"
          tabIndex={0}
          className="w-full overflow-x-auto"
        >
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  When
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  App account
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  What happened
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  Premium until
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal-hairline">
              {filteredEvents.map((e) => {
                const badge = getEventBadge(e.kind);
                return (
                  <tr
                    key={e.id || `${e.user_id}-${e.created_at}`}
                    className="transition-colors hover:bg-cal-surface-soft/70"
                  >
                    <td className="px-4 py-3.5 sm:px-5 align-middle font-cal-mono text-[12.5px] tabular-nums text-cal-muted whitespace-nowrap">
                      {dateLabel(e.created_at)}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 align-middle text-[13.5px] font-semibold text-cal-ink">
                      {e.user_name}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`${PILL} ${badge.tone}`}>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                          />
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[13.5px] text-cal-ink">
                          {describeEvent(e)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 text-right align-middle font-cal-mono text-[12.5px] tabular-nums text-cal-muted whitespace-nowrap">
                      {e.kind === "admin_removed"
                        ? "—"
                        : dateLabel(e.premium_until)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const Premium = () => {
  const overview = useApiQuery("/api/admin/premium");
  const data = overview.data;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <Crown size={13.5} className="text-cal-ink" />
              <span>Operations · Optional Premium access</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              HeartLink Premium
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Read-only demo configuration and recorded optional entitlements.
              Account access is managed separately in Accounts &amp; Staff. This
              is not a payments or revenue dashboard.
            </p>
          </div>

          <Link
            to="/users"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors"
          >
            <Users size={15} className="text-cal-muted" />
            <span>Accounts &amp; Staff</span>
            <ArrowUpRight size={14} className="text-cal-muted" />
          </Link>
        </div>

        {/* ─── 2. BODY: LOADING / ERROR / CONTENT ───────────────────────────── */}
        {overview.isPending ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-28 rounded-[12px] bg-cal-surface-card"
                />
              ))}
            </div>
            <Skeleton className="h-72 rounded-[12px] bg-cal-surface-card" />
            <Skeleton className="h-64 rounded-[12px] bg-cal-surface-card" />
          </div>
        ) : overview.isError || !data ? (
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-8">
            <LoadError what="Premium" onRetry={overview.refetch} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 4-Column KPI Summary Strip */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Premium members
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                    <Crown size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {data.premium_members}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  of{" "}
                  <span className="font-cal-mono font-medium tabular-nums text-cal-ink">
                    {data.patients}
                  </span>{" "}
                  active app accounts
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    On free trial
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink">
                    <Sparkles size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {data.on_trial}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Active trial period
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Given by admins
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                    <Gift size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {data.by_admin}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Complimentary access
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Recorded demo amounts
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                    <Wallet size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {peso(data.demo_revenue_php)}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Latest {data.events_considered} events considered; not revenue
                </div>
              </div>
            </div>

            <PlanConfiguration config={data.config} basis={data.config_basis} />
            <p className="text-sm text-cal-muted">
              Demo history is limited to the latest 5,000 records; this is not
              an all-time total.{" "}
              {data.history_may_be_truncated
                ? "More history may exist."
                : "Only recorded data is included."}
              The table shows at most {data.event_limit} recent entries.
            </p>

            <ChangesTable events={data.events} />

            <div className="flex items-center gap-2.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3 text-[13px] text-cal-muted">
              <ShieldCheck
                size={15.5}
                className="shrink-0 text-cal-success"
                aria-hidden="true"
              />
              <span>
                Premium is optional. It does not certify health safety, medical
                advice or clinical outcomes. Existing personal warning/help
                safeguards are not redesigned by this website work.
              </span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Premium;
