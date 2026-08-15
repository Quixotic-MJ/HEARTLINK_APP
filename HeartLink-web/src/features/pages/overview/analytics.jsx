import React, { useState, useEffect } from "react";
import {
  Users,
  Bell,
  Download,
  Calendar,
  Activity,
  HeartPulse,
  ChevronDown,
  TrendingUp,
  Apple,
} from "lucide-react";
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from "recharts";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("demographics");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const analyticsData = await apiFetch(`/api/admin/analytics?period=${period}`);
        setData(analyticsData);
      } catch (err) {
        console.error("Failed to fetch analytics data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const getExportText = () => {
    switch (activeTab) {
      case "demographics":
        return "Export User Data";
      case "outcomes":
        return "Export HSS Outcomes";
      case "content":
        return "Export Content Report";
      default:
        return "Export Report";
    }
  };

  if (loading || !data) {
    return (
      <AdminLayout>
        {/* Skeleton for Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-3">
          <div>
            <Skeleton className="w-32 h-3 mb-3" />
            <Skeleton className="w-72 h-8" />
          </div>
          <Skeleton className="w-40 h-8 rounded-full" />
        </div>
        <Skeleton className="w-96 h-10 rounded-xl mb-6" />
        <Skeleton className="w-full h-[400px] rounded-xl" />
      </AdminLayout>
    );
  }

  const { demographics, wellness_outcomes, content_efficacy } = data;

  return (
    <AdminLayout>
      {/* Page Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-8 gap-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
            System Intelligence
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Analytics & Reporting.
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Understand HeartLink users, activity, HSS trends, and content usage.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div
        className="bg-white p-1 rounded-xl inline-flex flex-wrap border mb-6 w-full sm:w-auto"
        style={{ borderColor: "rgba(15,23,42,0.08)" }}
      >
        <button
          onClick={() => setActiveTab("demographics")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === "demographics"
              ? "text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          style={activeTab === "demographics" ? { backgroundColor: "rgba(15,23,42,0.04)" } : {}}
        >
          <Users size={14} />
          USER ADOPTION
        </button>
        <button
          onClick={() => setActiveTab("outcomes")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === "outcomes"
              ? "text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          style={activeTab === "outcomes" ? { backgroundColor: "rgba(15,23,42,0.04)" } : {}}
        >
          <HeartPulse size={14} />
          HSS TRENDS
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === "content"
              ? "text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          style={activeTab === "content" ? { backgroundColor: "rgba(15,23,42,0.04)" } : {}}
        >
          <Apple size={14} />
          CONTENT USAGE
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: DEMOGRAPHICS & ADOPTION            */}
      {/* ========================================= */}
      {activeTab === "demographics" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Engagement Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.22em]">
                  Total Sign-ups
                </p>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
                >
                  <Users size={13} style={{ color: "#0f172a" }} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                {demographics.total_signups.toLocaleString()}
              </p>
              <p
                className="text-[9px] font-semibold mt-2 w-fit px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#059669" }}
              >
                {demographics.signups_growth} from previous period
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.22em]">
                  Total Activity Logs
                </p>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
                >
                  <Activity size={13} style={{ color: "#0f172a" }} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                {demographics.total_records.toLocaleString()}
              </p>
              <p
                className="text-[9px] font-semibold mt-2 w-fit px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#059669" }}
              >
                {demographics.records_growth} vs last period
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.22em]">
                  Archived Users
                </p>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(239,68,68,0.06)" }}
                >
                  <TrendingUp size={13} className="text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                {demographics.archived_accounts}
              </p>
              <p
                className="text-[9px] font-semibold text-slate-500 mt-2 w-fit px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                {demographics.churn_rate} archiving rate
              </p>
            </div>
          </div>

          {/* Monthly Active Users Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5">
              Monthly Active Users (MAU) Trend
            </h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.monthly_dau} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="dau" name="Active Users" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Grid: Symptom Records & Activity Volume */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5">
                Most Frequently Recorded Symptoms
              </h3>
              {data.symptoms_frequency && data.symptoms_frequency.length > 0 ? (
                <div className="space-y-3">
                  {data.symptoms_frequency.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                      <span className="text-xs font-bold text-slate-600">{item.count} logs</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No symptoms recorded.</p>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5">
                Activity Volume Over Time
              </h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.activity_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="meals" name="Meals" stroke="#0f172a" fill="rgba(15,23,42,0.05)" strokeWidth={2} />
                    <Area type="monotone" dataKey="exercises" name="Exercises" stroke="#f59e0b" fill="rgba(245,158,11,0.05)" strokeWidth={2} />
                    <Area type="monotone" dataKey="sleep" name="Sleep" stroke="#3b82f6" fill="rgba(59,130,246,0.05)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: HSS TRENDS                         */}
      {/* ========================================= */}
      {activeTab === "outcomes" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-2">
              HSS Population Tiers Over Time
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Displays how registered users distribute across HSS tiers at the end of each calendar month. Excludes users with no HSS record computed by that date.
            </p>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wellness_outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} barSize={40} />
                  <Bar dataKey="elevated_risk" name="Elevated Risk" stackId="a" fill="#f97316" />
                  <Bar dataKey="moderate" name="Moderate" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="stable" name="Stable" stackId="a" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Grid: Content Library by HSS Target Tier */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5">
                Recipe Library by HSS Target Tier
              </h3>
              <div className="space-y-2">
                {Object.entries(data.content_distribution.recipes).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-800">{tier}</span>
                    <span className="text-xs font-bold text-slate-600">{count} recipes</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5">
                Exercise Library by HSS Target Tier
              </h3>
              <div className="space-y-2">
                {Object.entries(data.content_distribution.exercises).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-800">{tier}</span>
                    <span className="text-xs font-bold text-slate-600">{count} routines</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 3: CONTENT USAGE                      */}
      {/* ========================================= */}
      {activeTab === "content" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-300">
          {/* Top Recipes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <Apple size={13} style={{ color: "#0f172a" }} />
              </div>
              Most Logged Recipes
            </h3>
            <div className="space-y-4">
              {content_efficacy.top_recipes.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex gap-3 items-center">
                    <span className="text-slate-400 font-bold text-xs">{idx + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">{item.completions.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400">logs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Exercises */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <HeartPulse size={13} style={{ color: "#0f172a" }} />
              </div>
              Most Logged Exercises
            </h3>
            <div className="space-y-4">
              {content_efficacy.top_exercises.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex gap-3 items-center">
                    <span className="text-slate-400 font-bold text-xs">{idx + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">{item.completions.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400">sessions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Analytics;
