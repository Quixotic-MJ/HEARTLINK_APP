import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Loader2,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";

const DISABLE_REASONS = [
  "Suspicious activity",
  "Policy violation",
  "User request",
  "Other",
];

const AccountActionModal = ({ isOpen, onClose, user, onToggleStatus, canDelete, onDeleteUser }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isActive = user.status === "Active" || user.status === "active";

  const handleDelete = () => {
    if (onDeleteUser) {
      onDeleteUser(user.id, user.name, user);
    }
  };

  const handleDisableClick = () => {
    setIsConfirming(true);
    setSelectedReason("");
    setCustomReason("");
  };

  const handleConfirmDisable = async () => {
    const reason =
      selectedReason === "Other" ? customReason.trim() : selectedReason;
    if (!reason) return;

    setIsSubmitting(true);
    try {
      await onToggleStatus(user.id, reason);
    } finally {
      setIsSubmitting(false);
      setIsConfirming(false);
      setSelectedReason("");
      setCustomReason("");
    }
  };

  const handleEnable = async () => {
    setIsSubmitting(true);
    try {
      await onToggleStatus(user.id, null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsConfirming(false);
    setSelectedReason("");
    setCustomReason("");
    onClose();
  };

  const canSubmitDisable =
    selectedReason &&
    (selectedReason !== "Other" || customReason.trim().length > 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          className="relative w-full max-w-md bg-ds-canvas rounded-2xl shadow-2xl border border-ds-hairline overflow-hidden text-ds-ink z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-ds-tint flex items-center justify-center text-ds-on-tint border border-ds-tint shrink-0">
                <Shield size={16} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-ds-ink leading-tight">
                  Account Governance
                </h3>
                <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider mt-0.5">
                  User access controls
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ds-slate hover:text-ds-ink hover:bg-ds-surface transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-3.5 mb-4.5">
              <div className="w-11 h-11 rounded-full bg-ds-tint text-ds-on-tint border border-ds-tint flex items-center justify-center font-bold text-base shrink-0">
                {user.name?.charAt(0) || "P"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-ds-ink truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-ds-slate mt-0.5">
                  {formatUserRef(user.id)}
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[8px] bg-ds-surface/60 border border-ds-hairline">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ds-steel mb-1">
                  Account Status
                </p>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-ds-mint text-ds-charcoal border border-ds-mint">
                    <CheckCircle2 size={10} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-ds-rose text-ds-ink border border-ds-rose">
                    <Ban size={10} /> Disabled
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ds-steel mb-1">
                  Registered
                </p>
                <p className="text-[12px] font-semibold text-ds-ink flex items-center gap-1 mt-0.5">
                  <Calendar size={11} className="text-ds-steel" />
                  {user.regDate}
                </p>
              </div>
            </div>

            {/* Deactivation reason (if disabled) */}
            {!isActive && user.deactivationReason && (
              <div className="mt-3.5 p-3 rounded-[8px] flex items-start gap-2 bg-ds-rose border border-ds-rose">
                <AlertTriangle
                  size={14}
                  className="text-ds-danger mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-[11px] font-bold text-ds-danger uppercase tracking-wider mb-0.5">
                    Disabled Reason
                  </p>
                  <p className="text-[11.5px] text-ds-danger leading-relaxed font-medium">
                    {user.deactivationReason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action area */}
          <div className="px-6 py-4 border-t border-ds-hairline bg-ds-canvas">
            {!isConfirming ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleClose}
                  className="px-3.5 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
                >
                  Close
                </button>
                {isActive ? (
                  <button
                    onClick={handleDisableClick}
                    disabled={isSubmitting}
                    className="flex-1 px-3.5 py-2 text-[12px] font-semibold text-white bg-ds-warm-text hover:bg-ds-warm-text rounded-[8px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Ban size={13} /> Disable Account
                  </button>
                ) : (
                  <button
                    onClick={handleEnable}
                    disabled={isSubmitting}
                    className="flex-1 px-3.5 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary rounded-[8px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    Re-enable Account
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3 py-2 text-[12px] font-semibold text-white bg-ds-danger hover:bg-ds-danger rounded-[8px] transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
              </div>
            ) : (
              /* Disable confirmation with reason */
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-2.5 rounded-[8px] bg-ds-rose border border-ds-rose">
                  <AlertTriangle
                    size={13}
                    className="text-ds-danger mt-0.5 shrink-0"
                  />
                  <p className="text-[11.5px] text-ds-danger leading-relaxed font-medium">
                    This will immediately revoke access. The user will not be able to log in until re-enabled.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-ds-steel mb-1.5 block">
                    Reason for disabling *
                  </label>
                  <div className="relative">
                    <select
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-full pl-3 pr-7 py-2 text-[12.5px] font-medium text-ds-ink bg-ds-canvas border border-ds-hairline-strong rounded-[8px] appearance-none cursor-pointer transition-colors focus:outline-none focus:border-ds-line"
                    >
                      <option value="" disabled>
                        Select a reason…
                      </option>
                      {DISABLE_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ds-steel"
                    />
                  </div>
                </div>

                {selectedReason === "Other" && (
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-ds-steel mb-1 block">
                      Custom Reason *
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Describe the reason for disabling this account…"
                      rows={2}
                      className="w-full px-3 py-2 text-[12.5px] rounded-[8px] bg-ds-canvas border border-ds-hairline-strong text-ds-ink placeholder:text-ds-steel resize-none focus:outline-none focus:border-ds-line"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setIsConfirming(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-3 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDisable}
                    disabled={isSubmitting || !canSubmitDisable}
                    className="flex-1 px-3 py-2 text-[12px] font-semibold text-white bg-ds-danger hover:bg-ds-danger rounded-[8px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Ban size={13} />
                    )}
                    {isSubmitting ? "Disabling…" : "Confirm Disable"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AccountActionModal;
