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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 border-b border-ds-hairline last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-ds-surface border border-ds-hairline flex items-center justify-center text-ds-slate">
          <Icon size={14} />
        </div>
        <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className="pl-11 sm:pl-0">
        {pill ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider ${pill.cls}`}
          >
            {pill.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            )}
            {pill.label}
          </span>
        ) : (
          <p
            className={`text-[12.5px] font-semibold text-ds-ink ${
              mono ? "text-ds-slate" : ""
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
    <div className="flex items-start gap-3.5 py-4 border-b border-ds-hairline last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-ds-tint border border-ds-tint flex items-center justify-center mt-0.5 text-ds-on-tint">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-[13px] font-bold text-ds-ink">{label}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-ds-surface border border-ds-hairline text-[11px] font-semibold text-ds-slate uppercase tracking-wider">
            System managed
          </span>
          {statusPill && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider ${statusPill.cls}`}
            >
              {statusPill.dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              )}
              {statusPill.label}
            </span>
          )}
        </div>
        <p className="text-[12.5px] font-semibold text-ds-ink">{value}</p>
        {note && (
          <p className="text-[11.5px] text-ds-slate mt-1 leading-relaxed">
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
      className={`bg-ds-canvas rounded-xl border border-ds-hairline overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-ds-hairline bg-ds-canvas flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-[8px] bg-ds-tint border border-ds-tint flex items-center justify-center text-ds-on-tint">
              <Icon size={15} />
            </div>
          )}
          <div>
            <h4 className="text-[15px] font-bold text-ds-ink">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-ds-steel mt-0.5 font-medium">
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
      cls: "bg-ds-tint text-ds-on-tint border border-ds-tint",
      dot: true,
    };
  if (role === "admin")
    return {
      label: "System Admin",
      cls: "bg-ds-surface text-ds-ink border border-ds-hairline",
      dot: true,
    };
  if (role === "medical_expert")
    return {
      label: "Medical Expert",
      cls: "bg-ds-mint text-ds-charcoal border border-ds-mint",
      dot: true,
    };
  return {
    label: getRoleLabel(role),
    cls: "bg-ds-surface text-ds-slate border border-ds-hairline",
    dot: false,
  };
}

function getStatusPill(status) {
  if (status === "active")
    return {
      label: "Active",
      cls: "bg-ds-mint text-ds-charcoal border border-ds-mint",
      dot: true,
    };
  if (status === "disabled")
    return {
      label: "Disabled",
      cls: "bg-ds-rose text-ds-ink border border-ds-rose",
      dot: true,
    };
  return {
    label: status ?? "Unknown",
    cls: "bg-ds-surface text-ds-slate border border-ds-hairline",
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
    if (pwForm.next.length < 16) {
      setPwError("New password must be at least 16 characters.");
      return;
    }
    if (!/\d/.test(pwForm.next)) {
      setPwError("New password must include at least one number.");
      return;
    }
    if (!/[^A-Za-z0-9\s]/.test(pwForm.next)) {
      setPwError("New password must include at least one special character.");
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
      let errorMsg = err?.data?.detail ?? "Password change failed. Please check your current password and try again.";
      if (Array.isArray(err?.data?.detail)) {
        errorMsg = err.data.detail[0].msg;
      }
      errorMsg = errorMsg.replace(/^Value error,\s*/i, "");
      setPwError(errorMsg);
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
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ds-steel hover:text-ds-ink transition-colors cursor-pointer"
      tabIndex={-1}
      aria-label={showPw[field] ? "Hide password" : "Show password"}
    >
      {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  const getPasswordStrength = (pw) => {
    if (!pw) return { label: "", color: "", width: "0%" };
    if (pw.length < 8) return { label: "Too Short", color: "bg-ds-danger text-ds-danger", width: "25%" };
    if (pw.length < 12) return { label: "Fair", color: "bg-ds-warm-text text-ds-warm-text", width: "65%" };
    return { label: "Strong", color: "bg-ds-primary text-ds-charcoal", width: "100%" };
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 pb-5 mb-4 border-b border-ds-hairline">
          <div className="w-14 h-14 rounded-full bg-ds-tint text-ds-on-tint border border-ds-tint flex items-center justify-center text-xl font-bold flex-shrink-0">
            {fullName !== "—" ? fullName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[18px] font-bold text-ds-ink tracking-tight">
                {fullName}
              </h3>
              {getRolePill(role) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider ${getRolePill(role).cls}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {getRolePill(role).label}
                </span>
              )}
            </div>
            <p className="text-[12px] text-ds-slate mt-0.5">
              {user?.email || "No email on record"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-ds-hairline">
          <InfoRow icon={Mail} label="Email Address" value={user?.email} />
          <InfoRow icon={Hash} label="Admin Account ID" value={userId} mono />
          <InfoRow icon={BadgeCheck} label="Access Role" pill={getRolePill(role)} />
          <InfoRow icon={CheckCircle2} label="Account Status" pill={getStatusPill(status)} />
        </div>

        <div className="mt-5 p-3 rounded-[8px] bg-ds-surface/60 border border-ds-hairline flex items-start gap-2.5 text-ds-slate">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-ds-charcoal" />
          <p className="text-[11.5px] leading-relaxed">
            Roles and account statuses are managed by Super Admins in the{" "}
            <span className="text-ds-ink font-semibold">User & Staff Directory</span>.
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
          <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-ds-mint border border-ds-mint flex items-center justify-center text-ds-charcoal">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-[13px] font-bold text-ds-ink">
                Email & Password Login
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-ds-mint text-ds-charcoal border border-ds-mint text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                Active
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-ds-surface text-ds-slate border border-ds-hairline text-[11px] font-semibold uppercase tracking-wider">
                No Phone Code Required
              </span>
            </div>
            <p className="text-[12px] text-ds-slate leading-relaxed max-w-2xl">
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
          <div className="p-4 rounded-[8px] bg-ds-mint border border-ds-mint flex items-start gap-3.5">
            <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-ds-mint text-ds-charcoal flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-[14px] font-bold text-ds-ink mb-0.5">
                Password Updated Successfully
              </h4>
              <p className="text-[12px] text-ds-charcoal leading-relaxed mb-3 font-medium">
                Your administrative password has been updated securely. Your current console session remains authenticated.
              </p>
              <button
                type="button"
                onClick={clearPwForm}
                className="text-[12px] font-semibold text-ds-ink bg-ds-canvas hover:bg-ds-surface border border-ds-hairline px-3.5 py-1.5 rounded-[6px] transition-colors cursor-pointer"
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
            <p className="text-[12px] text-ds-slate leading-relaxed">
              Your new password must be at least 16 characters long. We recommend using a mix of letters, numbers, and symbols to keep your account secure.
            </p>

            {pwError && (
              <div
                id="settings-pw-error"
                className="flex items-start gap-2 p-3 rounded-[8px] bg-ds-rose border border-ds-rose text-ds-ink"
              >
                <XCircle size={14} className="text-ds-danger flex-shrink-0 mt-0.5" />
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
                  className="block text-[13px] font-medium text-ds-ink mb-1"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel" />
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
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-ds-surface border border-ds-hairline rounded-[8px] text-ds-ink placeholder:text-ds-steel focus:outline-none focus:border-ds-ink transition-colors disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                  <ToggleEye field="current" />
                </div>
              </div>

              {/* New password */}
              <div>
                <label
                  htmlFor="pw-new"
                  className="block text-[13px] font-medium text-ds-ink mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel" />
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
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-ds-surface border border-ds-hairline rounded-[8px] text-ds-ink placeholder:text-ds-steel focus:outline-none focus:border-ds-ink transition-colors disabled:opacity-50"
                    placeholder="Minimum 8 characters"
                  />
                  <ToggleEye field="next" />
                </div>
                {pwForm.next.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="h-1 w-full bg-ds-hairline rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color.split(" ")[0]}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-ds-steel">Strength</span>
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
                  className="block text-[13px] font-medium text-ds-ink mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel" />
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
                    className={`w-full pl-9 pr-9 py-2 text-[13px] bg-ds-surface border rounded-[8px] text-ds-ink placeholder:text-ds-steel focus:outline-none transition-colors disabled:opacity-50 ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-ds-danger text-ds-danger"
                        : "border-ds-hairline focus:border-ds-ink"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <ToggleEye field="confirm" />
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[11px] text-ds-danger mt-1 font-medium flex items-center gap-1">
                    <XCircle size={11} /> Passwords do not match
                  </p>
                )}
                {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.confirm.length >= 8 && (
                  <p className="text-[11px] text-ds-charcoal mt-1 font-medium flex items-center gap-1">
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
                className="flex items-center gap-1.5 bg-ds-primary hover:bg-ds-primary-pressed text-white font-semibold text-[12.5px] px-4 py-2 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
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
                className="px-3.5 py-2 text-[12.5px] font-semibold text-ds-slate hover:text-ds-ink hover:bg-ds-surface rounded-[8px] transition-colors cursor-pointer disabled:opacity-40"
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
            iconBg="bg-ds-tint"
            iconColor="text-ds-primary"
            iconBorder="border-ds-tint"
          />
          <KpiCard
            label="Login Security"
            value="Active"
            icon={ShieldCheck}
            iconBg="bg-ds-mint"
            iconColor="text-ds-charcoal"
            iconBorder="border-ds-mint"
            valueColor="text-ds-charcoal"
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
