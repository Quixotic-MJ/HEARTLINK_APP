import React from "react";
import {
  User,
  AlertTriangle,
  ArrowRight,
  HeartPulse,
  Activity,
  Dumbbell,
  Utensils,
  ClipboardList,
  Shield,
  Clock,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";

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
        {/* Page Title & Meta Skeleton */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-3">
          <div>
            <Skeleton className="w-32 h-3 mb-3 bg-white/10" />
            <Skeleton className="w-72 h-8 bg-white/10" />
          </div>
          <Skeleton className="w-40 h-8 rounded-full bg-white/10" />
        </div>

        {/* Quick Actions Skeleton */}
        <Skeleton className="w-full h-[88px] rounded-2xl mb-6 bg-white/10" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="w-full h-[110px] rounded-2xl bg-white/10" />
          <Skeleton className="w-full h-[110px] rounded-2xl bg-white/10" />
          <Skeleton className="w-full h-[110px] rounded-2xl bg-white/10" />
          <Skeleton className="w-full h-[110px] rounded-2xl bg-white/10" />
        </div>

        {/* Main Content Side-by-Side Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Skeleton className="w-full h-[220px] rounded-2xl bg-white/10" />
          <Skeleton className="w-full h-[220px] rounded-2xl bg-white/10" />
        </div>

        {/* User Activity Skeleton */}
        <Skeleton className="w-full h-[130px] rounded-2xl mb-6 bg-white/10" />

        {/* Bottom Panel Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="w-full h-[200px] rounded-2xl bg-white/10" />
          <Skeleton className="w-full h-[200px] rounded-2xl bg-white/10" />
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

  return (
    <AdminLayout>
      {/* Page Title & Meta */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
            <Sparkles size={11} />
            <span>Operations Console</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
            HeartLink Dashboard
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Monitor users, clinical activity, HSS telemetry, and content management.
          </p>
        </div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-white/10 text-xs text-[#89899C] select-none">
          <span className="w-2 h-2 rounded-full bg-[#5EC235] animate-pulse" />
          <span className="text-[#5EC235] font-semibold text-[11px]">System Online</span>
          <span className="text-white/20">•</span>
          <span className="text-[11px]">Live Sync</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1A1A1A] p-4 sm:p-5 rounded-2xl border border-white/10 mb-6">
        <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] mb-3">
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/foods")}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#21202E]/60 border border-white/5 hover:border-[#E55F37]/40 hover:bg-[#21202E] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37] shrink-0 group-hover:scale-105 transition-transform">
              <Utensils size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Add Recipe</p>
              <p className="text-[10px] text-[#89899C] font-medium mt-0.5">Nutritional library</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/exercises")}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#21202E]/60 border border-white/5 hover:border-[#E55F37]/40 hover:bg-[#21202E] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37] shrink-0 group-hover:scale-105 transition-transform">
              <Dumbbell size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Add Exercise</p>
              <p className="text-[10px] text-[#89899C] font-medium mt-0.5">Workout regimens</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/users")}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#21202E]/60 border border-white/5 hover:border-[#E55F37]/40 hover:bg-[#21202E] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37] shrink-0 group-hover:scale-105 transition-transform">
              <User size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">View Users</p>
              <p className="text-[10px] text-[#89899C] font-medium mt-0.5">Patient database</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/cases")}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#21202E]/60 border border-white/5 hover:border-[#E55F37]/40 hover:bg-[#21202E] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37] shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardList size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Review Cases</p>
              <p className="text-[10px] text-[#89899C] font-medium mt-0.5">Clinical evaluations</p>
            </div>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1A] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Total Users</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
              <User size={15} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{kpi?.total_users ?? 0}</h3>
            <p className="text-[10px] text-[#89899C] mt-1 font-medium">Registered accounts</p>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Active Users</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity size={15} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-emerald-400 tracking-tight">{kpi?.active_users ?? 0}</h3>
            <p className="text-[10px] text-[#89899C] mt-1 font-medium">Active this week</p>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Average HSS</span>
            <div className="w-7 h-7 rounded-lg bg-[#E55F37]/10 flex items-center justify-center text-[#E55F37]">
              <HeartPulse size={15} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#E55F37] tracking-tight">{kpi?.avg_hss ?? 0}</h3>
            <p className="text-[10px] text-[#89899C] mt-1 font-medium">Mean health score</p>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col justify-between relative overflow-hidden hover:border-white/20 transition-all">
          {kpi?.open_alerts > 0 && <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500" />}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Open Alerts</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpi?.open_alerts > 0 ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-white/5 text-slate-400"}`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-bold tracking-tight ${kpi?.open_alerts > 0 ? "text-red-400" : "text-white"}`}>
              {kpi?.open_alerts ?? 0}
            </h3>
            <p className="text-[10px] text-[#89899C] mt-1 font-medium">Unresolved system flags</p>
          </div>
        </div>
      </div>

      {/* Users Needing Review & HSS Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Users Needing Review */}
        <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Users Needing Review
          </h3>
          <p className="text-[11px] text-[#89899C] font-medium mb-4">
            Clinical items flagged for verification and analysis
          </p>
          
          <div className="space-y-2.5">
            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-[#21202E]/40 border border-white/5 hover:bg-[#21202E] hover:border-white/10 transition-all cursor-pointer"
              onClick={() => navigate("/users")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-white font-medium">Critical HSS Users</span>
              </div>
              <span className="text-xs font-bold text-white bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">
                {users_needing_review?.critical_hss ?? 0}
              </span>
            </div>

            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-[#21202E]/40 border border-white/5 hover:bg-[#21202E] hover:border-white/10 transition-all cursor-pointer"
              onClick={() => navigate("/users")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-white font-medium">Symptoms Recorded</span>
              </div>
              <span className="text-xs font-bold text-white bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">
                {users_needing_review?.symptoms_recorded ?? 0}
              </span>
            </div>

            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-[#21202E]/40 border border-white/5 hover:bg-[#21202E] hover:border-white/10 transition-all cursor-pointer"
              onClick={() => navigate("/cases")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#E55F37]" />
                <span className="text-xs text-white font-medium">Pending Evaluations</span>
              </div>
              <span className="text-xs font-bold text-white bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">
                {users_needing_review?.pending_evaluations ?? 0}
              </span>
            </div>

            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-[#21202E]/40 border border-white/5 hover:bg-[#21202E] hover:border-white/10 transition-all cursor-pointer"
              onClick={() => navigate("/users")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-white font-medium">Open Alerts</span>
              </div>
              <span className="text-xs font-bold text-white bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">
                {users_needing_review?.open_alerts ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* HSS Distribution */}
        <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            HSS Distribution
          </h3>
          <p className="text-[11px] text-[#89899C] font-medium mb-4">
            Health Stability Score cohorts across registered population
          </p>
          
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs text-slate-300 font-medium">Stable (80-100)</span>
                <span className="text-xs font-bold text-emerald-400">
                  {hss_distribution?.stable?.count ?? 0} users · {hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs text-slate-300 font-medium">Moderate (60-79)</span>
                <span className="text-xs font-bold text-amber-400">
                  {hss_distribution?.moderate?.count ?? 0} users · {hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 rounded-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs text-slate-300 font-medium">Elevated Risk (50-59)</span>
                <span className="text-xs font-bold text-[#E55F37]">
                  {hss_distribution?.elevated_risk?.count ?? 0} users · {hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 rounded-full bg-[#E55F37] transition-all duration-500" 
                  style={{ width: `${hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs text-slate-300 font-medium">Critical (&lt;50)</span>
                <span className="text-xs font-bold text-red-400">
                  {hss_distribution?.critical?.count ?? 0} users · {hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 rounded-full bg-red-500 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Activity — Last 7 Days */}
      <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10 mb-6">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
          User Activity (Last 7 Days)
        </h3>
        <p className="text-[11px] text-[#89899C] font-medium mb-4">
          Clinical telemetry events recorded in the rolling week
        </p>

        {Object.values(user_activity).reduce((a, b) => a + b, 0) === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-2xl">
            No user activity recorded this week.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="p-3.5 bg-[#21202E]/40 border border-white/5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-[#89899C] uppercase block mb-1">Meals</span>
              <span className="text-xl font-bold text-white">{user_activity.meals}</span>
            </div>
            <div className="p-3.5 bg-[#21202E]/40 border border-white/5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-[#89899C] uppercase block mb-1">Exercise</span>
              <span className="text-xl font-bold text-white">{user_activity.exercise}</span>
            </div>
            <div className="p-3.5 bg-[#21202E]/40 border border-white/5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-[#89899C] uppercase block mb-1">Vitals</span>
              <span className="text-xl font-bold text-white">{user_activity.vitals}</span>
            </div>
            <div className="p-3.5 bg-[#21202E]/40 border border-white/5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-[#89899C] uppercase block mb-1">Sleep</span>
              <span className="text-xl font-bold text-white">{user_activity.sleep}</span>
            </div>
            <div className="p-3.5 bg-[#21202E]/40 border border-white/5 rounded-xl text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-[#89899C] uppercase block mb-1">Symptoms</span>
              <span className={`text-xl font-bold ${user_activity.symptoms > 0 ? "text-amber-400" : "text-white"}`}>
                {user_activity.symptoms}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Library & Recent Admin Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Content Library */}
        <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Content Library
          </h3>
          <p className="text-[11px] text-[#89899C] font-medium mb-4">
            Manage application recipes and exercises
          </p>

          <div className="grid grid-cols-2 gap-3.5 mb-4">
            <div className="p-4 bg-[#21202E]/40 border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#89899C] uppercase block">Recipes</span>
                <span className="text-2xl font-bold text-white mt-1 block">{content_library.recipes}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37]">
                <Utensils size={18} />
              </div>
            </div>

            <div className="p-4 bg-[#21202E]/40 border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#89899C] uppercase block">Exercises</span>
                <span className="text-2xl font-bold text-white mt-1 block">{content_library.exercises}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37]">
                <Dumbbell size={18} />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => navigate("/foods")}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#21202E] border border-white/10 hover:bg-[#36272B] hover:border-[#E55F37]/50 hover:text-[#E55F37] rounded-xl transition-all text-center cursor-pointer"
            >
              Food Library
            </button>
            <button
              onClick={() => navigate("/exercises")}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#21202E] border border-white/10 hover:bg-[#36272B] hover:border-[#E55F37]/50 hover:text-[#E55F37] rounded-xl transition-all text-center cursor-pointer"
            >
              Exercise Library
            </button>
          </div>
        </div>

        {/* Recent Admin Activity */}
        <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
              Recent Admin Activity
            </h3>
            <p className="text-[11px] text-[#89899C] font-medium mb-4">
              Real-time audit log of administrative events
            </p>

            {recent_activity && recent_activity.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recent_activity.map((act, i) => {
                  const formattedAction = act.action.charAt(0).toUpperCase() + act.action.slice(1);
                  
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
                    <div key={act.id || i} className="flex justify-between items-start text-xs p-2.5 bg-[#21202E]/40 border border-white/5 rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-4 h-4 rounded-full bg-[#36272B] flex items-center justify-center text-[8px] font-bold text-[#E55F37] uppercase">
                            {act.admin_name ? act.admin_name.charAt(0) : "A"}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-300">{act.admin_name || "Admin"}</span>
                        </div>
                        <span className="font-semibold text-white">{formattedAction} {act.target_type}</span>
                        <span className="text-[10px] text-[#89899C] font-medium">{act.target_name}</span>
                      </div>
                      <span className="text-[9px] text-[#89899C] font-semibold uppercase">{formattedTime}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-2xl my-auto">
                No recent administrative activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
