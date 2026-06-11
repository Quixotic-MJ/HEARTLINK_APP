import React, { useState } from "react";
import {
  Search,
  Filter,
  X,
  User,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Save,
  Activity,
  UserPlus,
  Lock,
  Mail,
  Calendar,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  MoreVertical,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; // Adjust path

// Mock Data
const initialAppUsers = [
  {
    id: "USR-A492",
    name: "Robert Villanueva",
    email: "robert.v@email.com",
    regDate: "Mar 12, 2026",
    status: "Active",
    metrics: { loginsThisWeek: 14, avgSession: "8m", alertsTriggered: 3 },
  },
  {
    id: "USR-B118",
    name: "Elena Marasigan",
    email: "elena.m@email.com",
    regDate: "Feb 05, 2026",
    status: "Active",
    metrics: { loginsThisWeek: 21, avgSession: "12m", alertsTriggered: 1 },
  },
  {
    id: "USR-C882",
    name: "Miguel Santos",
    email: "miguel88@email.com",
    regDate: "Apr 20, 2026",
    status: "Disabled",
    metrics: { loginsThisWeek: 0, avgSession: "0m", alertsTriggered: 8 },
    deactivationReason:
      "Repeatedly ignored critical alerts. Account frozen pending medical review.",
  },
];

const initialSystemStaff = [
  {
    id: "MED-01",
    name: "Dr. Sarah Jenkins",
    email: "s.jenkins@heartlink.ph",
    role: "Authorized Medical Expert",
    permissions: ["Validate Recipes", "Verify Exercises", "Evaluate Cases"],
    status: "Active",
  },
  {
    id: "SYS-02",
    name: "Alex Reyes",
    email: "alex.admin@heartlink.ph",
    role: "System Admin",
    permissions: ["Manage Content", "Broadcast Alerts", "View Analytics"],
    status: "Active",
  },
];

const Users = () => {
  // IMPORTANT: Role Simulator for Defense Presentation
  // Toggle this to demonstrate the RBAC (Role-Based Access Control) to the panel
  const [currentUserRole, setCurrentUserRole] = useState("sysadmin"); // options: "chief_admin", "sysadmin", "medical"

  const [activeTab, setActiveTab] = useState("app_users");

  // Data States
  const [appUsers, setAppUsers] = useState(initialAppUsers);
  const [systemStaff, setSystemStaff] = useState(initialSystemStaff);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(""); // "view_user", "deactivate_user", "edit_staff", "create_staff"
  const [activeEntity, setActiveEntity] = useState(null);

  // Deactivation Form State
  const [deactivationReason, setDeactivationReason] = useState("");

  // Open Drawer Helpers
  const handleOpenUser = (user) => {
    setActiveEntity(user);
    setDrawerMode("view_user");
    setIsDrawerOpen(true);
  };

  const handleOpenDeactivate = () => {
    setDeactivationReason("");
    setDrawerMode("deactivate_user");
  };

  const handleCreateStaff = () => {
    setActiveEntity({
      name: "",
      email: "",
      role: "System Admin",
      permissions: [],
    });
    setDrawerMode("create_staff");
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setActiveEntity(null);
    setDrawerMode("");
  };

  // Tab Switcher with Security Check
  const handleTabSwitch = (tab) => {
    if (tab === "system_staff" && currentUserRole !== "chief_admin") {
      alert(
        "Access Denied: Only a Chief Admin can view or modify System Staff records.",
      );
      return;
    }
    setActiveTab(tab);
    setSearchQuery("");
  };

  // Filter Logic
  const filteredUsers = appUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "all" || u.status.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredStaff = systemStaff.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  // UI Helpers
  const getStatusBadge = (status) => {
    if (status === "Active")
      return (
        <span className="bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    if (status === "Disabled")
      return (
        <span className="bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit">
          <Ban size={10} /> Disabled
        </span>
      );
    return (
      <span className="bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit">
        <Archive size={10} /> Archived
      </span>
    );
  };

  return (
    <AdminLayout>
      {/* ⚠️ PRESENTATION UTILITY: Role Simulator Banner
      <div className="mb-4 bg-purple-50 border border-purple-200 p-2.5 rounded-lg flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-purple-600" />
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-widest">
            Presentation Tool: Simulate Role Access
          </span>
        </div>
        <select
          value={currentUserRole}
          onChange={(e) => {
            setCurrentUserRole(e.target.value);
            if (
              e.target.value !== "chief_admin" &&
              activeTab === "system_staff"
            )
              setActiveTab("app_users");
          }}
          className="text-[10px] font-bold bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded focus:outline-none cursor-pointer"
        >
          <option value="chief_admin">Chief Admin (Full Access)</option>
          <option value="sysadmin">System Admin (Restricted)</option>
          <option value="medical">Medical Expert (Restricted)</option>
        </select>
      </div> */}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            System Security
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Account <span className="text-[#1e4ed8]">Management.</span>
          </h2>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="bg-white p-1 rounded-lg inline-flex flex-wrap shadow-sm border border-gray-100 mb-5 w-full sm:w-auto">
        <button
          onClick={() => handleTabSwitch("app_users")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "app_users"
              ? "bg-blue-50 text-[#1e4ed8] shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <User size={14} /> High-Risk Individuals
        </button>

        <button
          onClick={() => handleTabSwitch("system_staff")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "system_staff"
              ? "bg-blue-50 text-[#1e4ed8] shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          } ${currentUserRole !== "chief_admin" ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {currentUserRole !== "chief_admin" ? (
            <Lock size={14} className="text-red-400" />
          ) : (
            <ShieldCheck size={14} />
          )}
          System Staff
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: HIGH-RISK INDIVIDUALS (APP USERS)  */}
      {/* ========================================= */}
      {activeTab === "app_users" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-gray-50 bg-[#f8fafc] flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <Filter
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
              >
                <option value="all">All Accounts</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* User Data Table */}
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-2/5">
                    Name & Email
                  </th>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                    Registration Date
                  </th>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                    Account Status
                  </th>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[#f8fafc] transition-colors group cursor-pointer"
                    onClick={() => handleOpenUser(user)}
                  >
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1e4ed8] flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-gray-900 font-bold text-[11px] mb-0.5">
                            {user.name}
                          </p>
                          <p className="text-gray-500 text-[9px] font-medium flex items-center gap-1">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span className="text-gray-600 text-[11px] font-medium flex items-center gap-1">
                        <Calendar size={12} /> {user.regDate}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-3 px-4 align-middle text-right">
                      <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center gap-1">
                        View Details <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: SYSTEM STAFF (ADMINS & EXPERTS)    */}
      {/* ========================================= */}
      {activeTab === "system_staff" && currentUserRole === "chief_admin" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 border-b border-gray-50 bg-[#f8fafc] flex justify-between items-center">
            <div className="relative w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] transition-all shadow-sm"
              />
            </div>
            <button
              onClick={handleCreateStaff}
              className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm shadow-blue-900/20 transition-colors"
            >
              <UserPlus size={14} strokeWidth={2.5} /> Create New Account
            </button>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                    Staff Member
                  </th>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                    Role
                  </th>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/3">
                    Access Permissions
                  </th>
                  <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.map((staff) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-[#f8fafc] transition-colors"
                  >
                    <td className="py-3 px-4 align-middle">
                      <p className="text-gray-900 font-bold text-[11px] mb-0.5">
                        {staff.name}
                      </p>
                      <p className="text-gray-500 text-[9px] font-mono">
                        {staff.id} • {staff.email}
                      </p>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest uppercase ${staff.role.includes("Expert") ? "bg-green-50 text-green-700 border-green-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}
                      >
                        {staff.role.includes("Expert") ? (
                          <Stethoscope size={10} />
                        ) : (
                          <ShieldCheck size={10} />
                        )}{" "}
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-wrap gap-1">
                        {staff.permissions.map((perm, i) => (
                          <span
                            key={i}
                            className="text-[8px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wider"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-right">
                      <button className="p-1.5 text-gray-400 hover:text-[#1e4ed8] hover:bg-blue-50 rounded transition-colors shadow-sm border border-transparent hover:border-gray-200">
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* SLIDE-OUT DRAWER: Dynamic Actions         */}
      {/* ========================================= */}
      {isDrawerOpen && activeEntity && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          <div className="relative w-full max-w-md bg-[#f8fafc] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {drawerMode === "view_user" && "User Details"}
                  {drawerMode === "deactivate_user" && "Deactivate Account"}
                  {drawerMode === "create_staff" && "Register System Staff"}
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {drawerMode === "create_staff"
                    ? "Define administrative access controls."
                    : activeEntity.name}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-gray-400 hover:text-gray-900 bg-gray-50 p-1.5 rounded-md border border-gray-200 shadow-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content Area */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {/* --- VIEW USER MODE --- */}
              {drawerMode === "view_user" && (
                <div className="space-y-6">
                  {/* Identity Card */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">
                        {activeEntity.name}
                      </h2>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {activeEntity.id}
                      </p>
                    </div>
                    {getStatusBadge(activeEntity.status)}
                  </div>

                  {/* Engagement Data */}
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-1.5">
                      <Activity size={12} /> Engagement Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Logins (7 Days)
                        </p>
                        <p className="text-xl font-black text-[#1e4ed8]">
                          {activeEntity.metrics.loginsThisWeek}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Avg Session
                        </p>
                        <p className="text-xl font-black text-[#1e4ed8]">
                          {activeEntity.metrics.avgSession}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Alert Frequency */}
                  <div>
                    <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest border-b border-red-100 pb-1.5 mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Alert History
                    </h4>
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-red-800 uppercase tracking-wider mb-0.5">
                          High-Risk Triggers
                        </p>
                        <p className="text-[10px] text-red-600">
                          Total alerts generated by this account.
                        </p>
                      </div>
                      <span className="text-2xl font-black text-red-600">
                        {activeEntity.metrics.alertsTriggered}
                      </span>
                    </div>
                  </div>

                  {/* Disabled Context (if applicable) */}
                  {activeEntity.status === "Disabled" && (
                    <div className="bg-gray-100 border border-gray-200 p-4 rounded-xl">
                      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Ban size={10} /> Deactivation Log
                      </p>
                      <p className="text-[11px] font-medium text-gray-800 italic">
                        "{activeEntity.deactivationReason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* --- DEACTIVATE USER MODE (The Pop-up Flow) --- */}
              {drawerMode === "deactivate_user" && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle
                      size={16}
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-1">
                        Account Suspension Protocol
                      </p>
                      <p className="text-[10px] text-red-700 leading-relaxed">
                        You are about to disable access for{" "}
                        <strong>{activeEntity.name}</strong>. System protocol
                        requires logging a formal reason for auditing purposes.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 mb-1.5">
                      Deactivation Reason{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows="4"
                      value={deactivationReason}
                      onChange={(e) => setDeactivationReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-colors resize-none"
                      placeholder="Enter specific clinical or administrative reason for disabling this account..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 mb-1.5">
                      Action Timestamp
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`}
                      className="w-full px-3 py-2 text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* --- CREATE SYSTEM STAFF MODE --- */}
              {drawerMode === "create_staff" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-[#1e4ed8] focus:outline-none"
                        placeholder="e.g. Dr. Jane Doe"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-[#1e4ed8] focus:outline-none"
                        placeholder="jane@heartlink.ph"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">
                        Temporary Password
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg focus:border-[#1e4ed8] focus:outline-none"
                        value="TempPass2026!"
                        readOnly
                      />
                    </div>
                    <div className="col-span-2 mt-2">
                      <label className="block text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest border-b border-blue-100 pb-1 mb-2">
                        Role Assignment
                      </label>
                      <select className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg focus:border-[#1e4ed8] focus:outline-none">
                        <option>Authorized Medical Expert</option>
                        <option>System Admin</option>
                      </select>
                    </div>
                    <div className="col-span-2 mt-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Granular Permissions
                      </label>
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                        <label className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                          <input
                            type="checkbox"
                            className="rounded text-[#1e4ed8]"
                            defaultChecked
                          />{" "}
                          Validate Recipes & Exercises
                        </label>
                        <label className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                          <input
                            type="checkbox"
                            className="rounded text-[#1e4ed8]"
                            defaultChecked
                          />{" "}
                          Evaluate High-Risk Cases
                        </label>
                        <label className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                          <input
                            type="checkbox"
                            className="rounded text-[#1e4ed8]"
                          />{" "}
                          Manage App Users
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-2 shrink-0">
              {drawerMode === "view_user" &&
                activeEntity.status === "Active" && (
                  <button
                    onClick={handleOpenDeactivate}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors mr-auto"
                  >
                    <Ban size={14} /> Disable Account
                  </button>
                )}

              {drawerMode === "deactivate_user" && (
                <>
                  <button
                    onClick={() => setDrawerMode("view_user")}
                    className="px-4 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    disabled={!deactivationReason}
                  >
                    Confirm Deactivation
                  </button>
                </>
              )}

              {drawerMode === "create_staff" && (
                <>
                  <button
                    onClick={closeDrawer}
                    className="px-4 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  >
                    Cancel
                  </button>
                  <button className="flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-bold text-white bg-[#1e4ed8] hover:bg-[#113296] rounded-lg shadow-sm transition-colors">
                    <UserPlus size={14} /> Provision Account
                  </button>
                </>
              )}

              {drawerMode === "view_user" && (
                <button
                  onClick={closeDrawer}
                  className="px-5 py-1.5 text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Users;
