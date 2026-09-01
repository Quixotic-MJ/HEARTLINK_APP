import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
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

  const isActive = user.status === "Active";

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
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#1A1A1A] rounded-3xl shadow-2xl border border-white/10 overflow-hidden text-white z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#36272B] flex items-center justify-center text-[#E55F37] border border-[#E55F37]/30 shrink-0">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Account Governance
              </h3>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest">
                User Access Controls
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30 flex items-center justify-center font-bold text-lg shrink-0">
              {user.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white truncate">
                {user.name}
              </p>
              <p className="text-xs font-mono text-[#89899C] mt-0.5">
                {formatUserRef(user.id)}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#21202E]/50 border border-white/10">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#89899C] mb-1.5">
                Account Status
              </p>
              {isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={10} /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Ban size={10} /> Disabled
                </span>
              )}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#89899C] mb-1.5">
                Registered
              </p>
              <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Calendar size={12} className="text-[#89899C]" />
                {user.regDate}
              </p>
            </div>
          </div>

          {/* Deactivation reason (if disabled) */}
          {!isActive && user.deactivationReason && (
            <div className="mt-4 p-3 rounded-xl flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle
                size={14}
                className="text-rose-400 mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">
                  Disabled Reason
                </p>
                <p className="text-xs text-rose-300 leading-relaxed font-medium">
                  {user.deactivationReason}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616]">
          {!isConfirming ? (
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              {isActive ? (
                <button
                  onClick={handleDisableClick}
                  disabled={isSubmitting || isDeleting}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Ban size={13} /> Disable Account
                </button>
              ) : (
                <button
                  onClick={handleEnable}
                  disabled={isSubmitting || isDeleting}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                  disabled={isSubmitting || isDeleting}
                  className="px-3.5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete
                </button>
              )}
            </div>
          ) : (
            /* Disable confirmation with reason */
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle
                  size={14}
                  className="text-rose-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-rose-300 leading-relaxed font-medium">
                  This will immediately revoke the user's access. They will not
                  be able to log in until the account is re-enabled.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#89899C] mb-2 block">
                  Reason for disabling *
                </label>
                <div className="relative">
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl appearance-none cursor-pointer transition-colors focus:outline-none focus:border-[#E55F37]"
                  >
                    <option value="" disabled className="bg-[#161616]">
                      Select a reason...
                    </option>
                    {DISABLE_REASONS.map((reason) => (
                      <option key={reason} value={reason} className="bg-[#161616]">
                        {reason}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  />
                </div>
              </div>

              {selectedReason === "Other" && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#89899C] mb-2 block">
                    Custom Reason *
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe the reason for disabling this account..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#1A1A1A] border border-white/10 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-[#E55F37]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisable}
                  disabled={isSubmitting || !canSubmitDisable}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Ban size={13} />
                  )}
                  {isSubmitting ? "Disabling..." : "Confirm Disable"}
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

