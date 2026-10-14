import { useState } from "react";
import { Eye, EyeOff, Loader2, Check, Circle } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../api";
import { HeartLogoIcon, LoginBackdrop, ErrorBanner, FieldError } from "./login";
import { inputBase, inputState, labelText, primaryButton, textLink, focusRing } from "./authStyles";

// HL-044: staff created by a Super Admin start with a one-time temporary password and land here
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
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#94A3B8] hover:text-[#334155] transition-colors cursor-pointer ${focusRing}`}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function Rule({ met, children }) {
  return (
    <li className={`flex items-center gap-2 text-[13px] ${met ? "text-[#067647]" : "text-[#64748B]"}`}>
      {met ? <Check size={14} className="shrink-0" aria-hidden="true" /> : <Circle size={10} className="shrink-0 mx-[2px]" aria-hidden="true" />}
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
  if (!isAuthenticated) return <Navigate to="/" replace />;
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
        setError({ title: "Temporary password is incorrect", message: "Check the password your administrator gave you and try again." });
      } else if (err?.status === 422 || err?.status === 400) {
        setError({ title: "Password not accepted", message: detail || "Choose a password that meets every rule below." });
      } else if (err?.status === 429) {
        setError({ title: "Too many attempts", message: "Wait a minute, then try again." });
      } else {
        setError({ title: "Couldn't save your password", message: "Check your connection and try again." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="relative isolate overflow-hidden min-h-screen w-full flex flex-col bg-[#F5F8FC] text-[#0F172A] selection:bg-[#2E9AE8] selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <LoginBackdrop />

      <main className="relative flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-[400px]">
          <div className="flex flex-col items-center text-center">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/70 bg-white/90 backdrop-blur ring-1 ring-[#E2E8F0]/70 shadow-[0_8px_20px_-6px_rgba(46,154,232,0.35)]">
              <HeartLogoIcon size={28} />
            </span>
            <h1 className="mt-6 text-[24px] leading-8 font-semibold tracking-[-0.02em]">Set your password</h1>
            <p className="mt-2 text-[14px] text-[#64748B]">
              You signed in with a temporary password. Choose your own to continue.
            </p>
          </div>

          <div className="hl-glow-border relative mt-8 rounded-2xl border border-white/70 bg-white/80 p-6 sm:p-8 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.05),0_30px_70px_-28px_rgba(46,154,232,0.45)] ring-1 ring-[#E2E8F0]/70">
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
                <FieldError id="current-error" message={submitted && !current ? "Enter the temporary password you were given." : ""} />
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
                <ul id="password-rules" className="mt-2.5 space-y-1.5" aria-label="Password rules">
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
                <FieldError id="confirm-error" message={submitted && !matches ? "The passwords don't match." : ""} />
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

          <p className="mt-6 text-center text-[13.5px] text-[#64748B]">
            Not you?{" "}
            <button type="button" onClick={logout} className={textLink}>
              Sign out
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
