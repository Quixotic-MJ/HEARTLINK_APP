import React, { useState } from "react";
import { Search, Filter, ShieldCheck, Stethoscope, ChevronRight, UserPlus, Ban, CheckCircle2, RotateCcw } from "lucide-react";

const StaffListView = ({
  staffList = [],
  loading = false,
  error = false,
  onRetry,
  onOpenStaff,
  onCreateStaff
}) => {
  const [internalSearch, setInternalSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const totalStaff = staffList.length;
  const admins = staffList.filter(s => s.role === "System Admin" || s.db_role === "admin").length;
  const experts = staffList.filter(s => s.role === "Authorized Medical Expert" || s.db_role === "medical_expert").length;
  const activeStaff = staffList.filter(s => s.account_status === "active" || s.status?.toLowerCase() === "active").length;

  const handleClearFilters = () => {
    setInternalSearch("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center shadow-sm animate-in fade-in duration-300">
        <p className="text-xs font-semibold text-slate-600 mb-4">Unable to load staff accounts.</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0f172a] hover:opacity-90 rounded-xl transition-all shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filtering
  const filtered = staffList.filter((s) => {
    const searchString = internalSearch.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(searchString) || false;
    const idMatch = s.id?.toLowerCase().includes(searchString) || false;
    const emailMatch = s.email?.toLowerCase().includes(searchString) || false;
    const matchSearch = nameMatch || idMatch || emailMatch;

    // Role Match
    let matchRole = true;
    if (filterRole === "admin") {
      matchRole = s.role === "System Admin" || s.db_role === "admin";
    } else if (filterRole === "medical_expert") {
      matchRole = s.role === "Authorized Medical Expert" || s.db_role === "medical_expert";
    } else if (filterRole === "super_admin") {
      matchRole = s.role === "Super Admin" || s.db_role === "super_admin";
    }

    // Status Match
    let matchStatus = true;
    const itemStatus = (s.account_status || s.status || "active").toLowerCase();
    if (internalSearch) {
      // Allow searching
    }
    if (filterStatus !== "all") {
      matchStatus = itemStatus === filterStatus;
    }

    return matchSearch && matchRole && matchStatus;
  });

  const getStatusBadge = (status) => {
    const norm = status?.toLowerCase();
    if (norm === "active") {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    }
    return (
      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isExpert = role.includes("Expert") || role === "medical_expert";
    const isSuper = role.includes("Super") || role === "super_admin";
    
    let color = "bg-slate-100 text-slate-700 border-slate-200";
    let icon = <ShieldCheck size={12} />;
    
    if (isExpert) {
      color = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = <Stethoscope size={12} />;
    } else if (isSuper) {
      color = "bg-indigo-50 text-indigo-700 border-indigo-200";
      icon = <ShieldCheck size={12} />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border tracking-[0.15em] uppercase ${color}`}>
        {icon} {role}
      </span>
    );
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
          <div className="space-y-1">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-2.5 w-16 bg-slate-100 rounded" />
          </div>
        </div>
      </td>
      <td className="py-4 px-5">
        <div className="h-5 w-24 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-3 w-20 bg-slate-200 rounded" />
      </td>
      <td className="py-4 px-5 text-right">
        <div className="h-8 w-16 bg-slate-200 rounded-lg inline-block" />
      </td>
    </tr>
  );

  return (
    <div className="animate-in fade-in duration-300">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Staff</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{loading ? "..." : totalStaff}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System Admins</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{loading ? "..." : admins}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expert Reviewers</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{loading ? "..." : experts}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Staff</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{loading ? "..." : activeStaff}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Search, Filters, and Actions */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row flex-1 w-full gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff by ID, name or email..."
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-sm"
              />
            </div>
            
            {/* Role Filter */}
            <div className="relative">
              <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="all">All Roles</option>
                <option value="admin">System Admin</option>
                <option value="medical_expert">Expert Reviewer</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <button
            onClick={onCreateStaff}
            className="flex items-center justify-center w-full lg:w-auto gap-2 bg-[#0f172a] hover:opacity-90 active:scale-[0.99] text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <UserPlus size={14} /> Create Staff Account
          </button>
        </div>

        {/* Directory Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Staff Member
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Role
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Status
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Created
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 px-5 text-center text-slate-400 text-xs">
                    <p className="mb-3">
                      {totalStaff === 0 ? "No staff accounts found." : "No staff accounts match these filters."}
                    </p>
                    {totalStaff > 0 && (
                      <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-900 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw size={10} /> Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((staff) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => onOpenStaff(staff)}
                  >
                    <td className="py-4 px-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {staff.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-slate-900 font-semibold text-xs mb-0.5 group-hover:text-slate-700 transition-colors">
                            {staff.name}
                          </p>
                          <span className="font-mono text-[9px] font-medium bg-slate-100 px-1 py-0.5 rounded text-slate-500 border border-slate-200 uppercase tracking-widest">
                            {staff.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      {getRoleBadge(staff.role)}
                    </td>
                    <td className="py-4 px-5 align-middle">
                      {getStatusBadge(staff.account_status || staff.status)}
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="text-slate-600 text-xs font-medium">
                        {staff.created_at
                          ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                          : "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenStaff(staff)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
                      >
                        Manage <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffListView;
