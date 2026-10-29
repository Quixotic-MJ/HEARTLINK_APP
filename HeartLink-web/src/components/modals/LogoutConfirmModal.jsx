import { useRef, useState } from "react";
import { Loader2, Lock, LogOut, X } from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import { useDialogFocus } from "../../hooks/useDialogFocus";

const LogoutConfirmModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dialogRef = useRef(null);
  // HL-083: Escape closes it (not while signing out), Tab stays inside, focus returns to the Sign out button
  useDialogFocus(isOpen, dialogRef, isLoggingOut ? null : onClose);

  if (!isOpen) return null;

  const role = user?.role || "admin";
  const expertType = user?.expert_type;
  const userName =
    user?.first_name || user?.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user?.name || user?.email || "Administrator";
  const userInitials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "HL";

  const getRoleLabel = (r) => {
    if (r === "admin") return "System Admin";
    if (r === "medical_expert") return expertType || "Medical Expert";
    return r ? r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Staff User";
  };

  const getAvatarSurface = (r) => {
    if (r === "admin") return "bg-cal-badge-violet/15 text-cal-ink";
    if (expertType === "Cardiologist") return "bg-cal-badge-orange/20 text-cal-ink";
    if (expertType === "Dietitian") return "bg-cal-badge-emerald/20 text-cal-ink";
    if (expertType === "Physical Therapist") return "bg-cal-badge-pink/15 text-cal-ink";
    return "bg-cal-surface-card text-cal-ink";
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      try {
        await logout();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        setIsLoggingOut(false);
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={!isLoggingOut ? onClose : undefined}
      />

      {/* Modal Dialog (Cal.com 12px Card + Hairline + Subtle Drop Shadow) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 sm:p-7 text-left text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink transition-colors cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cal-surface-card border border-cal-hairline text-cal-ink mb-4">
          <LogOut size={18} className="ml-0.5" />
        </div>

        <h3
          id="logout-dialog-title"
          className="font-cal-display text-[22px] font-semibold tracking-[-0.5px] text-cal-ink leading-[1.2]"
        >
          Sign out of HeartLink?
        </h3>
        <p className="mt-1.5 text-[14px] text-cal-muted leading-[1.5]">
          Your active staff session will be closed and you will be returned to the sign-in portal.
        </p>

        {/* User Session Profile Card */}
        <div className="my-5 flex items-center gap-3 rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-3.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[12.5px] font-semibold ${getAvatarSurface(
              role
            )}`}
          >
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[13.5px] font-semibold text-cal-ink">
                {userName}
              </p>
              <span className="inline-flex items-center rounded-full bg-cal-surface-card px-2.5 py-0.5 text-[11.5px] font-medium text-cal-ink">
                {getRoleLabel(role)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-cal-muted">
              {user?.email || "Authenticated Staff"}
            </p>
          </div>
        </div>

        {/* Session Expiry Hint */}
        <div className="mb-6 flex items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-2.5 text-[12.5px] text-cal-muted">
          <Lock size={13} className="shrink-0 text-cal-muted" />
          <span>Your authentication token will be revoked upon sign out.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="h-10 w-1/2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-5 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="flex h-10 w-1/2 items-center justify-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Signing out…</span>
              </>
            ) : (
              <>
                <LogOut size={15} />
                <span>Sign out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
