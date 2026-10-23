import {
  User,
  AlertTriangle,
  Activity,
  HeartPulse,
  Utensils,
  Dumbbell,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader, KpiCard } from "../../../styles/designSystem";

const Dashboard = () => {
  const { data, isPending, isError, refetch } = useApiQuery("/api/admin/dashboard");
  const navigate = useNavigate();

  // Used to stay on the loading skeleton for ever when the dashboard couldn't load
  if (isError) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          <LoadError what="the dashboard" onRetry={refetch} />
        </div>
      </AdminLayout>
    );
  }

  if (isPending || !data) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          {/* Page Head Skeleton */}
          <div className="mb-6">
            <Skeleton className="w-28 h-3.5 mb-2 bg-ds-hairline/70 rounded" />
            <Skeleton className="w-64 h-8 mb-2 bg-ds-hairline/70 rounded-md" />
            <Skeleton className="w-96 h-4 bg-ds-hairline/70 rounded" />
          </div>

          {/* Quick Actions Skeleton */}
          <Skeleton className="w-full h-[120px] rounded-xl mb-5 bg-ds-hairline/60" />

          {/* KPI Grid Skeleton */}
          <div className={UI.kpi.grid}>
            <Skeleton className="w-full h-[100px] rounded-xl bg-ds-hairline/60" />
            <Skeleton className="w-full h-[100px] rounded-xl bg-ds-hairline/60" />
            <Skeleton className="w-full h-[100px] rounded-xl bg-ds-hairline/60" />
            <Skeleton className="w-full h-[100px] rounded-xl bg-ds-hairline/60" />
          </div>

          {/* Two-col Panels Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
            <Skeleton className="w-full h-[240px] rounded-xl bg-ds-hairline/60" />
            <Skeleton className="w-full h-[240px] rounded-xl bg-ds-hairline/60" />
          </div>

          {/* Activity Skeleton */}
          <Skeleton className="w-full h-[140px] rounded-xl mb-5 bg-ds-hairline/60" />

          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Skeleton className="w-full h-[220px] rounded-xl bg-ds-hairline/60" />
            <Skeleton className="w-full h-[220px] rounded-xl bg-ds-hairline/60" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const {
    kpi = {},
    users_needing_review = { critical_hss: 0, symptoms_recorded: 0, pending_evaluations: 0, open_alerts: 0 },
    hss_distribution = {
      stable: { count: 0, percentage: 0 },
      moderate: { count: 0, percentage: 0 },
      elevated_risk: { count: 0, percentage: 0 },
      critical: { count: 0, percentage: 0 }
    },
    user_activity = { meals: 0, exercise: 0, vitals: 0, sleep: 0, symptoms: 0 },
    content_library = { recipes: 0, exercises: 0 },
    recent_activity = []
  } = data || {};

  // Formatter for numbers with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return Number(num).toLocaleString();
  };

  return (
    <AdminLayout>
      {/* Expanded container for full-width layout utilization */}
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-4" style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Operations console"
          title="Dashboard"
          description="Monitor users, clinical activity, HSS telemetry, and content management."
        />

        {/* ── QUICK ACTIONS ── */}
        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-5 mb-5 ">
          <div className="text-[13px] font-semibold text-ds-ink mb-0.5">Quick actions</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3.5">
            <button
              onClick={() => navigate("/foods")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-ds-hairline bg-ds-surface hover:border-ds-line hover:bg-ds-tint transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-ds-tint text-ds-on-tint group-hover:bg-ds-primary group-hover:text-white transition-colors">
                <Utensils size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-ds-ink">Add recipe</p>
                <span className="text-[11px] text-ds-slate font-medium">Nutritional library</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/exercises")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-ds-hairline bg-ds-surface hover:border-ds-line hover:bg-ds-tint transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-ds-tint text-ds-on-tint group-hover:bg-ds-primary group-hover:text-white transition-colors">
                <Dumbbell size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-ds-ink">Add exercise</p>
                <span className="text-[11px] text-ds-slate font-medium">Workout regimens</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/users")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-ds-hairline bg-ds-surface hover:border-ds-line hover:bg-ds-tint transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-ds-tint text-ds-on-tint group-hover:bg-ds-primary group-hover:text-white transition-colors">
                <User size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-ds-ink">View users</p>
                <span className="text-[11px] text-ds-slate font-medium">Patient database</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/cases")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-ds-hairline bg-ds-surface hover:border-ds-line hover:bg-ds-tint transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-ds-tint text-ds-on-tint group-hover:bg-ds-primary group-hover:text-white transition-colors">
                <ClipboardList size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-ds-ink">Review cases</p>
                <span className="text-[11px] text-ds-slate font-medium">Clinical evaluations</span>
              </div>
            </button>
          </div>
        </div>

        {/* ── KPI GRID ── */}
        <div className={UI.kpi.grid}>
          <KpiCard
            label="Total users"
            value={formatNumber(kpi?.total_users)}
            icon={User}
            iconBg="bg-ds-surface"
            iconColor="text-ds-slate"
          />

          <KpiCard
            label="Active users"
            value={formatNumber(kpi?.active_users)}
            icon={Activity}
            iconBg="bg-ds-mint"
            iconColor="text-ds-charcoal"
            valueColor="text-ds-charcoal"
          />

          <KpiCard
            label="Average HSS"
            value={kpi?.avg_hss ?? 0}
            icon={HeartPulse}
            iconBg="bg-ds-tint"
            iconColor="text-ds-primary"
            valueColor="text-ds-primary"
          />

          <KpiCard
            label="Open alerts"
            value={kpi?.open_alerts ?? 0}
            icon={AlertTriangle}
            iconBg={Number(kpi?.open_alerts) > 0 ? "bg-ds-rose" : "bg-ds-surface"}
            iconColor={Number(kpi?.open_alerts) > 0 ? "text-ds-danger" : "text-ds-slate"}
            valueColor={Number(kpi?.open_alerts) > 0 ? "text-ds-danger" : "text-ds-ink"}
            className={Number(kpi?.open_alerts) > 0 ? "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-ds-danger" : ""}
          />
        </div>

        {/* ── PANELS: USERS NEEDING REVIEW & HSS DISTRIBUTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
          {/* Users needing review */}
          <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-ds-ink mb-0.5">Users needing review</div>
              <div className="text-[12px] text-ds-slate mb-4">Clinical items flagged for verification and analysis</div>

              <div className="space-y-2">
                <div 
                  onClick={() => navigate("/users")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-ds-hairline hover:border-ds-steel hover:bg-ds-surface transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-ds-ink">
                    <span className="w-2 h-2 rounded-full bg-ds-danger" />
                    Critical HSS users
                  </div>
                  <span className="text-[12px] font-bold text-ds-ink bg-ds-surface border border-ds-hairline px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.critical_hss ?? 0}
                  </span>
                </div>

                <div 
                  onClick={() => navigate("/users")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-ds-hairline hover:border-ds-steel hover:bg-ds-surface transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-ds-ink">
                    <span className="w-2 h-2 rounded-full bg-ds-warm-text" />
                    Symptoms recorded
                  </div>
                  <span className="text-[12px] font-bold text-ds-ink bg-ds-surface border border-ds-hairline px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.symptoms_recorded ?? 0}
                  </span>
                </div>

                <div 
                  onClick={() => navigate("/cases")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-ds-hairline hover:border-ds-steel hover:bg-ds-surface transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-ds-ink">
                    <span className="w-2 h-2 rounded-full bg-ds-primary" />
                    Pending evaluations
                  </div>
                  <span className="text-[12px] font-bold text-ds-ink bg-ds-surface border border-ds-hairline px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.pending_evaluations ?? 0}
                  </span>
                </div>

                <div 
                  onClick={() => navigate("/users")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-ds-hairline hover:border-ds-steel hover:bg-ds-surface transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-ds-ink">
                    <span className="w-2 h-2 rounded-full bg-ds-danger" />
                    Open alerts
                  </div>
                  <span className="text-[12px] font-bold text-ds-ink bg-ds-surface border border-ds-hairline px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.open_alerts ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HSS distribution */}
          <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-5 ">
            <div className="text-[13px] font-semibold text-ds-ink mb-0.5">HSS distribution</div>
            <div className="text-[12px] text-ds-slate mb-4">Health Stability Score cohorts across registered population</div>

            <div className="space-y-3.5">
              {/* Stable */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-ds-ink font-medium">Stable (Scores 80 to 100)</span>
                  <span className="text-[12px] font-semibold text-ds-charcoal">
                    {formatNumber(hss_distribution?.stable?.count ?? 0)} users · {hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-ds-surface overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-ds-primary transition-all duration-500"
                    style={{ width: `${hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Moderate */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-ds-ink font-medium">Moderate (Scores 60 to 79)</span>
                  <span className="text-[12px] font-semibold text-ds-warm-text">
                    {formatNumber(hss_distribution?.moderate?.count ?? 0)} users · {hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-ds-surface overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-ds-warm-text transition-all duration-500"
                    style={{ width: `${hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Elevated risk */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-ds-ink font-medium">Elevated risk (Scores 50 to 59)</span>
                  <span className="text-[12px] font-semibold text-ds-primary">
                    {formatNumber(hss_distribution?.elevated_risk?.count ?? 0)} users · {hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-ds-surface overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-ds-primary transition-all duration-500"
                    style={{ width: `${hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Critical */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-ds-ink font-medium">Critical (Under 50)</span>
                  <span className="text-[12px] font-semibold text-ds-danger">
                    {formatNumber(hss_distribution?.critical?.count ?? 0)} users · {hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-ds-surface overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-ds-danger transition-all duration-500"
                    style={{ width: `${hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── USER ACTIVITY ── */}
        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-5 mb-5 ">
          <div className="text-[13px] font-semibold text-ds-ink mb-0.5">User activity (last 7 days)</div>
          <div className="text-[12px] text-ds-slate mb-3.5">Clinical telemetry events recorded in the rolling week</div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3.5">
            <div className="text-center p-3.5 px-2 border border-ds-hairline rounded-[8px] bg-ds-surface">
              <span className="text-[11px] uppercase tracking-[0.03em] text-ds-slate font-semibold block mb-1">
                Meals
              </span>
              <span 
                className="text-[19px] text-ds-ink font-medium"
              >
                {formatNumber(user_activity.meals)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-ds-hairline rounded-[8px] bg-ds-surface">
              <span className="text-[11px] uppercase tracking-[0.03em] text-ds-slate font-semibold block mb-1">
                Exercise
              </span>
              <span 
                className="text-[19px] text-ds-ink font-medium"
              >
                {formatNumber(user_activity.exercise)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-ds-hairline rounded-[8px] bg-ds-surface">
              <span className="text-[11px] uppercase tracking-[0.03em] text-ds-slate font-semibold block mb-1">
                Vitals
              </span>
              <span 
                className="text-[19px] text-ds-ink font-medium"
              >
                {formatNumber(user_activity.vitals)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-ds-hairline rounded-[8px] bg-ds-surface">
              <span className="text-[11px] uppercase tracking-[0.03em] text-ds-slate font-semibold block mb-1">
                Sleep
              </span>
              <span 
                className="text-[19px] text-ds-ink font-medium"
              >
                {formatNumber(user_activity.sleep)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-ds-hairline rounded-[8px] bg-ds-surface col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase tracking-[0.03em] text-ds-slate font-semibold block mb-1">
                Symptoms
              </span>
              <span 
                className={`text-[19px] font-medium ${Number(user_activity.symptoms) > 0 ? "text-ds-warm-text" : "text-ds-ink"}`}
              >
                {formatNumber(user_activity.symptoms)}
              </span>
            </div>
          </div>
        </div>

        {/* ── CONTENT LIBRARY & RECENT ADMIN ACTIVITY ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-0">
          {/* Content Library */}
          <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-ds-ink mb-0.5">Content library</div>
              <div className="text-[12px] text-ds-slate mb-4">Manage application recipes and exercises</div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="flex items-center justify-between p-3.5 border border-ds-hairline rounded-[8px] bg-ds-surface">
                  <div>
                    <span className="text-[11px] uppercase text-ds-slate font-semibold block">Recipes</span>
                    <span 
                      className="text-[22px] text-ds-ink font-medium block mt-0.5"
                    >
                      {formatNumber(content_library.recipes)}
                    </span>
                  </div>
                  <div className="w-[34px] h-[34px] rounded-[8px] bg-ds-tint text-ds-on-tint flex items-center justify-center shrink-0">
                    <Utensils size={16} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 border border-ds-hairline rounded-[8px] bg-ds-surface">
                  <div>
                    <span className="text-[11px] uppercase text-ds-slate font-semibold block">Exercises</span>
                    <span 
                      className="text-[22px] text-ds-ink font-medium block mt-0.5"
                    >
                      {formatNumber(content_library.exercises)}
                    </span>
                  </div>
                  <div className="w-[34px] h-[34px] rounded-[8px] bg-ds-tint text-ds-on-tint flex items-center justify-center shrink-0">
                    <Dumbbell size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => navigate("/foods")}
                className="flex-1 p-2.5 border border-ds-hairline rounded-[8px] bg-ds-canvas hover:border-ds-line hover:text-ds-primary-pressed text-[12px] font-semibold text-ds-ink text-center cursor-pointer transition-colors "
              >
                Food library
              </button>
              <button
                onClick={() => navigate("/exercises")}
                className="flex-1 p-2.5 border border-ds-hairline rounded-[8px] bg-ds-canvas hover:border-ds-line hover:text-ds-primary-pressed text-[12px] font-semibold text-ds-ink text-center cursor-pointer transition-colors "
              >
                Exercise library
              </button>
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-ds-ink mb-0.5">Recent admin activity</div>
              <div className="text-[12px] text-ds-slate mb-4">Real-time audit log of administrative events</div>

              {recent_activity && recent_activity.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {recent_activity.map((act, i) => {
                    const formattedAction = act.action ? act.action.charAt(0).toUpperCase() + act.action.slice(1) : "Activity";
                    const initial = act.admin_name ? act.admin_name.charAt(0).toUpperCase() : "A";

                    let formattedTime = "";
                    try {
                      const d = new Date(act.created_at);
                      if (!isNaN(d.getTime())) {
                        formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      }
                    } catch (err) {
                      console.error(err);
                    }

                    return (
                      <div 
                        key={act.id || i} 
                        className="flex justify-between items-start p-2.5 px-3 border border-ds-hairline rounded-[8px] bg-ds-surface"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-4 h-4 rounded-full bg-ds-tint text-ds-on-tint text-[8.5px] font-bold flex items-center justify-center">
                              {initial}
                            </span>
                            <span className="text-[11px] font-semibold text-ds-slate truncate">
                              {act.admin_name || "Admin"}
                            </span>
                          </div>
                          <div className="text-[12.5px] font-semibold text-ds-ink leading-tight">
                            {formattedAction} {act.target_type || ""}
                          </div>
                          {act.target_name && (
                            <div className="text-[11px] text-ds-slate mt-0.5 truncate">
                              {act.target_name}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-ds-steel font-semibold uppercase whitespace-nowrap pt-0.5">
                          {formattedTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-ds-steel text-[12px] border border-dashed border-ds-hairline rounded-[8px] bg-ds-surface/50">
                  No recent administrative activity recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;