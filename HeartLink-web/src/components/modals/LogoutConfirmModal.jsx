import React, { useState } from "react";
import {
  LogOut,
  X,
  Loader2,
  Lock,
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
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "HL";

  const getRoleLabel = (r) => {
    if (r === "super_admin") return "Super admin";
    if (r === "admin") return "System admin";
    if (r === "medical_expert") return "Medical expert";
    return r ? r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Staff user";
  };

  const getRolePillClass = (r) => {
    if (r === "super_admin") return "bg-purple-100 text-purple-700 border border-purple-200";
    if (r === "admin") return "bg-blue-100 text-blue-700 border border-blue-200";
    if (r === "medical_expert") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    return "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]";
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
        className="relative w-full max-w-md bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#DCE3DF] overflow-hidden text-[#152131] animate-in fade-in zoom-in-95 duration-200 z-10 p-6 sm:p-7 text-center"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-4 right-4 p-2 text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] rounded-xl transition-all cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Red / Garnet Icon Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-[#F7E4E1] border border-[#F0C4B8] flex items-center justify-center text-[#A93226] mx-auto mb-4">
          <LogOut size={24} className="-ml-0.5" />
        </div>

        <h3 
          className="text-xl font-medium text-[#152131] tracking-tight"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Sign Out of HeartLink
        </h3>
        <p className="text-xs text-[#5C6B66] mt-1.5 leading-relaxed max-w-xs mx-auto">
          Are you sure you want to end your current session? You will be redirected to the login portal.
        </p>

        {/* User Session Profile Card */}
        <div className="p-3.5 rounded-xl bg-[#EDF1EF] border border-[#DCE3DF] flex items-center gap-3 my-5 text-left">
          <div className="w-9 h-9 rounded-full bg-[#FBEAE6] text-[#C13E20] font-bold text-xs flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-[#152131] truncate">
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
            <p className="text-[11px] text-[#5C6B66] truncate font-mono mt-0.5">
              {user?.email || "Authenticated Staff"}
            </p>
          </div>
        </div>

        {/* Session Expiry Hint */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#E3EFEC] border border-[#DCE3DF] text-[11px] text-[#1B6E63] mb-6 text-left">
          <Lock size={12} className="shrink-0" />
          <span>Your authentication session will be revoked upon signout.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="w-1/2 py-2.5 px-4 rounded-lg border border-[#DCE3DF] bg-[#EDF1EF] hover:bg-[#DCE3DF] text-xs font-semibold text-[#152131] transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="w-1/2 py-2.5 px-4 rounded-lg bg-[#A93226] hover:bg-[#8A1F1A] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
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
