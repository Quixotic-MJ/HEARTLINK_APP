import React from "react";
import { motion } from "framer-motion";
import { Search, Filter, ShieldCheck, Heart, Ban, CheckCircle2, Archive, Activity, UserCheck, AlertTriangle, ChevronDown, Users, AlertCircle } from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import { Skeleton } from "../ui/Skeleton";

const UserListView = ({ users, searchQuery, onSearchChange, filterStatus, onFilterChange, onOpenUser, loading }) => {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active" || u.status === "active").length;
  const elevatedRisk = users.filter((u) => u.hssScore !== null && u.hssScore !== undefined && u.hssScore < 60).length;
  const evaluated = users.filter((u) => u.reviewStatus === "Evaluated").length;

  const getStatusBadge = (status) => {
    if (status === "Active" || status === "active")
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    return (
      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getHssBadge = (score, tier) => {
    if (score === null || score === undefined) {
      return (
        <span className="bg-white/5 text-[#89899C] border border-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit inline-block">
          N/A
        </span>
      );
    }

    let standardTier = "Stable";
    let colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    if (score >= 80) {
      standardTier = "Stable";
      colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (score >= 60) {
      standardTier = "Moderate";
      colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    } else if (score >= 50) {
      standardTier = "Elevated Risk";
      colorClasses = "bg-[#E55F37]/10 text-[#E55F37] border-[#E55F37]/20";
    } else {
      standardTier = "Critical";
      colorClasses = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }

    return (
      <span className={`${colorClasses} border px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit`}>
        <Heart size={10} className="fill-current" /> {score} ({standardTier})
      </span>
    );
  };

  const getActivityBadge = (activity) => {
    if (activity === "Recently Active") {
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <Activity size={10} /> Recently Active
        </span>
      );
    } else if (activity === "Inactive") {
      return (
        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Inactive
        </span>
      );
    } else if (activity === "Sparse Data" || activity === "Sparse") {
      return (
        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Sparse Data
        </span>
      );
    }
    return (
      <span className="bg-white/5 text-[#89899C] border border-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit">
        New User
      </span>
    );
  };

  const getOnboardingBadge = (status) => {
    if (status === "Complete" || status === "complete") {
      return (
        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <UserCheck size={10} /> Done
        </span>
      );
    }
    return (
      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit">
        Pending
      </span>
    );
  };

  const getReviewBadge = (status) => {
    if (status === "Evaluated") {
      return (
        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <ShieldCheck size={10} /> Evaluated
        </span>
      );
    }
    return (
      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Total Patients</p>
            <Users size={14} className="text-[#89899C]" />
          </div>
          <p className="text-2xl font-extrabold text-white">{loading ? "..." : totalUsers}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Active Accounts</p>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{loading ? "..." : activeUsers}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Elevated Risk</p>
            <AlertCircle size={14} className="text-[#E55F37]" />
          </div>
          <p className="text-2xl font-extrabold text-[#E55F37]">{loading ? "..." : elevatedRisk}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">Evaluated</p>
            <ShieldCheck size={14} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-400">{loading ? "..." : evaluated}</p>
        </motion.div>
      </div>

      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-sm">
        {/* Search & Filter bar */}
        <div className="p-4 border-b border-white/10 bg-[#161616] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID or name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
            >
              <option value="all" className="bg-[#161616]">All Accounts</option>
              <option value="active" className="bg-[#161616]">Active</option>
              <option value="disabled" className="bg-[#161616]">Disabled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
              <ChevronDown size={12} className="text-slate-400" />
            </div>
          </div>
        </div>

      {/* Users Table */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                Name
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                User ID
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                HSS
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                Activity
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                Account
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                Onboarding
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                Review
              </th>
              <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [1, 2, 3, 4, 5].map((item) => (
                <tr key={item} className="border-t border-white/5">
                  <td className="py-4 px-5"><Skeleton className="w-28 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5"><Skeleton className="w-20 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5"><Skeleton className="w-20 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                  <td className="py-4 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-white/10 rounded-xl" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 px-5 text-center text-slate-400 text-xs">
                  No user accounts match the search or filter settings.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => onOpenUser(user)}
                >
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30 flex items-center justify-center font-bold text-xs shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <p className="text-white font-bold text-xs group-hover:text-[#E55F37] transition-colors">
                        {user.name}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="font-mono text-[10px] font-bold bg-[#21202E] px-2 py-1 rounded-lg text-slate-300 border border-white/10 uppercase tracking-wider">
                      {formatUserRef(user.id)}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getHssBadge(user.hssScore, user.hssTier)}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getActivityBadge(user.activityStatus)}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getOnboardingBadge(user.onboardingStatus)}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getReviewBadge(user.reviewStatus)}
                  </td>
                  <td className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenUser(user)}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#21202E] text-slate-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                    >
                      Manage
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

export default UserListView;

