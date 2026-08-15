import React, { useState } from "react";
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
} from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";

const DISABLE_REASONS = [
  "Suspicious activity",
  "Policy violation",
  "User request",
  "Other",
];

const AccountActionModal = ({ isOpen, onClose, user, onToggleStatus }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isActive = user.status === "Active";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ border: "1px solid rgba(15,23,42,0.08)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: "1px solid rgba(15,23,42,0.06)",
            backgroundColor: "#fafbfc",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: "#0f172a",
              }}
            >
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "#0f172a" }}
              >
                Account Management
              </h3>
              <p
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ color: "rgba(15,23,42,0.35)" }}
              >
                User Governance
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
            style={{ color: "rgba(15,23,42,0.4)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xl border border-slate-200">
              {user.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-base font-semibold truncate"
                style={{ color: "#0f172a" }}
              >
                {user.name}
              </p>
              <p
                className="text-xs font-mono mt-0.5"
                style={{ color: "rgba(15,23,42,0.45)" }}
              >
                {formatUserRef(user.id)}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div
            className="grid grid-cols-2 gap-4 p-4 rounded-xl"
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.06)",
            }}
          >
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5"
                style={{ color: "rgba(15,23,42,0.35)" }}
              >
                Account Status
              </p>
              {isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={10} /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                  <Ban size={10} /> Disabled
                </span>
              )}
            </div>
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5"
                style={{ color: "rgba(15,23,42,0.35)" }}
              >
                Registered
              </p>
              <p
                className="text-xs font-medium flex items-center gap-1.5"
                style={{ color: "#0f172a" }}
              >
                <Calendar size={12} style={{ color: "rgba(15,23,42,0.4)" }} />
                {user.regDate}
              </p>
            </div>
          </div>

          {/* Deactivation reason (if disabled) */}
          {!isActive && user.deactivationReason && (
            <div
              className="mt-4 p-3 rounded-xl flex items-start gap-2.5"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <AlertTriangle
                size={14}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-0.5">
                  Disabled Reason
                </p>
                <p className="text-xs text-red-600 leading-relaxed">
                  {user.deactivationReason}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action area */}
        <div
          className="px-6 py-4"
          style={{
            borderTop: "1px solid rgba(15,23,42,0.06)",
            backgroundColor: "#fafbfc",
          }}
        >
          {!isConfirming ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors border shadow-sm"
                style={{
                  color: "#64748b",
                  backgroundColor: "#fff",
                  borderColor: "rgba(15,23,42,0.1)",
                }}
              >
                Close
              </button>
              {isActive ? (
                <button
                  onClick={handleDisableClick}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  <Ban size={13} /> Disable Account
                </button>
              ) : (
                <button
                  onClick={handleEnable}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  {isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  Re-enable Account
                </button>
              )}
            </div>
          ) : (
            /* Disable confirmation with reason */
            <div className="space-y-3">
              <div
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <AlertTriangle
                  size={14}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-red-700 leading-relaxed font-medium">
                  This will immediately revoke the user's access. They will not
                  be able to log in until the account is re-enabled.
                </p>
              </div>

              <div>
                <label
                  className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2 block"
                  style={{ color: "rgba(15,23,42,0.5)" }}
                >
                  Reason for disabling *
                </label>
                <div className="relative">
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full pl-4 pr-8 py-2.5 text-xs font-medium rounded-xl appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                    style={{
                      color: selectedReason ? "#0f172a" : "#94a3b8",
                      backgroundColor: "#fff",
                      border: "1px solid rgba(15,23,42,0.1)",
                    }}
                  >
                    <option value="" disabled>
                      Select a reason...
                    </option>
                    {DISABLE_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "rgba(15,23,42,0.3)" }}
                  />
                </div>
              </div>

              {selectedReason === "Other" && (
                <div>
                  <label
                    className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2 block"
                    style={{ color: "rgba(15,23,42,0.5)" }}
                  >
                    Custom Reason *
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe the reason for disabling this account..."
                    rows={2}
                    className="w-full px-4 py-2.5 text-xs rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                    style={{
                      color: "#0f172a",
                      backgroundColor: "#fff",
                      border: "1px solid rgba(15,23,42,0.1)",
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors border shadow-sm disabled:opacity-50"
                  style={{
                    color: "#64748b",
                    backgroundColor: "#fff",
                    borderColor: "rgba(15,23,42,0.1)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisable}
                  disabled={isSubmitting || !canSubmitDisable}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#dc2626" }}
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
      </div>
    </div>
  );
};

export default AccountActionModal;
