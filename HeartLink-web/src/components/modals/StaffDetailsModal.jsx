import React from "react";
import { X, ShieldCheck, CheckCircle2, Ban, Archive, Lock, Edit } from "lucide-react";

const StaffDetailsModal = ({ isOpen, onClose, staff, onRevoke, onRestore, onEdit }) => {
  if (!isOpen || !staff) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-lg bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Staff Details</h3>
            <p className="text-[11px] text-slate-500 mt-1">{staff.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Identity Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{staff.name}</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {staff.id} • {staff.phone}
              </p>
            </div>
            {getStatusBadge(staff.status)}
          </div>

          {/* Role & Permissions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <ShieldCheck size={13} /> Role & Permissions
            </h4>
            <p className="text-sm font-semibold text-slate-800 mb-3">{staff.role}</p>
            <div className="flex flex-wrap gap-2">
              {staff.permissions?.map((perm, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md uppercase tracking-wider"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          {staff.status === "Disabled" ? (
            <button
              onClick={onRestore}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
            >
              <CheckCircle2 size={14} /> Restore Access
            </button>
          ) : (
            <button
              onClick={onRevoke}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors"
            >
              <Lock size={14} /> Revoke Access
            </button>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0f172a] hover:opacity-90 rounded-xl transition-colors shadow-sm"
            >
              <Edit size={14} /> Edit Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDetailsModal;
