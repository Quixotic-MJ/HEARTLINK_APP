import React from "react";
import {
  User,
  AlertTriangle,
  ArrowRight,
  FileSearch,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";

const Dashboard = () => {
  const [exercises, setExercises] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const exercisesData = await apiFetch("/api/exercises/");
        setExercises(exercisesData);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
          Last sync: 04:22 PM
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
                  1,245
                </p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Active Accounts
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold text-emerald-600 mb-1 truncate">
                  +12%
                </p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  VS Last Week
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

        {/* Card 2: Case Calibration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between min-w-0 relative overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: "#0f172a" }} />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <span className="text-slate-900 font-semibold text-sm block mb-0.5 truncate">
                  Case Calibration
                </span>
                <span className="text-slate-400 text-[10px] font-medium tracking-[0.22em] uppercase truncate block">
                  Expert Review Queue
                </span>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
              >
                <Stethoscope size={14} style={{ color: "#0f172a" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border min-w-0" style={{ backgroundColor: "rgba(15,23,42,0.03)", borderColor: "rgba(15,23,42,0.06)" }}>
                <p className="text-lg font-semibold mb-1 truncate" style={{ color: "#0f172a" }}>{loading ? "..." : exercises.length}</p>
                <p className="text-[9px] font-medium tracking-[0.18em] uppercase truncate" style={{ color: "#0f172a", opacity: 0.5 }}>
                  Active Exercises
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold text-slate-700 mb-1 truncate">
                  142
                </p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Calibrations Done
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
                  System Alerts
                </span>
                <span className="text-slate-400 text-[10px] font-medium tracking-[0.22em] uppercase truncate block">
                  Threshold Breaches
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
                <p className="text-lg font-semibold text-red-600 mb-1 truncate">12</p>
                <p className="text-[9px] font-medium text-red-500 tracking-[0.18em] uppercase truncate">
                  Unresolved
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                <p className="text-lg font-semibold text-slate-700 mb-1 truncate">248</p>
                <p className="text-[9px] font-medium text-slate-400 tracking-[0.18em] uppercase truncate">
                  Total Triggered
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Population Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
          >
            <HeartPulse size={13} style={{ color: "#0f172a" }} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            CSS Population Distribution
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-medium text-slate-700 text-xs">
                Stable <span className="text-slate-400 font-normal ml-1">(Score 80-100)</span>
              </span>
              <span className="font-semibold text-xs" style={{ color: "#0f172a" }}>68%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full w-[68%]" style={{ backgroundColor: "#0f172a" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-medium text-slate-700 text-xs">
                Monitor Closely <span className="text-slate-400 font-normal ml-1">(Score 50-79)</span>
              </span>
              <span className="font-semibold text-amber-500 text-xs">24%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full w-[24%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-medium text-slate-700 text-xs">
                Consider Check-up <span className="text-slate-400 font-normal ml-1">(Score &lt; 50)</span>
              </span>
              <span className="font-semibold text-red-500 text-xs">8%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full w-[8%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent System Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            Recent System Activity
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
                  Involved Entity
                </th>
                <th className="py-3 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-[0.18em] w-1/4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0f172a" }} />
                    <div>
                      <p className="text-slate-900 font-medium text-xs">14:23:05</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Today, Oct 24</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span
                    className="inline-flex text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                    style={{ backgroundColor: "rgba(15,23,42,0.05)", color: "#0f172a" }}
                  >
                    Data Sync
                  </span>
                </td>
                <td className="py-3 px-2">
                  <p className="text-slate-900 font-medium text-xs">System Process</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Open Food Facts API Sync Completed</p>
                </td>
                <td className="py-3 px-2 text-right">
                  <button className="inline-flex p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    <FileSearch size={14} />
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <div>
                      <p className="text-slate-900 font-medium text-xs">14:21:12</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Today, Oct 24</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span
                    className="inline-flex text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                    style={{ backgroundColor: "rgba(239,68,68,0.06)", color: "#ef4444" }}
                  >
                    Alert Triggered
                  </span>
                </td>
                <td className="py-3 px-2">
                  <p className="text-slate-900 font-medium text-xs">Auto-Monitor Engine</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Rule-Based CSS Threshold Breached</p>
                </td>
                <td className="py-3 px-2 text-right">
                  <button className="inline-flex p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    <FileSearch size={14} />
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <div>
                      <p className="text-slate-900 font-medium text-xs">13:45:00</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Today, Oct 24</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span
                    className="inline-flex text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                    style={{ backgroundColor: "rgba(15,23,42,0.04)", color: "rgba(15,23,42,0.45)" }}
                  >
                    Auth Log
                  </span>
                </td>
                <td className="py-3 px-2">
                  <p className="text-slate-900 font-medium text-xs">Dr. Sarah Jenkins</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">New Expert Account Provisioned</p>
                </td>
                <td className="py-3 px-2 text-right">
                  <button className="inline-flex p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    <FileSearch size={14} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
