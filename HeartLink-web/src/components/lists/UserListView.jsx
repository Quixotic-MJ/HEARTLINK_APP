import React from "react";
import { Search, Filter, Phone, Calendar, ChevronRight, Ban, CheckCircle2, Archive } from "lucide-react";

const UserListView = ({ users, searchQuery, onSearchChange, filterStatus, onFilterChange, onOpenUser }) => {
  const getStatusBadge = (status) => {
    if (status === "Active")
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    if (status === "Disabled")
      return (
        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <Ban size={10} /> Disabled
        </span>
      );
    return (
      <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
        <Archive size={10} /> Archived
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or phone..."
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
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-2/5">
                Name & Phone Number
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Registration Date
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Account Status
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                onClick={() => onOpenUser(user)}
              >
                <td className="py-4 px-5 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-slate-900 font-semibold text-xs mb-0.5 group-hover:text-slate-700 transition-colors">
                        {user.name}
                      </p>
                      <p className="text-slate-500 text-[10px] font-medium flex items-center gap-1.5">
                        <Phone size={12} /> {user.phone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-5 align-middle">
                  <span className="text-slate-600 text-xs font-medium flex items-center gap-1.5">
                    <Calendar size={14} /> {user.regDate}
                  </span>
                </td>
                <td className="py-4 px-5 align-middle">
                  {getStatusBadge(user.status)}
                </td>
                <td className="py-4 px-5 align-middle text-right">
                  <button className="text-[11px] font-medium px-4 py-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1.5">
                    View Details <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserListView;
