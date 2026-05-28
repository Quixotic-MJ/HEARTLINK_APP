import React, { useState } from "react";
import {
  Users,
  Bell,
  DollarSign,
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
import AdminLayout from "../../../components/layouts/AdminLayout"; // Adjust path

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("engagement");

  // Dynamic Export Button Text based on Active Tab
  const getExportText = () => {
    switch (activeTab) {
      case "engagement":
        return "Export Engagement Report";
      case "alerts":
        return "Export Alert Data";
      case "financials":
        return "Export Revenue Report";
      default:
        return "Export Report";
    }
  };

  return (
    <AdminLayout>
      {/* Page Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            System Intelligence
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Analytics & <span className="text-[#1e4ed8]">Reporting.</span>
          </h2>
        </div>

        {/* Global Controls: Date Picker & Export */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:border-gray-300 transition-colors w-full sm:w-auto">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-700">
              Last 30 Days
            </span>
            <ChevronDown size={14} className="text-gray-400 ml-1" />
          </div>
          <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white rounded-lg shadow-sm shadow-blue-900/20 font-bold text-[11px] transition-colors w-full sm:w-auto">
            <Download size={14} strokeWidth={2.5} />
            {getExportText()}
          </button>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="bg-white p-1 rounded-lg inline-flex flex-wrap shadow-sm border border-gray-100 mb-6 w-full sm:w-auto">
        <button
          onClick={() => setActiveTab("engagement")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "engagement"
              ? "bg-blue-50 text-[#1e4ed8] shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Users size={14} />
          Engagement
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "alerts"
              ? "bg-blue-50 text-[#1e4ed8] shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Bell size={14} />
          Alerts
        </button>
        <button
          onClick={() => setActiveTab("financials")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "financials"
              ? "bg-blue-50 text-[#1e4ed8] shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <DollarSign size={14} />
          Financials
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: USER ENGAGEMENT DATA               */}
      {/* ========================================= */}
      {activeTab === "engagement" && (
        <div className="space-y-5 animate-in fade-in duration-500">
          {/* Top Control Bar for Engagement */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Activity size={14} className="text-[#1e4ed8]" /> Application
              Usage
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <Filter size={12} className="text-gray-500" />
              <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider">
                Filter: High-Risk Users
              </span>
            </div>
          </div>

          {/* Engagement Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Total Sign-ups
                </p>
                <Users size={14} className="text-[#1e4ed8]" />
              </div>
              <p className="text-2xl font-black text-gray-900 tracking-tight">
                12,842
              </p>
              <p className="text-[9px] font-bold text-green-600 mt-1.5 bg-green-50 w-fit px-1.5 py-0.5 rounded">
                +8% this month
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Avg Session Length
                </p>
                <Clock size={14} className="text-[#1e4ed8]" />
              </div>
              <p className="text-2xl font-black text-gray-900 tracking-tight">
                6m 12s
              </p>
              <p className="text-[9px] font-bold text-green-600 mt-1.5 bg-green-50 w-fit px-1.5 py-0.5 rounded">
                +1m 05s vs last month
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Archived Accounts
                </p>
                <Archive size={14} className="text-gray-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 tracking-tight">
                142
              </p>
              <p className="text-[9px] font-bold text-gray-500 mt-1.5 bg-gray-50 w-fit px-1.5 py-0.5 rounded">
                1.1% churn rate
              </p>
            </div>
          </div>

          {/* Active Users Line Chart (CSS Mock) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-bold text-gray-900">
                Daily Active Users (DAU)
              </h3>
              <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e4ed8]"></div>{" "}
                  Current
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>{" "}
                  Previous
                </span>
              </div>
            </div>
            <div className="w-full h-48 relative border-b border-l border-gray-100 flex items-end">
              {/* CSS Mock Chart Line */}
              <svg
                className="absolute w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                {/* Previous Period */}
                <path
                  d="M0,80 Q10,70 20,75 T40,60 T60,65 T80,40 T100,50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {/* Current Period */}
                <path
                  d="M0,90 Q10,60 20,65 T40,40 T60,35 T80,15 T100,20"
                  fill="none"
                  stroke="#1e4ed8"
                  strokeWidth="2.5"
                />
                {/* Gradient Fill */}
                <path
                  d="M0,90 Q10,60 20,65 T40,40 T60,35 T80,15 T100,20 L100,100 L0,100 Z"
                  fill="url(#blue-gradient)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient
                    id="blue-gradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#1e4ed8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              {/* X-Axis Labels */}
              <div className="absolute -bottom-5 w-full flex justify-between text-[8px] font-bold text-gray-400">
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
        <div className="space-y-5 animate-in fade-in duration-500">
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <p className="text-[11px] font-bold text-[#1e4ed8] flex items-center gap-1.5">
              <MapPin size={14} /> Regional Risk Trends: Cebu City & Central
              Visayas
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Alert Frequency Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xs font-bold text-gray-900">
                  Alert Volume (High-Risk)
                </h3>
                <TrendingUp size={14} className="text-red-500" />
              </div>
              <div className="flex-1 flex items-end justify-between gap-1.5 h-40 border-b border-gray-100 pb-2 relative">
                {/* Mock Bars */}
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div key={i} className="w-full relative group">
                    <div
                      className="bg-[#1e4ed8] rounded-t-sm w-full group-hover:bg-blue-800 transition-colors"
                      style={{ height: `${height}%` }}
                    ></div>
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] py-1 px-1.5 rounded font-bold transition-opacity">
                      {height * 3} Alerts
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full flex justify-between mt-2 text-[8px] font-bold text-gray-400 uppercase">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>

            {/* Alert Breakdown Doughnut Chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-bold text-gray-900 mb-4">
                Alert Breakdown
              </h3>
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                {/* CSS Doughnut using conic-gradient */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#ef4444 0% 35%, #eab308 35% 75%, #1e4ed8 75% 100%)`,
                  }}
                ></div>
                {/* Inner white circle for doughnut effect */}
                <div className="absolute inset-3.5 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xl font-black text-gray-900 leading-none">
                    342
                  </span>
                  <span className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">
                    Total
                  </span>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>{" "}
                    Severe Symptoms
                  </span>
                  <span className="text-gray-900">35%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>{" "}
                    Dietary Breach
                  </span>
                  <span className="text-gray-900">40%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[#1e4ed8] rounded-full"></div>{" "}
                    System Offline
                  </span>
                  <span className="text-gray-900">25%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Severity Heatmap */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 mb-5 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-500" /> Severity
              Heatmap
            </h3>

            <div className="flex gap-3">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between py-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-wider text-right pr-2 border-r border-gray-100">
                <span>Critical</span>
                <span>Warning</span>
                <span>Low</span>
              </div>

              {/* Heatmap Grid */}
              <div className="flex-1">
                <div className="grid grid-cols-7 gap-1 h-24">
                  {/* Generate 21 mock blocks with random opacities to simulate a heatmap */}
                  {Array.from({ length: 21 }).map((_, i) => {
                    const row = Math.floor(i / 7);
                    // Mock logic: top row (Critical) is mostly red, bottom row is blue/light
                    let bgClass = "bg-blue-50";
                    if (row === 0)
                      bgClass = i % 3 === 0 ? "bg-red-500" : "bg-red-200";
                    if (row === 1)
                      bgClass = i % 2 === 0 ? "bg-yellow-400" : "bg-yellow-100";
                    if (row === 2)
                      bgClass = i % 4 === 0 ? "bg-[#1e4ed8]" : "bg-blue-100";

                    return (
                      <div
                        key={i}
                        className={`${bgClass} rounded-[3px] cursor-pointer hover:opacity-75 transition-opacity`}
                      ></div>
                    );
                  })}
                </div>
                {/* X-Axis Labels */}
                <div className="grid grid-cols-7 gap-1 mt-2 text-center text-[8px] font-bold text-gray-400 uppercase">
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
      {/* TAB 3: FINANCIAL SUMMARY                  */}
      {/* ========================================= */}
      {activeTab === "financials" && (
        <div className="space-y-5 animate-in fade-in duration-500">
          {/* Revenue Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Total Revenue Card */}
            <div className="bg-gradient-to-br from-[#1e4ed8] to-[#0f349a] p-5 rounded-xl shadow-md shadow-blue-900/20 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full blur-xl -mr-8 -mt-8"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                  Total Gross Revenue
                </p>
                <DollarSign size={16} className="text-blue-200" />
              </div>
              <p className="text-3xl font-black tracking-tight relative z-10">
                ₱124,500
              </p>
              <div className="mt-3 flex items-center gap-1.5 relative z-10">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  +14.5%
                </span>
                <span className="text-[10px] font-medium text-blue-200">
                  vs previous period
                </span>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <h3 className="text-xs font-bold text-gray-900 mb-5">
                Revenue Breakdown
              </h3>

              <div className="space-y-3">
                {/* Premium Subscriptions */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-gray-700">Premium Features</span>
                    <span className="text-[#1e4ed8]">₱87,150 (70%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#1e4ed8] h-2 rounded-full w-[70%]"></div>
                  </div>
                </div>

                {/* Local Clinic Sponsorships / Ads */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-gray-700">
                      Clinic Sponsorships & Ads
                    </span>
                    <span className="text-yellow-500">₱37,350 (30%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-yellow-400 h-2 rounded-full w-[30%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Revenue Trend */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 mb-5 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#1e4ed8]" /> Historical
              Revenue Trend
            </h3>

            <div className="w-full h-48 relative border-b border-l border-gray-100 flex items-end">
              {/* CSS Mock Chart Line */}
              <svg
                className="absolute w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <path
                  d="M0,70 L20,60 L40,80 L60,40 L80,30 L100,10"
                  fill="none"
                  stroke="#1e4ed8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M0,70 L20,60 L40,80 L60,40 L80,30 L100,10 L100,100 L0,100 Z"
                  fill="url(#green-gradient)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient
                    id="green-gradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#1e4ed8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Plot Points */}
              <div className="absolute w-full h-full">
                <div className="absolute left-0 bottom-[30%] w-1.5 h-1.5 bg-white border border-[#1e4ed8] rounded-full -ml-[3px]"></div>
                <div className="absolute left-[20%] bottom-[40%] w-1.5 h-1.5 bg-white border border-[#1e4ed8] rounded-full -ml-[3px]"></div>
                <div className="absolute left-[40%] bottom-[20%] w-1.5 h-1.5 bg-white border border-[#1e4ed8] rounded-full -ml-[3px]"></div>
                <div className="absolute left-[60%] bottom-[60%] w-1.5 h-1.5 bg-white border border-[#1e4ed8] rounded-full -ml-[3px]"></div>
                <div className="absolute left-[80%] bottom-[70%] w-1.5 h-1.5 bg-white border border-[#1e4ed8] rounded-full -ml-[3px]"></div>
                <div className="absolute left-[100%] bottom-[90%] w-1.5 h-1.5 bg-white border border-[#1e4ed8] rounded-full -ml-[3px]"></div>
              </div>

              {/* X-Axis Labels */}
              <div className="absolute -bottom-5 w-full flex justify-between text-[8px] font-bold text-gray-400 uppercase">
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
