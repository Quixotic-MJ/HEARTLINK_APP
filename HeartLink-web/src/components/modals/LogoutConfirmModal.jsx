import React, { useState } from "react";
import {
  LogOut,
  X,
  ShieldAlert,
  Loader2,
  Lock,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const LogoutConfirmModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const role = user?.role || "admin";
  const userName =
    user?.first_name || user?.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user?.name || user?.email || "Administrator";
  const userInitials = userName ? userName.substring(0, 1).toUpperCase() : "A";

  const getRoleLabel = (r) => {
    if (r === "super_admin") return "Super Admin";
    if (r === "admin") return "System Admin";
    if (r === "medical_expert") return "Medical Expert";
    return r ? r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Administrator";
  };

  const getRolePillClass = (r) => {
    if (r === "super_admin") return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    if (r === "admin") return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    if (r === "medical_expert") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    return "bg-white/5 text-slate-300 border border-white/10";
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    // Give a brief smooth moment for animation feedback
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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={!isLoggingOut ? onClose : undefined}
      />

      {/* Animated Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-3xl shadow-2xl border border-white/10 overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200 z-10">
        {/* Subtle Top Glowing Line */}
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-[#E55F37] to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="p-6 sm:p-7 text-center">
          {/* Animated Icon Avatar */}
          <div className="relative w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-lg shadow-rose-500/10">
            <div className="absolute inset-0 rounded-2xl bg-rose-500/15 animate-ping opacity-30 pointer-events-none" />
            <LogOut size={26} className="relative z-10 text-rose-400 -ml-0.5" />
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight">
            Sign Out of HeartLink
          </h3>
          <p className="text-xs text-[#89899C] mt-1.5 leading-relaxed max-w-xs mx-auto">
            Are you sure you want to end your current session? You will be redirected to the login portal.
          </p>

          {/* User Session Profile Card */}
          <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center gap-3.5 my-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30 flex items-center justify-center font-extrabold text-sm shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-white truncate">
                  {userName}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getRolePillClass(
                    role
                  )}`}
                >
                  {getRoleLabel(role)}
                </span>
              </div>
              <p className="text-[11px] text-[#89899C] truncate font-mono mt-0.5">
                {user?.email || "Authenticated Admin"}
              </p>
            </div>
          </div>

          {/* Session Expiry Hint */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-[#89899C] mb-6 text-left">
            <Lock size={12} className="text-slate-400 shrink-0" />
            <span>Your authentication token will be revoked upon signout.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="w-1/2 py-2.5 px-4 rounded-xl border border-white/10 bg-[#21202E] hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-[#E55F37] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
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
    </div>
  );
};

export default LogoutConfirmModal;
