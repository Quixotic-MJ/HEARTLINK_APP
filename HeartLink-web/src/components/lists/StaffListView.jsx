import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ShieldCheck, Stethoscope, ChevronRight, UserPlus, Ban, CheckCircle2, RotateCcw, ChevronDown, Users, Shield } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

const StaffListView = ({
  staffList = [],
  loading = false,
  error = false,
  onRetry,
  onOpenStaff,
  onCreateStaff,
}) => {
  const [internalSearch, setInternalSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const totalStaff = staffList.length;
  const admins = staffList.filter((s) => s.role === "System Admin" || s.db_role === "admin").length;
  const experts = staffList.filter((s) => s.role === "Authorized Medical Expert" || s.db_role === "medical_expert").length;
  const activeStaff = staffList.filter((s) => s.account_status === "active" || s.status?.toLowerCase() === "active").length;

  const handleClearFilters = () => {
    setInternalSearch("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  if (error) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-10 flex flex-col items-center justify-center text-center shadow-sm animate-in fade-in duration-300">
        <p className="text-xs font-semibold text-slate-300 mb-4">Unable to load staff accounts.</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-bold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl transition-all shadow-sm cursor-pointer"
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
    if (filterStatus !== "all") {
      matchStatus = itemStatus === filterStatus;
    }

    return matchSearch && matchRole && matchStatus;
  });

  const getStatusBadge = (status) => {
    const norm = status?.toLowerCase();
    if (norm === "active") {
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    }
    return (
      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isExpert = role.includes("Expert") || role === "medical_expert";
    const isSuper = role.includes("Super") || role === "super_admin";
    
    let color = "bg-white/5 text-slate-300 border-white/10";
    let icon = <ShieldCheck size={12} />;
    
    if (isExpert) {
      color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      icon = <Stethoscope size={12} />;
    } else if (isSuper) {
      color = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      icon = <ShieldCheck size={12} />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border tracking-[0.15em] uppercase ${color}`}>
        {icon} {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row with Smooth Hover/Stagger */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Total Staff</p>
            <Users size={14} className="text-[#89899C]" />
          </div>
          <p className="text-2xl font-extrabold text-white">{loading ? "..." : totalStaff}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">System Admins</p>
            <Shield size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{loading ? "..." : admins}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Expert Reviewers</p>
            <Stethoscope size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{loading ? "..." : experts}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Active Staff</p>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{loading ? "..." : activeStaff}</p>
        </motion.div>
      </div>

      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Search, Filters, and Actions */}
        <div className="p-4 border-b border-white/10 bg-[#161616] flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row flex-1 w-full gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff by ID, name or email..."
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
              />
            </div>
            
            {/* Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All Roles</option>
                <option value="admin" className="bg-[#161616]">System Admin</option>
                <option value="medical_expert" className="bg-[#161616]">Expert Reviewer</option>
                <option value="super_admin" className="bg-[#161616]">Super Admin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All Statuses</option>
                <option value="active" className="bg-[#161616]">Active</option>
                <option value="disabled" className="bg-[#161616]">Disabled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>
          </div>

          <button
            onClick={onCreateStaff}
            className="flex items-center justify-center w-full lg:w-auto gap-2 bg-[#E55F37] hover:bg-[#D4542E] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-[#E55F37]/25 shrink-0 cursor-pointer"
          >
            <UserPlus size={14} /> Create Staff Account
          </button>
        </div>

        {/* Directory Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Staff Member
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Role
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Status
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Created
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <tr key={item} className="border-t border-white/5">
                    <td className="py-4 px-5"><Skeleton className="w-32 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-24 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-20 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-white/10 rounded-xl" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 px-5 text-center text-slate-400 text-xs">
                    <p className="mb-3 font-medium">
                      {totalStaff === 0 ? "No staff accounts found." : "No staff accounts match these filters."}
                    </p>
                    {totalStaff > 0 && (
                      <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white border border-white/10 bg-[#21202E] hover:border-white/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <RotateCcw size={11} /> Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((staff) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => onOpenStaff(staff)}
                  >
                    <td className="py-4 px-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {staff.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-white font-bold text-xs mb-0.5 group-hover:text-[#E55F37] transition-colors">
                            {staff.name}
                          </p>
                          <span className="font-mono text-[9px] font-bold bg-[#21202E] px-1.5 py-0.5 rounded text-slate-400 border border-white/10 uppercase tracking-wider">
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
                      <span className="text-[#89899C] text-xs font-medium">
                        {staff.created_at
                          ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                          : "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenStaff(staff)}
                        className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#21202E] text-slate-300 hover:text-white hover:border-white/20 transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
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

