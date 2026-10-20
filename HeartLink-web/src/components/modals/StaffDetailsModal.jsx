import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, CheckCircle2, Ban, ShieldAlert, KeyRound, Trash2, Stethoscope, BadgeCheck } from "lucide-react";

const StaffDetailsModal = ({
  isOpen,
  onClose,
  staff,
  currentUserRole,
  currentUserId,
  onToggleStatus,
  onChangeRole,
  onDeleteStaff,
  onToggleClinician,
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
        <span className="bg-ds-mint text-ds-charcoal border border-ds-mint px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    return (
      <span className="bg-ds-rose text-ds-ink border border-ds-rose px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getRoleBadge = (role) => {
    let classes = "bg-ds-surface text-ds-ink border-ds-hairline";
    let icon = <ShieldCheck size={11} />;
    if (role === "Super Admin" || role === "super_admin") {
      classes = "bg-ds-tint text-ds-on-tint border-ds-tint";
      icon = <ShieldCheck size={11} />;
    } else if (role === "Authorized Medical Expert" || role === "medical_expert" || role === "Expert Reviewer") {
      classes = "bg-ds-mint text-ds-charcoal border-ds-mint";
      icon = <Stethoscope size={11} />;
    }
    return (
      <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider border inline-flex items-center gap-1 ${classes}`}>
        {icon}
        {(role === "Authorized Medical Expert" || role === "medical_expert") ? "Expert Reviewer" : role}
      </span>
    );
  };

  const isStatusActive = (staff.account_status || staff.status)?.toLowerCase() === "active";
  const isExpert = staff.role === "Authorized Medical Expert" || staff.db_role === "medical_expert";
  const canVerify = currentUserRole === "super_admin" && isExpert && onToggleClinician;
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
          className="relative w-full max-w-lg bg-ds-canvas max-h-full rounded-2xl shadow-2xl border border-ds-hairline flex flex-col overflow-hidden text-ds-ink z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas z-10">
            <div>
              <h3 className="text-[17px] font-bold text-ds-ink leading-tight">
                Administrative Staff Details
              </h3>
              <p className="text-[11px] text-ds-steel mt-0.5 font-medium">{staff.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-ds-slate hover:text-ds-ink p-1.5 rounded-lg hover:bg-ds-surface transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4.5">
            {/* Main profile card */}
            <div className="bg-ds-surface/60 p-4.5 rounded-xl border border-ds-hairline space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[17px] font-bold text-ds-ink">
                    {staff.name}
                  </h4>
                  <p className="text-[11px] text-ds-slate mt-0.5 uppercase tracking-wider font-semibold">ID: {staff.id}</p>
                </div>
                {getStatusBadge(staff.account_status || staff.status)}
              </div>

              {isProtected && (
                <div className="bg-ds-tint border border-ds-tint text-ds-on-tint px-3 py-1.5 rounded-[6px] text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert size={13} className="text-ds-primary" /> Protected Super Admin Account
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="bg-ds-canvas p-4.5 rounded-xl border border-ds-hairline space-y-3.5">
              <h5 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 flex items-center gap-1.5">
                <KeyRound size={12} className="text-ds-primary" /> Account Parameters
              </h5>
              <div className="grid grid-cols-2 gap-3.5 text-[12px]">
                <div>
                  <p className="text-ds-steel font-semibold text-[11px] uppercase tracking-wider">Role Assignment</p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {getRoleBadge(staff.role)}
                    {staff.expert_type && (
                      <span className="text-[11px] font-bold text-ds-charcoal bg-ds-mint px-2 py-0.5 rounded border border-ds-mint">
                        {staff.expert_type}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-ds-steel font-semibold text-[11px] uppercase tracking-wider">Contact Number</p>
                  <p className="mt-1 font-bold text-ds-ink">{staff.phone || "No Phone"}</p>
                </div>
                <div>
                  <p className="text-ds-steel font-semibold text-[11px] uppercase tracking-wider">Email Address</p>
                  <p className="mt-1 font-bold text-ds-ink truncate">{staff.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-ds-steel font-semibold text-[11px] uppercase tracking-wider">Provision Date</p>
                  <p className="mt-1 font-bold text-ds-ink">
                    {staff.created_at
                      ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* HL-058: only reviews by verified clinicians count in Model Check */}
            {isExpert && (
              <div className="bg-ds-canvas p-4.5 rounded-xl border border-ds-hairline space-y-2.5">
                <h5 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 flex items-center gap-1.5">
                  <BadgeCheck size={12} className="text-ds-primary" /> Clinician Verification
                </h5>
                <p className={`text-[12.5px] font-semibold m-0 ${staff.is_verified_clinician ? "text-ds-charcoal" : "text-ds-warm-text"}`}>
                  {staff.is_verified_clinician
                    ? `Verified clinician${staff.clinician_verified_at ? ` since ${new Date(staff.clinician_verified_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}` : ""}`
                    : "Not verified: case reviews count as practice"}
                </p>
                <p className="text-[11.5px] text-ds-slate m-0">
                  Verify only after checking their professional license. Only reviews submitted while verified count in Model Check; earlier practice reviews stay practice.
                </p>
                {canVerify && (
                  <button
                    onClick={() => onToggleClinician(staff)}
                    className={`px-3.5 py-2 text-[12px] font-semibold rounded-[8px] transition-colors cursor-pointer border ${
                      staff.is_verified_clinician
                        ? "text-ds-ink bg-ds-surface hover:bg-ds-hairline border-ds-hairline"
                        : "text-white bg-ds-primary hover:bg-ds-primary border-ds-success"
                    }`}
                  >
                    {staff.is_verified_clinician ? "Remove verification" : "Mark as verified clinician"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-ds-hairline bg-ds-canvas flex flex-wrap justify-between items-center gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {!isProtected && (
                <>
                  <button
                    onClick={() => onChangeRole(staff.id, staff.role, targetRoleLabel, staff)}
                    className="px-3.5 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => onToggleStatus(staff)}
                    className={`px-3.5 py-2 text-[12px] font-semibold text-white rounded-[8px] transition-colors cursor-pointer ${
                      isStatusActive ? "bg-ds-warm-text hover:bg-ds-warm-text" : "bg-ds-primary hover:bg-ds-primary"
                    }`}
                  >
                    {isStatusActive ? "Disable" : "Enable"}
                  </button>
                </>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 text-[12px] font-semibold text-white bg-ds-danger hover:bg-ds-danger rounded-[8px] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  Delete Account
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
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
