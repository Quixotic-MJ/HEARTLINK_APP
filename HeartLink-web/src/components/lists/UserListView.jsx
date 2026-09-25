import React from "react";
import {
  Search,
  ShieldCheck,
  Heart,
  Ban,
  CheckCircle2,
  Activity,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  Users,
  AlertCircle,
} from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import { Skeleton } from "../ui/Skeleton";

const UserListView = ({
  users,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  onOpenUser,
  loading,
}) => {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active" || u.status === "active").length;
  const elevatedRisk = users.filter((u) => u.hssScore !== null && u.hssScore !== undefined && u.hssScore < 60).length;
  const evaluated = users.filter((u) => u.reviewStatus === "Evaluated").length;

  const getStatusBadge = (status) => {
    if (status === "Active" || status === "active") {
      return (
        <span className="bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    }
    return (
      <span className="bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getHssBadge = (score, tier) => {
    if (score === null || score === undefined) {
      return (
        <span className="bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-[9.5px] font-semibold uppercase tracking-wider w-fit inline-block">
          N/A
        </span>
      );
    }

    let standardTier = "Stable";
    let colorClasses = "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]";

    if (score >= 80) {
      standardTier = "Stable";
      colorClasses = "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]";
    } else if (score >= 60) {
      standardTier = "Moderate";
      colorClasses = "bg-[#F6EDDD] text-[#A9741B] border-[#EBD7B8]";
    } else if (score >= 50) {
      standardTier = "Elevated Risk";
      colorClasses = "bg-[#EAF5FC] text-[#2E9AE8] border-[#CDE1F4]";
    } else {
      standardTier = "Critical";
      colorClasses = "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]";
    }

    return (
      <span className={`${colorClasses} border px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit`}>
        <Heart size={10} className="fill-current" /> {score} ({standardTier})
      </span>
    );
  };

  const getActivityBadge = (activity) => {
    if (activity === "Recently Active") {
      return (
        <span className="bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <Activity size={10} /> Active
        </span>
      );
    } else if (activity === "Inactive") {
      return (
        <span className="bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Inactive
        </span>
      );
    } else if (activity === "Sparse Data" || activity === "Sparse") {
      return (
        <span className="bg-[#EAF5FC] text-[#2E9AE8] border border-[#CDE1F4] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Sparse
        </span>
      );
    }
    return (
      <span className="bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-[9px] font-semibold uppercase tracking-wider w-fit">
        New
      </span>
    );
  };

  const getOnboardingBadge = (status) => {
    if (status === "Complete" || status === "complete") {
      return (
        <span className="bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <UserCheck size={10} /> Done
        </span>
      );
    }
    return (
      <span className="bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider w-fit">
        Pending
      </span>
    );
  };

  const getReviewBadge = (status) => {
    if (status === "Evaluated") {
      return (
        <span className="bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <ShieldCheck size={10} /> Evaluated
        </span>
      );
    }
    return (
      <span className="bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider w-fit">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── METRICS ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Total Patients</p>
            <Users size={13} className="text-[#94A3B8]" />
          </div>
          <p className="text-[26px] font-bold text-[#0F172A] leading-tight">
            {loading ? "…" : totalUsers}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Active Accounts</p>
            <CheckCircle2 size={13} className="text-[#1B6E63]" />
          </div>
          <p className="text-[26px] font-bold text-[#1B6E63] leading-tight">
            {loading ? "…" : activeUsers}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Elevated Risk</p>
            <AlertCircle size={13} className="text-[#2E9AE8]" />
          </div>
          <p className="text-[26px] font-bold text-[#2E9AE8] leading-tight">
            {loading ? "…" : elevatedRisk}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Evaluated</p>
            <ShieldCheck size={13} className="text-[#0F172A]" />
          </div>
          <p className="text-[26px] font-bold text-[#0F172A] leading-tight">
            {loading ? "…" : evaluated}
          </p>
        </div>
      </div>

      {/* ── USERS DIRECTORY TABLE CARD ── */}
      <div className="bg-[#FFFFFF] rounded-[10px] border border-[#E2E8F0] flex flex-col overflow-hidden shadow-2xs">
        {/* Search & Filter bar */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#FFFFFF] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, name, or phone…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#E2E8F0] rounded-[8px] focus:outline-none focus:border-[#0F172A] transition-colors bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8]"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-3 pr-7 py-2 text-[12px] font-semibold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] rounded-[8px] focus:outline-none focus:border-[#0F172A] appearance-none cursor-pointer hover:border-[#94A3B8] transition-colors"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronDown size={12} className="text-[#94A3B8]" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]/40">
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  Patient Name
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  User ID
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  HSS Score
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  Activity
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  Account
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  Onboarding
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">
                  Review
                </th>
                <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="border-t border-[#E2E8F0]/60">
                    <td className="py-3.5 px-5"><Skeleton className="w-28 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-20 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-20 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#E2E8F0]/70 rounded" /></td>
                    <td className="py-3.5 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-[#E2E8F0]/70 rounded-[6px]" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 px-5 text-center text-[#64748B] text-[13px]">
                    No user accounts match the search or filter settings.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[#F8FAFC]/60 transition-colors group cursor-pointer"
                    onClick={() => onOpenUser(user)}
                  >
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EAF5FC] text-[#2E9AE8] border border-[#CDE1F4] flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name?.charAt(0) || "P"}
                        </div>
                        <p className="text-[#0F172A] font-semibold text-[13px] group-hover:text-[#2E9AE8] transition-colors">
                          {user.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <span className="text-[11px] font-bold bg-[#F8FAFC] px-2 py-0.5 rounded-[5px] text-[#0F172A] border border-[#E2E8F0] uppercase tracking-wider">
                        {formatUserRef(user.id)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getHssBadge(user.hssScore, user.hssTier)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getActivityBadge(user.activityStatus)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getOnboardingBadge(user.onboardingStatus)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getReviewBadge(user.reviewStatus)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenUser(user)}
                        className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
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
