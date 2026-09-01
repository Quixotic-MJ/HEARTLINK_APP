import React from "react";
import { Search, Filter, ShieldCheck, Heart, Ban, CheckCircle2, Archive, Activity, UserCheck, AlertTriangle } from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";

const UserListView = ({ users, searchQuery, onSearchChange, filterStatus, onFilterChange, onOpenUser, loading }) => {
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
        <div className="h-4 w-20 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-4 w-16 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-4 w-16 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-4 w-16 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-4 w-16 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5">
        <div className="h-4 w-20 bg-slate-200 rounded-full" />
      </td>
      <td className="py-4 px-5 text-right">
        <div className="h-7 w-16 bg-slate-200 rounded-lg inline-block" />
      </td>
    </tr>
  );

  const getStatusBadge = (status) => {
    if (status === "Active" || status === "active")
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    return (
      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getHssBadge = (score, tier) => {
    if (score === null || score === undefined) {
      return (
        <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit inline-block">
          N/A
        </span>
      );
    }

    let standardTier = "Stable";
    let colorClasses = "bg-emerald-50 text-emerald-700 border border-emerald-200";

    if (score >= 80) {
      standardTier = "Stable";
      colorClasses = "bg-emerald-50 text-emerald-700 border border-emerald-200";
    } else if (score >= 60) {
      standardTier = "Moderate";
      colorClasses = "bg-amber-50 text-amber-700 border border-amber-200";
    } else if (score >= 50) {
      standardTier = "Elevated Risk";
      colorClasses = "bg-rose-50/50 text-rose-700 border border-rose-200/60";
    } else {
      standardTier = "Critical";
      colorClasses = "bg-rose-50 text-rose-700 border border-rose-200";
    }

    return (
      <span className={`${colorClasses} px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit`}>
        <Heart size={10} className="fill-current" /> {score} ({standardTier})
      </span>
    );
  };

  const getActivityBadge = (activity) => {
    if (activity === "Recently Active") {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <Activity size={10} /> Recently Active
        </span>
      );
    } else if (activity === "Inactive") {
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Inactive
        </span>
      );
    } else if (activity === "Sparse Data" || activity === "Sparse") {
      return (
        <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Sparse Data
        </span>
      );
    }
    return (
      <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit">
        New User
      </span>
    );
  };

  const getOnboardingBadge = (status) => {
    if (status === "Complete" || status === "complete") {
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <UserCheck size={10} /> Done
        </span>
      );
    }
    return (
      <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit">
        Pending
      </span>
    );
  };

  const getReviewBadge = (status) => {
    if (status === "Evaluated") {
      return (
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <ShieldCheck size={10} /> Evaluated
        </span>
      );
    }
    return (
      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] w-fit">
        Pending
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Search & Filter bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm focus:ring-2 focus:ring-slate-900/5"
          >
            <option value="all">All Accounts</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Name
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                User ID
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                HSS
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Activity
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Account
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Onboarding
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Review
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={`skeleton-${index}`} />)
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 px-5 text-center text-slate-400 text-xs">
                  No user accounts match the search or filter settings.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => onOpenUser(user)}
                >
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                        {user.name.charAt(0)}
                      </div>
                      <p className="text-slate-900 font-semibold text-xs group-hover:text-slate-700 transition-colors">
                        {user.name}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="font-mono text-[9px] font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 uppercase tracking-widest">
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
                      className="text-[11px] font-medium px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1"
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
  );
};

export default UserListView;
