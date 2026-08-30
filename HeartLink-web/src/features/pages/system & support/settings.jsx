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
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiFetch } from "../../../api";

// ─── Shared primitives ────────────────────────────────────────────────────────

/** A read-only information row inside an info card */
function InfoRow({ icon: Icon, label, value, mono = false, pill = null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-0.5">
          {label}
        </p>
        {pill ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pill.cls}`}
          >
            {pill.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            )}
            {pill.label}
          </span>
        ) : (
          <p
            className={`text-xs font-semibold text-slate-800 truncate ${
              mono ? "font-mono" : ""
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
function SystemConfigRow({ icon: Icon, label, value, note }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-50 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-[10px] font-bold text-slate-700">{label}</p>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">
            System managed
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-800">{value}</p>
        {note && (
          <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/** Section card wrapper */
function Card({ title, icon: Icon, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-5 pt-4 pb-3 border-b border-slate-50 flex items-center gap-2">
        {Icon && (
          <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
            <Icon size={12} className="text-white" />
          </div>
        )}
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
          {title}
        </h4>
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "account", label: "My Account", icon: User },
  { id: "system", label: "System", icon: Settings2 },
  { id: "security", label: "Security", icon: ShieldCheck },
];

// ─── Role display helpers ─────────────────────────────────────────────────────

function getRoleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "System Admin";
  if (role === "medical_expert") return "Authorized Medical Expert";
  return role ?? "Unknown";
}

function getRolePill(role) {
  if (role === "super_admin")
    return {
      label: "Super Admin",
      cls: "bg-violet-50 text-violet-700",
      dot: true,
    };
  if (role === "admin")
    return { label: "System Admin", cls: "bg-blue-50 text-blue-700", dot: true };
  return {
    label: getRoleLabel(role),
    cls: "bg-slate-100 text-slate-600",
    dot: false,
  };
}

function getStatusPill(status) {
  if (status === "active")
    return {
      label: "Active",
      cls: "bg-emerald-50 text-emerald-700",
      dot: true,
    };
  if (status === "disabled")
    return { label: "Disabled", cls: "bg-red-50 text-red-700", dot: true };
  return { label: status ?? "Unknown", cls: "bg-slate-100 text-slate-500", dot: false };
}

// ─── Tab: My Account ─────────────────────────────────────────────────────────

function AccountTab({ user, userId }) {
  const role = user?.role;
  const status = user?.account_status ?? "active";
  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.first_name ?? "—";

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
      // Clear all sensitive password state immediately after success — never retain
      setPwForm({ current: "", next: "", confirm: "" });
      setPwState("success");
    } catch (err) {
      const detail =
        err?.data?.detail ?? "Password change failed. Please try again.";
      setPwError(detail);
      // Always clear current password field on failure — do not retain it
      setPwForm((prev) => ({ ...prev, current: "" }));
      setPwState("error");
    }
  };

  const handleCancelPw = () => clearPwForm();

  const ToggleEye = ({ field }) => (
    <button
      type="button"
      onClick={() => setShowPw((prev) => ({ ...prev, [field]: !prev[field] }))}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      tabIndex={-1}
      aria-label={showPw[field] ? "Hide password" : "Show password"}
    >
      {showPw[field] ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Profile information ─────────────────────────────────────────── */}
      <Card title="Account Information" icon={User}>
        <div className="pt-1">
          <div className="flex items-center gap-3 py-3 border-b border-slate-50 mb-1">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {fullName !== "—" ? fullName.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{fullName}</p>
              <p className="text-[10px] text-slate-400 font-medium">
                {getRoleLabel(role)}
              </p>
            </div>
          </div>
          <InfoRow icon={Mail} label="Email Address" value={user?.email} />
          <InfoRow icon={Hash} label="User ID" value={userId} mono />
          <InfoRow icon={BadgeCheck} label="Role" pill={getRolePill(role)} />
          <InfoRow icon={CheckCircle2} label="Account Status" pill={getStatusPill(status)} />
        </div>
        <p className="text-[9px] text-slate-400 mt-3 leading-relaxed flex items-start gap-1">
          <Info size={10} className="mt-px flex-shrink-0" />
          Role and account status are managed by the Super Admin in Staff Management
          and cannot be changed here.
        </p>
      </Card>

      {/* ── 2FA status ──────────────────────────────────────────────────── */}
      <Card title="Two-Factor Authentication" icon={ShieldCheck}>
        <div className="pt-2 flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
            <ShieldCheck size={15} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-slate-800">
                2FA is active on this account
              </p>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-[8.5px] font-bold text-amber-600 uppercase tracking-widest">
                Mock Phase
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-md">
              All admin logins require a 6-digit verification code sent to your
              registered device. During the current development phase the system
              uses a fixed verification code. Dynamic OTP delivery will be
              enabled in production.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Change password ─────────────────────────────────────────────── */}
      <Card title="Change Password" icon={KeyRound}>
        {pwState === "success" ? (
          <div className="pt-3 flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mt-0.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800 mb-1">
                Password changed successfully
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                Your password has been updated. You may be prompted to log in
                again on other devices.
              </p>
              <button
                type="button"
                onClick={clearPwForm}
                className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
              >
                Change password again
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handlePwChange}
            autoComplete="off"
            className="pt-2"
            id="settings-password-form"
          >
            <p className="text-[10px] text-slate-500 leading-relaxed mb-4 max-w-md">
              Passwords must be at least 8 characters. After a successful change
              your current session remains active.
            </p>

            {pwError && (
              <div
                id="settings-pw-error"
                className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-4"
              >
                <XCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-red-700 leading-relaxed">
                  {pwError}
                </p>
              </div>
            )}

            <div className="space-y-3 max-w-sm">
              {/* Current password */}
              <div>
                <label
                  htmlFor="pw-current"
                  className="block text-[11px] font-bold text-slate-700 mb-1.5"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    className="w-full pl-8 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors disabled:opacity-60"
                    placeholder="Enter current password"
                  />
                  <ToggleEye field="current" />
                </div>
              </div>

              {/* New password */}
              <div>
                <label
                  htmlFor="pw-new"
                  className="block text-[11px] font-bold text-slate-700 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    className="w-full pl-8 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors disabled:opacity-60"
                    placeholder="Minimum 8 characters"
                  />
                  <ToggleEye field="next" />
                </div>
                {pwForm.next.length > 0 && (
                  <p
                    className={`text-[9px] mt-1 font-medium ${
                      pwForm.next.length < 8
                        ? "text-red-500"
                        : pwForm.next.length < 12
                        ? "text-amber-500"
                        : "text-emerald-600"
                    }`}
                  >
                    {pwForm.next.length < 8
                      ? `Too short — ${8 - pwForm.next.length} more character(s) needed`
                      : pwForm.next.length < 12
                      ? "Acceptable — consider using a longer password"
                      : "Strong password"}
                  </p>
                )}
              </div>

              {/* Confirm new password */}
              <div>
                <label
                  htmlFor="pw-confirm"
                  className="block text-[11px] font-bold text-slate-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    className={`w-full pl-8 pr-9 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-colors disabled:opacity-60 ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-red-300 focus:border-red-400 focus:ring-red-900/5"
                        : "border-slate-200 focus:border-slate-400 focus:ring-slate-900/5"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <ToggleEye field="confirm" />
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[9px] text-red-500 mt-1 font-medium">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                id="settings-pw-submit"
                type="submit"
                disabled={pwState === "loading"}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white font-bold text-[11px] px-4 py-2 rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                {pwState === "loading" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <KeyRound size={13} />
                )}
                {pwState === "loading" ? "Changing…" : "Change Password"}
              </button>
              <button
                id="settings-pw-cancel"
                type="button"
                onClick={handleCancelPw}
                disabled={pwState === "loading"}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-40 px-2 py-2"
              >
                Cancel
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
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold text-blue-800 mb-0.5">Read-only view</p>
          <p className="text-[10px] text-blue-700 leading-relaxed">
            These values reflect the current system configuration enforced by
            the backend. They are not editable here. To change system policy,
            update the server configuration and redeploy.
          </p>
        </div>
      </div>

      <Card title="Application State" icon={Settings2}>
        <div className="pt-1">
          <SystemConfigRow
            icon={AlertTriangle}
            label="Maintenance Mode"
            value="Disabled"
            note="When enabled, mobile app users and standard admins are locked out. Currently managed as a server-side flag — not yet configurable from this UI."
          />
          <SystemConfigRow
            icon={Database}
            label="Activity Log Retention"
            value="Audited events"
            note="The backend maintains admin activity audit events in PostgreSQL repository storage."
          />
        </div>
      </Card>

      <Card title="Runtime Environment" icon={Info}>
        <div className="pt-1">
          <SystemConfigRow
            icon={Settings2}
            label="Backend Mode"
            value="Production API (Render + Supabase)"
            note="The system is running against the production FastAPI backend backed by Supabase PostgreSQL."
          />
          <SystemConfigRow
            icon={Database}
            label="Persistence Layer"
            value="Supabase PostgreSQL + Storage"
            note="All mutations are persisted to Supabase PostgreSQL database tables and Supabase Storage buckets."
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
    <div className="space-y-5 max-w-3xl">
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
          <ShieldCheck size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-amber-800 mb-0.5">
              Super Admin access required for policy changes
            </p>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              Security policy configuration is restricted to Super Admin accounts.
              You can view the current enforced values below.
            </p>
          </div>
        </div>
      )}

      <Card title="Access Policies" icon={ShieldCheck}>
        <div className="pt-1">
          <SystemConfigRow
            icon={Clock}
            label="Admin Session Lifetime"
            value="24 hours (30 days with Remember Me)"
            note="JWT tokens issued at login expire after 24 hours. Selecting 'Remember Me' at login extends this to 30 days. System-wide policy configuration is planned for a future release."
          />
          <SystemConfigRow
            icon={ShieldCheck}
            label="Max Failed Login Attempts"
            value="5 attempts → 15-minute lockout"
            note="After 5 consecutive failed login attempts, the account identifier is locked for 15 minutes. This threshold is enforced server-side."
          />
        </div>
      </Card>

      <Card title="Authentication" icon={KeyRound}>
        <div className="pt-1">
          <SystemConfigRow
            icon={ShieldCheck}
            label="Two-Factor Authentication"
            value="Required for all admin logins"
            note="Every web console login requires a second-factor code after password verification. Dynamic OTP delivery via SMS is planned for production."
          />
          <SystemConfigRow
            icon={Lock}
            label="Token Blacklist on Logout"
            value="In-memory (resets on server restart)"
            note="Revoked tokens are tracked in a server-side in-memory set. Persistent token revocation will be implemented before production deployment."
          />
        </div>
      </Card>

      {isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Editable security policy controls — session timeout, failed-login
            threshold, audit log retention — are planned for Settings Pass 2.
            When implemented they will be restricted to Super Admin and will
            produce an admin activity log event on every change.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings component ──────────────────────────────────────────────────

const Settings = () => {
  const { user, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("account");

  // Derive role from context
  const role = user?.role || "admin";

  // Enrich profile from the backend if the AuthContext user object is sparse.
  // The /api/users/{id}/profile endpoint returns the full profile dict.
  const [profile, setProfile] = useState(user);

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/users/${userId}/profile`)
      .then((data) => {
        if (data?.profile) setProfile(data.profile);
      })
      .catch(() => {
        // Fall back gracefully to whatever is in the auth context
        setProfile(user);
      });
  }, [userId, user]);

  return (
    <AdminLayout>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
          Administration
        </p>
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-[1.1] tracking-tight">
          Settings<span className="text-[#0f172a]">.</span>
        </h2>
      </div>

      {/* ── Tab strip ───────────────────────────────────────────────────── */}
      <div className="bg-white p-1 rounded-xl inline-flex flex-wrap shadow-sm border border-slate-100 mb-6 w-full sm:w-auto gap-0.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`settings-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              activeTab === id
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ──────────────────────────────────────────────────── */}
      <div className="animate-in fade-in duration-200">
        {activeTab === "account" && (
          <AccountTab user={profile} userId={userId} />
        )}
        {activeTab === "system" && <SystemTab />}
        {activeTab === "security" && <SecurityTab role={role} />}
      </div>
    </AdminLayout>
  );
};

export default Settings;
