import React, { useState } from "react";
import {
  Users,
  Bell,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Archive,
  Clock,
  Activity,
  AlertTriangle,
  HeartPulse,
  ChevronDown,
  MapPin,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("engagement");

  const getExportText = () => {
    switch (activeTab) {
      case "engagement":
        return "Export Engagement Report";
      case "alerts":
        return "Export Alert Data";
      case "diagnostics":
        return "Export Diagnostics Data";
      default:
        return "Export Report";
    }
  };

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
        </div>

        {/* Global Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div
            className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-xl cursor-pointer hover:border-slate-300 transition-colors w-full sm:w-auto"
            style={{ borderColor: "rgba(15,23,42,0.12)" }}
          >
            <Calendar size={14} className="text-slate-400" />
            <span className="text-[11px] font-medium text-slate-700">
              Last 30 Days
            </span>
            <ChevronDown size={14} className="text-slate-400 ml-1" />
          </div>
          <button
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-[11px] font-medium transition-all hover:opacity-90 active:scale-[0.99] w-full sm:w-auto"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Download size={14} strokeWidth={2} />
            {getExportText()}
          </button>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div
        className="bg-white p-1 rounded-xl inline-flex flex-wrap border mb-6 w-full sm:w-auto"
        style={{ borderColor: "rgba(15,23,42,0.08)" }}
      >
        <button
          onClick={() => setActiveTab("engagement")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === "engagement"
              ? "text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          style={activeTab === "engagement" ? { backgroundColor: "rgba(15,23,42,0.04)" } : {}}
        >
          <Users size={14} />
          Engagement
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === "alerts"
              ? "text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          style={activeTab === "alerts" ? { backgroundColor: "rgba(15,23,42,0.04)" } : {}}
        >
          <Bell size={14} />
          Alerts
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === "diagnostics"
              ? "text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          style={activeTab === "diagnostics" ? { backgroundColor: "rgba(15,23,42,0.04)" } : {}}
        >
          <Activity size={14} />
          System Diagnostics
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: USER ENGAGEMENT DATA               */}
      {/* ========================================= */}
      {activeTab === "engagement" && (
        <div className="space-y-5">
          {/* Top Control Bar */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
            <h3 className="text-xs font-medium text-slate-900 flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <Activity size={12} style={{ color: "#0f172a" }} />
              </div>
              Application Usage
            </h3>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
              style={{ borderColor: "rgba(15,23,42,0.08)" }}
            >
              <Filter size={12} className="text-slate-400" />
              <span className="text-[9px] font-medium text-slate-600 uppercase tracking-[0.18em]">
                Filter: High-Risk Users
              </span>
            </div>
          </div>

          {/* Engagement Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Sign-ups */}
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
                12,842
              </p>
              <p
                className="text-[9px] font-medium mt-2 w-fit px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#059669" }}
              >
                +8% this month
              </p>
            </div>

            {/* Avg Session Length */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.22em]">
                  Avg Session Length
                </p>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
                >
                  <Clock size={13} style={{ color: "#0f172a" }} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                6m 12s
              </p>
              <p
                className="text-[9px] font-medium mt-2 w-fit px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#059669" }}
              >
                +1m 05s vs last month
              </p>
            </div>

            {/* Archived Accounts */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.22em]">
                  Archived Accounts
                </p>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
                >
                  <Archive size={13} className="text-slate-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                142
              </p>
              <p
                className="text-[9px] font-medium text-slate-500 mt-2 w-fit px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                1.1% churn rate
              </p>
            </div>
          </div>

          {/* Active Users Line Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                Daily Active Users (DAU)
              </h3>
              <div className="flex items-center gap-4 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0f172a" }} />
                  Current
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  Previous
                </span>
              </div>
            </div>
            <div className="w-full h-48 relative border-b border-l border-slate-100 flex items-end">
              <svg
                className="absolute w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                {/* Previous Period */}
                <path
                  d="M0,80 Q10,70 20,75 T40,60 T60,65 T80,40 T100,50"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Current Period */}
                <path
                  d="M0,90 Q10,60 20,65 T40,40 T60,35 T80,15 T100,20"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                {/* Gradient Fill */}
                <path
                  d="M0,90 Q10,60 20,65 T40,40 T60,35 T80,15 T100,20 L100,100 L0,100 Z"
                  fill="url(#slate-gradient)"
                  opacity="0.06"
                />
                <defs>
                  <linearGradient id="slate-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              {/* X-Axis Labels */}
              <div className="absolute -bottom-5 w-full flex justify-between text-[8px] font-medium text-slate-400 tracking-[0.15em]">
                <span>May 1</span>
                <span>May 8</span>
                <span>May 15</span>
                <span>May 22</span>
                <span>May 28</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: ALERT FREQUENCY DASHBOARD          */}
      {/* ========================================= */}
      {activeTab === "alerts" && (
        <div className="space-y-5">
          {/* Region Banner */}
          <div
            className="p-3 rounded-xl border"
            style={{ backgroundColor: "rgba(15,23,42,0.02)", borderColor: "rgba(15,23,42,0.06)" }}
          >
            <p className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
              <MapPin size={14} className="text-slate-400" /> Regional Risk Trends: Cebu City & Central Visayas
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Alert Frequency Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Alert Volume (High-Risk)
                </h3>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(239,68,68,0.06)" }}
                >
                  <TrendingUp size={13} className="text-red-500" />
                </div>
              </div>
              <div className="flex-1 flex items-end justify-between gap-2 h-40 border-b border-slate-100 pb-2 relative">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div key={i} className="w-full relative group">
                    <div
                      className="rounded-t w-full transition-colors"
                      style={{
                        height: `${height}%`,
                        backgroundColor: "rgba(15,23,42,0.75)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#0f172a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.75)"; }}
                    />
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] py-1 px-1.5 rounded-md font-medium transition-opacity whitespace-nowrap">
                      {height * 3} Alerts
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full flex justify-between mt-2.5 text-[8px] font-medium text-slate-400 uppercase tracking-[0.18em]">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>

            {/* Alert Breakdown Doughnut */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">
                Alert Breakdown
              </h3>
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#ef4444 0% 35%, #f59e0b 35% 75%, #0f172a 75% 100%)`,
                  }}
                />
                <div className="absolute inset-3.5 bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold text-slate-900 leading-none">
                    342
                  </span>
                  <span className="text-[7px] font-medium text-slate-400 uppercase tracking-[0.18em] mt-0.5">
                    Total
                  </span>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="flex justify-between items-center text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Severe Symptoms
                  </span>
                  <span className="text-slate-900 font-semibold">35%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    Dietary Breach
                  </span>
                  <span className="text-slate-900 font-semibold">40%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0f172a" }} />
                    Missed Vital Logs
                  </span>
                  <span className="text-slate-900 font-semibold">25%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Severity Heatmap */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(239,68,68,0.06)" }}
              >
                <AlertTriangle size={13} className="text-red-500" />
              </div>
              Severity Heatmap
            </h3>

            <div className="flex gap-3">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between py-1.5 text-[8px] font-medium text-slate-400 uppercase tracking-[0.18em] text-right pr-2 border-r border-slate-100">
                <span>Critical</span>
                <span>Warning</span>
                <span>Low</span>
              </div>

              {/* Heatmap Grid */}
              <div className="flex-1">
                <div className="grid grid-cols-7 gap-1 h-24">
                  {Array.from({ length: 21 }).map((_, i) => {
                    const row = Math.floor(i / 7);
                    let bg = "rgba(15,23,42,0.03)";
                    if (row === 0)
                      bg = i % 3 === 0 ? "rgba(239,68,68,0.75)" : "rgba(239,68,68,0.2)";
                    if (row === 1)
                      bg = i % 2 === 0 ? "rgba(245,158,11,0.6)" : "rgba(245,158,11,0.12)";
                    if (row === 2)
                      bg = i % 4 === 0 ? "rgba(15,23,42,0.6)" : "rgba(15,23,42,0.06)";

                    return (
                      <div
                        key={i}
                        className="rounded cursor-pointer hover:opacity-75 transition-opacity"
                        style={{ backgroundColor: bg }}
                      />
                    );
                  })}
                </div>
                {/* X-Axis Labels */}
                <div className="grid grid-cols-7 gap-1 mt-2 text-center text-[8px] font-medium text-slate-400 uppercase tracking-[0.18em]">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 3: SYSTEM DIAGNOSTICS                 */}
      {/* ========================================= */}
      {activeTab === "diagnostics" && (
        <div className="space-y-5">
          {/* Diagnostics Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Algorithm Accuracy Card */}
            <div
              className="p-5 rounded-xl text-white relative overflow-hidden"
              style={{ backgroundColor: "#0f172a" }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(30,78,216,0.15) 0%, transparent 70%)",
                }}
              />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Algorithm Accuracy Rate
                </p>
                <HeartPulse size={16} style={{ color: "rgba(255,255,255,0.35)" }} />
              </div>
              <p className="text-3xl font-semibold tracking-tight relative z-10">
                94.2%
              </p>
              <div className="mt-3 flex items-center gap-2 relative z-10">
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
                >
                  +14.5%
                </span>
                <span className="text-[10px] font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                  vs previous period
                </span>
              </div>
            </div>

            {/* Calibration Sources */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5">
                Calibration Sources
              </h3>

              <div className="space-y-4">
                {/* Expert Reviews */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium mb-1.5">
                    <span className="text-slate-600">Expert Reviews</span>
                    <span className="font-semibold" style={{ color: "#0f172a" }}>60%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full w-[60%]" style={{ backgroundColor: "#0f172a" }} />
                  </div>
                </div>

                {/* Automated Rule Adjustments */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium mb-1.5">
                    <span className="text-slate-600">
                      Automated Rule Adjustments
                    </span>
                    <span className="font-semibold text-amber-500">40%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full w-[40%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Response Latency Trend */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-5 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <TrendingUp size={13} style={{ color: "#0f172a" }} />
              </div>
              System Response Latency Trend
            </h3>

            <div className="w-full h-48 relative border-b border-l border-slate-100 flex items-end">
              <svg
                className="absolute w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <path
                  d="M0,70 L20,60 L40,80 L60,40 L80,30 L100,10"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M0,70 L20,60 L40,80 L60,40 L80,30 L100,10 L100,100 L0,100 Z"
                  fill="url(#latency-gradient)"
                  opacity="0.06"
                />
                <defs>
                  <linearGradient id="latency-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Plot Points */}
              <div className="absolute w-full h-full">
                {[
                  { left: "0%", bottom: "30%" },
                  { left: "20%", bottom: "40%" },
                  { left: "40%", bottom: "20%" },
                  { left: "60%", bottom: "60%" },
                  { left: "80%", bottom: "70%" },
                  { left: "100%", bottom: "90%" },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full -ml-[3px]"
                    style={{
                      left: pos.left,
                      bottom: pos.bottom,
                      border: "1.5px solid #0f172a",
                    }}
                  />
                ))}
              </div>

              {/* X-Axis Labels */}
              <div className="absolute -bottom-5 w-full flex justify-between text-[8px] font-medium text-slate-400 uppercase tracking-[0.18em]">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Analytics;
