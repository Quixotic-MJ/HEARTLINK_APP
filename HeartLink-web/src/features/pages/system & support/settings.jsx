import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useAuth } from "../../../contexts/useAuth";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

// ─── Role Display Helpers ─────────────────────────────────────────────────────

function getRoleLabel(role, expertType) {
  if (role === "admin") return "System Admin";
  if (role === "medical_expert") return expertType || "Medical Expert";
  return role
    ? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Staff User";
}

function RoleBadge({ role, expertType }) {
  if (role === "admin") {
    return (
      <span
        className={`${PILL} border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink`}
      >
        <Shield size={11} className="text-cal-badge-violet" aria-hidden="true" />
        <span>System Admin</span>
      </span>
    );
  }
  if (role === "medical_expert") {
    return (
      <span
        className={`${PILL} border-cal-brand-accent/25 bg-cal-brand-accent/10 text-cal-ink`}
      >
        <Activity
          size={11}
          className="text-cal-brand-accent"
          aria-hidden="true"
        />
        <span>{expertType || "Medical Expert"}</span>
      </span>
    );
  }
  return (
    <span
      className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}
    >
      <BadgeCheck size={11} className="text-cal-muted" aria-hidden="true" />
      <span>{getRoleLabel(role, expertType)}</span>
    </span>
  );
}

function StatusBadge({ status = "active" }) {
  const isActive = status === "active";
  if (isActive) {
    return (
      <span
        className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
      >
        <CheckCircle2
          size={11}
          className="text-cal-success"
          aria-hidden="true"
        />
        <span>Active</span>
      </span>
    );
  }
  return (
    <span
      className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}
    >
      <XCircle size={11} className="text-cal-error" aria-hidden="true" />
      <span>{status || "Disabled"}</span>
    </span>
  );
}

// ─── Shared Section Card ──────────────────────────────────────────────────────

function SettingsCard({ title, subtitle, icon: Icon, children, className = "" }) {
  return (
    <section
      className={`overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-cal-hairline bg-cal-canvas px-6 py-4">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
            <Icon size={15} aria-hidden="true" />
          </div>
        )}
        <div>
          <h3 className="font-cal-display text-[17px] font-semibold tracking-[-0.3px] leading-[1.2] text-cal-ink">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] text-cal-muted">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ─── Password Field Eye Toggle ────────────────────────────────────────────────

function ToggleEye({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-cal-muted hover:text-cal-ink transition-colors cursor-pointer"
      tabIndex={-1}
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );
}

// ─── Account & Credentials Panel ──────────────────────────────────────────────

function AccountTab({ user, userId }) {
  const role = user?.role;
  const expertType = user?.expert_type;
  const status = user?.account_status ?? "active";
  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.first_name ?? user?.name ?? "Administrator";

  const avatarInitial = fullName !== "—" ? fullName.charAt(0).toUpperCase() : "A";

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });
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
      setPwError("New password must be at least 16 characters long.");
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
      setPwError("New password must be different from your current password.");
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
      setPwForm({ current: "", next: "", confirm: "" });
      setPwState("success");
      toast.success("Password updated successfully", {
        description: "Your administrator password has been updated securely.",
      });
    } catch (err) {
      let errorMsg =
        err?.data?.detail ??
        "Password update failed. Please verify your current password and try again.";
      if (Array.isArray(err?.data?.detail)) {
        errorMsg = err.data.detail[0].msg;
      }
      errorMsg = errorMsg.replace(/^Value error,\s*/i, "");
      setPwError(errorMsg);
      setPwForm((prev) => ({ ...prev, current: "" }));
      setPwState("error");
      toast.error("Failed to update password", {
        description: errorMsg,
      });
    }
  };

  const toggleShow = (field) =>
    setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));

  // Dynamic Password Validation
  const hasMinLength = pwForm.next.length >= 16;
  const hasNumber = /\d/.test(pwForm.next);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(pwForm.next);
  const passwordsMatch = Boolean(
    pwForm.confirm && pwForm.next === pwForm.confirm
  );

  const strengthScore = useMemo(() => {
    let score = 0;
    if (pwForm.next.length >= 8) score += 1;
    if (pwForm.next.length >= 16) score += 1;
    if (/\d/.test(pwForm.next)) score += 1;
    if (/[^A-Za-z0-9\s]/.test(pwForm.next)) score += 1;
    return score;
  }, [pwForm.next]);

  const strengthLabel = useMemo(() => {
    if (!pwForm.next) return { label: "", color: "bg-cal-hairline" };
    if (strengthScore <= 1) return { label: "Weak", color: "bg-cal-error" };
    if (strengthScore <= 3) return { label: "Moderate", color: "bg-cal-warning" };
    return { label: "Strong", color: "bg-cal-success" };
  }, [pwForm.next, strengthScore]);

  return (
    <div className="space-y-6">
      {/* ── 1. Profile Information ────────────────────────────────────────── */}
      <SettingsCard
        title="Account Profile"
        subtitle="Your identity details and role permissions"
        icon={User}
      >
        {/* Profile Banner */}
        <div className="flex flex-col gap-4 border-b border-cal-hairline pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/15 font-cal-display text-[22px] font-semibold text-cal-ink">
              {avatarInitial}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-cal-display text-[19px] font-semibold tracking-[-0.3px] text-cal-ink">
                  {fullName}
                </h4>
                <RoleBadge role={role} expertType={expertType} />
              </div>
              <p className="mt-0.5 text-[13px] text-cal-muted">
                {user?.email || "No email on record"}
              </p>
            </div>
          </div>

          <StatusBadge status={status} />
        </div>

        {/* 2-Column Hairline Metadata Grid */}
        <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline sm:grid-cols-2">
          <div className="bg-cal-canvas p-4">
            <div className="flex items-center gap-2 text-cal-muted">
              <Mail size={13.5} />
              <span className="text-[12px] font-medium">Email address</span>
            </div>
            <p className="mt-1 text-[13.5px] font-semibold text-cal-ink">
              {user?.email || "—"}
            </p>
          </div>

          <div className="bg-cal-canvas p-4">
            <div className="flex items-center gap-2 text-cal-muted">
              <Hash size={13.5} />
              <span className="text-[12px] font-medium">Administrator ID</span>
            </div>
            <p className="mt-1 font-cal-mono text-[13px] font-semibold tabular-nums text-cal-ink">
              {userId || "—"}
            </p>
          </div>

          <div className="bg-cal-canvas p-4">
            <div className="flex items-center gap-2 text-cal-muted">
              <BadgeCheck size={13.5} />
              <span className="text-[12px] font-medium">Access scope</span>
            </div>
            <div className="mt-1">
              <RoleBadge role={role} expertType={expertType} />
            </div>
          </div>

          <div className="bg-cal-canvas p-4">
            <div className="flex items-center gap-2 text-cal-muted">
              <CheckCircle2 size={13.5} />
              <span className="text-[12px] font-medium">Directory status</span>
            </div>
            <div className="mt-1">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5 text-cal-muted">
          <Info size={15} className="mt-0.5 shrink-0 text-cal-ink" />
          <p className="text-[12.5px] leading-relaxed">
            Roles, directory permissions, and expert assignments are managed in
            the{" "}
            <span className="font-semibold text-cal-ink">
              Users &amp; Staff Directory
            </span>
            .
          </p>
        </div>
      </SettingsCard>

      {/* ── 2. Login Security Method ──────────────────────────────────────── */}
      <SettingsCard
        title="Login Security"
        subtitle="Current authentication method for your staff account"
        icon={ShieldCheck}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[14px] font-semibold text-cal-ink">
                Email &amp; Password Authentication
              </h4>
              <span
                className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
              >
                <CheckCircle2
                  size={10.5}
                  className="text-cal-success"
                  aria-hidden="true"
                />
                <span>Active</span>
              </span>
              <span
                className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-muted`}
              >
                Single-factor portal access
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-cal-muted">
              You are signed in using direct credentials. Session tokens are
              secured via HTTP-only authentication and verified against the
              clinical backend.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* ── 3. Change Password ────────────────────────────────────────────── */}
      <SettingsCard
        title="Change Password"
        subtitle="Update your administrator login credentials"
        icon={KeyRound}
      >
        {pwState === "success" ? (
          <div className="flex items-start gap-3.5 rounded-[10px] border border-cal-success/25 bg-cal-success/10 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-success/25 bg-cal-canvas text-cal-success">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <h4 className="font-cal-display text-[16px] font-semibold text-cal-ink">
                Password updated successfully
              </h4>
              <p className="mt-1 text-[13px] leading-relaxed text-cal-body">
                Your administrator password has been updated securely. Your
                current web console session remains authenticated.
              </p>
              <button
                type="button"
                onClick={clearPwForm}
                className="mt-3.5 inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                Change password again
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handlePwChange}
            autoComplete="off"
            className="space-y-4"
          >
            <p className="text-[13px] leading-relaxed text-cal-muted">
              Choose a strong, unique password with at least 16 characters. Mix
              letters, numbers, and symbols to ensure maximum account security.
            </p>

            {pwError && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-error/25 bg-cal-error/10 p-3.5 text-cal-ink">
                <XCircle size={15} className="mt-0.5 shrink-0 text-cal-error" />
                <p className="text-[12.5px] font-medium leading-relaxed">
                  {pwError}
                </p>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label
                htmlFor="pw-current"
                className="mb-1.5 block text-[13px] font-medium text-cal-ink"
              >
                Current password <span className="text-cal-error">*</span>
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
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
                  className="h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-10 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors disabled:opacity-50"
                  placeholder="Enter your current password"
                />
                <ToggleEye
                  shown={showPw.current}
                  onToggle={() => toggleShow("current")}
                />
              </div>
            </div>

            {/* New Password & Confirm Password (2 Columns) */}
            <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="pw-new"
                  className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                >
                  New password <span className="text-cal-error">*</span>
                </label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                  <input
                    id="pw-new"
                    type={showPw.next ? "text" : "password"}
                    value={pwForm.next}
                    onChange={(e) =>
                      setPwForm((prev) => ({ ...prev, next: e.target.value }))
                    }
                    autoComplete="new-password"
                    required
                    disabled={pwState === "loading"}
                    className="h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-10 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors disabled:opacity-50"
                    placeholder="Minimum 16 characters"
                  />
                  <ToggleEye
                    shown={showPw.next}
                    onToggle={() => toggleShow("next")}
                  />
                </div>

                {/* Password Strength Indicator */}
                {pwForm.next.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-cal-hairline">
                      <div
                        className={`h-full flex-1 rounded-full transition-colors ${
                          strengthScore >= 1
                            ? strengthLabel.color
                            : "bg-transparent"
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-colors ${
                          strengthScore >= 2
                            ? strengthLabel.color
                            : "bg-transparent"
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-colors ${
                          strengthScore >= 3
                            ? strengthLabel.color
                            : "bg-transparent"
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-colors ${
                          strengthScore >= 4
                            ? strengthLabel.color
                            : "bg-transparent"
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-cal-muted">Strength</span>
                      <span className="font-semibold text-cal-ink">
                        {strengthLabel.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="pw-confirm"
                  className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                >
                  Confirm new password <span className="text-cal-error">*</span>
                </label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                  <input
                    id="pw-confirm"
                    type={showPw.confirm ? "text" : "password"}
                    value={pwForm.confirm}
                    onChange={(e) =>
                      setPwForm((prev) => ({
                        ...prev,
                        confirm: e.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    required
                    disabled={pwState === "loading"}
                    className={`h-10 w-full rounded-[8px] border bg-cal-canvas pl-9 pr-10 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:outline-none transition-colors disabled:opacity-50 ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-cal-error focus:border-cal-error"
                        : "border-cal-hairline focus:border-cal-ink"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <ToggleEye
                    shown={showPw.confirm}
                    onToggle={() => toggleShow("confirm")}
                  />
                </div>

                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-cal-error">
                    <XCircle size={12} />
                    <span>Passwords do not match</span>
                  </p>
                )}
                {pwForm.confirm && passwordsMatch && (
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-cal-success">
                    <Check size={12} />
                    <span>Passwords match</span>
                  </p>
                )}
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
              <span className="mb-2 block text-[12px] font-semibold text-cal-ink">
                Security requirements
              </span>
              <ul className="grid grid-cols-1 gap-1.5 text-[12px] sm:grid-cols-2">
                <li
                  className={`flex items-center gap-2 ${
                    hasMinLength ? "text-cal-ink font-medium" : "text-cal-muted"
                  }`}
                >
                  {hasMinLength ? (
                    <Check size={13} className="text-cal-success" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-muted" />
                  )}
                  <span>At least 16 characters</span>
                </li>

                <li
                  className={`flex items-center gap-2 ${
                    hasNumber ? "text-cal-ink font-medium" : "text-cal-muted"
                  }`}
                >
                  {hasNumber ? (
                    <Check size={13} className="text-cal-success" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-muted" />
                  )}
                  <span>Contains at least one number</span>
                </li>

                <li
                  className={`flex items-center gap-2 ${
                    hasSpecial ? "text-cal-ink font-medium" : "text-cal-muted"
                  }`}
                >
                  {hasSpecial ? (
                    <Check size={13} className="text-cal-success" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-muted" />
                  )}
                  <span>Contains a special symbol</span>
                </li>

                <li
                  className={`flex items-center gap-2 ${
                    passwordsMatch
                      ? "text-cal-ink font-medium"
                      : "text-cal-muted"
                  }`}
                >
                  {passwordsMatch ? (
                    <Check size={13} className="text-cal-success" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-muted" />
                  )}
                  <span>Passwords match exactly</span>
                </li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="submit"
                disabled={
                  pwState === "loading" ||
                  !hasMinLength ||
                  !hasNumber ||
                  !hasSpecial ||
                  !passwordsMatch
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed"
              >
                {pwState === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Update password</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={clearPwForm}
                disabled={pwState === "loading"}
                className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </form>
        )}
      </SettingsCard>
    </div>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────

const Settings = () => {
  const { user, userId } = useAuth();

  const role = user?.role || "admin";
  const expertType = user?.expert_type;

  // Fetch full profile when userId is present
  const profileQuery = useApiQuery(
    userId ? `/api/users/${userId}/profile` : null
  );
  const profile = profileQuery.data?.profile || user;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <User size={13.5} className="text-cal-ink" />
              <span>My account · Profile &amp; security credentials</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Settings &amp; preferences
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Manage your administrator profile details, review assigned role
              permissions, and update account credentials.
            </p>
          </div>
        </div>

        {/* ─── 2. KPI / STATUS SUMMARY STRIP ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Active role
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink">
                <BadgeCheck size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 truncate font-cal-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.5px] leading-none text-cal-ink">
              {getRoleLabel(role, expertType)}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              {role === "admin"
                ? "Full administrative scope"
                : "Clinical expert permissions"}
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Account status
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                <CheckCircle2 size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[26px] font-semibold tracking-[-0.5px] leading-none text-cal-ink">
              Active
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Authorized clinical session
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Login security
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <ShieldCheck size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 truncate font-cal-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.5px] leading-none text-cal-ink">
              Direct Auth
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Encrypted password verification
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Staff identifier
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Hash size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 truncate font-cal-mono text-[16px] sm:text-[18px] font-semibold tabular-nums text-cal-ink">
              {userId ? userId.slice(0, 12) + "…" : "—"}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Immutable staff database record
            </div>
          </div>
        </div>

        {/* ─── 3. ACCOUNT SETTINGS CONTENT ───────────────────────────────────── */}
        <AccountTab user={profile} userId={userId} />
      </div>
    </AdminLayout>
  );
};

export default Settings;
