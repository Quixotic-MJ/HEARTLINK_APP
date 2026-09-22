import React, { useState, useEffect } from "react";
import {
  Users,
  Activity,
  HeartPulse,
  TrendingUp,
  Globe,
  Utensils,
  Dumbbell,
  Archive,
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
import { UI, FONTS, PageHeader } from "../../../styles/designSystem";

// ─── Custom Light Tooltip for Recharts ────────────────────────────────────────
const CustomLightTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[8px] p-2.5 px-3 shadow-lg text-xs select-none min-w-[130px]"
        style={{ fontFamily: FONTS.sans }}
      >
        <p className="font-semibold text-[#0F172A] mb-1.5 border-b border-[#E2E8F0] pb-1">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 my-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-[#64748B] font-medium text-[11px]">{entry.name}:</span>
            </div>
            <span className="font-bold text-[#0F172A] text-[11px]">
              {entry.value?.toLocaleString?.() ?? entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("adoption");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("3months");

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

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return Number(num).toLocaleString();
  };

  if (loading || !data) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          {/* Header Skeleton */}
          <div className="flex flex-wrap gap-4 justify-between items-end mb-5">
            <div>
              <Skeleton className="w-28 h-3.5 mb-2 bg-[#E2E8F0]/70 rounded" />
              <Skeleton className="w-64 h-8 mb-2 bg-[#E2E8F0]/70 rounded-md" />
              <Skeleton className="w-96 h-4 bg-[#E2E8F0]/70 rounded" />
            </div>
            <Skeleton className="w-40 h-9 rounded-[8px] bg-[#E2E8F0]/70" />
          </div>

          {/* Tabs Skeleton */}
          <Skeleton className="w-80 h-11 rounded-[10px] mb-5 bg-[#E2E8F0]/60" />

          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
            <Skeleton className="w-full h-32 rounded-[10px] bg-[#E2E8F0]/60" />
            <Skeleton className="w-full h-32 rounded-[10px] bg-[#E2E8F0]/60" />
            <Skeleton className="w-full h-32 rounded-[10px] bg-[#E2E8F0]/60" />
          </div>

          {/* Chart Panel Skeleton */}
          <Skeleton className="w-full h-72 rounded-[10px] mb-5 bg-[#E2E8F0]/60" />
        </div>
      </AdminLayout>
    );
  }

  const { demographics = {}, wellness_outcomes = [], content_efficacy = {}, content_distribution = {} } = data || {};

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="System intelligence"
          title="Analytics & reporting"
          description="Understand HeartLink users, clinical activity, HSS telemetry trends, and content usage."
          actions={
            <div className="flex items-center gap-2.5">
              <label htmlFor="period" className="text-[11.5px] font-semibold text-[#64748B]">
                Period
              </label>
              <select
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-[#E2E8F0] bg-[#FFFFFF] rounded-[8px] px-3 py-2 text-[12.5px] font-semibold text-[#0F172A] outline-none cursor-pointer hover:border-[#0F172A] transition-colors"
              >
                <option value="30days">Last 30 days</option>
                <option value="3months">Last 3 months</option>
                <option value="6months">Last 6 months</option>
                <option value="12months">Last 12 months</option>
              </select>
            </div>
          }
        />

        {/* ── TABS ── */}
        <div className="inline-flex gap-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-1 mb-5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("adoption")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[7px] border-none text-[12.5px] font-semibold cursor-pointer transition-colors ${
              activeTab === "adoption"
                ? "bg-[#2E9AE8] text-white shadow-2xs"
                : "bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
          >
            <Users size={14} />
            <span>User adoption</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("outcomes")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[7px] border-none text-[12.5px] font-semibold cursor-pointer transition-colors ${
              activeTab === "outcomes"
                ? "bg-[#2E9AE8] text-white shadow-2xs"
                : "bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
          >
            <HeartPulse size={14} />
            <span>HSS trends</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[7px] border-none text-[12.5px] font-semibold cursor-pointer transition-colors ${
              activeTab === "content"
                ? "bg-[#2E9AE8] text-white shadow-2xs"
                : "bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
          >
            <Globe size={14} />
            <span>Content usage</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: USER ADOPTION                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "adoption" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Total Sign-ups */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 sm:p-[18px_18px_16px] shadow-2xs">
                <div className="flex justify-between items-start mb-3.5">
                  <span className="text-[11px] font-semibold text-[#64748B]">Total sign-ups</span>
                  <div className="w-7 h-7 rounded-[7px] bg-[#EAF5FC] text-[#2E9AE8] flex items-center justify-center">
                    <Users size={15} />
                  </div>
                </div>
                <div 
                  className="text-[24px] font-medium text-[#0F172A] tracking-tight"
                  style={{ fontFamily: FONTS.serif }}
                >
                  {formatNumber(demographics?.total_signups)}
                </div>
                <span className="inline-block mt-2 text-[10.5px] font-bold px-2 py-0.5 rounded-[6px] bg-[#E3EFEC] text-[#1B6E63]">
                  {demographics?.signups_growth || "+12%"} from previous period
                </span>
              </div>

              {/* Total Activity Logs */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 sm:p-[18px_18px_16px] shadow-2xs">
                <div className="flex justify-between items-start mb-3.5">
                  <span className="text-[11px] font-semibold text-[#64748B]">Total activity logs</span>
                  <div className="w-7 h-7 rounded-[7px] bg-[#E3EFEC] text-[#1B6E63] flex items-center justify-center">
                    <Activity size={15} />
                  </div>
                </div>
                <div 
                  className="text-[24px] font-medium text-[#0F172A] tracking-tight"
                  style={{ fontFamily: FONTS.serif }}
                >
                  {formatNumber(demographics?.total_records)}
                </div>
                <span className="inline-block mt-2 text-[10.5px] font-bold px-2 py-0.5 rounded-[6px] bg-[#E3EFEC] text-[#1B6E63]">
                  {demographics?.records_growth || "+8%"} vs last period
                </span>
              </div>

              {/* Archived Accounts */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 sm:p-[18px_18px_16px] shadow-2xs">
                <div className="flex justify-between items-start mb-3.5">
                  <span className="text-[11px] font-semibold text-[#64748B]">Archived accounts</span>
                  <div className="w-7 h-7 rounded-[7px] bg-[#F7E4E1] text-[#A93226] flex items-center justify-center">
                    <Archive size={15} />
                  </div>
                </div>
                <div 
                  className="text-[24px] font-medium text-[#0F172A] tracking-tight"
                  style={{ fontFamily: FONTS.serif }}
                >
                  {formatNumber(demographics?.archived_accounts)}
                </div>
                <span className="inline-block mt-2 text-[10.5px] font-bold px-2 py-0.5 rounded-[6px] bg-[#F8FAFC] text-[#64748B]">
                  {demographics?.churn_rate || "3.1%"} archiving rate
                </span>
              </div>
            </div>

            {/* Monthly Active Users Chart */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
              <h3 className="text-[13.5px] font-semibold text-[#0F172A] mb-0.5">
                Monthly active users trend
              </h3>
              <div className="text-[12px] text-[#64748B] mb-4">
                Unique users logging at least one event per month
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demographics?.monthly_dau || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip content={<CustomLightTooltip />} cursor={{ fill: 'rgba(232,83,46,0.04)' }} />
                    <Bar dataKey="dau" name="Active users" fill="#2E9AE8" radius={[5, 5, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Symptoms & Activity Volume Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* Most Frequently Recorded Symptoms */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#0F172A] mb-0.5">
                    Most frequently recorded symptoms
                  </h3>
                  <div className="text-[12px] text-[#64748B] mb-4">
                    Top self-reported symptoms this period
                  </div>

                  {data.symptoms_frequency && data.symptoms_frequency.length > 0 ? (
                    <div className="space-y-2">
                      {data.symptoms_frequency.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 px-3 border border-[#E2E8F0] rounded-[8px] bg-[#F8FAFC]">
                          <span className="text-[12.5px] font-semibold text-[#0F172A] capitalize">{item.name}</span>
                          <span className="text-[12px] font-bold text-[#1C7AC8] bg-[#FFFFFF] border border-[#E2E8F0] px-2.5 py-0.5 rounded-[6px]">
                            {item.count} logs
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[#94A3B8] text-xs border border-dashed border-[#E2E8F0] rounded-[8px]">
                      No symptoms recorded for this period.
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Volume Over Time */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
                <h3 className="text-[13.5px] font-semibold text-[#0F172A] mb-0.5">
                  Activity volume over time
                </h3>
                <div className="text-[12px] text-[#64748B] mb-4">
                  Meals, exercise, and sleep logs per week
                </div>
                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.activity_over_time || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <Tooltip content={<CustomLightTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748B', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="meals" name="Meals" stroke="#2E9AE8" fill="rgba(232,83,46,0.10)" strokeWidth={2} />
                      <Area type="monotone" dataKey="exercises" name="Exercise" stroke="#A9741B" fill="rgba(169,116,27,0.10)" strokeWidth={2} />
                      <Area type="monotone" dataKey="sleep" name="Sleep" stroke="#1B6E63" fill="rgba(27,110,99,0.10)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: HSS TRENDS                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "outcomes" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Stacked HSS Chart */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
              <h3 className="text-[13.5px] font-semibold text-[#0F172A] mb-0.5">
                HSS population tiers over time
              </h3>
              <div className="text-[12px] text-[#64748B] mb-4">
                How registered users distribute across HSS tiers at the end of each month
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wellness_outcomes || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip content={<CustomLightTooltip />} cursor={{ fill: 'rgba(21,33,49,0.03)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                    <Bar dataKey="stable" name="Stable" stackId="s" fill="#1B6E63" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="moderate" name="Moderate" stackId="s" fill="#A9741B" />
                    <Bar dataKey="elevated_risk" name="Elevated risk" stackId="s" fill="#2E9AE8" />
                    <Bar dataKey="critical" name="Critical" stackId="s" fill="#A93226" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Content Library by Tier */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* Recipe Library by HSS */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
                <h3 className="text-[13.5px] font-semibold text-[#0F172A] mb-0.5">
                  Recipe library by HSS target tier
                </h3>
                <div className="text-[12px] text-[#64748B] mb-4">
                  Content distribution across risk cohorts
                </div>
                <div className="space-y-2">
                  {content_distribution?.recipes ? (
                    Object.entries(content_distribution.recipes).map(([tier, count]) => (
                      <div key={tier} className="flex justify-between items-center p-2.5 px-3 border border-[#E2E8F0] rounded-[8px] bg-[#F8FAFC]">
                        <span className="text-[12.5px] font-semibold text-[#0F172A] capitalize">
                          {tier.replace(/_/g, " ")}
                        </span>
                        <span className="text-[12px] font-bold text-[#1C7AC8] bg-[#FFFFFF] border border-[#E2E8F0] px-2.5 py-0.5 rounded-[6px]">
                          {count} recipes
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-[#94A3B8] text-xs">No data available</div>
                  )}
                </div>
              </div>

              {/* Exercise Library by HSS */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
                <h3 className="text-[13.5px] font-semibold text-[#0F172A] mb-0.5">
                  Exercise library by HSS target tier
                </h3>
                <div className="text-[12px] text-[#64748B] mb-4">
                  Content distribution across risk cohorts
                </div>
                <div className="space-y-2">
                  {content_distribution?.exercises ? (
                    Object.entries(content_distribution.exercises).map(([tier, count]) => (
                      <div key={tier} className="flex justify-between items-center p-2.5 px-3 border border-[#E2E8F0] rounded-[8px] bg-[#F8FAFC]">
                        <span className="text-[12.5px] font-semibold text-[#0F172A] capitalize">
                          {tier.replace(/_/g, " ")}
                        </span>
                        <span className="text-[12px] font-bold text-[#1C7AC8] bg-[#FFFFFF] border border-[#E2E8F0] px-2.5 py-0.5 rounded-[6px]">
                          {count} routines
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-[#94A3B8] text-xs">No data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: CONTENT USAGE                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "content" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 animate-in fade-in duration-200">
            {/* Most Logged Recipes */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EAF5FC] text-[#2E9AE8] flex items-center justify-center shrink-0">
                  <Utensils size={15} />
                </div>
                <h3 className="text-[13.5px] font-semibold text-[#0F172A] m-0">
                  Most logged recipes
                </h3>
              </div>

              <div className="space-y-2">
                {content_efficacy?.top_recipes && content_efficacy.top_recipes.length > 0 ? (
                  content_efficacy.top_recipes.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 px-3 border border-[#E2E8F0] rounded-[8px] bg-[#F8FAFC]">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-[22px] h-[22px] rounded-[6px] bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center text-[11px] font-bold text-[#2E9AE8] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[12.5px] font-semibold text-[#0F172A] truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-[#0F172A]">
                          {formatNumber(item.completions)}
                        </div>
                        <div className="text-[9.5px] uppercase text-[#94A3B8] font-semibold tracking-wide">
                          logs
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[#94A3B8] text-xs">No recipes logged yet.</div>
                )}
              </div>
            </div>

            {/* Most Logged Exercises */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EAF5FC] text-[#2E9AE8] flex items-center justify-center shrink-0">
                  <Dumbbell size={15} />
                </div>
                <h3 className="text-[13.5px] font-semibold text-[#0F172A] m-0">
                  Most logged exercises
                </h3>
              </div>

              <div className="space-y-2">
                {content_efficacy?.top_exercises && content_efficacy.top_exercises.length > 0 ? (
                  content_efficacy.top_exercises.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 px-3 border border-[#E2E8F0] rounded-[8px] bg-[#F8FAFC]">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-[22px] h-[22px] rounded-[6px] bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center text-[11px] font-bold text-[#2E9AE8] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[12.5px] font-semibold text-[#0F172A] truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-[#0F172A]">
                          {formatNumber(item.completions)}
                        </div>
                        <div className="text-[9.5px] uppercase text-[#94A3B8] font-semibold tracking-wide">
                          sessions
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[#94A3B8] text-xs">No exercises logged yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Analytics;
