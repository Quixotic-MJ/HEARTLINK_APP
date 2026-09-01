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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#21202E] border border-white/10 flex items-center justify-center text-slate-400">
          <Icon size={14} />
        </div>
        <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className="pl-11 sm:pl-0">
        {pill ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pill.cls}`}
          >
            {pill.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            )}
            {pill.label}
          </span>
        ) : (
          <p
            className={`text-xs font-semibold text-white ${
              mono ? "font-mono text-slate-300" : ""
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
    <div className="flex items-start gap-3.5 py-4 border-b border-white/5 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#21202E] border border-white/10 flex items-center justify-center mt-0.5 text-[#E55F37]">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-xs font-bold text-white">{label}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-[#89899C] uppercase tracking-wider">
            System managed
          </span>
          {statusPill && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusPill.cls}`}
            >
              {statusPill.dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              )}
              {statusPill.label}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-300">{value}</p>
        {note && (
          <p className="text-[11px] text-[#89899C] mt-1 leading-relaxed">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/** Section card wrapper matching the HeartLink dark aesthetic */
function Card({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return (
    <div
      className={`bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-sm overflow-hidden animate-in fade-in duration-300 ${className}`}
    >
      <div className="px-6 py-4 border-b border-white/10 bg-[#161616] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-[#21202E] border border-white/10 flex items-center justify-center text-[#E55F37]">
              <Icon size={15} />
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-[#89899C] mt-0.5 font-medium">
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
      cls: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      dot: true,
    };
  if (role === "admin")
    return {
      label: "System Admin",
      cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      dot: true,
    };
  if (role === "medical_expert")
    return {
      label: "Medical Expert",
      cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      dot: true,
    };
  return {
    label: getRoleLabel(role),
    cls: "bg-white/5 text-slate-300 border border-white/10",
    dot: false,
  };
}

function getStatusPill(status) {
  if (status === "active")
    return {
      label: "Active",
      cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      dot: true,
    };
  if (status === "disabled")
    return {
      label: "Disabled",
      cls: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      dot: true,
    };
  return {
    label: status ?? "Unknown",
    cls: "bg-white/5 text-slate-400 border border-white/10",
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
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
      tabIndex={-1}
      aria-label={showPw[field] ? "Hide password" : "Show password"}
    >
      {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  const getPasswordStrength = (pw) => {
    if (!pw) return { label: "", color: "", width: "0%" };
    if (pw.length < 8) return { label: "Too Short", color: "bg-rose-500 text-rose-400", width: "25%" };
    if (pw.length < 12) return { label: "Fair", color: "bg-amber-500 text-amber-400", width: "65%" };
    return { label: "Strong", color: "bg-emerald-500 text-emerald-400", width: "100%" };
  };

  const strength = getPasswordStrength(pwForm.next);

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* ── Profile Information ─────────────────────────────────────────── */}
      <Card
        title="Account Profile"
        subtitle="Active administrative identity and permission tier"
        icon={User}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 mb-4 border-b border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30 flex items-center justify-center text-2xl font-extrabold shadow-md flex-shrink-0">
            {fullName !== "—" ? fullName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-tight">{fullName}</h3>
              {getRolePill(role) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRolePill(role).cls}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {getRolePill(role).label}
                </span>
              )}
            </div>
            <p className="text-xs text-[#89899C] mt-1 font-mono">
              {user?.email || "No email on record"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          <InfoRow icon={Mail} label="Email Address" value={user?.email} />
          <InfoRow icon={Hash} label="Admin Account ID" value={userId} mono />
          <InfoRow icon={BadgeCheck} label="Access Role" pill={getRolePill(role)} />
          <InfoRow icon={CheckCircle2} label="Account Status" pill={getStatusPill(status)} />
        </div>

        <div className="mt-5 p-3.5 rounded-xl bg-[#161616] border border-white/5 flex items-start gap-2.5 text-[#89899C]">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
          <p className="text-[11px] leading-relaxed">
            Role assignments and account statuses are centrally governed by Super Administrators in{" "}
            <span className="text-white font-semibold">User & Staff Directory</span>.
          </p>
        </div>
      </Card>

      {/* ── 2FA status ──────────────────────────────────────────────────── */}
      <Card
        title="Multi-Factor Authentication"
        subtitle="Second-factor verification policy for console logins"
        icon={ShieldCheck}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-white">
                Two-Factor Authentication Enforced
              </h4>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                Active
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider">
                Mock Phase
              </span>
            </div>
            <p className="text-xs text-[#89899C] leading-relaxed max-w-2xl">
              All web administration logins require a 6-digit verification code sent to your registered device. During current preview staging, the system validates the default security code. Dynamic SMS/Email OTP delivery will be activated upon production release.
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
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white mb-1">
                Password Updated Successfully
              </h4>
              <p className="text-xs text-emerald-300/80 leading-relaxed mb-4">
                Your administrative password has been updated securely. Your current console session remains authenticated.
              </p>
              <button
                type="button"
                onClick={clearPwForm}
                className="text-xs font-bold text-white bg-[#21202E] hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all cursor-pointer"
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
            <p className="text-xs text-[#89899C] leading-relaxed">
              Passwords must be at least 8 characters. Ensure you use a strong combination of letters, numbers, and symbols.
            </p>

            {pwError && (
              <div
                id="settings-pw-error"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300"
              >
                <XCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed">
                  {pwError}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Current password */}
              <div className="md:col-span-2">
                <label
                  htmlFor="pw-current"
                  className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#161616] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E55F37] focus:ring-1 focus:ring-[#E55F37]/30 transition-all disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                  <ToggleEye field="current" />
                </div>
              </div>

              {/* New password */}
              <div>
                <label
                  htmlFor="pw-new"
                  className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#161616] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E55F37] focus:ring-1 focus:ring-[#E55F37]/30 transition-all disabled:opacity-50"
                    placeholder="Minimum 8 characters"
                  />
                  <ToggleEye field="next" />
                </div>
                {pwForm.next.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color.split(" ")[0]}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#89899C]">Password Strength</span>
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
                  className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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
                    className={`w-full pl-10 pr-10 py-2.5 text-xs bg-[#161616] border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20 text-rose-200"
                        : "border-white/10 focus:border-[#E55F37] focus:ring-[#E55F37]/30"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <ToggleEye field="confirm" />
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[10px] text-rose-400 mt-1 font-medium flex items-center gap-1">
                    <XCircle size={11} /> Passwords do not match
                  </p>
                )}
                {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.confirm.length >= 8 && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
                    <Check size={11} /> Passwords match
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                id="settings-pw-submit"
                type="submit"
                disabled={pwState === "loading" || (pwForm.confirm && pwForm.next !== pwForm.confirm)}
                className="flex items-center gap-2 bg-[#E55F37] hover:bg-[#D4542E] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {pwState === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
              <button
                id="settings-pw-cancel"
                type="button"
                onClick={handleCancelPw}
                disabled={pwState === "loading"}
                className="px-4 py-2.5 text-xs font-semibold text-[#89899C] hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
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
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
        <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-white mb-1">
            Enforced Platform Configuration
          </p>
          <p className="text-xs text-blue-200/80 leading-relaxed">
            These values represent live environment constraints and backend services currently running for the HeartLink web console. System runtime variables are managed via cloud deployment configuration.
          </p>
        </div>
      </div>

      <Card
        title="Application State"
        subtitle="Global platform operation parameters"
        icon={Settings2}
      >
        <div className="divide-y divide-white/5">
          <SystemConfigRow
            icon={AlertTriangle}
            label="Platform Maintenance Mode"
            value="Disabled (Normal Operation)"
            statusPill={{
              label: "Operational",
              cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
              cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
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
              cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
        <div className="divide-y divide-white/5">
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
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {!isSuperAdmin ? (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <Shield size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-white mb-1">
              Super Admin Policy Authorization Required
            </p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Global security policy reconfiguration is restricted to Super Administrator credentials. Your account can inspect current active policies below.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
          <Sparkles size={18} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-white mb-1">
              Super Admin Governance Privileges Active
            </p>
            <p className="text-xs text-purple-200/80 leading-relaxed">
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
        <div className="divide-y divide-white/5">
          <SystemConfigRow
            icon={Clock}
            label="Administrative Session Lifetime"
            value="24 Hours (30 Days with 'Remember Me')"
            statusPill={{
              label: "Enforced",
              cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
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
              cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
        <div className="divide-y divide-white/5">
          <SystemConfigRow
            icon={ShieldCheck}
            label="Two-Factor Authentication (2FA)"
            value="Mandatory for all Administrator and Expert accounts"
            note="Secondary authentication ensures accounts remain secure even if primary passwords are compromised."
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
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
              <Sliders size={11} />
              <span>System Preferences</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
              Admin Settings
            </h2>
            <p className="text-[#89899C] text-xs mt-1 font-medium">
              Manage your administrator profile, security credentials, and review platform configurations.
            </p>
          </div>
        </div>

        {/* ── Quick KPI / Status Row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                Active Role
              </p>
              <p className="text-base font-extrabold text-white">
                {getRoleLabel(role)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#21202E] border border-white/10 flex items-center justify-center text-[#E55F37]">
              <BadgeCheck size={18} />
            </div>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                2FA Security
              </p>
              <p className="text-base font-extrabold text-emerald-400">
                Active (Mock)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                Backend API
              </p>
              <p className="text-base font-extrabold text-blue-400">
                FastAPI / Online
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Server size={18} />
            </div>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                Session Policy
              </p>
              <p className="text-base font-extrabold text-purple-400">
                24h Auto-Expire
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock size={18} />
            </div>
          </div>
        </div>

        {/* ── Segmented Tab Strip ─────────────────────────────────────────── */}
        <div className="bg-[#1A1A1A] p-1.5 rounded-2xl inline-flex flex-wrap border border-white/10 mb-6 w-full sm:w-auto gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`settings-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-[#E55F37] text-white shadow-sm shadow-[#E55F37]/25"
                  : "text-[#89899C] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Panels ──────────────────────────────────────────────────── */}
        <div className="animate-in fade-in duration-200">
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
