import { useState } from "react";
import {
  LogOut,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import { useAuth } from "../../contexts/useAuth";

const LogoutConfirmModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const role = user?.role || "admin";
  const userName =
    user?.first_name || user?.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user?.name || user?.email || "Administrator";
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "HL";

  const getRoleLabel = (r) => {
    if (r === "super_admin") return "Super admin";
    if (r === "admin") return "System admin";
    if (r === "medical_expert") return "Medical expert";
    return r ? r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Staff user";
  };

  const getRolePillClass = (r) => {
    if (r === "super_admin" || r === "admin") return "bg-ds-tint text-ds-primary-pressed border border-ds-tint";
    if (r === "medical_expert") return "bg-ds-mint text-ds-charcoal border border-ds-mint";
    return "bg-ds-surface text-ds-slate border border-ds-hairline";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Animated Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={!isLoggingOut ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div 
        className="relative w-full max-w-md bg-ds-canvas rounded-2xl shadow-2xl border border-ds-hairline overflow-hidden text-ds-ink animate-in fade-in zoom-in-95 duration-200 z-10 p-6 sm:p-7 text-center"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-4 right-4 p-2 text-ds-slate hover:text-ds-ink hover:bg-ds-surface rounded-xl transition-all cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Simple Icon Avatar */}
        <div className="w-12 h-12 rounded-full bg-ds-surface-alt border border-ds-hairline flex items-center justify-center text-ds-slate mx-auto mb-4">
          <LogOut size={20} className="ml-0.5" />
        </div>

        <h3 className="text-[17px] font-bold text-ds-ink tracking-tight">
          Sign Out of HeartLink
        </h3>
        <p className="text-xs text-ds-slate mt-1.5 leading-relaxed max-w-xs mx-auto">
          Are you sure you want to end your current session? You will be redirected to the login portal.
        </p>

        {/* User Session Profile Card */}
        <div className="p-3.5 rounded-xl bg-ds-surface border border-ds-hairline flex items-center gap-3 my-5 text-left">
          <div className="w-9 h-9 rounded-full bg-ds-tint text-ds-primary-pressed font-bold text-xs flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-ds-ink truncate">
                {userName}
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getRolePillClass(
                  role
                )}`}
              >
                {getRoleLabel(role)}
              </span>
            </div>
            <p className="text-[11px] text-ds-slate truncate mt-0.5">
              {user?.email || "Authenticated Staff"}
            </p>
          </div>
        </div>

        {/* Session Expiry Hint */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ds-surface border border-ds-hairline text-[11px] text-ds-slate mb-6 text-left">
          <Lock size={12} className="shrink-0 text-ds-steel" />
          <span>Your authentication session will be revoked upon sign out.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="w-1/2 py-2.5 px-4 rounded-lg border border-ds-hairline bg-ds-surface hover:bg-ds-hairline text-xs font-semibold text-ds-ink transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="w-1/2 py-2.5 px-4 rounded-lg bg-ds-primary hover:bg-ds-primary text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Signing Out…</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
