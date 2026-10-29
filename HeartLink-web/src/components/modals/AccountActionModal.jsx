import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  Loader2,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import { useDialogFocus } from "../../hooks/useDialogFocus";

const DISABLE_REASONS = [
  "Suspicious activity",
  "Policy violation",
  "User request",
  "Other",
];

// HL-084: how long an admin can give Premium for (testers, the panel)
const PREMIUM_DAYS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

const AccountActionModal = ({
  isOpen,
  onClose,
  user,
  onToggleStatus,
  onChangePlan,
  canDelete,
  onDeleteUser,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [premiumDays, setPremiumDays] = useState(30);
  const [isPlanSaving, setIsPlanSaving] = useState(false);
  const dialogRef = useRef(null);

  const handleClose = () => {
    setIsConfirming(false);
    setSelectedReason("");
    setCustomReason("");
    onClose();
  };

  useDialogFocus(isOpen, dialogRef, isSubmitting || isPlanSaving ? null : handleClose);

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

  const changePlan = async (premium) => {
    setIsPlanSaving(true);
    try {
      await onChangePlan(user, premium, premiumDays);
    } finally {
      setIsPlanSaving(false);
    }
  };

  const premiumUntilLabel = user.premiumUntil
    ? new Date(user.premiumUntil).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const canSubmitDisable =
    selectedReason &&
    (selectedReason !== "Other" || customReason.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={!isSubmitting ? handleClose : undefined}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-governance-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-6 py-4.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <Shield size={16} />
            </span>
            <div>
              <h3
                id="account-governance-title"
                className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] leading-[1.2] text-cal-ink"
              >
                Account governance
              </h3>
              <p className="mt-0.5 text-[12.5px] text-cal-muted">
                Patient access controls and plan management.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* User Info */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-[13px] font-semibold text-cal-ink">
                {(user.name?.charAt(0) || "P").toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-cal-ink">
                  {user.name}
                </p>
                <p className="mt-0.5 font-cal-mono text-[12px] text-cal-muted">
                  {formatUserRef(user.id)}
                </p>
              </div>
            </div>

            <Link
              to={`/users/${user.id}`}
              onClick={handleClose}
              className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-2.5 py-1.5 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors"
            >
              <span>Profile</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
            <div>
              <p className="mb-1 text-[11.5px] font-medium text-cal-muted">
                Account status
              </p>
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cal-success/25 bg-cal-success/10 px-2.5 py-0.5 text-[11.5px] font-medium text-cal-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
                  <span>Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cal-error/25 bg-cal-error/10 px-2.5 py-0.5 text-[11.5px] font-medium text-cal-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-cal-error" />
                  <span>Disabled</span>
                </span>
              )}
            </div>
            <div>
              <p className="mb-1 text-[11.5px] font-medium text-cal-muted">
                Registered
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-cal-mono text-[12.5px] font-medium text-cal-ink">
                <Calendar size={12.5} className="text-cal-muted" />
                <span>{user.regDate}</span>
              </p>
            </div>
          </div>

          {/* HL-084: plan */}
          {onChangePlan && (
            <div className="rounded-[10px] border border-cal-hairline bg-cal-canvas p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="mb-1 text-[11.5px] font-medium text-cal-muted">Plan</p>
                  {user.isPremium ? (
                    <p className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-cal-ink">
                      <Crown size={13.5} className="text-cal-badge-orange" />
                      <span>
                        {user.premiumSource === "trial" ? "Premium trial" : "Premium"} until{" "}
                        <span className="font-cal-mono text-[12.5px]">
                          {premiumUntilLabel}
                        </span>
                      </span>
                    </p>
                  ) : (
                    <p className="m-0 text-[13px] font-semibold text-cal-ink">Free</p>
                  )}
                </div>

                {user.isPremium && (
                  <button
                    type="button"
                    onClick={() => changePlan(false)}
                    disabled={isPlanSaving}
                    className="h-8 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Remove Premium
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="premium-days" className="sr-only">
                  Premium length
                </label>
                <div className="relative flex-1">
                  <select
                    id="premium-days"
                    value={premiumDays}
                    onChange={(e) => setPremiumDays(Number(e.target.value))}
                    className="h-9 w-full appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[13px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none cursor-pointer"
                  >
                    {PREMIUM_DAYS.map((o) => (
                      <option key={o.days} value={o.days}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => changePlan(true)}
                  disabled={isPlanSaving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-3.5 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
                >
                  {isPlanSaving ? (
                    <Loader2 size={13.5} className="animate-spin" />
                  ) : (
                    <Crown size={13.5} />
                  )}
                  <span>{user.isPremium ? "Add time" : "Give Premium"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Deactivation reason (if disabled) */}
          {!isActive && user.deactivationReason && (
            <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-error/25 bg-cal-error/10 p-3.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-cal-error" />
              <div>
                <p className="text-[11.5px] font-semibold text-cal-ink">
                  Disabled reason
                </p>
                <p className="mt-0.5 text-[12.5px] leading-[1.45] text-cal-body">
                  {user.deactivationReason}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          {!isConfirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="h-9 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                Close
              </button>
              {isActive ? (
                <button
                  type="button"
                  onClick={handleDisableClick}
                  disabled={isSubmitting}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Ban size={13.5} />
                  <span>Disable account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={isSubmitting}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-3.5 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
                >
                  {isSubmitting ? (
                    <Loader2 size={13.5} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13.5} />
                  )}
                  <span>Re-enable account</span>
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-cal-error hover:opacity-90 px-3.5 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={13.5} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          ) : (
            /* Disable confirmation with reason */
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-[8px] border border-cal-warning/35 bg-cal-warning/10 p-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-cal-ink" />
                <p className="m-0 text-[12.5px] leading-[1.45] text-cal-ink">
                  This immediately revokes sign-in access until an administrator re-enables the account.
                </p>
              </div>

              <div>
                <label
                  htmlFor="disable-reason-select"
                  className="mb-1.5 block text-[12.5px] font-semibold text-cal-ink"
                >
                  Reason for disabling <span className="text-cal-error">*</span>
                </label>
                <div className="relative">
                  <select
                    id="disable-reason-select"
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="h-9 w-full appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[13px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none cursor-pointer"
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
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                </div>
              </div>

              {selectedReason === "Other" && (
                <div>
                  <label
                    htmlFor="disable-custom-reason"
                    className="mb-1.5 block text-[12.5px] font-semibold text-cal-ink"
                  >
                    Custom reason <span className="text-cal-error">*</span>
                  </label>
                  <textarea
                    id="disable-custom-reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe why this account is being disabled…"
                    rows={2}
                    className="w-full resize-none rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-2 text-[13px] text-cal-ink placeholder:text-cal-muted focus:border-cal-ink focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="h-9 flex-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisable}
                  disabled={isSubmitting || !canSubmitDisable}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-cal-error hover:opacity-90 px-3 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
                >
                  {isSubmitting ? (
                    <Loader2 size={13.5} className="animate-spin" />
                  ) : (
                    <Ban size={13.5} />
                  )}
                  <span>{isSubmitting ? "Disabling…" : "Confirm disable"}</span>
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
