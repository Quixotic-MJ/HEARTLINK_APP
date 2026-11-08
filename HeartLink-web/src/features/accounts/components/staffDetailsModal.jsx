import { createPortal } from "react-dom";
import { useRef } from "react";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";
import { StatusBadge } from "../../../styles/designSystem.jsx";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

const EXPERT_BADGE = {
  Cardiologist:
    "border-cal-badge-orange/35 bg-cal-badge-orange/15 text-cal-ink",
  Dietitian: "border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink",
  "Physical Therapist":
    "border-cal-badge-pink/30 bg-cal-badge-pink/10 text-cal-ink",
};

const getAvatarSurface = (staff) => {
  if (staff.role === "System Admin" || staff.db_role === "admin") {
    return "bg-cal-badge-violet/15 text-cal-ink";
  }
  if (staff.expert_type === "Cardiologist")
    return "bg-cal-badge-orange/20 text-cal-ink";
  if (staff.expert_type === "Dietitian")
    return "bg-cal-badge-emerald/20 text-cal-ink";
  if (staff.expert_type === "Physical Therapist")
    return "bg-cal-badge-pink/15 text-cal-ink";
  return "bg-cal-surface-card text-cal-ink";
};

const StaffDetailsModal = ({
  isOpen,
  onClose,
  staff,
  currentUserRole,
  currentUserId,
  onToggleStatus,
  onChangeRole,
}) => {
  const dialogRef = useRef(null);
  useDialogFocus(isOpen, dialogRef, onClose);

  if (!isOpen || !staff) return null;

  // HL-074: all admins are equal; another admin can be disabled but not deleted
  const isSelf = staff.id === currentUserId;
  const isProtected = currentUserRole !== "admin" || !currentUserId || isSelf;
  const canToggleStatus = ["active", "disabled"].includes(staff.account_status);
  const isStatusActive =
    (staff.account_status || staff.status)?.toLowerCase() === "active";
  const isExpert =
    staff.role === "Authorized Medical Expert" ||
    staff.db_role === "medical_expert";
  const targetRoleLabel =
    staff.role === "System Admin" || staff.role === "admin"
      ? "Authorized Medical Expert"
      : "System Admin";

  const initials =
    (staff.name || "S")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "S";

  const getRoleBadge = (role) => {
    if (role === "System Admin" || role === "admin") {
      return (
        <span
          className={`${PILL} border-cal-badge-violet/30 bg-cal-badge-violet/10 text-cal-ink`}
        >
          <ShieldCheck size={12} />
          <span>System Admin</span>
        </span>
      );
    }
    if (
      role === "Authorized Medical Expert" ||
      role === "medical_expert" ||
      role === "Expert Reviewer"
    ) {
      return (
        <span
          className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}
        >
          <Stethoscope size={12} />
          <span>Expert Reviewer</span>
        </span>
      );
    }
    return (
      <span
        className={`${PILL} border-cal-hairline bg-cal-surface-card text-cal-ink`}
      >
        {role}
      </span>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-details-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-cal-hairline bg-cal-canvas px-6 py-4.5">
          <div>
            <h3
              id="staff-details-title"
              className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] leading-[1.2] text-cal-ink"
            >
              Staff account details
            </h3>
            <p className="mt-0.5 text-[12.5px] text-cal-muted">
              Role permissions, verification state, and access status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Identity Card */}
          <div className="space-y-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[13px] font-semibold ${getAvatarSurface(
                    staff,
                  )}`}
                >
                  {initials}
                </span>
                <div className="min-w-0">
                  <h4 className="truncate text-[15.5px] font-semibold text-cal-ink">
                    {staff.name}
                  </h4>
                  <p className="mt-0.5 truncate font-cal-mono text-[11.5px] text-cal-muted">
                    ID: {staff.id}
                  </p>
                </div>
              </div>

              <StatusBadge status={staff.status || "Unknown"} />
            </div>

            {isProtected && (
              <div className="flex items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-2 text-[12px] font-medium text-cal-body">
                <ShieldAlert size={14} className="shrink-0 text-cal-ink" />
                <span>
                  Account changes are not available from your own account
                  details.
                </span>
              </div>
            )}
          </div>

          {/* Account Parameters */}
          <div className="space-y-3.5 rounded-[10px] border border-cal-hairline bg-cal-canvas p-4">
            <h5 className="flex items-center gap-2 border-b border-cal-hairline pb-2.5 text-[12px] font-semibold text-cal-ink">
              <KeyRound size={13.5} className="text-cal-muted" />
              <span>Account parameters</span>
            </h5>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-[13px]">
              <div>
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Role assignment
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {getRoleBadge(staff.role)}
                  {staff.expert_type && (
                    <span
                      className={`${PILL} ${
                        EXPERT_BADGE[staff.expert_type] ||
                        "border-cal-hairline bg-cal-surface-card text-cal-ink"
                      }`}
                    >
                      {staff.expert_type}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Contact number
                </p>
                <p className="mt-1 font-cal-mono text-[13px] font-medium text-cal-ink">
                  {staff.phone || "No phone"}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Email address
                </p>
                <p className="mt-1 truncate text-[13px] font-medium text-cal-ink">
                  {staff.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Provision date
                </p>
                <p className="mt-1 font-cal-mono text-[13px] font-medium text-cal-ink">
                  {staff.created_at
                    ? new Date(staff.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        timeZone: "Asia/Manila",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* HL-058: Clinician Verification */}
          {isExpert && (
            <div className="space-y-3 rounded-[10px] border border-cal-hairline bg-cal-canvas p-4">
              <div className="flex items-center justify-between gap-2 border-b border-cal-hairline pb-2.5">
                <h5 className="flex items-center gap-2 text-[12px] font-semibold text-cal-ink">
                  <BadgeCheck size={14} className="text-cal-muted" />
                  <span>Historical verification flag</span>
                </h5>
                {staff.is_verified_clinician ? (
                  <span
                    className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
                  >
                    <CheckCircle2 size={11.5} className="text-cal-success" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span
                    className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}
                  >
                    <span>Practice mode</span>
                  </span>
                )}
              </div>

              <p className="m-0 text-[13px] font-semibold text-cal-ink">
                {staff.is_verified_clinician
                  ? `Verification recorded${
                      staff.clinician_verified_at
                        ? ` since ${new Date(
                            staff.clinician_verified_at,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}`
                        : ""
                    }`
                  : "No verification flag recorded"}
              </p>

              <p className="m-0 text-[12.5px] leading-[1.5] text-cal-muted">
                This historical account flag is not content approval or an
                endorsement of medical safety. Verification policy and reviewer
                provenance require separate review before release.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {!isProtected && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onChangeRole(staff.id, staff.role, targetRoleLabel, staff)
                  }
                  className="h-9 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  Change role
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(staff)}
                  disabled={!canToggleStatus}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-semibold transition-colors cursor-pointer ${
                    isStatusActive
                      ? "border border-cal-hairline bg-cal-canvas text-cal-ink hover:bg-cal-surface-soft"
                      : "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary"
                  }`}
                >
                  {isStatusActive ? (
                    <Ban size={13.5} />
                  ) : (
                    <CheckCircle2 size={13.5} />
                  )}
                  <span>{isStatusActive ? "Disable" : "Enable"}</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default StaffDetailsModal;
