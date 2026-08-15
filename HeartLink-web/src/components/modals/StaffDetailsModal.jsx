import React from "react";
import { X, ShieldCheck, CheckCircle2, Ban, Archive, Lock, ShieldAlert, KeyRound } from "lucide-react";

const StaffDetailsModal = ({
  isOpen,
  onClose,
  staff,
  currentUserRole,
  currentUserId,
  onToggleStatus,
  onChangeRole
}) => {
  if (!isOpen || !staff) return null;

  const isSuperAdminRole = staff.role === "Super Admin" || staff.db_role === "super_admin";
  const isSelf = staff.id === currentUserId;
  const isProtected = isSuperAdminRole;

  const getStatusBadge = (status) => {
    const norm = status?.toLowerCase();
    if (norm === "active")
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

  const getRoleBadge = (role) => {
    let classes = "bg-slate-50 text-slate-700 border-slate-200";
    if (role === "Super Admin" || role === "super_admin") {
      classes = "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (role === "Authorized Medical Expert" || role === "medical_expert") {
      classes = "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] border ${classes}`}>
        {(role === "Authorized Medical Expert" || role === "medical_expert") ? "Expert Reviewer" : role}
      </span>
    );
  };

  const isStatusActive = (staff.account_status || staff.status)?.toLowerCase() === "active";
  const targetRoleLabel = (staff.role === "System Admin") ? "Expert Reviewer" : "System Admin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Administrative Staff Details</h3>
            <p className="text-[11px] text-slate-500 mt-1">{staff.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
          {/* Main profile card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{staff.name}</h4>
                <p className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-wider">ID: {staff.id}</p>
              </div>
              {getStatusBadge(staff.account_status || staff.status)}
            </div>

            {isProtected && (
              <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert size={12} /> Protected Account
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <KeyRound size={12} /> Account Parameters
            </h5>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Role Assignment</p>
                <p className="mt-1">{getRoleBadge(staff.role)}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Mobile Number</p>
                <p className="mt-1 font-semibold text-slate-800">{staff.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Email Address</p>
                <p className="mt-1 font-semibold text-slate-800 truncate">{staff.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Provision Date</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {staff.created_at
                    ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex gap-2">
            {!isProtected && (
              <>
                <button
                  onClick={() => onChangeRole(staff.id, staff.role, targetRoleLabel)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Change Role
                </button>
                <button
                  onClick={() => onToggleStatus(staff)}
                  className={`px-3.5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-colors cursor-pointer ${
                    isStatusActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isStatusActive ? "Disable" : "Enable"}
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDetailsModal;
