import React, { useState } from "react";
import {
  User,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
} from "lucide-react";

// Adjust these paths based on your actual file structure
import Sidebar from "../../components/layouts/sidebar";
import Header from "../../components/layouts/header";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans text-gray-900 overflow-hidden">
      {/* Extracted Sidebar Component */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-white lg:rounded-l-[1.5rem] lg:shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-gray-100">
        {/* Extracted Header Component */}
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Page Title & Meta */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-3">
              <div>
                <p className="text-[10px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-2">
                  Analytics Overview
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                  System Performance & <br />
                  <span className="text-[#1e4ed8]">Diagnostics.</span>
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-50 border border-blue-100 text-[#1e4ed8] text-[10px] font-bold tracking-wide uppercase shadow-sm">
                Last Sync: 04:22 PM
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Card 1 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/30 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-3">
                  <div>
                    <span className="text-gray-900 font-bold text-xs block">
                      Patient Census
                    </span>
                    <span className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">
                      Total Registered
                    </span>
                  </div>
                  <User className="text-[#1e4ed8]" size={18} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-50">
                    <p className="text-lg font-bold text-[#1e4ed8] mb-0.5">
                      1,245
                    </p>
                    <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                      Total Patients
                    </p>
                  </div>
                  <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-50">
                    <p className="text-lg font-bold text-green-600 mb-0.5">
                      +12%
                    </p>
                    <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                      vs Last Week
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/30 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-3">
                  <div>
                    <span className="text-gray-900 font-bold text-xs block">
                      Traffic Analysis
                    </span>
                    <span className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">
                      Active Users Today
                    </span>
                  </div>
                  <BarChart2 className="text-[#1e4ed8]" size={18} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-50">
                    <p className="text-lg font-bold text-[#1e4ed8] mb-0.5">
                      342
                    </p>
                    <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                      Live Now
                    </p>
                  </div>
                  <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-50">
                    <p className="text-lg font-bold text-[#1e4ed8] mb-0.5">
                      99.9%
                    </p>
                    <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                      Uptime
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3 - Critical Theme */}
              <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-lg shadow-red-100/30 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-3 mt-0.5">
                  <div>
                    <span className="text-gray-900 font-bold text-xs block">
                      System Alerts
                    </span>
                    <span className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">
                      Critical Actions
                    </span>
                  </div>
                  <AlertTriangle className="text-red-500" size={18} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-50">
                    <p className="text-lg font-bold text-red-600 mb-0.5">12</p>
                    <p className="text-[8px] font-bold text-red-500 tracking-widest uppercase">
                      Unresolved
                    </p>
                  </div>
                  <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-50">
                    <p className="text-lg font-bold text-[#1e4ed8] mb-0.5">
                      4m
                    </p>
                    <p className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">
                      Avg Response
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Table Container */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/30 border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-5 gap-3 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1">
                    Audit Log
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                    Recent System Activity
                  </h3>
                </div>
                <button className="text-[#1e4ed8] text-xs font-bold flex items-center gap-1.5 hover:text-[#113296] transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-100">
                  View Full Audit Trail <ArrowRight size={14} />
                </button>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="py-3 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 w-1/4">
                        Timestamp
                      </th>
                      <th className="py-3 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 w-1/4">
                        Event Type
                      </th>
                      <th className="py-3 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 w-1/5">
                        Involved Entity
                      </th>
                      <th className="py-3 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 w-auto text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* Row 1 */}
                    <tr className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="py-3.5 px-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                          <div>
                            <p className="text-gray-900 font-bold text-xs">
                              14:23:05
                            </p>
                            <p className="text-gray-400 text-[10px] mt-0.5 font-medium">
                              Today, Oct 24
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-[#1e4ed8] text-[9px] font-bold px-2 py-1 rounded-md border border-blue-100 tracking-widest uppercase">
                          Data Sync
                        </span>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <p className="text-gray-900 text-xs font-bold">
                          System Process
                        </p>
                        <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[200px]">
                          Ward 4B Historical Batch
                        </p>
                      </td>
                      <td className="py-3.5 px-3 align-middle text-right">
                        <button className="p-1.5 text-gray-400 hover:text-[#1e4ed8] hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="py-3.5 px-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"></div>
                          <div>
                            <p className="text-gray-900 font-bold text-xs">
                              14:21:12
                            </p>
                            <p className="text-gray-400 text-[10px] mt-0.5 font-medium">
                              Today, Oct 24
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[9px] font-bold px-2 py-1 rounded-md border border-red-100 tracking-widest uppercase">
                          Alert Trig
                        </span>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <p className="text-gray-900 text-xs font-bold">
                          Auto-Monitor
                        </p>
                        <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[200px]">
                          Tachycardia event detected
                        </p>
                      </td>
                      <td className="py-3.5 px-3 align-middle text-right">
                        <button className="p-1.5 text-gray-400 hover:text-[#1e4ed8] hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="py-3.5 px-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                          <div>
                            <p className="text-gray-900 font-bold text-xs">
                              13:45:00
                            </p>
                            <p className="text-gray-400 text-[10px] mt-0.5 font-medium">
                              Today, Oct 24
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <span className="inline-flex items-center gap-1 bg-white text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md border border-gray-200 tracking-widest uppercase shadow-sm">
                          Auth Log
                        </span>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <p className="text-gray-900 text-xs font-bold">
                          Dr. Mark
                        </p>
                        <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[200px]">
                          Secure gateway portal access
                        </p>
                      </td>
                      <td className="py-3.5 px-3 align-middle text-right">
                        <button className="p-1.5 text-gray-400 hover:text-[#1e4ed8] hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
