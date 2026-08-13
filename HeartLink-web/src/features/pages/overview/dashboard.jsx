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
            <Skeleton className="w-32 h-3 mb-3" />
            <Skeleton className="w-72 h-8" />
          </div>
          <Skeleton className="w-40 h-8 rounded-full" />
        </div>

        {/* Quick Actions Skeleton */}
        <Skeleton className="w-full h-[80px] rounded-xl mb-6" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="w-full h-[100px] rounded-xl" />
          <Skeleton className="w-full h-[100px] rounded-xl" />
          <Skeleton className="w-full h-[100px] rounded-xl" />
          <Skeleton className="w-full h-[100px] rounded-xl" />
        </div>

        {/* Main Content Side-by-Side Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Skeleton className="w-full h-[200px] rounded-xl" />
          <Skeleton className="w-full h-[200px] rounded-xl" />
        </div>

        {/* User Activity Skeleton */}
        <Skeleton className="w-full h-[120px] rounded-xl mb-6" />

        {/* Bottom Panel Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="w-full h-[180px] rounded-xl" />
          <Skeleton className="w-full h-[180px] rounded-xl" />
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
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
            Operations Console
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            HEARTLINK ADMIN.
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Monitor users, app activity, HSS, recommendations, and content.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] tracking-widest uppercase"
          style={{ borderColor: "rgba(15,23,42,0.1)", color: "rgba(15,23,42,0.35)" }}
        >
          Last sync: Just now
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/foods")}
            className="flex items-center justify-center gap-2 p-3 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Utensils size={14} className="text-slate-500" /> Add Recipe
          </button>
          <button
            onClick={() => navigate("/exercises")}
            className="flex items-center justify-center gap-2 p-3 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Dumbbell size={14} className="text-slate-500" /> Add Exercise
          </button>
          <button
            onClick={() => navigate("/users")}
            className="flex items-center justify-center gap-2 p-3 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <User size={14} className="text-slate-500" /> View Users
          </button>
          <button
            onClick={() => navigate("/cases")}
            className="flex items-center justify-center gap-2 p-3 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ClipboardList size={14} className="text-slate-500" /> Review Cases
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users</span>
            <User size={15} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{kpi?.total_users ?? 0}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Registered accounts</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Users</span>
            <Activity size={15} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-emerald-600">{kpi?.active_users ?? 0}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Active this week</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average HSS</span>
            <HeartPulse size={15} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{kpi?.avg_hss ?? 0}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Mean latest score</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          {kpi?.open_alerts > 0 && <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500" />}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Alerts</span>
            <AlertTriangle size={15} className={kpi?.open_alerts > 0 ? "text-red-500 animate-pulse" : "text-slate-400"} />
          </div>
          <div>
            <h3 className={`text-xl font-bold ${kpi?.open_alerts > 0 ? "text-red-600" : "text-slate-900"}`}>{kpi?.open_alerts ?? 0}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Unresolved system flags</p>
          </div>
        </div>
      </div>

      {/* Users Needing Review & HSS Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Users Needing Review */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
            Users Needing Review
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">
            Items flagged for verification and analysis
          </p>
          
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/55 transition-colors cursor-pointer"
              onClick={() => navigate("/users")}
            >
              <span className="text-xs text-slate-700 font-medium">Critical HSS Users</span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {users_needing_review?.critical_hss ?? 0}
              </span>
            </div>

            <div 
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/55 transition-colors cursor-pointer"
              onClick={() => navigate("/users")}
            >
              <span className="text-xs text-slate-700 font-medium">Symptoms Recorded</span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {users_needing_review?.symptoms_recorded ?? 0}
              </span>
            </div>

            <div 
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/55 transition-colors cursor-pointer"
              onClick={() => navigate("/cases")}
            >
              <span className="text-xs text-slate-700 font-medium">Pending Evaluations</span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {users_needing_review?.pending_evaluations ?? 0}
              </span>
            </div>

            <div 
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/55 transition-colors cursor-pointer"
              onClick={() => navigate("/users")}
            >
              <span className="text-xs text-slate-700 font-medium">Open Alerts</span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {users_needing_review?.open_alerts ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* HSS Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
            HSS Distribution
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">
            Latest Health Stability Score tiers across users
          </p>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-slate-700 font-medium">Stable (80-100)</span>
                <span className="text-xs font-semibold text-slate-950">
                  {hss_distribution?.stable?.count ?? 0} users · {hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-slate-800 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.stable?.percentage ?? hss_distribution?.stable ?? 0}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-slate-700 font-medium">Moderate (60-79)</span>
                <span className="text-xs font-semibold text-amber-600">
                  {hss_distribution?.moderate?.count ?? 0} users · {hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.moderate?.percentage ?? hss_distribution?.moderate ?? 0}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-slate-700 font-medium">Elevated Risk (50-59)</span>
                <span className="text-xs font-semibold text-orange-500">
                  {hss_distribution?.elevated_risk?.count ?? 0} users · {hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-orange-500 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.elevated_risk?.percentage ?? hss_distribution?.elevated_risk ?? 0}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-slate-700 font-medium">Critical (&lt;50)</span>
                <span className="text-xs font-semibold text-red-500">
                  {hss_distribution?.critical?.count ?? 0} users · {hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-red-500 transition-all duration-500" 
                  style={{ width: `${hss_distribution?.critical?.percentage ?? hss_distribution?.critical ?? 0}%` }} 
                />
              </div>
            </div>
          </div>
      </div>
      </div>

      {/* User Activity — Last 7 Days */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
          User Activity
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">
          Qualifying application events in the rolling last 7 days
        </p>

        {Object.values(user_activity).reduce((a, b) => a + b, 0) === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            No user activity recorded this week.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meals</span>
              <span className="text-lg font-bold text-slate-800">{user_activity.meals}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Exercise</span>
              <span className="text-lg font-bold text-slate-800">{user_activity.exercise}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vitals</span>
              <span className="text-lg font-bold text-slate-800">{user_activity.vitals}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sleep</span>
              <span className="text-lg font-bold text-slate-800">{user_activity.sleep}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Symptoms Recorded</span>
              <span className={`text-lg font-bold ${user_activity.symptoms > 0 ? "text-amber-600" : "text-slate-800"}`}>
                {user_activity.symptoms}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Library & Recent Admin Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Content Library */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
            Content Library
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">
            Manage application recipes and exercises
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Recipes</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{content_library.recipes}</span>
              </div>
              <Utensils size={20} className="text-slate-300" />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Exercises</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{content_library.exercises}</span>
              </div>
              <Dumbbell size={20} className="text-slate-300" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/foods")}
              className="flex-1 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
            >
              Food Library
            </button>
            <button
              onClick={() => navigate("/exercises")}
              className="flex-1 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
            >
              Exercise Library
            </button>
          </div>
        </div>

        {/* Recent Admin Activity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Recent Admin Activity
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">
              Real-time log of administrative events
            </p>

            {recent_activity && recent_activity.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recent_activity.map((act, i) => {
                  const formattedAction = act.action.charAt(0).toUpperCase() + act.action.slice(1);
                  const formattedType = act.target_type.charAt(0).toUpperCase() + act.target_type.slice(1);
                  
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
                    <div key={act.id || i} className="flex justify-between items-start text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-600 uppercase">
                            {act.admin_name ? act.admin_name.charAt(0) : "A"}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">{act.admin_name || "Admin"}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{formattedAction} {act.target_type}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{act.target_name}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">{formattedTime}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl my-auto">
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
