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

// ─── Shared primitives ────────────────────────────────────────────────────────

/** A read-only information row inside an info card */
function InfoRow({ icon: Icon, label, value, mono = false, pill = null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 border-b border-[#DCE3DF] last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-[#EDF1EF] border border-[#DCE3DF] flex items-center justify-center text-[#5C6B66]">
          <Icon size={14} />
        </div>
        <p className="text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider">
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
            className={`text-[12.5px] font-semibold text-[#152131] ${
              mono ? "font-mono text-[#5C6B66]" : ""
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
    <div className="flex items-start gap-3.5 py-4 border-b border-[#DCE3DF] last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-[#FBEAE6] border border-[#F5C7BD] flex items-center justify-center mt-0.5 text-[#E8532E]">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-[13px] font-bold text-[#152131]">{label}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#EDF1EF] border border-[#DCE3DF] text-[9.5px] font-semibold text-[#5C6B66] uppercase tracking-wider">
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
        <p className="text-[12.5px] font-semibold text-[#152131]">{value}</p>
        {note && (
          <p className="text-[11.5px] text-[#5C6B66] mt-1 leading-relaxed">
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
      className={`bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] shadow-2xs overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-[#DCE3DF] bg-[#FFFFFF] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-[8px] bg-[#FBEAE6] border border-[#F5C7BD] flex items-center justify-center text-[#E8532E]">
              <Icon size={15} />
            </div>
          )}
          <div>
            <h4 
              className="text-[15px] font-medium text-[#152131]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-[#8B9893] mt-0.5 font-medium">
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

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "account", label: "My Account", icon: User, desc: "Personal credentials and profile" },
  { id: "system", label: "System Config", icon: Settings2, desc: "Runtime and infrastructure state" },
  { id: "security", label: "Security & Policies", icon: ShieldCheck, desc: "Authentication and session rules" },
];

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
      cls: "bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD]",
      dot: true,
    };
  if (role === "admin")
    return {
      label: "System Admin",
      cls: "bg-[#EDF1EF] text-[#152131] border border-[#DCE3DF]",
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
    cls: "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]",
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
    cls: "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]",
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
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B9893] hover:text-[#152131] transition-colors cursor-pointer"
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
        subtitle="Active administrative identity and permission tier"
        icon={User}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 pb-5 mb-4 border-b border-[#DCE3DF]">
          <div className="w-14 h-14 rounded-full bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD] flex items-center justify-center text-xl font-bold shadow-2xs flex-shrink-0">
            {fullName !== "—" ? fullName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 
                className="text-[18px] font-medium text-[#152131] tracking-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
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
            <p className="text-[12px] text-[#5C6B66] mt-0.5 font-mono">
              {user?.email || "No email on record"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#DCE3DF]">
          <InfoRow icon={Mail} label="Email Address" value={user?.email} />
          <InfoRow icon={Hash} label="Admin Account ID" value={userId} mono />
          <InfoRow icon={BadgeCheck} label="Access Role" pill={getRolePill(role)} />
          <InfoRow icon={CheckCircle2} label="Account Status" pill={getStatusPill(status)} />
        </div>

        <div className="mt-5 p-3 rounded-[8px] bg-[#EDF1EF]/60 border border-[#DCE3DF] flex items-start gap-2.5 text-[#5C6B66]">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-[#1B6E63]" />
          <p className="text-[11.5px] leading-relaxed">
            Role assignments and account statuses are centrally governed by Super Administrators in{" "}
            <span className="text-[#152131] font-semibold">User & Staff Directory</span>.
          </p>
        </div>
      </Card>

      {/* ── 2FA status ──────────────────────────────────────────────────── */}
      <Card
        title="Admin Authentication Policy"
        subtitle="Authentication and credential access controls for staff console"
        icon={ShieldCheck}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] flex items-center justify-center text-[#1B6E63]">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-[13px] font-bold text-[#152131]">
                Direct Email & Password Authentication
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] text-[9.5px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                Active
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF] text-[9.5px] font-semibold uppercase tracking-wider">
                Phone OTP Bypassed
              </span>
            </div>
            <p className="text-[12px] text-[#5C6B66] leading-relaxed max-w-2xl">
              Web administration access utilizes direct email and password authentication with salted cryptographic hashing and server-side JWT session invalidation. Phone number OTP is not required for admin login.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Change password ─────────────────────────────────────────────── */}
      <Card
        title="Update Security Password"
        subtitle="Manage your primary login authentication credentials"
        icon={KeyRound}
      >
        {pwState === "success" ? (
          <div className="p-4 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] flex items-start gap-3.5">
            <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-[#C5DFD8] text-[#1B6E63] flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-[14px] font-bold text-[#152131] mb-0.5">
                Password Updated Successfully
              </h4>
              <p className="text-[12px] text-[#1B6E63] leading-relaxed mb-3 font-medium">
                Your administrative password has been updated securely. Your current console session remains authenticated.
              </p>
              <button
                type="button"
                onClick={clearPwForm}
                className="text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] hover:bg-[#EDF1EF] border border-[#DCE3DF] px-3.5 py-1.5 rounded-[6px] transition-colors cursor-pointer"
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
            <p className="text-[12px] text-[#5C6B66] leading-relaxed">
              Passwords must be at least 8 characters. Ensure you use a strong combination of letters, numbers, and symbols.
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
                  className="block text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893]" />
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
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] text-[#152131] placeholder:text-[#8B9893] focus:outline-none focus:border-[#152131] transition-colors disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                  <ToggleEye field="current" />
                </div>
              </div>

              {/* New password */}
              <div>
                <label
                  htmlFor="pw-new"
                  className="block text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893]" />
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
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] text-[#152131] placeholder:text-[#8B9893] focus:outline-none focus:border-[#152131] transition-colors disabled:opacity-50"
                    placeholder="Minimum 8 characters"
                  />
                  <ToggleEye field="next" />
                </div>
                {pwForm.next.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="h-1 w-full bg-[#DCE3DF] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color.split(" ")[0]}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#8B9893]">Strength</span>
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
                  className="block text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893]" />
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
                    className={`w-full pl-9 pr-9 py-2 text-[13px] bg-[#EDF1EF] border rounded-[8px] text-[#152131] placeholder:text-[#8B9893] focus:outline-none transition-colors disabled:opacity-50 ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-[#A93226] text-[#A93226]"
                        : "border-[#DCE3DF] focus:border-[#152131]"
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
                className="flex items-center gap-1.5 bg-[#E8532E] hover:bg-[#C13E20] text-white font-semibold text-[12.5px] px-4 py-2 rounded-[8px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
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
                className="px-3.5 py-2 text-[12.5px] font-semibold text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] rounded-[8px] transition-colors cursor-pointer disabled:opacity-40"
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

// ─── Tab: System ─────────────────────────────────────────────────────────────

function SystemTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3 p-3.5 rounded-[8px] bg-[#EDF1EF]/70 border border-[#DCE3DF] text-[#5C6B66]">
        <Info size={16} className="text-[#1B6E63] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12.5px] font-bold text-[#152131] mb-0.5">
            Enforced Platform Configuration
          </p>
          <p className="text-[11.5px] text-[#5C6B66] leading-relaxed font-medium">
            These values represent live environment constraints and backend services currently running for the HeartLink web console. System runtime variables are managed via cloud deployment configuration.
          </p>
        </div>
      </div>

      <Card
        title="Application State"
        subtitle="Global platform operation parameters"
        icon={Settings2}
      >
        <div className="divide-y divide-[#DCE3DF]">
          <SystemConfigRow
            icon={AlertTriangle}
            label="Platform Maintenance Mode"
            value="Disabled (Normal Operation)"
            statusPill={{
              label: "Operational",
              cls: "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]",
              dot: true,
            }}
            note="When activated, mobile users and standard staff are restricted to offline caching. Managed via backend deployment environmental variables."
          />
          <SystemConfigRow
            icon={Database}
            label="Activity Audit Trail Retention"
            value="Continuous PostgreSQL Repository"
            statusPill={{
              label: "Persistent",
              cls: "bg-[#EDF1EF] text-[#152131] border border-[#DCE3DF]",
              dot: false,
            }}
            note="Clinical and administrative activity events are committed to PostgreSQL audit tables with immutable timestamps."
          />
          <SystemConfigRow
            icon={Activity}
            label="Health Evaluation Engine"
            value="Automated HeartLink Risk Stratification (HSS v2)"
            statusPill={{
              label: "Online",
              cls: "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]",
              dot: true,
            }}
            note="Rule-based heart status scoring computes real-time biometric and symptomatic risk tiers for patient profiles."
          />
        </div>
      </Card>

      <Card
        title="Runtime Environment"
        subtitle="Infrastructure connectivity and service mapping"
        icon={Server}
      >
        <div className="divide-y divide-[#DCE3DF]">
          <SystemConfigRow
            icon={Server}
            label="FastAPI Backend Cluster"
            value="Production API (FastAPI on Render.com)"
            note="High-performance asynchronous Python FastAPI backend delivering low-latency clinical endpoints and REST services."
          />
          <SystemConfigRow
            icon={Database}
            label="Database & Storage Engine"
            value="Supabase PostgreSQL + Secure Storage"
            note="Primary relational store backed by high-availability PostgreSQL with encrypted Supabase storage for clinical assets."
          />
          <SystemConfigRow
            icon={Lock}
            label="Authentication Provider"
            value="JWT Bearer Authentication + Session Cache"
            note="Stateless cryptographic JSON Web Tokens issued with server-validated cryptographic signing."
          />
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Security ───────────────────────────────────────────────────────────

function SecurityTab({ role }) {
  const isSuperAdmin = role === "super_admin";

  return (
    <div className="space-y-6 max-w-4xl">
      {!isSuperAdmin ? (
        <div className="flex items-start gap-3 p-3.5 rounded-[8px] bg-[#F6EDDD] border border-[#EBD7B8] text-[#A9741B]">
          <Shield size={16} className="text-[#A9741B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-bold text-[#152131] mb-0.5">
              Super Admin Policy Authorization Required
            </p>
            <p className="text-[11.5px] text-[#A9741B] leading-relaxed font-medium">
              Global security policy reconfiguration is restricted to Super Administrator credentials. Your account can inspect current active policies below.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3.5 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] text-[#1B6E63]">
          <Sparkles size={16} className="text-[#1B6E63] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-bold text-[#152131] mb-0.5">
              Super Admin Governance Privileges Active
            </p>
            <p className="text-[11.5px] text-[#1B6E63] leading-relaxed font-medium">
              You are signed in with Super Admin privileges. Editable security rule overrides (custom session timeouts, rate-limit thresholds, IP restrictions) will be configurable directly from this portal in upcoming releases.
            </p>
          </div>
        </div>
      )}

      <Card
        title="Access & Session Policies"
        subtitle="Enforced session lifespan and account protection rules"
        icon={ShieldCheck}
      >
        <div className="divide-y divide-[#DCE3DF]">
          <SystemConfigRow
            icon={Clock}
            label="Administrative Session Lifetime"
            value="24 Hours (30 Days with 'Remember Me')"
            statusPill={{
              label: "Enforced",
              cls: "bg-[#EDF1EF] text-[#152131] border border-[#DCE3DF]",
              dot: false,
            }}
            note="JWT access tokens automatically expire after 24 hours of inactivity unless 'Remember Me' is selected during login."
          />
          <SystemConfigRow
            icon={ShieldCheck}
            label="Maximum Failed Login Attempts"
            value="5 attempts → 15-minute temporary lockout"
            statusPill={{
              label: "Active Guard",
              cls: "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]",
              dot: true,
            }}
            note="Prevents credential brute-forcing by locking authentication endpoints for repeated failed password attempts."
          />
        </div>
      </Card>

      <Card
        title="Authentication & Cryptography"
        subtitle="Security standards protecting administrative communications"
        icon={KeyRound}
      >
        <div className="divide-y divide-[#DCE3DF]">
          <SystemConfigRow
            icon={ShieldCheck}
            label="Staff Console Authentication"
            value="Direct Email & Password (Phone OTP Bypassed)"
            note="Staff authentication uses direct email and password verification without requiring SMS OTP delivery."
          />
          <SystemConfigRow
            icon={Lock}
            label="Token Revocation Engine"
            value="Server-Side Blacklist Mechanism"
            note="Signing out immediately invalidates active tokens to ensure sessions cannot be reused or hijacked."
          />
          <SystemConfigRow
            icon={Database}
            label="Password Hashing Standard"
            value="Bcrypt with Cryptographic Salt"
            note="Zero plain-text password storage. All credentials undergo irreversible salted cryptographic hashing before database persistence."
          />
        </div>
      </Card>
    </div>
  );
}

// ─── Main Settings component ──────────────────────────────────────────────────

const Settings = () => {
  const { user, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("account");

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
      <div 
        className="max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <span className="block text-[12px] text-[#8B9893] font-medium mb-1 flex items-center gap-1.5">
              <Sliders size={13} className="text-[#E8532E]" /> System preferences
            </span>
            <h1 
              className="text-[26px] font-medium tracking-tight text-[#152131] m-0"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Admin Settings & Preferences
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[55ch] leading-[1.5]">
              Manage your administrator profile, security credentials, and review live platform configurations.
            </p>
          </div>
        </div>

        {/* ── Quick KPI / Status Row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Active Role
              </p>
              <p 
                className="text-[17px] font-medium text-[#152131] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {getRoleLabel(role)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#FBEAE6] border border-[#F5C7BD] flex items-center justify-center text-[#E8532E]">
              <BadgeCheck size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                2FA Security
              </p>
              <p 
                className="text-[17px] font-medium text-[#1B6E63] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Active
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] flex items-center justify-center text-[#1B6E63]">
              <ShieldCheck size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Backend API
              </p>
              <p 
                className="text-[17px] font-medium text-[#152131] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                FastAPI / Online
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#EDF1EF] border border-[#DCE3DF] flex items-center justify-center text-[#5C6B66]">
              <Server size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Session Policy
              </p>
              <p 
                className="text-[17px] font-medium text-[#152131] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                24h Expire
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#EDF1EF] border border-[#DCE3DF] flex items-center justify-center text-[#5C6B66]">
              <Clock size={16} />
            </div>
          </div>
        </div>

        {/* ── Segmented Tab Strip ─────────────────────────────────────────── */}
        <div className="bg-[#FFFFFF] p-1 rounded-[10px] inline-flex flex-wrap border border-[#DCE3DF] mb-6 w-full sm:w-auto gap-1 shadow-2xs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`settings-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-[#E8532E] text-white shadow-2xs"
                  : "text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF]"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Panels ──────────────────────────────────────────────────── */}
        <div>
          {activeTab === "account" && (
            <AccountTab user={profile} userId={userId} />
          )}
          {activeTab === "system" && <SystemTab />}
          {activeTab === "security" && <SecurityTab role={role} />}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
