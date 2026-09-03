import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, CheckCircle2, Ban, ShieldAlert, KeyRound, Trash2, Stethoscope } from "lucide-react";

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
        <span className="bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    return (
      <span className="bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8] px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getRoleBadge = (role) => {
    let classes = "bg-[#EDF1EF] text-[#152131] border-[#DCE3DF]";
    let icon = <ShieldCheck size={11} />;
    if (role === "Super Admin" || role === "super_admin") {
      classes = "bg-[#FBEAE6] text-[#E8532E] border-[#F5C7BD]";
      icon = <ShieldCheck size={11} />;
    } else if (role === "Authorized Medical Expert" || role === "medical_expert" || role === "Expert Reviewer") {
      classes = "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]";
      icon = <Stethoscope size={11} />;
    }
    return (
      <span className={`px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider border inline-flex items-center gap-1 ${classes}`}>
        {icon}
        {(role === "Authorized Medical Expert" || role === "medical_expert") ? "Expert Reviewer" : role}
      </span>
    );
  };

  const isStatusActive = (staff.account_status || staff.status)?.toLowerCase() === "active";
  const targetRoleLabel = (staff.role === "System Admin" || staff.role === "admin") ? "Authorized Medical Expert" : "System Admin";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          className="relative w-full max-w-lg bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#DCE3DF] flex flex-col overflow-hidden text-[#152131] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF] z-10">
            <div>
              <h3 
                className="text-[17px] font-medium text-[#152131] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Administrative Staff Details
              </h3>
              <p className="text-[11px] text-[#8B9893] mt-0.5 font-medium">{staff.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#5C6B66] hover:text-[#152131] p-1.5 rounded-lg hover:bg-[#EDF1EF] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4.5">
            {/* Main profile card */}
            <div className="bg-[#EDF1EF]/60 p-4.5 rounded-[10px] border border-[#DCE3DF] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 
                    className="text-[17px] font-medium text-[#152131]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {staff.name}
                  </h4>
                  <p className="font-mono text-[10px] text-[#5C6B66] mt-0.5 uppercase tracking-wider font-semibold">ID: {staff.id}</p>
                </div>
                {getStatusBadge(staff.account_status || staff.status)}
              </div>

              {isProtected && (
                <div className="bg-[#FBEAE6] border border-[#F5C7BD] text-[#E8532E] px-3 py-1.5 rounded-[6px] text-[10.5px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert size={13} className="text-[#E8532E]" /> Protected Super Admin Account
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="bg-[#FFFFFF] p-4.5 rounded-[10px] border border-[#DCE3DF] space-y-3.5">
              <h5 className="text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
                <KeyRound size={12} className="text-[#E8532E]" /> Account Parameters
              </h5>
              <div className="grid grid-cols-2 gap-3.5 text-[12px]">
                <div>
                  <p className="text-[#8B9893] font-semibold text-[10.5px] uppercase tracking-wider">Role Assignment</p>
                  <div className="mt-1">{getRoleBadge(staff.role)}</div>
                </div>
                <div>
                  <p className="text-[#8B9893] font-semibold text-[10.5px] uppercase tracking-wider">Contact Number</p>
                  <p className="mt-1 font-bold text-[#152131]">{staff.phone || "No Phone"}</p>
                </div>
                <div>
                  <p className="text-[#8B9893] font-semibold text-[10.5px] uppercase tracking-wider">Email Address</p>
                  <p className="mt-1 font-bold text-[#152131] truncate">{staff.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[#8B9893] font-semibold text-[10.5px] uppercase tracking-wider">Provision Date</p>
                  <p className="mt-1 font-bold text-[#152131]">
                    {staff.created_at
                      ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-[#DCE3DF] bg-[#FFFFFF] flex flex-wrap justify-between items-center gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {!isProtected && (
                <>
                  <button
                    onClick={() => onChangeRole(staff.id, staff.role, targetRoleLabel, staff)}
                    className="px-3.5 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => onToggleStatus(staff)}
                    className={`px-3.5 py-2 text-[12px] font-semibold text-white rounded-[8px] shadow-2xs transition-colors cursor-pointer ${
                      isStatusActive ? "bg-[#A9741B] hover:bg-[#8F5F14]" : "bg-[#1B6E63] hover:bg-[#14534B]"
                    }`}
                  >
                    {isStatusActive ? "Disable" : "Enable"}
                  </button>
                </>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 text-[12px] font-semibold text-white bg-[#A93226] hover:bg-[#8A1F1A] rounded-[8px] shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  Delete Account
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
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
