import { useState } from "react";
import { Eye, EyeOff, Loader2, Check, Circle } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/useAuth";
import { apiFetch } from "../../api";
import { HeartLogoIcon, ErrorBanner, FieldError } from "./login";
import { inputBase, inputState, labelText, primaryButton, textLink, focusRing } from "./authStyles";

// HL-044: staff created by an admin start with a one-time temporary password and land here
// on first login. The backend blocks every other request until the password is replaced.

const homeFor = (role) => (role === "medical_expert" ? "/cases" : "/dashboard");

function PasswordInput({ id, label, value, onChange, autoComplete, hasError, describedBy }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={`${labelText} mb-1.5`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={`${inputBase} ${inputState(hasError)} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={`absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[6px] border-0 bg-transparent text-cal-muted active:bg-cal-surface-soft cursor-pointer ${focusRing}`}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Rule({ met, children }) {
  return (
    <li className={`flex items-center gap-2 text-[13px] ${met ? "text-cal-ink font-medium" : "text-cal-muted"}`}>
      {met ? (
        <Check size={14} className="shrink-0 text-cal-success" aria-hidden="true" />
      ) : (
        <Circle size={10} className="mx-[2px] shrink-0 text-cal-muted-soft" aria-hidden="true" />
      )}
      <span>{children}</span>
      <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
    </li>
  );
}

export default function SetPassword() {
  const { user, userId, isAuthenticated, loading, logout, markPasswordChanged } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.mustChangePassword) return <Navigate to={homeFor(user?.role)} replace />;

  const rules = {
    length: next.length >= 16,
    number: /\d/.test(next),
    special: /[^A-Za-z0-9\s]/.test(next),
    different: next.length > 0 && next !== current,
  };
  const matches = confirm.length > 0 && confirm === next;
  const valid = current.length > 0 && Object.values(rules).every(Boolean) && matches;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!valid) return;

    setSaving(true);
    try {
      await apiFetch(`/api/users/${userId}/password`, {
        method: "PUT",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      markPasswordChanged();
      toast.success("Password saved", { description: "Use your new password next time you sign in." });
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      const detail = typeof err?.data?.detail === "string" ? err.data.detail : "";
      if (err?.status === 400 && detail.toLowerCase().includes("current password")) {
        setError({
          title: "Temporary password is incorrect",
          message: "Check the password your administrator gave you and try again.",
        });
      } else if (err?.status === 422 || err?.status === 400) {
        setError({
          title: "Password not accepted",
          message: detail || "Choose a password that meets every rule below.",
        });
      } else if (err?.status === 429) {
        setError({ title: "Too many attempts", message: "Wait a minute, then try again." });
      } else {
        setError({
          title: "Couldn't save your password",
          message: "Check your connection and try again.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-cal-surface-soft font-cal-sans text-cal-ink selection:bg-cal-ink selection:text-cal-on-primary">
      <header className="border-b border-cal-hairline bg-cal-canvas">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link
            to="/"
            className={`flex items-center gap-2.5 rounded-[6px] text-cal-ink no-underline ${focusRing}`}
          >
            <HeartLogoIcon size={26} />
            <span className="font-cal-display text-[19px] font-semibold tracking-[-0.4px] text-cal-ink">
              HeartLink
            </span>
          </Link>
          <span className="rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
            First-time setup
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-[420px]">
          <div className="text-center">
            <h1 className="m-0 font-cal-display text-[28px] font-semibold leading-[1.2] tracking-[-0.5px] text-cal-ink sm:text-[32px]">
              Set your password
            </h1>
            <p className="mt-2 mb-0 text-[14px] leading-[1.5] text-cal-muted">
              You signed in with a temporary password. Choose your own to continue to the portal.
            </p>
          </div>

          <div className="mt-8 rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-8">
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <PasswordInput
                  id="current-password"
                  label="Temporary password"
                  value={current}
                  onChange={setCurrent}
                  autoComplete="current-password"
                  hasError={submitted && !current}
                  describedBy={submitted && !current ? "current-error" : undefined}
                />
                <FieldError
                  id="current-error"
                  message={submitted && !current ? "Enter the temporary password you were given." : ""}
                />
              </div>

              <div>
                <PasswordInput
                  id="new-password"
                  label="New password"
                  value={next}
                  onChange={setNext}
                  autoComplete="new-password"
                  hasError={submitted && !Object.values(rules).every(Boolean)}
                  describedBy="password-rules"
                />
                <ul
                  id="password-rules"
                  className="mt-3 space-y-1.5 rounded-[8px] bg-cal-surface-card p-3.5 list-none"
                  aria-label="Password rules"
                >
                  <Rule met={rules.length}>At least 16 characters</Rule>
                  <Rule met={rules.number}>At least one number</Rule>
                  <Rule met={rules.special}>At least one special character (like ! or #)</Rule>
                  <Rule met={rules.different}>Different from the temporary password</Rule>
                </ul>
              </div>

              <div>
                <PasswordInput
                  id="confirm-password"
                  label="Confirm new password"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                  hasError={submitted && !matches}
                  describedBy={submitted && !matches ? "confirm-error" : undefined}
                />
                <FieldError
                  id="confirm-error"
                  message={submitted && !matches ? "The passwords don't match." : ""}
                />
              </div>

              <ErrorBanner error={error} />

              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save and continue</span>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[13px] text-cal-muted">
            Not you?{" "}
            <button type="button" onClick={logout} className={`border-0 bg-transparent p-0 text-[13px] ${textLink}`}>
              Sign out
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
