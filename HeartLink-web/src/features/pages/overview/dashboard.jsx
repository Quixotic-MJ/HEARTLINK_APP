import React from "react";
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
import { apiFetch } from "../../../api";
import { UI, FONTS, PageHeader, KpiCard } from "../../../styles/designSystem";

const Dashboard = () => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await apiFetch("/api/admin/dashboard");
        setData(dashboardData);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          {/* Page Head Skeleton */}
          <div className="mb-6">
            <Skeleton className="w-28 h-3.5 mb-2 bg-[#DCE3DF]/70 rounded" />
            <Skeleton className="w-64 h-8 mb-2 bg-[#DCE3DF]/70 rounded-md" />
            <Skeleton className="w-96 h-4 bg-[#DCE3DF]/70 rounded" />
          </div>

          {/* Quick Actions Skeleton */}
          <Skeleton className="w-full h-[120px] rounded-[10px] mb-5 bg-[#DCE3DF]/60" />

          {/* KPI Grid Skeleton */}
          <div className={UI.kpi.grid}>
            <Skeleton className="w-full h-[100px] rounded-[10px] bg-[#DCE3DF]/60" />
            <Skeleton className="w-full h-[100px] rounded-[10px] bg-[#DCE3DF]/60" />
            <Skeleton className="w-full h-[100px] rounded-[10px] bg-[#DCE3DF]/60" />
            <Skeleton className="w-full h-[100px] rounded-[10px] bg-[#DCE3DF]/60" />
          </div>

          {/* Two-col Panels Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
            <Skeleton className="w-full h-[240px] rounded-[10px] bg-[#DCE3DF]/60" />
            <Skeleton className="w-full h-[240px] rounded-[10px] bg-[#DCE3DF]/60" />
          </div>

          {/* Activity Skeleton */}
          <Skeleton className="w-full h-[140px] rounded-[10px] mb-5 bg-[#DCE3DF]/60" />

          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Skeleton className="w-full h-[220px] rounded-[10px] bg-[#DCE3DF]/60" />
            <Skeleton className="w-full h-[220px] rounded-[10px] bg-[#DCE3DF]/60" />
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
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Operations console"
          title="Dashboard"
          description="Monitor users, clinical activity, HSS telemetry, and content management."
        />

        {/* ── QUICK ACTIONS ── */}
        <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] p-5 mb-5 shadow-2xs">
          <div className="text-[13px] font-semibold text-[#152131] mb-0.5">Quick actions</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3.5">
            <button
              onClick={() => navigate("/foods")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-[#DCE3DF] bg-[#EDF1EF] hover:border-[#E8532E] hover:bg-[#FBEAE6] transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-[#FBEAE6] text-[#E8532E] group-hover:bg-[#E8532E] group-hover:text-white transition-colors">
                <Utensils size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-[#152131]">Add recipe</p>
                <span className="text-[11px] text-[#5C6B66] font-medium">Nutritional library</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/exercises")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-[#DCE3DF] bg-[#EDF1EF] hover:border-[#E8532E] hover:bg-[#FBEAE6] transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-[#FBEAE6] text-[#E8532E] group-hover:bg-[#E8532E] group-hover:text-white transition-colors">
                <Dumbbell size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-[#152131]">Add exercise</p>
                <span className="text-[11px] text-[#5C6B66] font-medium">Workout regimens</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/users")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-[#DCE3DF] bg-[#EDF1EF] hover:border-[#E8532E] hover:bg-[#FBEAE6] transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-[#FBEAE6] text-[#E8532E] group-hover:bg-[#E8532E] group-hover:text-white transition-colors">
                <User size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-[#152131]">View users</p>
                <span className="text-[11px] text-[#5C6B66] font-medium">Patient database</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/cases")}
              className="flex items-center gap-3 p-3 rounded-[8px] border border-[#DCE3DF] bg-[#EDF1EF] hover:border-[#E8532E] hover:bg-[#FBEAE6] transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-[7px] shrink-0 flex items-center justify-center bg-[#FBEAE6] text-[#E8532E] group-hover:bg-[#E8532E] group-hover:text-white transition-colors">
                <ClipboardList size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="m-0 text-[12.5px] font-semibold text-[#152131]">Review cases</p>
                <span className="text-[11px] text-[#5C6B66] font-medium">Clinical evaluations</span>
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
            iconBg="bg-[#EDF1EF]"
            iconColor="text-[#5C6B66]"
          />

          <KpiCard
            label="Active users"
            value={formatNumber(kpi?.active_users)}
            icon={Activity}
            iconBg="bg-[#E3EFEC]"
            iconColor="text-[#1B6E63]"
            valueColor="text-[#1B6E63]"
          />

          <KpiCard
            label="Average HSS"
            value={kpi?.avg_hss ?? 0}
            icon={HeartPulse}
            iconBg="bg-[#FBEAE6]"
            iconColor="text-[#E8532E]"
            valueColor="text-[#E8532E]"
          />

          <KpiCard
            label="Open alerts"
            value={kpi?.open_alerts ?? 0}
            icon={AlertTriangle}
            iconBg={Number(kpi?.open_alerts) > 0 ? "bg-[#F7E4E1]" : "bg-[#EDF1EF]"}
            iconColor={Number(kpi?.open_alerts) > 0 ? "text-[#A93226]" : "text-[#5C6B66]"}
            valueColor={Number(kpi?.open_alerts) > 0 ? "text-[#A93226]" : "text-[#152131]"}
            className={Number(kpi?.open_alerts) > 0 ? "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#A93226]" : ""}
          />
        </div>

        {/* ── PANELS: USERS NEEDING REVIEW & HSS DISTRIBUTION ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
          {/* Users needing review */}
          <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#152131] mb-0.5">Users needing review</div>
              <div className="text-[12px] text-[#5C6B66] mb-4">Clinical items flagged for verification and analysis</div>

              <div className="space-y-2">
                <div 
                  onClick={() => navigate("/users")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-[#DCE3DF] hover:border-[#8B9893] hover:bg-[#EDF1EF] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#152131]">
                    <span className="w-2 h-2 rounded-full bg-[#A93226]" />
                    Critical HSS users
                  </div>
                  <span className="text-[12px] font-bold text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.critical_hss ?? 0}
                  </span>
                </div>

                <div 
                  onClick={() => navigate("/users")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-[#DCE3DF] hover:border-[#8B9893] hover:bg-[#EDF1EF] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#152131]">
                    <span className="w-2 h-2 rounded-full bg-[#A9741B]" />
                    Symptoms recorded
                  </div>
                  <span className="text-[12px] font-bold text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.symptoms_recorded ?? 0}
                  </span>
                </div>

                <div 
                  onClick={() => navigate("/cases")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-[#DCE3DF] hover:border-[#8B9893] hover:bg-[#EDF1EF] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#152131]">
                    <span className="w-2 h-2 rounded-full bg-[#E8532E]" />
                    Pending evaluations
                  </div>
                  <span className="text-[12px] font-bold text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.pending_evaluations ?? 0}
                  </span>
                </div>

                <div 
                  onClick={() => navigate("/users")}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[8px] border border-[#DCE3DF] hover:border-[#8B9893] hover:bg-[#EDF1EF] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#152131]">
                    <span className="w-2 h-2 rounded-full bg-[#A93226]" />
                    Open alerts
                  </div>
                  <span className="text-[12px] font-bold text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2.5 py-0.5 rounded-[6px]">
                    {users_needing_review?.open_alerts ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HSS distribution */}
          <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] p-5 shadow-2xs">
            <div className="text-[13px] font-semibold text-[#152131] mb-0.5">HSS distribution</div>
            <div className="text-[12px] text-[#5C6B66] mb-4">Health Stability Score cohorts across registered population</div>

            <div className="space-y-3.5">
              {/* Stable */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-[#152131] font-medium">Stable (80–100)</span>
                  <span className="text-[12px] font-semibold text-[#1B6E63]">
                    {formatNumber(hss_distribution?.stable?.count ?? 0)} users · {hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#EDF1EF] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#1B6E63] transition-all duration-500"
                    style={{ width: `${hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Moderate */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-[#152131] font-medium">Moderate (60–79)</span>
                  <span className="text-[12px] font-semibold text-[#A9741B]">
                    {formatNumber(hss_distribution?.moderate?.count ?? 0)} users · {hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#EDF1EF] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#A9741B] transition-all duration-500"
                    style={{ width: `${hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Elevated risk */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-[#152131] font-medium">Elevated risk (50–59)</span>
                  <span className="text-[12px] font-semibold text-[#E8532E]">
                    {formatNumber(hss_distribution?.elevated_risk?.count ?? 0)} users · {hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#EDF1EF] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#E8532E] transition-all duration-500"
                    style={{ width: `${hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Critical */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] text-[#152131] font-medium">Critical (&lt;50)</span>
                  <span className="text-[12px] font-semibold text-[#A93226]">
                    {formatNumber(hss_distribution?.critical?.count ?? 0)} users · {hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#EDF1EF] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#A93226] transition-all duration-500"
                    style={{ width: `${hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── USER ACTIVITY ── */}
        <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] p-5 mb-5 shadow-2xs">
          <div className="text-[13px] font-semibold text-[#152131] mb-0.5">User activity (last 7 days)</div>
          <div className="text-[12px] text-[#5C6B66] mb-3.5">Clinical telemetry events recorded in the rolling week</div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3.5">
            <div className="text-center p-3.5 px-2 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]">
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5C6B66] font-semibold block mb-1">
                Meals
              </span>
              <span 
                className="text-[19px] text-[#152131] font-medium"
                style={{ fontFamily: FONTS.serif }}
              >
                {formatNumber(user_activity.meals)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]">
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5C6B66] font-semibold block mb-1">
                Exercise
              </span>
              <span 
                className="text-[19px] text-[#152131] font-medium"
                style={{ fontFamily: FONTS.serif }}
              >
                {formatNumber(user_activity.exercise)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]">
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5C6B66] font-semibold block mb-1">
                Vitals
              </span>
              <span 
                className="text-[19px] text-[#152131] font-medium"
                style={{ fontFamily: FONTS.serif }}
              >
                {formatNumber(user_activity.vitals)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]">
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5C6B66] font-semibold block mb-1">
                Sleep
              </span>
              <span 
                className="text-[19px] text-[#152131] font-medium"
                style={{ fontFamily: FONTS.serif }}
              >
                {formatNumber(user_activity.sleep)}
              </span>
            </div>

            <div className="text-center p-3.5 px-2 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF] col-span-2 sm:col-span-1">
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5C6B66] font-semibold block mb-1">
                Symptoms
              </span>
              <span 
                className={`text-[19px] font-medium ${Number(user_activity.symptoms) > 0 ? "text-[#A9741B]" : "text-[#152131]"}`}
                style={{ fontFamily: FONTS.serif }}
              >
                {formatNumber(user_activity.symptoms)}
              </span>
            </div>
          </div>
        </div>

        {/* ── CONTENT LIBRARY & RECENT ADMIN ACTIVITY ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-0">
          {/* Content Library */}
          <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#152131] mb-0.5">Content library</div>
              <div className="text-[12px] text-[#5C6B66] mb-4">Manage application recipes and exercises</div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="flex items-center justify-between p-3.5 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]">
                  <div>
                    <span className="text-[10.5px] uppercase text-[#5C6B66] font-semibold block">Recipes</span>
                    <span 
                      className="text-[22px] text-[#152131] font-medium block mt-0.5"
                      style={{ fontFamily: FONTS.serif }}
                    >
                      {formatNumber(content_library.recipes)}
                    </span>
                  </div>
                  <div className="w-[34px] h-[34px] rounded-[8px] bg-[#FBEAE6] text-[#E8532E] flex items-center justify-center shrink-0">
                    <Utensils size={16} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]">
                  <div>
                    <span className="text-[10.5px] uppercase text-[#5C6B66] font-semibold block">Exercises</span>
                    <span 
                      className="text-[22px] text-[#152131] font-medium block mt-0.5"
                      style={{ fontFamily: FONTS.serif }}
                    >
                      {formatNumber(content_library.exercises)}
                    </span>
                  </div>
                  <div className="w-[34px] h-[34px] rounded-[8px] bg-[#FBEAE6] text-[#E8532E] flex items-center justify-center shrink-0">
                    <Dumbbell size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => navigate("/foods")}
                className="flex-1 p-2.5 border border-[#DCE3DF] rounded-[8px] bg-[#FFFFFF] hover:border-[#E8532E] hover:text-[#C13E20] text-[12px] font-semibold text-[#152131] text-center cursor-pointer transition-colors shadow-2xs"
              >
                Food library
              </button>
              <button
                onClick={() => navigate("/exercises")}
                className="flex-1 p-2.5 border border-[#DCE3DF] rounded-[8px] bg-[#FFFFFF] hover:border-[#E8532E] hover:text-[#C13E20] text-[12px] font-semibold text-[#152131] text-center cursor-pointer transition-colors shadow-2xs"
              >
                Exercise library
              </button>
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#152131] mb-0.5">Recent admin activity</div>
              <div className="text-[12px] text-[#5C6B66] mb-4">Real-time audit log of administrative events</div>

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
                        className="flex justify-between items-start p-2.5 px-3 border border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-4 h-4 rounded-full bg-[#FBEAE6] text-[#E8532E] text-[8.5px] font-bold flex items-center justify-center">
                              {initial}
                            </span>
                            <span className="text-[11px] font-semibold text-[#5C6B66] truncate">
                              {act.admin_name || "Admin"}
                            </span>
                          </div>
                          <div className="text-[12.5px] font-semibold text-[#152131] leading-tight">
                            {formattedAction} {act.target_type || ""}
                          </div>
                          {act.target_name && (
                            <div className="text-[11px] text-[#5C6B66] mt-0.5 truncate">
                              {act.target_name}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8B9893] font-semibold uppercase whitespace-nowrap pt-0.5">
                          {formattedTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[#8B9893] text-[12px] border border-dashed border-[#DCE3DF] rounded-[8px] bg-[#EDF1EF]/50">
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
