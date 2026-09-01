import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, CheckCircle2, Ban, Archive, Lock, ShieldAlert, KeyRound, UserCheck, Trash2, Loader2, Stethoscope } from "lucide-react";

const StaffDetailsModal = ({
  isOpen,
  onClose,
  staff,
  currentUserRole,
  currentUserId,
  onToggleStatus,
  onChangeRole,
  onDeleteStaff,
}) => {
  if (!isOpen || !staff) return null;

  const isSuperAdminRole = staff.role === "Super Admin" || staff.db_role === "super_admin";
  const isSelf = staff.id === currentUserId;
  const isProtected = isSuperAdminRole;
  const canDelete = currentUserRole === "super_admin" && !isProtected && !isSelf;

  const handleDelete = () => {
    if (onDeleteStaff) {
      onDeleteStaff(staff.id, staff.name, staff);
    }
  };

  const getStatusBadge = (status) => {
    const norm = status?.toLowerCase();
    if (norm === "active")
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

  const getRoleBadge = (role) => {
    let classes = "bg-white/5 text-slate-300 border-white/10";
    let icon = <ShieldCheck size={12} />;
    if (role === "Super Admin" || role === "super_admin") {
      classes = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      icon = <ShieldCheck size={12} />;
    } else if (role === "Authorized Medical Expert" || role === "medical_expert" || role === "Expert Reviewer") {
      classes = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      icon = <Stethoscope size={12} />;
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] border inline-flex items-center gap-1.5 ${classes}`}>
        {icon}
        {(role === "Authorized Medical Expert" || role === "medical_expert") ? "Expert Reviewer" : role}
      </span>
    );
  };

  const isStatusActive = (staff.account_status || staff.status)?.toLowerCase() === "active";
  const targetRoleLabel = (staff.role === "System Admin" || staff.role === "admin") ? "Authorized Medical Expert" : "System Admin";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          className="relative w-full max-w-lg bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden text-white z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
            <div>
              <h3 className="text-base font-bold text-white">Administrative Staff Details</h3>
              <p className="text-[11px] text-[#89899C] mt-0.5 font-medium">{staff.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
            {/* Main profile card */}
            <div className="bg-[#21202E]/40 p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-white">{staff.name}</h4>
                  <p className="font-mono text-[9px] text-[#89899C] mt-1 uppercase tracking-wider font-bold">ID: {staff.id}</p>
                </div>
                {getStatusBadge(staff.account_status || staff.status)}
              </div>

              {isProtected && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert size={12} className="text-indigo-400" /> Protected Super Admin Account
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="bg-[#161616] p-5 rounded-2xl border border-white/10 space-y-4">
              <h5 className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-1.5">
                <KeyRound size={12} className="text-[#E55F37]" /> Account Parameters
              </h5>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#89899C] font-medium text-[11px]">Role Assignment</p>
                  <p className="mt-1.5">{getRoleBadge(staff.role)}</p>
                </div>
                <div>
                  <p className="text-[#89899C] font-medium text-[11px]">Contact Number</p>
                  <p className="mt-1.5 font-bold text-white">{staff.phone || "No Phone"}</p>
                </div>
                <div>
                  <p className="text-[#89899C] font-medium text-[11px]">Email Address</p>
                  <p className="mt-1.5 font-bold text-white truncate">{staff.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[#89899C] font-medium text-[11px]">Provision Date</p>
                  <p className="mt-1.5 font-bold text-white">
                    {staff.created_at
                      ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex flex-wrap justify-between items-center gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {!isProtected && (
                <>
                  <button
                    onClick={() => onChangeRole(staff.id, staff.role, targetRoleLabel, staff)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] hover:bg-[#2A2938] border border-white/10 hover:border-white/20 rounded-xl transition-colors cursor-pointer"
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => onToggleStatus(staff)}
                    className={`px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors cursor-pointer ${
                      isStatusActive ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    }`}
                  >
                    {isStatusActive ? "Disable" : "Enable"}
                  </button>
                </>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm shadow-rose-600/25 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Delete Account
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StaffDetailsModal;
