import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ChartColumn,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  ListChecks,
  Moon,
  RotateCw,
  Users,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import LoadError from "../../../components/ui/LoadError";
import { useApiQuery } from "../../../hooks/useApiQuery";

const AVATAR_SURFACES = [
  "bg-cal-badge-violet/15 text-cal-ink",
  "bg-cal-badge-emerald/20 text-cal-ink",
  "bg-cal-badge-orange/20 text-cal-ink",
  "bg-cal-badge-pink/15 text-cal-ink",
];

function getInitials(name) {
  if (!name) return "AD";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AD"
  );
}

function getHssBandMeta(score) {
  const num = Number(score ?? 0);
  if (num >= 80) {
    return { label: "Stable", dotClass: "bg-cal-success" };
  }
  if (num >= 60) {
    return { label: "Moderate", dotClass: "bg-cal-warning" };
  }
  if (num >= 50) {
    return { label: "Elevated", dotClass: "bg-cal-badge-orange" };
  }
  return { label: "Critical", dotClass: "bg-cal-error" };
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans">
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-full bg-cal-surface-strong/70" />
          <Skeleton className="h-8 w-56 rounded-[8px] bg-cal-surface-strong/70" />
          <Skeleton className="h-4 w-96 max-w-full rounded-[6px] bg-cal-surface-strong/60" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-28 rounded-[8px] bg-cal-surface-strong/60" />
          <Skeleton className="h-10 w-36 rounded-[8px] bg-cal-surface-strong/70" />
        </div>
      </div>

      {/* 4-Up KPI Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24 rounded-[6px] bg-cal-surface-strong/60" />
              <Skeleton className="h-9 w-9 rounded-full bg-cal-surface-strong/60" />
            </div>
            <Skeleton className="h-8 w-28 rounded-[6px] bg-cal-surface-strong/70 mb-2" />
            <Skeleton className="h-3.5 w-40 rounded-[6px] bg-cal-surface-strong/50" />
          </div>
        ))}
      </div>

      {/* Quick Workflows Skeleton */}
      <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-6">
        <Skeleton className="h-5 w-36 rounded-[6px] bg-cal-surface-strong/70 mb-4" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[8px] bg-cal-surface-strong/50" />
          ))}
        </div>
      </div>

      {/* Two-Column Panels Skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[296px] w-full rounded-[12px] bg-cal-canvas border border-cal-hairline" />
        <Skeleton className="h-[296px] w-full rounded-[12px] bg-cal-canvas border border-cal-hairline" />
      </div>

      {/* Telemetry & Bottom Grid Skeleton */}
      <Skeleton className="h-[164px] w-full rounded-[12px] bg-cal-canvas border border-cal-hairline" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[260px] w-full rounded-[12px] bg-cal-canvas border border-cal-hairline" />
        <Skeleton className="h-[260px] w-full rounded-[12px] bg-cal-canvas border border-cal-hairline" />
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { data, isPending, isFetching, isError, refetch } = useApiQuery("/api/admin/dashboard");
  const navigate = useNavigate();

  // Used to stay on the loading skeleton forever when the dashboard couldn't load
  if (isError) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] rounded-[12px] border border-cal-hairline bg-cal-canvas p-8 font-cal-sans">
          <LoadError what="the dashboard" onRetry={refetch} />
        </div>
      </AdminLayout>
    );
  }

  if (isPending || !data) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  const {
    kpi = {},
    users_needing_review = {
      critical_hss: 0,
      symptoms_recorded: 0,
      pending_evaluations: 0,
      open_alerts: 0,
    },
    hss_distribution = {
      stable: { count: 0, percentage: 0 },
      moderate: { count: 0, percentage: 0 },
      elevated_risk: { count: 0, percentage: 0 },
      critical: { count: 0, percentage: 0 },
    },
    user_activity = { meals: 0, exercise: 0, vitals: 0, sleep: 0, symptoms: 0 },
    content_library = { recipes: 0, exercises: 0 },
    recent_activity = [],
  } = data || {};

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return Number(num).toLocaleString();
  };

  const totalUsers = Number(kpi?.total_users ?? 0);
  const activeUsers = Number(kpi?.active_users ?? 0);
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const openAlerts = Number(kpi?.open_alerts ?? 0);
  const avgHss = kpi?.avg_hss ?? 0;
  const avgHssMeta = getHssBandMeta(avgHss);

  const pendingEvaluations = Number(users_needing_review?.pending_evaluations ?? 0);
  const totalReviewQueue =
    Number(users_needing_review?.critical_hss ?? 0) +
    Number(users_needing_review?.symptoms_recorded ?? 0) +
    pendingEvaluations +
    Number(users_needing_review?.open_alerts ?? 0);

  const cohorts = [
    {
      key: "stable",
      label: "Stable",
      range: "80–100",
      count: hss_distribution?.stable?.count ?? 0,
      pct: Number(hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0),
      barClass: "bg-cal-success",
      dotClass: "bg-cal-success",
    },
    {
      key: "moderate",
      label: "Moderate",
      range: "60–79",
      count: hss_distribution?.moderate?.count ?? 0,
      pct: Number(hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0),
      barClass: "bg-cal-warning",
      dotClass: "bg-cal-warning",
    },
    {
      key: "elevated",
      label: "Elevated risk",
      range: "50–59",
      count: hss_distribution?.elevated_risk?.count ?? 0,
      pct: Number(
        hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0
      ),
      barClass: "bg-cal-badge-orange",
      dotClass: "bg-cal-badge-orange",
    },
    {
      key: "critical",
      label: "Critical",
      range: "< 50",
      count: hss_distribution?.critical?.count ?? 0,
      pct: Number(hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0),
      barClass: "bg-cal-error",
      dotClass: "bg-cal-error",
    },
  ];

  const totalWeeklyTelemetry =
    Number(user_activity?.meals ?? 0) +
    Number(user_activity?.exercise ?? 0) +
    Number(user_activity?.vitals ?? 0) +
    Number(user_activity?.sleep ?? 0) +
    Number(user_activity?.symptoms ?? 0);

  const quickWorkflows = [
    {
      title: "Add recipe",
      subtitle: "Nutritional library",
      path: "/foods",
      icon: Utensils,
    },
    {
      title: "Add exercise",
      subtitle: "Workout regimens",
      path: "/exercises",
      icon: Dumbbell,
    },
    {
      title: "View users",
      subtitle: "Patient & staff roster",
      path: "/users",
      icon: Users,
    },
    {
      title: "Review cases",
      subtitle: "Clinical evaluations",
      path: "/cases",
      icon: ListChecks,
    },
  ];

  const reviewItems = [
    {
      label: "Critical HSS users",
      hint: "Stability score under 50",
      count: users_needing_review?.critical_hss ?? 0,
      dotClass: "bg-cal-error",
      path: "/users",
    },
    {
      label: "Symptoms recorded",
      hint: "Self-reported clinical symptoms",
      count: users_needing_review?.symptoms_recorded ?? 0,
      dotClass: "bg-cal-warning",
      path: "/users",
    },
    {
      label: "Pending evaluations",
      hint: "Queued HSS review rounds",
      count: pendingEvaluations,
      dotClass: "bg-cal-ink",
      path: "/cases",
    },
    {
      label: "Open alerts",
      hint: "Active threshold triggers",
      count: users_needing_review?.open_alerts ?? 0,
      dotClass: "bg-cal-error",
      path: "/patients",
    },
  ];

  const telemetryTiles = [
    { label: "Meals", value: user_activity?.meals ?? 0, icon: Utensils, warn: false },
    { label: "Exercise", value: user_activity?.exercise ?? 0, icon: Dumbbell, warn: false },
    { label: "Vitals", value: user_activity?.vitals ?? 0, icon: HeartPulse, warn: false },
    { label: "Sleep", value: user_activity?.sleep ?? 0, icon: Moon, warn: false },
    {
      label: "Symptoms",
      value: user_activity?.symptoms ?? 0,
      icon: AlertCircle,
      warn: Number(user_activity?.symptoms ?? 0) > 0,
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
              <span>Operations console · Rolling 7-day telemetry</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Dashboard
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-[14px] leading-[1.5] text-cal-muted">
              Monitor registered population health, HSS cohort stability, clinical review queues, and published wellness content.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh dashboard metrics"
              aria-label="Refresh dashboard metrics"
              className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={15} className={isFetching ? "animate-spin text-cal-muted" : ""} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/analytics")}
              className="flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
            >
              <ChartColumn size={15} className="text-cal-muted" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/cases")}
              className="flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
            >
              <ListChecks size={15} />
              <span>Review cases</span>
              {pendingEvaluations > 0 && (
                <span className="ml-0.5 rounded-full bg-cal-surface-dark-elevated px-2 py-0.5 font-cal-mono text-[11px] font-medium text-cal-on-primary">
                  {pendingEvaluations}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── 2. 4-UP KPI METRIC CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Total Users */}
          <button
            type="button"
            onClick={() => navigate("/users")}
            className="group flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-cal-ink/30 transition-colors cursor-pointer"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-cal-muted">Total users</span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cal-surface-card text-cal-ink">
                <Users size={16} strokeWidth={1.9} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-cal-display text-[30px] font-semibold tracking-[-0.8px] leading-none text-cal-ink">
                {formatNumber(totalUsers)}
              </span>
            </div>
            <div className="mt-3 flex w-full items-center justify-between text-[12.5px] text-cal-muted">
              <span>Registered accounts</span>
              <ArrowUpRight
                size={14}
                className="text-cal-muted group-hover:text-cal-ink transition-colors"
              />
            </div>
          </button>

          {/* Active Users */}
          <div className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-cal-muted">Active users</span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cal-surface-card text-cal-ink">
                <Activity size={16} strokeWidth={1.9} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-cal-display text-[30px] font-semibold tracking-[-0.8px] leading-none text-cal-ink">
                {formatNumber(activeUsers)}
              </span>
              {totalUsers > 0 && (
                <span className="rounded-full bg-cal-surface-card px-2.5 py-0.5 font-cal-mono text-[11.5px] font-medium text-cal-ink">
                  {activeRate}%
                </span>
              )}
            </div>
            <div className="mt-3 text-[12.5px] text-cal-muted">
              Logged telemetry in last 7 days
            </div>
          </div>

          {/* Average HSS */}
          <div className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-cal-muted">Average HSS</span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cal-surface-card text-cal-ink">
                <HeartPulse size={16} strokeWidth={1.9} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-cal-display text-[30px] font-semibold tracking-[-0.8px] leading-none text-cal-ink">
                {avgHss}
              </span>
              <span className="font-cal-mono text-[12.5px] text-cal-muted">/ 100</span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-cal-surface-card px-2.5 py-0.5 text-[11.5px] font-medium text-cal-ink">
                <span className={`h-1.5 w-1.5 rounded-full ${avgHssMeta.dotClass}`} />
                {avgHssMeta.label}
              </span>
            </div>
            <div className="mt-3 text-[12.5px] text-cal-muted">
              Population mean stability score
            </div>
          </div>

          {/* Open Alerts */}
          <button
            type="button"
            onClick={() => navigate("/patients")}
            className="group flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-cal-ink/30 transition-colors cursor-pointer"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-cal-muted">Open alerts</span>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cal-surface-card ${
                  openAlerts > 0 ? "text-cal-error" : "text-cal-ink"
                }`}
              >
                <AlertTriangle size={16} strokeWidth={1.9} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span
                className={`font-cal-display text-[30px] font-semibold tracking-[-0.8px] leading-none ${
                  openAlerts > 0 ? "text-cal-error" : "text-cal-ink"
                }`}
              >
                {formatNumber(openAlerts)}
              </span>
              {openAlerts > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cal-error/10 px-2.5 py-0.5 text-[11.5px] font-medium text-cal-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-cal-error" />
                  Needs attention
                </span>
              )}
            </div>
            <div className="mt-3 flex w-full items-center justify-between text-[12.5px] text-cal-muted">
              <span>Unresolved clinical flags</span>
              <ArrowUpRight
                size={14}
                className="text-cal-muted group-hover:text-cal-ink transition-colors"
              />
            </div>
          </button>
        </div>

        {/* ─── 3. QUICK WORKFLOWS STRIP ─────────────────────────────────────── */}
        <section className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-cal-ink">Quick actions</h3>
              <p className="mt-0.5 text-[13px] text-cal-muted">
                Direct entry points for library authoring, user governance, and clinical evaluations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickWorkflows.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="group flex items-center gap-3 rounded-[8px] border border-cal-hairline bg-cal-surface-soft p-3.5 text-left hover:bg-cal-surface-card hover:border-cal-ink/30 transition-colors cursor-pointer"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-ink">
                    <Icon size={16} strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-cal-ink leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-cal-muted">
                      {item.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-cal-muted group-hover:text-cal-ink transition-colors"
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── 4. CLINICAL TRIAGE & HSS COHORT DISTRIBUTION ─────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Users Needing Review */}
          <section className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-[16px] font-semibold text-cal-ink">Users needing review</h3>
                  <p className="mt-0.5 text-[13px] text-cal-muted">
                    Clinical items flagged for verification and specialist follow-up
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-cal-surface-card px-2.5 py-1 font-cal-mono text-[11.5px] font-medium text-cal-ink">
                  {formatNumber(totalReviewQueue)} flagged
                </span>
              </div>

              <div className="space-y-2.5">
                {reviewItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="group flex w-full items-center justify-between gap-3 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3.5 py-3 text-left hover:bg-cal-surface-card hover:border-cal-ink/30 transition-colors cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-cal-ink leading-tight">
                          {item.label}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-cal-muted">
                          {item.hint}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-[6px] border border-cal-hairline bg-cal-canvas px-2.5 py-0.5 font-cal-mono text-[12px] font-medium text-cal-ink tabular-nums">
                        {formatNumber(item.count)}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-cal-muted group-hover:text-cal-ink transition-colors"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* HSS Distribution */}
          <section className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="mb-4">
                <h3 className="text-[16px] font-semibold text-cal-ink">HSS distribution</h3>
                <p className="mt-0.5 text-[13px] text-cal-muted">
                  Health Stability Score cohorts across the registered population
                </p>
              </div>

              {/* Segmented Overview Bar */}
              <div
                className="mb-5 flex h-2.5 w-full overflow-hidden rounded-full bg-cal-surface-card gap-0.5"
                aria-hidden="true"
              >
                {cohorts.map((cohort) =>
                  cohort.pct > 0 ? (
                    <div
                      key={cohort.key}
                      className={`h-full transition-all duration-500 ${cohort.barClass}`}
                      style={{ width: `${cohort.pct}%` }}
                    />
                  ) : null
                )}
              </div>

              <div className="space-y-4">
                {cohorts.map((cohort) => (
                  <div key={cohort.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${cohort.dotClass}`} />
                        <span className="text-[13.5px] font-medium text-cal-ink">
                          {cohort.label}
                        </span>
                        <span className="rounded-full bg-cal-surface-card px-2 py-0.5 font-cal-mono text-[11px] text-cal-muted">
                          {cohort.range}
                        </span>
                      </div>
                      <span className="font-cal-mono text-[12px] font-medium text-cal-body tabular-nums">
                        {formatNumber(cohort.count)} users · {cohort.pct}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cal-surface-card">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cohort.barClass}`}
                        style={{ width: `${Math.min(Math.max(cohort.pct, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ─── 5. ROLLING 7-DAY TELEMETRY ACTIVITY ──────────────────────────── */}
        <section className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-cal-ink">
                User activity (last 7 days)
              </h3>
              <p className="mt-0.5 text-[13px] text-cal-muted">
                Clinical telemetry events recorded across patient check-ins in the rolling week
              </p>
            </div>
            <span className="rounded-full bg-cal-surface-card px-3 py-1 font-cal-mono text-[12px] font-medium text-cal-ink tabular-nums">
              {formatNumber(totalWeeklyTelemetry)} total logs
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {telemetryTiles.map((tile, idx) => {
              const TileIcon = tile.icon;
              const isLastOdd = idx === telemetryTiles.length - 1;
              return (
                <div
                  key={tile.label}
                  className={`flex flex-col justify-between rounded-[8px] border border-cal-hairline bg-cal-surface-soft p-4 ${
                    isLastOdd ? "col-span-2 sm:col-span-1" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[12.5px] font-medium text-cal-muted">
                      {tile.label}
                    </span>
                    <TileIcon
                      size={15}
                      className={tile.warn ? "text-cal-warning" : "text-cal-muted"}
                    />
                  </div>
                  <span
                    className={`font-cal-display text-[26px] font-semibold tracking-[-0.5px] leading-none ${
                      tile.warn ? "text-cal-warning" : "text-cal-ink"
                    }`}
                  >
                    {formatNumber(tile.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 6. CONTENT LIBRARY & RECENT ADMIN ACTIVITY ───────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Content Library */}
          <section className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="mb-4">
                <h3 className="text-[16px] font-semibold text-cal-ink">Content library</h3>
                <p className="mt-0.5 text-[13px] text-cal-muted">
                  Curated nutrition recipes and physical therapy exercise regimens
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="flex items-center justify-between gap-3 rounded-[8px] border border-cal-hairline bg-cal-surface-soft p-4">
                  <div>
                    <span className="block text-[12.5px] font-medium text-cal-muted">
                      Recipes
                    </span>
                    <span className="mt-1.5 block font-cal-display text-[28px] font-semibold tracking-[-0.5px] leading-none text-cal-ink">
                      {formatNumber(content_library?.recipes)}
                    </span>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-ink">
                    <Utensils size={16} strokeWidth={1.9} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[8px] border border-cal-hairline bg-cal-surface-soft p-4">
                  <div>
                    <span className="block text-[12.5px] font-medium text-cal-muted">
                      Exercises
                    </span>
                    <span className="mt-1.5 block font-cal-display text-[28px] font-semibold tracking-[-0.5px] leading-none text-cal-ink">
                      {formatNumber(content_library?.exercises)}
                    </span>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-ink">
                    <Dumbbell size={16} strokeWidth={1.9} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/foods")}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                <span>Food library</span>
                <ArrowUpRight size={14} className="text-cal-muted" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/exercises")}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                <span>Exercise library</span>
                <ArrowUpRight size={14} className="text-cal-muted" />
              </button>
            </div>
          </section>

          {/* Recent Admin Activity */}
          <section className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-[16px] font-semibold text-cal-ink">
                    Recent admin activity
                  </h3>
                  <p className="mt-0.5 text-[13px] text-cal-muted">
                    Real-time audit trail of administrative events
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/activity-log")}
                  className="shrink-0 text-[13px] font-semibold text-cal-ink hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>

              {recent_activity && recent_activity.length > 0 ? (
                <div className="max-h-[224px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {recent_activity.map((act, i) => {
                    const formattedAction = act.action
                      ? act.action.charAt(0).toUpperCase() + act.action.slice(1)
                      : "Activity";
                    const initials = getInitials(act.admin_name);
                    const avatarTone = AVATAR_SURFACES[i % AVATAR_SURFACES.length];

                    let formattedTime = "";
                    try {
                      const d = new Date(act.created_at);
                      if (!isNaN(d.getTime())) {
                        formattedTime = d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }
                    } catch (err) {
                      console.error(err);
                    }

                    return (
                      <div
                        key={act.id || i}
                        className="flex items-center gap-3 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3.5 py-2.5"
                      >
                        {/* Cal.com 36px Circular Avatar */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[12px] font-semibold ${avatarTone}`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-cal-ink">
                              {formattedAction} {act.target_type || ""}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-cal-muted">
                            <span className="truncate font-medium text-cal-body">
                              {act.admin_name || "Admin"}
                            </span>
                            {act.target_name && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{act.target_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {formattedTime && (
                          <span className="shrink-0 font-cal-mono text-[11.5px] font-medium text-cal-muted tabular-nums">
                            {formattedTime}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[8px] border border-dashed border-cal-hairline bg-cal-surface-soft py-10 text-center text-[13px] text-cal-muted">
                  No recent administrative activity recorded.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
