import React, { useState } from "react";
import {
  User,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  Archive,
  FileSearch,
  Stethoscope,
  Activity,
  HeartPulse,
  MoreVertical,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/AdminLayout"; // Adjust path based on your structure

const Dashboard = () => {
  // Toggle this between "sysadmin" and "medical" to see the dynamic KPI cards
  const [userRole] = useState("medical");

  return (
    <AdminLayout>
      {/* Page Title & Meta */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-3">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Analytics Overview
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            System Performance & <br />
            <span className="text-[#1e4ed8]">Diagnostics.</span>
          </h2>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#1e4ed8] text-[9px] font-bold tracking-wide uppercase shadow-sm">
          Last Sync: 04:22 PM
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 1: User Engagement */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-2.5 mb-2.5">
              <div>
                <span className="text-gray-900 font-bold text-[11px] block">
                  User Engagement
                </span>
                <span className="text-gray-500 text-[9px] font-medium tracking-wide uppercase">
                  Registered Users
                </span>
              </div>
              <User className="text-[#1e4ed8]" size={14} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#f8fafc] p-2 rounded-lg border border-gray-50">
                <p className="text-base font-bold text-[#1e4ed8] mb-0.5">
                  1,245
                </p>
                <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                  Active Accounts
                </p>
              </div>
              <div className="bg-[#f8fafc] p-2 rounded-lg border border-gray-50">
                <p className="text-base font-bold text-green-600 mb-0.5">
                  +12%
                </p>
                <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                  vs Last Week
                </p>
              </div>
            </div>
          </div>
          {/* Archived Accounts Link */}
          <div className="mt-2.5 pt-2.5 border-t border-gray-50">
            <a
              href="#"
              className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-[#1e4ed8] uppercase tracking-wider transition-colors"
            >
              <Archive size={10} strokeWidth={2.5} />
              View 42 Archived/Cancelled Accounts
            </a>
          </div>
        </div>

        {/* Card 2: Dynamic Role-Based Card */}
        {userRole === "medical" ? (
          /* Medical Expert View: Case Review / Calibration */
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1e4ed8]"></div>
            <div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2.5 mb-2.5 mt-0.5">
                <div>
                  <span className="text-gray-900 font-bold text-[11px] block">
                    Case Calibration
                  </span>
                  <span className="text-gray-500 text-[9px] font-medium tracking-wide uppercase">
                    Expert Review Queue
                  </span>
                </div>
                <Stethoscope className="text-[#1e4ed8]" size={14} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-50">
                  <p className="text-base font-bold text-[#1e4ed8] mb-0.5">8</p>
                  <p className="text-[8px] font-bold text-blue-600 tracking-widest uppercase">
                    Pending Flags
                  </p>
                </div>
                <div className="bg-[#f8fafc] p-2 rounded-lg border border-gray-50">
                  <p className="text-base font-bold text-gray-700 mb-0.5">
                    142
                  </p>
                  <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                    Calibrations Done
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* System Admin View: Traffic Analysis */
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2.5 mb-2.5">
                <div>
                  <span className="text-gray-900 font-bold text-[11px] block">
                    Traffic Analysis
                  </span>
                  <span className="text-gray-500 text-[9px] font-medium tracking-wide uppercase">
                    Active Users Today
                  </span>
                </div>
                <BarChart2 className="text-[#1e4ed8]" size={14} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#f8fafc] p-2 rounded-lg border border-gray-50">
                  <p className="text-base font-bold text-[#1e4ed8] mb-0.5">
                    342
                  </p>
                  <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                    Live Now
                  </p>
                </div>
                <div className="bg-[#f8fafc] p-2 rounded-lg border border-gray-50">
                  <p className="text-base font-bold text-[#1e4ed8] mb-0.5">
                    99.9%
                  </p>
                  <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                    Uptime
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: System Alerts */}
        <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-2.5 mb-2.5 mt-0.5">
              <div>
                <span className="text-gray-900 font-bold text-[11px] block">
                  System Alerts
                </span>
                <span className="text-gray-500 text-[9px] font-medium tracking-wide uppercase">
                  Threshold Breaches
                </span>
              </div>
              <AlertTriangle className="text-red-500" size={14} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-50/50 p-2 rounded-lg border border-red-50">
                <p className="text-base font-bold text-red-600 mb-0.5">12</p>
                <p className="text-[8px] font-bold text-red-500 tracking-widest uppercase">
                  Unresolved
                </p>
              </div>
              <div className="bg-[#f8fafc] p-2 rounded-lg border border-gray-50">
                <p className="text-base font-bold text-[#1e4ed8] mb-0.5">248</p>
                <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                  Total Triggered
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Section: CSS Population Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-1.5 mb-4">
          <HeartPulse size={14} className="text-[#1e4ed8]" />
          <h3 className="text-xs font-bold text-gray-900 tracking-tight">
            CSS Population Distribution
          </h3>
        </div>

        <div className="space-y-3">
          {/* Stable */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-bold text-gray-700">
                Stable{" "}
                <span className="text-gray-400 font-medium ml-1">
                  (Score 80-100)
                </span>
              </span>
              <span className="font-bold text-[#1e4ed8]">68%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#1e4ed8] h-1.5 rounded-full w-[68%]"></div>
            </div>
          </div>

          {/* Monitor Closely */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-bold text-gray-700">
                Monitor Closely{" "}
                <span className="text-gray-400 font-medium ml-1">
                  (Score 50-79)
                </span>
              </span>
              <span className="font-bold text-yellow-500">24%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-yellow-400 h-1.5 rounded-full w-[24%]"></div>
            </div>
          </div>

          {/* Consider Check-up */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-bold text-gray-700">
                Consider Check-up{" "}
                <span className="text-gray-400 font-medium ml-1">
                  (Score &lt; 50)
                </span>
              </span>
              <span className="font-bold text-red-500">8%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-red-500 h-1.5 rounded-full w-[8%]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 gap-3 border-b border-gray-50 pb-3">
          <div>
            <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1">
              Audit Log
            </p>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Recent System Activity
            </h3>
          </div>
          <button className="text-[#1e4ed8] text-[11px] font-bold flex items-center gap-1 hover:text-[#113296] transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100">
            View Full Audit Trail <ArrowRight size={12} />
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr>
                <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/4">
                  Timestamp
                </th>
                <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/4">
                  Event Type
                </th>
                <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/4">
                  Involved Entity
                </th>
                <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/4 text-right">
                  System Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Row 1 */}
              <tr className="hover:bg-[#f8fafc] transition-colors group">
                <td className="py-2.5 px-3 align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <div>
                      <p className="text-gray-900 font-bold text-[11px]">
                        14:23:05
                      </p>
                      <p className="text-gray-400 text-[9px] mt-0.5 font-medium">
                        Today, Oct 24
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-[#1e4ed8] text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100 tracking-widest uppercase">
                    Data Sync
                  </span>
                </td>
                <td className="py-2.5 px-3 align-middle">
                  <p className="text-gray-900 text-[11px] font-bold">
                    System Process
                  </p>
                  <p className="text-gray-500 text-[9px] mt-0.5 truncate max-w-[200px]">
                    Open Food Facts API Sync Completed
                  </p>
                </td>
                <td className="py-2.5 px-3 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex items-center gap-1 p-1 text-[11px] font-bold text-gray-500 hover:text-[#1e4ed8] hover:bg-blue-50 rounded transition-colors">
                      <FileSearch size={12} />{" "}
                      <span className="hidden sm:inline">View Log</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-[#f8fafc] transition-colors group">
                <td className="py-2.5 px-3 align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"></div>
                    <div>
                      <p className="text-gray-900 font-bold text-[11px]">
                        14:21:12
                      </p>
                      <p className="text-gray-400 text-[9px] mt-0.5 font-medium">
                        Today, Oct 24
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-100 tracking-widest uppercase">
                    Alert Trig
                  </span>
                </td>
                <td className="py-2.5 px-3 align-middle">
                  <p className="text-gray-900 text-[11px] font-bold">
                    Auto-Monitor Engine
                  </p>
                  <p className="text-gray-500 text-[9px] mt-0.5 truncate max-w-[200px]">
                    Rule-Based CSS Threshold Breached
                  </p>
                </td>
                <td className="py-2.5 px-3 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex items-center gap-1 p-1 text-[11px] font-bold text-gray-500 hover:text-[#1e4ed8] hover:bg-blue-50 rounded transition-colors">
                      <FileSearch size={12} />{" "}
                      <span className="hidden sm:inline">View Log</span>
                    </button>
                    <button className="flex items-center gap-1 p-1 text-[11px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Archive size={12} />
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-[#f8fafc] transition-colors group">
                <td className="py-2.5 px-3 align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                    <div>
                      <p className="text-gray-900 font-bold text-[11px]">
                        13:45:00
                      </p>
                      <p className="text-gray-400 text-[9px] mt-0.5 font-medium">
                        Today, Oct 24
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                  <span className="inline-flex items-center gap-1 bg-white text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 tracking-widest uppercase shadow-sm">
                    Auth Log
                  </span>
                </td>
                <td className="py-2.5 px-3 align-middle">
                  <p className="text-gray-900 text-[11px] font-bold">
                    Dr. Sarah Jenkins
                  </p>
                  <p className="text-gray-500 text-[9px] mt-0.5 truncate max-w-[200px]">
                    New Expert Account Provisioned
                  </p>
                </td>
                <td className="py-2.5 px-3 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex items-center gap-1 p-1 text-[11px] font-bold text-gray-500 hover:text-[#1e4ed8] hover:bg-blue-50 rounded transition-colors">
                      <FileSearch size={12} />{" "}
                      <span className="hidden sm:inline">View Log</span>
                    </button>
                  </div>
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
