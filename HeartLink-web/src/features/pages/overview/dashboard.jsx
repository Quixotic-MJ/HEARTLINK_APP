import React from "react";
import {
  User,
  AlertTriangle,
  ArrowRight,
  FileSearch,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <Skeleton className="w-full h-[200px] rounded-xl" />
          <Skeleton className="w-full h-[200px] rounded-xl" />
          <Skeleton className="w-full h-[200px] rounded-xl" />
        </div>

        {/* CSS Population Distribution Skeleton */}
        <Skeleton className="w-full h-[200px] rounded-xl mb-6" />

        {/* Recent System Activity Skeleton */}
        <Skeleton className="w-full h-[250px] rounded-xl" />
      </AdminLayout>
    );
  }

  const { kpi, css_distribution, recent_activity, weekly_engagement } = data;

  return (
    <AdminLayout>
      {/* Page Title & Meta */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-3">
        <div>
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
            Analytics Overview
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            System Performance & Diagnostics.
          </h2>
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] tracking-widest uppercase"
          style={{ borderColor: "rgba(15,23,42,0.1)", color: "rgba(15,23,42,0.35)" }}
        >
          Last sync: Just now
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

        {/* Card 1: User Engagement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <span className="text-slate-900 font-semibold text-sm block mb-0.5 truncate">
                  User Engagement
                </span>
                <span className="text-slate-400 text-[10px] font-medium tracking-[0.22em] uppercase truncate block">
                  Registered Users
                </span>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <User size={14} style={{ color: "#0f172a" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold mb-1 truncate" style={{ color: "#0f172a" }}>
                  {kpi.total_users}
                </p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Total Users
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold text-emerald-600 mb-1 truncate">
                  {kpi.active_users}
                </p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Active Users
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <a href="#" className="text-[10px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
              View 42 archived/cancelled accounts
            </a>
          </div>
        </div>

        {/* Card 2: Content Efficacy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between min-w-0 relative overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: "#0f172a" }} />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <span className="text-slate-900 font-semibold text-sm block mb-0.5 truncate">
                  Content Library
                </span>
                <span className="text-slate-400 text-[10px] font-medium tracking-[0.22em] uppercase truncate block">
                  Active Recommendations
                </span>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <HeartPulse size={14} style={{ color: "#0f172a" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border min-w-0" style={{ backgroundColor: "rgba(15,23,42,0.03)", borderColor: "rgba(15,23,42,0.06)" }}>
                <p className="text-lg font-semibold mb-1 truncate" style={{ color: "#0f172a" }}>{kpi.total_recipes}</p>
                <p className="text-[9px] font-medium tracking-[0.18em] uppercase truncate" style={{ color: "#0f172a", opacity: 0.5 }}>
                  Active Recipes
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold text-slate-700 mb-1 truncate">
                  {kpi.total_exercises}
                </p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Active Exercises
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: System Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between min-w-0 relative overflow-hidden">
          {/* Top accent — subtle red */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <span className="text-slate-900 font-semibold text-sm block mb-0.5 truncate">
                  Wellness Alerts
                </span>
                <span className="text-slate-400 text-[10px] font-medium tracking-[0.22em] uppercase truncate block">
                  Health & Dietary Warnings
                </span>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(239,68,68,0.06)" }}
              >
                <AlertTriangle size={14} className="text-red-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border min-w-0" style={{ backgroundColor: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.08)" }}>
                <p className="text-lg font-semibold text-red-600 mb-1 truncate">{kpi.unresolved_alerts}</p>
                <p className="text-[9px] font-medium text-red-500 tracking-[0.18em] uppercase truncate">
                  Unresolved
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold text-slate-700 mb-1 truncate">{kpi.total_alerts}</p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Total Triggered
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly User Engagement Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
          >
            <HeartPulse size={13} style={{ color: "#0f172a" }} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            Weekly User Engagement
          </h3>
        </div>
        <div className="h-64 w-full">
          {weekly_engagement ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly_engagement} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="logins" name="Daily Logins" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLogins)" />
                <Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No engagement data available.</div>
          )}
        </div>
      </div>

      {/* CSS Population Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
          >
            <User size={13} style={{ color: "#0f172a" }} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            User Base CSS Distribution
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-medium text-slate-700 text-xs">
                Stable <span className="text-slate-400 font-normal ml-1">(Score 80-100)</span>
              </span>
              <span className="font-semibold text-xs" style={{ color: "#0f172a" }}>{css_distribution.stable}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full" style={{ backgroundColor: "#0f172a", width: `${css_distribution.stable}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-medium text-slate-700 text-xs">
                Monitor Closely <span className="text-slate-400 font-normal ml-1">(Score 50-79)</span>
              </span>
              <span className="font-semibold text-amber-500 text-xs">{css_distribution.monitor}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${css_distribution.monitor}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-medium text-slate-700 text-xs">
                Consider Check-up <span className="text-slate-400 font-normal ml-1">(Score &lt; 50)</span>
              </span>
              <span className="font-semibold text-red-500 text-xs">{css_distribution.critical}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${css_distribution.critical}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent User Milestones */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            Recent User Milestones & Alerts
          </h3>
          <button className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors">
            View Full Audit Trail <ArrowRight size={13} />
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-[0.18em] w-1/4">
                  Timestamp
                </th>
                <th className="py-3 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-[0.18em] w-1/4">
                  Event Type
                </th>
                <th className="py-3 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-[0.18em] w-1/4">
                  User ID
                </th>
                <th className="py-3 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-[0.18em] w-1/4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent_activity.map((log, index) => {
                // Parse timestamp
                const dateObj = new Date(log.timestamp);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                
                // Color mapping
                let dotColor = "#0f172a";
                let tagBg = "rgba(15,23,42,0.05)";
                let tagColor = "#0f172a";
                
                if (log.status === "error") {
                  dotColor = "#ef4444";
                  tagBg = "rgba(239,68,68,0.06)";
                  tagColor = "#ef4444";
                } else if (log.status === "neutral") {
                  dotColor = "#cbd5e1";
                  tagBg = "rgba(15,23,42,0.04)";
                  tagColor = "rgba(15,23,42,0.45)";
                }

                return (
                  <tr 
                    key={index} 
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/users/${log.entity}`)}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                        <div>
                          <p className="text-slate-900 font-medium text-xs">{timeStr}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">{dateStr}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="inline-flex text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                        style={{ backgroundColor: tagBg, color: tagColor }}
                      >
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-slate-900 font-medium text-xs">{log.entity}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{log.detail}</p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button className="inline-flex p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                        <FileSearch size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
