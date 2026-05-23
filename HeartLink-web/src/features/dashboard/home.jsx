import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Plus,
  LogOut,
  Search,
  Bell,
  User,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  HeartPulse,
  Settings,
  MoreVertical,
  Activity,
  Menu,
  ChevronDown,
  X,
  ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans text-gray-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Reduced width to w-64 */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-50 border-r border-gray-100 flex flex-col justify-between flex-shrink-0 overflow-hidden
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Enhanced Logo */}
          <div className="p-6 flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#1e4ed8] text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/20">
                <HeartPulse size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col cursor-pointer">
                <span className="text-gray-900 text-xl font-bold tracking-tight leading-none">
                  Heart<span className="text-[#1e4ed8]">Link</span>
                </span>
                <span className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">
                  Atelier
                </span>
              </div>
            </div>
            {/* Mobile Close Button */}
            <button
              className="lg:hidden text-gray-400 hover:text-gray-900 bg-white p-1 rounded-md border border-gray-100 shadow-sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-5 flex flex-col gap-1 flex-1 overflow-y-auto pb-6">
            <div className="mb-1 mt-2">
              <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">
                Overview
              </p>
            </div>

            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2.5 bg-white text-[#1e4ed8] border border-blue-100 shadow-sm rounded-xl text-sm font-semibold transition-all group"
            >
              <LayoutDashboard size={18} strokeWidth={2.5} />
              Dashboard
            </a>

            <div className="mb-1 mt-5">
              <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">
                Management
              </p>
            </div>

            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2.5 text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900 rounded-xl text-sm font-medium transition-all group"
            >
              <Users
                size={18}
                className="group-hover:text-[#1e4ed8] transition-colors"
              />
              User Management
            </a>
            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2.5 text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900 rounded-xl text-sm font-medium transition-all group"
            >
              <FileText
                size={18}
                className="group-hover:text-[#1e4ed8] transition-colors"
              />
              Content Management
            </a>

            <div className="mb-1 mt-5">
              <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">
                System
              </p>
            </div>

            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2.5 text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900 rounded-xl text-sm font-medium transition-all group"
            >
              <Settings
                size={18}
                className="group-hover:text-[#1e4ed8] transition-colors"
              />
              Settings
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-white lg:rounded-l-[1.5rem] lg:shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-gray-100">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-gray-500 hover:text-gray-900 p-1.5 bg-gray-50 rounded-lg border border-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            {/* Search Bar */}
            <div className="flex items-center bg-[#f8fafc] rounded-lg px-3 py-2 w-full max-w-xs xl:max-w-sm border border-gray-100 focus-within:ring-2 focus-within:ring-[#1e4ed8]/20 focus-within:border-[#1e4ed8] transition-all shadow-sm">
              <Search size={16} className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search patients, logs..."
                className="bg-transparent border-none outline-none text-xs w-full text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="hidden sm:flex items-center gap-4">
            {/* New Report Action */}
            <button className="bg-[#1e4ed8] hover:bg-[#113296] text-white font-semibold py-2 px-3.5 rounded-lg transition-all shadow-sm shadow-blue-900/20 flex items-center justify-center gap-1.5 text-xs">
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden md:inline">New Report</span>
            </button>

            {/* System Status */}
            <div className="hidden xl:flex items-center justify-between border border-gray-100 bg-[#f8fafc] px-3 py-1.5 rounded-lg shadow-sm min-w-[130px]">
              <div>
                <span className="text-gray-900 font-bold text-[11px] block leading-tight">
                  System Status
                </span>
                <span className="text-gray-500 text-[8px] font-medium tracking-widest uppercase">
                  Live Monitoring
                </span>
              </div>
              <Activity
                className="text-[#1e4ed8]"
                size={14}
                strokeWidth={2.5}
              />
            </div>

            <div className="h-6 w-px bg-gray-100 hidden md:block"></div>

            {/* Notifications */}
            <button className="text-gray-400 hover:text-[#1e4ed8] relative transition-colors bg-[#f8fafc] p-2 rounded-lg border border-gray-100 shadow-sm">
              <Bell size={16} />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
            </button>

            <div className="h-6 w-px bg-gray-100"></div>

            {/* Profile Dropdown Component */}
            <div className="relative">
              <div
                className="flex items-center gap-2.5 cursor-pointer group select-none"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="relative">
                  <img
                    src="https://ui-avatars.com/api/?name=Admin+User&background=1e4ed8&color=fff&rounded=true&bold=true"
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                      Admin User
                    </p>
                    <ShieldCheck size={12} className="text-[#1e4ed8]" />
                  </div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-medium mt-1">
                    Chief Admin
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 group-hover:text-gray-900 hidden md:block transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                />
              </div>

              {/* Dropdown Menu */}
              {profileOpen && (
                <>
                  {/* Invisible backdrop to close dropdown when clicking outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  ></div>

                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 transform opacity-100 scale-100 transition-all origin-top-right">
                    <a
                      href="#"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User size={14} className="text-gray-400" /> My Profile
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={14} className="text-gray-400" /> Account
                      Settings
                    </a>

                    <div className="h-px bg-gray-100 my-1.5"></div>

                    {/* Temporary routing  */}
                    <Link to="/">
                      <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

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
