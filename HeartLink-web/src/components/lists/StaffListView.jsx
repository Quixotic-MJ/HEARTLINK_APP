import React from "react";
import { Search, UserPlus, ShieldCheck, Stethoscope, ChevronRight } from "lucide-react";

const StaffListView = ({ staffList, searchQuery, onSearchChange, onOpenStaff, onCreateStaff }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-sm"
          />
        </div>
        <button
          onClick={onCreateStaff}
          className="flex items-center justify-center w-full sm:w-auto gap-2 bg-[#0f172a] hover:opacity-90 active:scale-[0.99] text-white font-medium text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={16} /> Create New Account
        </button>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Name & Phone Number
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                Role
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-1/3">
                Access Permissions
              </th>
              <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staffList.map((staff) => (
              <tr
                key={staff.id}
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                onClick={() => onOpenStaff(staff)}
              >
                <td className="py-4 px-5 align-middle">
                  <p className="text-slate-900 font-semibold text-xs mb-0.5 group-hover:text-slate-700 transition-colors">
                    {staff.name}
                  </p>
                  <p className="text-slate-500 text-[10px] font-mono">
                    {staff.id} • {staff.phone}
                  </p>
                </td>
                <td className="py-4 px-5 align-middle">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border tracking-[0.15em] uppercase ${
                      staff.role.includes("Expert")
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {staff.role.includes("Expert") ? <Stethoscope size={12} /> : <ShieldCheck size={12} />} {staff.role}
                  </span>
                </td>
                <td className="py-4 px-5 align-middle">
                  <div className="flex flex-wrap gap-1.5">
                    {staff.permissions.map((perm, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
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

export default StaffListView;
