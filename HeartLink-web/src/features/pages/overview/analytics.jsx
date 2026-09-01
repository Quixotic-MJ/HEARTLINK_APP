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
  Sparkles,
  Utensils,
  Dumbbell
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

// Custom dark mode tooltip for recharts
const CustomDarkTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161616] border border-white/10 rounded-xl p-3 shadow-2xl text-xs select-none">
        <p className="font-bold text-white mb-1.5 border-b border-white/10 pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 my-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-[#89899C] font-medium">{entry.name}:</span>
            </div>
            <span className="font-bold text-white">{entry.value?.toLocaleString?.() ?? entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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
            <Skeleton className="w-32 h-3 mb-3 bg-white/10" />
            <Skeleton className="w-72 h-8 bg-white/10" />
          </div>
          <Skeleton className="w-40 h-8 rounded-full bg-white/10" />
        </div>
        <Skeleton className="w-96 h-10 rounded-2xl mb-6 bg-white/10" />
        <Skeleton className="w-full h-[400px] rounded-2xl bg-white/10" />
      </AdminLayout>
    );
  }

  const { demographics, wellness_outcomes, content_efficacy } = data;

  return (
    <AdminLayout>
      {/* Page Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
            <Sparkles size={11} />
            <span>System Intelligence</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
            Analytics & Reporting
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Understand HeartLink users, clinical activity, HSS telemetry trends, and content usage.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3.5 py-2 bg-[#1A1A1A] border border-white/10 rounded-xl text-xs font-semibold text-white outline-none cursor-pointer hover:border-white/20 transition-all"
          >
            <option value="30days" className="bg-[#161616] text-white">Last 30 Days</option>
            <option value="3months" className="bg-[#161616] text-white">Last 3 Months</option>
            <option value="6months" className="bg-[#161616] text-white">Last 6 Months</option>
            <option value="12months" className="bg-[#161616] text-white">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="bg-[#1A1A1A] p-1 rounded-2xl inline-flex flex-wrap border border-white/10 mb-6 w-full sm:w-auto">
        <button
          onClick={() => setActiveTab("demographics")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "demographics"
              ? "bg-[#E55F37] text-white shadow-sm shadow-[#E55F37]/25"
              : "text-[#89899C] hover:text-white hover:bg-white/5"
          }`}
        >
          <Users size={14} />
          USER ADOPTION
        </button>
        <button
          onClick={() => setActiveTab("outcomes")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "outcomes"
              ? "bg-[#E55F37] text-white shadow-sm shadow-[#E55F37]/25"
              : "text-[#89899C] hover:text-white hover:bg-white/5"
          }`}
        >
          <HeartPulse size={14} />
          HSS TRENDS
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "content"
              ? "bg-[#E55F37] text-white shadow-sm shadow-[#E55F37]/25"
              : "text-[#89899C] hover:text-white hover:bg-white/5"
          }`}
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
            <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.22em]">
                  Total Sign-ups
                </p>
                <div className="w-8 h-8 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37]">
                  <Users size={15} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">
                {demographics.total_signups.toLocaleString()}
              </p>
              <p className="text-[10px] font-bold mt-2 w-fit px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {demographics.signups_growth} from previous period
              </p>
            </div>

            <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.22em]">
                  Total Activity Logs
                </p>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Activity size={15} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">
                {demographics.total_records.toLocaleString()}
              </p>
              <p className="text-[10px] font-bold mt-2 w-fit px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {demographics.records_growth} vs last period
              </p>
            </div>

            <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.22em]">
                  Archived Accounts
                </p>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <TrendingUp size={15} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">
                {demographics.archived_accounts}
              </p>
              <p className="text-[10px] font-bold text-[#89899C] mt-2 w-fit px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                {demographics.churn_rate} archiving rate
              </p>
            </div>
          </div>

          {/* Monthly Active Users Chart */}
          <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white tracking-tight mb-5">
              Monthly Active Users (MAU) Trend
            </h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.monthly_dau} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#89899C' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#89899C' }} />
                  <Tooltip content={<CustomDarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="dau" name="Active Users" fill="#E55F37" radius={[6, 6, 0, 0]} barSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Grid: Symptom Records & Activity Volume */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white tracking-tight mb-4">
                Most Frequently Recorded Symptoms
              </h3>
              {data.symptoms_frequency && data.symptoms_frequency.length > 0 ? (
                <div className="space-y-2.5">
                  {data.symptoms_frequency.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-[#21202E]/40 hover:bg-[#21202E] transition-colors">
                      <span className="text-xs font-semibold text-white">{item.name}</span>
                      <span className="text-xs font-bold text-[#E55F37] bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">{item.count} logs</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#89899C] italic">No symptoms recorded.</p>
              )}
            </div>

            <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white tracking-tight mb-4">
                Activity Volume Over Time
              </h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.activity_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#89899C' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#89899C' }} />
                    <Tooltip content={<CustomDarkTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#89899C' }} />
                    <Area type="monotone" dataKey="meals" name="Meals" stroke="#E55F37" fill="#E55F37" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="exercises" name="Exercises" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="sleep" name="Sleep" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
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
          <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">
              HSS Population Tiers Over Time
            </h3>
            <p className="text-xs text-[#89899C] mb-6 font-medium">
              Displays how registered users distribute across HSS tiers at the end of each calendar month.
            </p>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wellness_outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#89899C' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#89899C' }} />
                  <Tooltip content={<CustomDarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                  <Bar dataKey="critical" name="Critical" stackId="a" fill="#EF4444" radius={[0, 0, 4, 4]} barSize={38} />
                  <Bar dataKey="elevated_risk" name="Elevated Risk" stackId="a" fill="#F97316" />
                  <Bar dataKey="moderate" name="Moderate" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="stable" name="Stable" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Grid: Content Library by HSS Target Tier */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white tracking-tight mb-4">
                Recipe Library by HSS Target Tier
              </h3>
              <div className="space-y-2.5">
                {Object.entries(data.content_distribution.recipes).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-[#21202E]/40">
                    <span className="text-xs font-semibold text-white capitalize">{tier}</span>
                    <span className="text-xs font-bold text-[#E55F37] bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">{count} recipes</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white tracking-tight mb-4">
                Exercise Library by HSS Target Tier
              </h3>
              <div className="space-y-2.5">
                {Object.entries(data.content_distribution.exercises).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-[#21202E]/40">
                    <span className="text-xs font-semibold text-white capitalize">{tier}</span>
                    <span className="text-xs font-bold text-[#E55F37] bg-[#161616] px-2.5 py-0.5 rounded-lg border border-white/10">{count} routines</span>
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
          <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white tracking-tight mb-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37]">
                <Utensils size={15} />
              </div>
              <span>Most Logged Recipes</span>
            </h3>
            <div className="space-y-3">
              {content_efficacy.top_recipes.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl border border-white/5 bg-[#21202E]/40 hover:bg-[#21202E] transition-colors">
                  <div className="flex gap-3 items-center">
                    <span className="w-6 h-6 rounded-md bg-[#161616] border border-white/10 flex items-center justify-center text-xs font-bold text-[#E55F37]">{idx + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{item.completions.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-widest text-[#89899C] font-semibold">logs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Exercises */}
          <div className="bg-[#1A1A1A] p-5 sm:p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white tracking-tight mb-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37]">
                <Dumbbell size={15} />
              </div>
              <span>Most Logged Exercises</span>
            </h3>
            <div className="space-y-3">
              {content_efficacy.top_exercises.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl border border-white/5 bg-[#21202E]/40 hover:bg-[#21202E] transition-colors">
                  <div className="flex gap-3 items-center">
                    <span className="w-6 h-6 rounded-md bg-[#161616] border border-white/10 flex items-center justify-center text-xs font-bold text-[#E55F37]">{idx + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{item.completions.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-widest text-[#89899C] font-semibold">sessions</p>
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
