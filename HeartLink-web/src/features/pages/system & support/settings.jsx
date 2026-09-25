import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Hash,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Settings2,
  AlertTriangle,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  BadgeCheck,
  Info,
  KeyRound,
  Shield,
  Server,
  Activity,
  Sparkles,
  Sliders,
  Check,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiFetch } from "../../../api";
import { UI, FONTS, PageHeader, KpiCard } from "../../../styles/designSystem";

// ─── Shared primitives ────────────────────────────────────────────────────────

/** A read-only information row inside an info card */
function InfoRow({ icon: Icon, label, value, mono = false, pill = null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 border-b border-[#E2E8F0] last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
          <Icon size={14} />
        </div>
        <p className="text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className="pl-11 sm:pl-0">
        {pill ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${pill.cls}`}
          >
            {pill.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            )}
            {pill.label}
          </span>
        ) : (
          <p
            className={`text-[12.5px] font-semibold text-[#0F172A] ${
              mono ? "text-[#64748B]" : ""
            }`}
          >
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

/** A system-managed config row (read-only, with "managed by system" badge) */
function SystemConfigRow({ icon: Icon, label, value, note, statusPill = null }) {
  return (
    <div className="flex items-start gap-3.5 py-4 border-b border-[#E2E8F0] last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-[#EAF5FC] border border-[#CDE1F4] flex items-center justify-center mt-0.5 text-[#2E9AE8]">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-[13px] font-bold text-[#0F172A]">{label}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] text-[9.5px] font-semibold text-[#64748B] uppercase tracking-wider">
            System managed
          </span>
          {statusPill && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider ${statusPill.cls}`}
            >
              {statusPill.dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              )}
              {statusPill.label}
            </span>
          )}
        </div>
        <p className="text-[12.5px] font-semibold text-[#0F172A]">{value}</p>
        {note && (
          <p className="text-[11.5px] text-[#64748B] mt-1 leading-relaxed">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/** Section card wrapper matching the HeartLink light paper aesthetic */
function Card({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return (
    <div
      className={`bg-[#FFFFFF] rounded-[10px] border border-[#E2E8F0] shadow-2xs overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-[8px] bg-[#EAF5FC] border border-[#CDE1F4] flex items-center justify-center text-[#2E9AE8]">
              <Icon size={15} />
            </div>
          )}
          <div>
            <h4 className="text-[15px] font-bold text-[#0F172A]">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Role display helpers ─────────────────────────────────────────────────────

function getRoleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "System Admin";
  if (role === "medical_expert") return "Authorized Medical Expert";
  return role ? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";
}

function getRolePill(role) {
  if (role === "super_admin")
    return {
      label: "Super Admin",
      cls: "bg-[#EAF5FC] text-[#2E9AE8] border border-[#CDE1F4]",
      dot: true,
    };
  if (role === "admin")
    return {
      label: "System Admin",
      cls: "bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]",
      dot: true,
    };
  if (role === "medical_expert")
    return {
      label: "Medical Expert",
      cls: "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]",
      dot: true,
    };
  return {
    label: getRoleLabel(role),
    cls: "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]",
    dot: false,
  };
}

function getStatusPill(status) {
  if (status === "active")
    return {
      label: "Active",
      cls: "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]",
      dot: true,
    };
  if (status === "disabled")
    return {
      label: "Disabled",
      cls: "bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8]",
      dot: true,
    };
  return {
    label: status ?? "Unknown",
    cls: "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]",
    dot: false,
  };
}

// ─── Tab: My Account ─────────────────────────────────────────────────────────

function AccountTab({ user, userId }) {
  const role = user?.role;
  const status = user?.account_status ?? "active";
  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.first_name ?? user?.name ?? "Administrator";

  // ── Password change state ──────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwState, setPwState] = useState("idle"); // idle | loading | success | error
  const [pwError, setPwError] = useState(null);

  const clearPwForm = useCallback(() => {
    setPwForm({ current: "", next: "", confirm: "" });
    setPwError(null);
    setPwState("idle");
  }, []);

  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwError(null);

    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError("All password fields are required.");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New password and confirmation do not match.");
      return;
    }
    if (pwForm.next === pwForm.current) {
      setPwError("New password must be different from the current password.");
      return;
    }

    setPwState("loading");

    try {
      await apiFetch(`/api/users/${userId}/password`, {
        method: "PUT",
        body: JSON.stringify({
          current_password: pwForm.current,
          new_password: pwForm.next,
        }),
      });
      // Clear sensitive fields immediately after success
      setPwForm({ current: "", next: "", confirm: "" });
      setPwState("success");
    } catch (err) {
      const detail =
        err?.data?.detail ?? "Password change failed. Please check your current password and try again.";
      setPwError(detail);
      // Clear current password on failure
      setPwForm((prev) => ({ ...prev, current: "" }));
      setPwState("error");
    }
  };

  const handleCancelPw = () => clearPwForm();

  const ToggleEye = ({ field }) => (
    <button
      type="button"
      onClick={() => setShowPw((prev) => ({ ...prev, [field]: !prev[field] }))}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
      tabIndex={-1}
      aria-label={showPw[field] ? "Hide password" : "Show password"}
    >
      {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  const getPasswordStrength = (pw) => {
    if (!pw) return { label: "", color: "", width: "0%" };
    if (pw.length < 8) return { label: "Too Short", color: "bg-[#A93226] text-[#A93226]", width: "25%" };
    if (pw.length < 12) return { label: "Fair", color: "bg-[#A9741B] text-[#A9741B]", width: "65%" };
    return { label: "Strong", color: "bg-[#1B6E63] text-[#1B6E63]", width: "100%" };
  };

  const strength = getPasswordStrength(pwForm.next);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Profile Information ─────────────────────────────────────────── */}
      <Card
        title="Account Profile"
        subtitle="Your personal details and assigned role"
        icon={User}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 pb-5 mb-4 border-b border-[#E2E8F0]">
          <div className="w-14 h-14 rounded-full bg-[#EAF5FC] text-[#2E9AE8] border border-[#CDE1F4] flex items-center justify-center text-xl font-bold shadow-2xs flex-shrink-0">
            {fullName !== "—" ? fullName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[18px] font-bold text-[#0F172A] tracking-tight">
                {fullName}
              </h3>
              {getRolePill(role) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${getRolePill(role).cls}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {getRolePill(role).label}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              {user?.email || "No email on record"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          <InfoRow icon={Mail} label="Email Address" value={user?.email} />
          <InfoRow icon={Hash} label="Admin Account ID" value={userId} mono />
          <InfoRow icon={BadgeCheck} label="Access Role" pill={getRolePill(role)} />
          <InfoRow icon={CheckCircle2} label="Account Status" pill={getStatusPill(status)} />
        </div>

        <div className="mt-5 p-3 rounded-[8px] bg-[#F8FAFC]/60 border border-[#E2E8F0] flex items-start gap-2.5 text-[#64748B]">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-[#1B6E63]" />
          <p className="text-[11.5px] leading-relaxed">
            Roles and account statuses are managed by Super Admins in the{" "}
            <span className="text-[#0F172A] font-semibold">User & Staff Directory</span>.
          </p>
        </div>
      </Card>

      {/* ── 2FA status ──────────────────────────────────────────────────── */}
      <Card
        title="Login Settings"
        subtitle="How you sign in to your administrator account"
        icon={ShieldCheck}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] flex items-center justify-center text-[#1B6E63]">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-[13px] font-bold text-[#0F172A]">
                Email & Password Login
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] text-[9.5px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                Active
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] text-[9.5px] font-semibold uppercase tracking-wider">
                No Phone Code Required
              </span>
            </div>
            <p className="text-[12px] text-[#64748B] leading-relaxed max-w-2xl">
              You can securely log in to the staff portal using just your email and password. A phone verification code is not needed.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Change password ─────────────────────────────────────────────── */}
      <Card
        title="Change Password"
        subtitle="Update the password you use to sign in"
        icon={KeyRound}
      >
        {pwState === "success" ? (
          <div className="p-4 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] flex items-start gap-3.5">
            <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-[#C5DFD8] text-[#1B6E63] flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-[14px] font-bold text-[#0F172A] mb-0.5">
                Password Updated Successfully
              </h4>
              <p className="text-[12px] text-[#1B6E63] leading-relaxed mb-3 font-medium">
                Your administrative password has been updated securely. Your current console session remains authenticated.
              </p>
              <button
                type="button"
                onClick={clearPwForm}
                className="text-[12px] font-semibold text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-1.5 rounded-[6px] transition-colors cursor-pointer"
              >
                Change password again
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handlePwChange}
            autoComplete="off"
            id="settings-password-form"
            className="space-y-4"
          >
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Your new password must be at least 8 characters long. We recommend using a mix of letters, numbers, and symbols to keep your account secure.
            </p>

            {pwError && (
              <div
                id="settings-pw-error"
                className="flex items-start gap-2 p-3 rounded-[8px] bg-[#F7E4E1] border border-[#F0C4B8] text-[#A93226]"
              >
                <XCircle size={14} className="text-[#A93226] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] font-semibold leading-relaxed">
                  {pwError}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Current password */}
              <div className="md:col-span-2">
                <label
                  htmlFor="pw-current"
                  className="block text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="pw-current"
                    type={showPw.current ? "text" : "password"}
                    value={pwForm.current}
                    onChange={(e) =>
                      setPwForm((prev) => ({ ...prev, current: e.target.value }))
                    }
                    autoComplete="current-password"
                    required
                    disabled={pwState === "loading"}
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                  <ToggleEye field="current" />
                </div>
              </div>

              {/* New password */}
              <div>
                <label
                  htmlFor="pw-new"
                  className="block text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="pw-new"
                    type={showPw.next ? "text" : "password"}
                    value={pwForm.next}
                    onChange={(e) =>
                      setPwForm((prev) => ({ ...prev, next: e.target.value }))
                    }
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={pwState === "loading"}
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors disabled:opacity-50"
                    placeholder="Minimum 8 characters"
                  />
                  <ToggleEye field="next" />
                </div>
                {pwForm.next.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="h-1 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color.split(" ")[0]}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#94A3B8]">Strength</span>
                      <span className={`font-bold ${strength.color.split(" ")[1]}`}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm new password */}
              <div>
                <label
                  htmlFor="pw-confirm"
                  className="block text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="pw-confirm"
                    type={showPw.confirm ? "text" : "password"}
                    value={pwForm.confirm}
                    onChange={(e) =>
                      setPwForm((prev) => ({ ...prev, confirm: e.target.value }))
                    }
                    autoComplete="new-password"
                    required
                    disabled={pwState === "loading"}
                    className={`w-full pl-9 pr-9 py-2 text-[13px] bg-[#F8FAFC] border rounded-[8px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none transition-colors disabled:opacity-50 ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-[#A93226] text-[#A93226]"
                        : "border-[#E2E8F0] focus:border-[#0F172A]"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <ToggleEye field="confirm" />
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[11px] text-[#A93226] mt-1 font-medium flex items-center gap-1">
                    <XCircle size={11} /> Passwords do not match
                  </p>
                )}
                {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.confirm.length >= 8 && (
                  <p className="text-[11px] text-[#1B6E63] mt-1 font-medium flex items-center gap-1">
                    <Check size={11} /> Passwords match
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                id="settings-pw-submit"
                type="submit"
                disabled={pwState === "loading" || (pwForm.confirm && pwForm.next !== pwForm.confirm)}
                className="flex items-center gap-1.5 bg-[#2E9AE8] hover:bg-[#1C7AC8] text-white font-semibold text-[12.5px] px-4 py-2 rounded-[8px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {pwState === "loading" ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={13} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
              <button
                id="settings-pw-cancel"
                type="button"
                onClick={handleCancelPw}
                disabled={pwState === "loading"}
                className="px-3.5 py-2 text-[12.5px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-[8px] transition-colors cursor-pointer disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

// ─── Main Settings component ──────────────────────────────────────────────────

const Settings = () => {
  const { user, userId } = useAuth();

  // Derive role from context
  const role = user?.role || "admin";

  // Enrich profile from the backend
  const [profile, setProfile] = useState(user);

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/users/${userId}/profile`)
      .then((data) => {
        if (data?.profile) setProfile(data.profile);
      })
      .catch(() => {
        setProfile(user);
      });
  }, [userId, user]);

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <PageHeader
          eyebrow="My Account"
          eyebrowIcon={User}
          title="Settings & Preferences"
          description="Manage your administrator profile and security credentials."
        />

        {/* ── Quick KPI / Status Row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <KpiCard
            label="Active Role"
            value={getRoleLabel(role)}
            icon={BadgeCheck}
            iconBg="bg-[#EAF5FC]"
            iconColor="text-[#2E9AE8]"
            iconBorder="border-[#CDE1F4]"
          />
          <KpiCard
            label="Login Security"
            value="Active"
            icon={ShieldCheck}
            iconBg="bg-[#E3EFEC]"
            iconColor="text-[#1B6E63]"
            iconBorder="border-[#C5DFD8]"
            valueColor="text-[#1B6E63]"
          />
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AccountTab user={profile} userId={userId} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
